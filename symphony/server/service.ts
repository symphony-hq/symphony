import { Server, WebSocket } from "ws";
import { createServer } from "http";
import { createMachine, interpret, EventObject } from "xstate";
import { assign } from "@xstate/immer";
import OpenAI from "openai";
import * as typescriptFunctions from "./typescript/descriptions.json";
import * as pythonFunctions from "./python/descriptions.json";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as dotenv from "dotenv";
import { exec } from "child_process";
import { decodeFunctionName, encodeFunctionName } from "../utils/functions";
import { Generation, Message } from "../utils/types";
import { v4 as id } from "uuid";
import * as S from "fp-ts/string";
import axios from "axios";
import * as AR from "fp-ts/Array";
import { UUID } from "crypto";

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

const createGeneration = (
  message: Message,
  conversationId: UUID
): Generation => {
  return {
    id: id(),
    message,
    conversationId,
    timestamp: new Date().toISOString(),
  };
};

const machine = createMachine(
  {
    id: "machine",
    initial: "idle",
    context: {
      id: id(),
      generations: [],
    },
    schema: {
      context: {} as {
        id: UUID;
        generations: Generation[];
      },
    },
    predictableActionArguments: true,
    on: {
      CLIENT_MESSAGE: [
        {
          target: "gpt4",
          cond: (_, event) => event.data.role === "user",
          actions: [
            assign((context, event) => {
              const { generations, id } = context;
              const { data } = event as SymphonyEvent;

              context.generations = [
                ...generations,
                createGeneration(data, id),
              ];
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
          target: "delete",
          cond: (_, event) => event.data.role === "delete",
        },
        {
          target: "edit",
          cond: (_, event) => event.data.role === "edit",
        },
        {
          target: "switch",
          cond: (_, event) => event.data.role === "switch",
          actions: [
            assign((context, event) => {
              const { data } = event;
              const { content: conversationId } = data;
              context.id = conversationId;
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
              const { generations } = context;

              const functionCall = pipe(
                generations,
                AR.last,
                O.map(
                  (generation: Generation) => generation.message.function_call
                ),
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
                assign((context, event) => {
                  const { id, generations } = context;
                  const { data: message } = event;

                  context.generations = [
                    ...generations,
                    createGeneration(message, id),
                  ];
                }),
                "sendFunctionMessageToClients",
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
              messages: [
                {
                  role: "system",
                  content: `You are a friendly assistant. Keep your responses short.`,
                },
                ...context.generations.map((generation) => generation.message),
                event.data,
              ],
              model: "gpt-4",
              functions: [...typescriptFunctions, ...pythonFunctions],
            }),
          onDone: {
            target: "function",
            actions: [
              assign((context, event) => {
                const { id, generations } = context;
                const { data } = event;
                const { choices } = data;
                const { message } = choices[0];

                context.generations = [
                  ...generations,
                  createGeneration(message, id),
                ];
              }),
              "sendAssistantMessageToClients",
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
              assign((context) => {
                context.id = id();
                context.generations = [];
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
            actions: ["sendConversationToClients"],
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
              AR.filter(
                (generation: Generation) => generation.conversationId === id
              )
            );
          },
          onDone: {
            target: "idle",
            actions: [
              assign((context, event) => {
                const { data: generations } = event;
                context.generations = generations;
              }),
              "sendConversationToClients",
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
                  AR.map((generation: Generation) => generation.conversationId),
                  AR.uniq(S.Eq),
                  AR.map((conversationId) =>
                    pipe(
                      generations,
                      AR.filter(
                        (generation: Generation) =>
                          generation.conversationId === conversationId
                      ),
                      AR.head,
                      O.map(({ conversationId, message, timestamp }) => ({
                        id: conversationId,
                        timestamp,
                        message,
                      })),
                      O.toUndefined
                    )
                  ),
                  AR.reverse
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
      delete: {
        invoke: {
          src: async (context) => {
            const { id } = context;

            await axios
              .delete(
                `${DATABASE_ENDPOINT}/generations?conversationId=eq.${id}`,
                {
                  headers: {
                    Prefer: "return=representation",
                  },
                }
              )
              .then((response) => {
                const deletedGeneration = pipe(response.data, AR.head);

                if (O.isSome(deletedGeneration)) {
                  wss.clients.forEach((client: WebSocket) => {
                    client.send(
                      JSON.stringify({
                        role: "delete",
                        content: deletedGeneration.value,
                      })
                    );
                  });
                }
              });
          },
          onDone: {
            target: "new",
          },
        },
      },
      edit: {
        invoke: {
          src: async (_, event) => {
            const { data: message } = event;
            const { content } = message;

            await axios
              .patch(
                `${DATABASE_ENDPOINT}/generations?id=eq.${content.id}`,
                {
                  message: content.message,
                },
                {
                  headers: {
                    Prefer: "return=representation",
                  },
                }
              )
              .then((response) => {
                const updatedGeneration = pipe(response.data, AR.head);

                if (O.isSome(updatedGeneration)) {
                  wss.clients.forEach((client: WebSocket) => {
                    client.send(
                      JSON.stringify({
                        role: "edit",
                        content: updatedGeneration.value,
                      })
                    );
                  });
                }
              });

            return content;
          },
          onDone: {
            target: "idle",
            actions: [
              assign((context, event) => {
                const { generations } = context;
                const { data } = event;
                const { id, message } = data;

                context.generations = pipe(
                  generations,
                  AR.map((generation: Generation) => {
                    if (generation.id === id) {
                      return { ...generation, message };
                    } else {
                      return generation;
                    }
                  })
                );
              }),
            ],
          },
        },
      },
      idle: {},
    },
  },
  {
    actions: {
      receiveUserMessageFromClient: async (context) => {
        const { generations } = context;

        const recentUserGeneration = pipe(
          generations,
          AR.findLast(
            (generation: Generation) => generation.message.role === "user"
          )
        );

        if (O.isSome(recentUserGeneration)) {
          wss.clients.forEach((client: WebSocket) => {
            client.send(JSON.stringify(recentUserGeneration.value));
          });

          await axios.post(
            `${DATABASE_ENDPOINT}/generations`,
            recentUserGeneration.value
          );
        }
      },
      sendAssistantMessageToClients: async (context) => {
        const { generations } = context;

        const recentAssistantGeneration = pipe(
          generations,
          AR.findLast(
            (generation: Generation) => generation.message.role === "assistant"
          )
        );

        if (O.isSome(recentAssistantGeneration)) {
          wss.clients.forEach((client: WebSocket) => {
            client.send(JSON.stringify(recentAssistantGeneration.value));
          });

          await axios.post(
            `${DATABASE_ENDPOINT}/generations`,
            recentAssistantGeneration.value
          );
        }
      },
      sendFunctionMessageToClients: async (context) => {
        const { generations } = context;

        const recentFunctionGeneration = pipe(
          generations,
          AR.findLast(
            (generation: Generation) => generation.message.role === "function"
          )
        );

        if (O.isSome(recentFunctionGeneration)) {
          wss.clients.forEach((client: WebSocket) => {
            client.send(JSON.stringify(recentFunctionGeneration.value));
          });

          await axios.post(
            `${DATABASE_ENDPOINT}/generations`,
            recentFunctionGeneration.value
          );
        }
      },
      sendConversationToClients: (context) => {
        const { generations } = context;

        wss.clients.forEach((client: WebSocket) => {
          client.send(
            JSON.stringify({
              role: "switch",
              content: generations.filter(
                (generation) => generation.message.role !== "system"
              ),
            })
          );
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
