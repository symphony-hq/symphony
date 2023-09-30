import { Server, WebSocket } from "ws";
import { createServer } from "http";
import { createMachine, interpret, EventObject, assign } from "xstate";
import OpenAI from "openai";
import * as typescriptFunctions from "./typescript/descriptions.json";
import * as pythonFunctions from "./python/descriptions.json";
import { pipe } from "fp-ts/lib/function";
import * as RAR from "fp-ts/ReadonlyArray";
import * as O from "fp-ts/Option";
import * as dotenv from "dotenv";
import { exec } from "child_process";
import { decodeFunctionName, encodeFunctionName } from "../utils/functions";
import { Generation, Message } from "../utils/types";
import { v4 as id } from "uuid";
import * as S from "fp-ts/string";
import axios from "axios";

dotenv.config();

const DATABASE_ENDPOINT = "http://127.0.0.1:3002";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SymphonyEvent extends EventObject {
  type: "CLIENT_MESSAGE";
  data: Message;
}

const server = createServer();
const wss = new Server({ server });

const machine = createMachine(
  {
    id: "machine",
    initial: "idle",
    context: {
      id: id(),
      messages: [
        {
          role: "system",
          content: `You are a friendly assistant. Keep your responses short.`,
        },
      ],
    },
    schema: {
      context: {} as {
        id: string;
        messages: Message[];
      },
    },
    predictableActionArguments: true,
    on: {
      CLIENT_MESSAGE: [
        {
          target: "gpt4",
          cond: (_, event) => event.data.role === "user",
          actions: [
            assign({
              messages: (context, event) => {
                const { messages } = context;
                const { data } = event as SymphonyEvent;
                return [...messages, data];
              },
            }),
            "receiveUserMessageFromClient",
          ],
        },
        {
          target: "restore",
          cond: (_, event) => event.data.role === "restore",
        },
        {
          target: "history",
          cond: (_, event) => event.data.role === "history",
        },
        {
          target: "new",
          cond: (_, event) => event.data.role === "new",
        },
        {
          target: "switch",
          cond: (_, event) => event.data.role === "switch",
          actions: [
            assign({
              id: (_, event) => {
                const { data } = event as SymphonyEvent;
                const { content: conversationId } = data;
                return conversationId;
              },
            }),
          ],
        },
      ],
    },
    states: {
      function: {
        invoke: {
          src: (context) =>
            new Promise((resolve) => {
              const { messages } = context;

              const functionCall = pipe(
                messages,
                RAR.last,
                O.map((message: Message) => message.function_call),
                O.chain(O.fromNullable)
              );

              if (O.isSome(functionCall)) {
                const name = decodeFunctionName(functionCall.value.name);
                const args = JSON.parse(functionCall.value.arguments);

                if (name.includes(".ts")) {
                  import(`../../functions/${name}`)
                    .then(async (module) => {
                      const result = await module.default(args);

                      const message = {
                        role: "function",
                        name: encodeFunctionName(name),
                        content: JSON.stringify(result),
                      };

                      resolve(message);
                    })
                    .catch((error) => {
                      console.error(`Failed to load function ${name}:`, error);

                      const message = {
                        role: "function",
                        name: encodeFunctionName(name),
                        content: JSON.stringify({
                          errorMessage: error.message,
                        }),
                      };

                      resolve(message);
                    });
                } else if (name.includes(".py")) {
                  const pythonInterpreterPath = "venv/bin/python3";
                  const pythonScriptPath = `functions/${name}`;
                  const argsString = JSON.stringify(args);

                  exec(
                    `${pythonInterpreterPath} ${pythonScriptPath} '${argsString}'`,
                    (error, stdout) => {
                      if (error) {
                        console.error(
                          `Failed to execute python script ${name}:`,
                          error
                        );

                        const message = {
                          role: "function",
                          name: encodeFunctionName(name),
                          content: JSON.stringify({
                            errorMessage: error.message,
                          }),
                        };

                        resolve(message);
                      } else {
                        const message = {
                          role: "function",
                          name: encodeFunctionName(name),
                          content: stdout,
                        };

                        resolve(message);
                      }
                    }
                  );
                }
              } else {
                resolve(null);
              }
            }).then((response) => response),
          onDone: [
            {
              target: "gpt4",
              cond: (_, event) => event.data,
              actions: [
                "sendFunctionMessageToClients",
                assign({
                  messages: (context, event) => {
                    const { messages } = context;
                    const { data: message } = event;

                    return [...messages, message];
                  },
                }),
              ],
            },
            {
              target: "idle",
            },
          ],
        },
      },
      gpt4: {
        invoke: {
          src: (context, event) =>
            openai.chat.completions.create({
              messages: [...context.messages, event.data],
              model: "gpt-4",
              functions: [...typescriptFunctions, ...pythonFunctions],
            }),
          onDone: {
            target: "function",
            actions: [
              "sendAssistantMessageToClients",
              assign({
                messages: (context, event) => {
                  const { messages } = context;
                  const { message } = event.data.choices[0];
                  return [...messages, message];
                },
              }),
            ],
          },
          onError: {
            target: "idle",
            actions: [
              (_, event) => {
                console.log(event);
              },
            ],
          },
        },
      },
      new: {
        invoke: {
          src: () => Promise.resolve({}),
          onDone: {
            target: "idle",
            actions: [
              assign({
                id: id(),
                messages: [],
              }),
            ],
          },
        },
      },
      restore: {
        invoke: {
          src: () => Promise.resolve({}),
          onDone: {
            target: "idle",
            actions: ["sendAllMessagesToClients"],
          },
        },
      },
      switch: {
        invoke: {
          src: async (context) => {
            const { id } = context;

            const { data: generations } = await axios.get(
              `${DATABASE_ENDPOINT}/generations?conversationId=eq.${id}&order=timestamp`
            );

            return pipe(
              generations,
              RAR.filter(
                (generation: Generation) => generation.conversationId === id
              ),
              RAR.map((generation: Generation) => generation.message)
            );
          },
          onDone: {
            target: "idle",
            actions: [
              assign({
                messages: (_, event) => {
                  const { data: messages } = event;
                  return messages;
                },
              }),
              "sendAllMessagesToClients",
            ],
          },
        },
      },
      history: {
        invoke: {
          src: async () => {
            const { data: generations } = await axios.get(
              `${DATABASE_ENDPOINT}/generations?order=timestamp`
            );

            return generations;
          },
          onDone: {
            target: "idle",
            actions: [
              (_, event) => {
                const { data: generations } = event;

                const history = pipe(
                  generations,
                  RAR.map(
                    (generation: Generation) => generation.conversationId
                  ),
                  RAR.uniq(S.Eq),
                  RAR.map((conversationId) =>
                    pipe(
                      generations,
                      RAR.filter(
                        (generation: Generation) =>
                          generation.conversationId === conversationId
                      ),
                      RAR.head,
                      O.map(({ conversationId, message, timestamp }) => ({
                        id: conversationId,
                        timestamp,
                        message,
                      })),
                      O.toUndefined
                    )
                  ),
                  RAR.reverse
                );

                wss.clients.forEach((client: WebSocket) => {
                  client.send(
                    JSON.stringify({
                      role: "history",
                      content: history,
                    })
                  );
                });
              },
            ],
          },
        },
      },
      idle: {},
    },
  },
  {
    actions: {
      receiveUserMessageFromClient: async (context, event) => {
        const { id } = context;
        const { data: message } = event;

        await axios.post(`${DATABASE_ENDPOINT}/generations`, {
          message: message,
          conversationId: id,
        });
      },
      sendAssistantMessageToClients: async (context, event) => {
        const { id } = context;
        const { message } = event.data.choices[0];

        wss.clients.forEach((client: WebSocket) => {
          client.send(JSON.stringify(message));
        });

        await axios.post(`${DATABASE_ENDPOINT}/generations`, {
          message: message,
          conversationId: id,
        });
      },
      sendFunctionMessageToClients: async (context, event) => {
        const { id } = context;
        const { data: message } = event;

        wss.clients.forEach((client: WebSocket) => {
          client.send(JSON.stringify(message));
        });

        await axios.post(`${DATABASE_ENDPOINT}/generations`, {
          message: message,
          conversationId: id,
        });
      },
      sendAllMessagesToClients: (context) => {
        const { messages } = context;

        wss.clients.forEach((client: WebSocket) => {
          messages
            .filter((message) => message.role !== "system")
            .map((message) => {
              client.send(JSON.stringify(message));
            });
        });
      },
    },
  }
);

const service = interpret(machine).start();

type Data = string | Buffer | ArrayBuffer | Buffer[] | ArrayBufferView;

wss.on("connection", (connection: WebSocket) => {
  connection.on("message", (message: Data) => {
    const decodedMessage = message.toString();
    const parsedMessage = JSON.parse(decodedMessage);

    const symphonyEvent: SymphonyEvent = {
      type: "CLIENT_MESSAGE",
      data: parsedMessage,
    };

    service.send(symphonyEvent);
  });
});

server.listen(3001);
