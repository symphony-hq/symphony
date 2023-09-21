import { Server } from "ws";
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

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface FunctionCall {
  name: string;
  arguments: string;
}

interface Message {
  role: string;
  content: string;
  function_call?: FunctionCall;
}

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
      messages: [
        {
          role: "system",
          content: "You are a friendly assistant. Keep your responses short.",
        },
      ],
    },
    predictableActionArguments: true,
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
                const name = functionCall.value.name.replace("-", ".");
                const args = JSON.parse(functionCall.value.arguments);

                if (name.includes(".ts")) {
                  import(`../functions/${name}`)
                    .then(async (module) => {
                      const result = await module.default(args);

                      const message = {
                        role: "function",
                        name: name.replace(".", "-"),
                        content: JSON.stringify(result),
                      };

                      resolve(message);
                    })
                    .catch((err) => {
                      console.error(`Failed to load function ${name}:`, err);
                      resolve(null);
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

                        resolve(null);
                      } else {
                        const message = {
                          role: "function",
                          name: name.replace(".", "-"),
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
              actions: ["sendFunctionMessageToClients"],
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
        },
      },
      idle: {
        on: {
          CLIENT_MESSAGE: {
            target: "gpt4",
            actions: [
              assign({
                messages: (context, event) => {
                  const { messages } = context;
                  const { data } = event as SymphonyEvent;
                  return [...messages, data];
                },
              }),
            ],
          },
        },
      },
    },
  },
  {
    actions: {
      sendAssistantMessageToClients: (_, event) => {
        const { message } = event.data.choices[0];

        wss.clients.forEach((client) => {
          client.send(JSON.stringify(message));
        });
      },
      sendFunctionMessageToClients: (_, event) => {
        const { data: message } = event;

        wss.clients.forEach((client) => {
          client.send(JSON.stringify(message));
        });
      },
    },
  }
);

const service = interpret(machine).start();

wss.on("connection", (connection) => {
  connection.on("message", (message) => {
    const decodedMessage = message.toString();
    const parsedMessage = JSON.parse(decodedMessage);

    const symphonyEvent: SymphonyEvent = {
      type: "CLIENT_MESSAGE",
      data: parsedMessage,
    };

    service.send(symphonyEvent);
  });
});

server.listen(8080);
