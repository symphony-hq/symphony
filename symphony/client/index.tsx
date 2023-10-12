import * as React from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import * as ReactDOM from "react-dom/client";
import * as cx from "classnames";
import {
  encodeFunctionName,
  decodeFunctionName,
  getAssistantFromConnections,
  getModelIdFromAssistant,
} from "../utils/functions";
import { Connection, Generation } from "../utils/types";
import "./index.scss";
import { parseISO, format } from "date-fns";
import {
  XIcon,
  ThreeBarsIcon,
  TrashIcon,
  GoalIcon,
  CheckIcon,
} from "@primer/octicons-react";
import { pipe } from "fp-ts/lib/function";
import * as AR from "fp-ts/Array";
import * as O from "fp-ts/Option";
import { produce } from "immer";
import { Model } from "openai/resources";

const interfaceCache = {};

const getInterface = (name: string, type: string) => {
  if (name) {
    const hash = `${name}-${type}`;

    if (!interfaceCache[hash]) {
      interfaceCache[hash] = React.lazy(async () => {
        const module = await import(
          `../../interfaces/${encodeFunctionName(name)}.tsx`
        );
        return { default: module[type] };
      });
    }
    return interfaceCache[hash];
  } else {
    return <div />;
  }
};

const EditGeneration = ({ generation, setIsEditing, socketRef }) => {
  const [content, setContent] = useState(generation.message.content);
  const [args, setArgs] = useState(generation.message.function_call?.arguments);

  const contentRef = useRef(null);
  const argsRef = useRef(null);

  useEffect(() => {
    contentRef.current.style.height = "inherit";
    const contentScrollHeight = contentRef.current.scrollHeight;
    contentRef.current.style.height = contentScrollHeight + "px";

    if (argsRef.current) {
      argsRef.current.style.height = "inherit";
      const argsScrollHeight = argsRef.current.scrollHeight;
      argsRef.current.style.height = argsScrollHeight + "px";
    }

    const length = contentRef.current.value.length;
    contentRef.current.setSelectionRange(length, length);
  }, []);

  return (
    <div className="editing">
      <div className="textareas">
        <div className="textarea">
          <div className="label">{args ? "Reasoning" : "Output"}</div>
          <textarea
            className={cx("input")}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
            }}
            ref={contentRef}
            autoFocus={true}
          />
        </div>

        {args && (
          <div className="textarea">
            <div className="label">
              {decodeFunctionName(generation.message.function_call.name)}
            </div>
            <textarea
              className={cx("input")}
              value={args}
              onChange={(event) => {
                setArgs(event.target.value);
              }}
              ref={argsRef}
            />
          </div>
        )}
      </div>

      <div className="actions">
        <div
          className="delete"
          onClick={() => {
            socketRef.current.send(
              JSON.stringify({
                role: "deleteGeneration",
                content: generation.id,
              })
            );
          }}
        >
          Delete
        </div>

        <div className="line" />

        <div
          className="discard"
          onClick={() => {
            setIsEditing(false);
          }}
        >
          Discard Changes
        </div>

        <div
          className="save"
          onClick={() => {
            setIsEditing(false);

            const updatedMessage = produce(generation.message, (draft) => {
              draft.content = content;

              if (args) {
                draft.function_call = draft.function_call || {};
                draft.function_call.arguments = args;
              }
            });

            socketRef.current.send(
              JSON.stringify({
                role: "edit",
                content: {
                  id: generation.id,
                  message: updatedMessage,
                },
              })
            );
          }}
        >
          Save Changes
        </div>
      </div>
    </div>
  );
};

const Generation = ({
  generation,
  socketRef,
  connections,
}: {
  generation: Generation;
  socketRef: React.RefObject<WebSocket>;
  connections: Connection[];
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const { message } = generation;

  const Interface = getInterface(
    message.function_call ? message.function_call.name : message.name,
    message.function_call ? "Request" : "Response"
  );

  const isFunction = message.function_call || message.role === "function";

  return (
    <div
      className={cx("generation", { editing: isEditing })}
      onClick={() => {
        if (!isEditing) setIsEditing(true);
      }}
    >
      <div
        className="avatar"
        style={{
          backgroundColor: pipe(
            connections,
            AR.findFirst((connection) => connection.name === message.role),
            O.map((connection) => connection.color),
            O.getOrElse(() => "#d4d4d4")
          ),
        }}
      />

      {isEditing ? (
        <EditGeneration {...{ generation, setIsEditing, socketRef }} />
      ) : (
        <div className="content">
          {!isFunction && message.content}

          {isFunction && (
            <div className="function">
              <div className="status">
                {message.function_call ? "Execute" : "Output"}
              </div>
              <div className="name">
                {decodeFunctionName(
                  message.function_call
                    ? message.function_call.name
                    : message.name
                )}
              </div>
            </div>
          )}

          {isFunction && (
            <Suspense>
              <ErrorBoundary>
                <Interface
                  props={JSON.parse(
                    message.function_call
                      ? message.function_call.arguments
                      : message.content
                  )}
                />
              </ErrorBoundary>
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
};

const App = () => {
  const socketRef = useRef(null);

  const [generations, setGenerations] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);

  const [connections, setConnections] = useState<Connection[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<
    O.Option<Connection>
  >(O.none);
  const [finetune, setFinetune] = useState(false);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3001");

    socket.addEventListener("open", () => {
      console.log("Connected to Symphony Service");
      socket.send(JSON.stringify({ role: "restore", content: "" }));
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.role === "history") {
        setConversations(message.content);
      } else if (message.role === "switch") {
        const { content: generations } = message;
        setGenerations(generations);
      } else if (message.role === "edit") {
        const { content: updatedGeneration } = message;
        setGenerations((generations: Generation[]) =>
          generations.map((generation) => {
            if (generation.id === updatedGeneration.id) {
              return updatedGeneration;
            } else {
              return generation;
            }
          })
        );
      } else if (message.role === "deleteConversation") {
        const { content: deletedGeneration } = message;
        setConversations((conversations) =>
          conversations.filter(
            (conversation) =>
              conversation.id !== deletedGeneration.conversationId
          )
        );
      } else if (message.role === "deleteGeneration") {
        const { content: deletedGeneration } = message;
        setGenerations((generations: Generation[]) =>
          generations.filter(
            (generation) => generation.id !== deletedGeneration.id
          )
        );
      } else if (message.role === "restore") {
        const { content: context } = message;
        const { connections, generations } = context;
        setSelectedConnection(O.none);
        setGenerations(generations);
        setConnections(connections);
      } else if (message.role === "finetune") {
        const { content: job } = message;
        window.open(`https://platform.openai.com/finetune/${job.id}`, "_blank");
      } else if (message.role === "models") {
        const { content: models } = message;
        setModels(models);
      } else {
        setGenerations((generations: Generation[]) => [
          ...generations,
          message,
        ]);
      }
    });

    socket.addEventListener("close", (event) => {
      console.log("Disconnected from Symphony Service", event.code);
      setConnections((connections) =>
        connections.filter((connection) => connection.name !== "assistant")
      );
    });

    socket.addEventListener("error", (event) => {
      console.error("WebSocket error: ", event);
    });

    socketRef.current = socket;

    return () => socket.close();
  }, []);

  const generationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (generationsRef.current) {
      const observer = new MutationObserver(() => {
        setTimeout(() => {
          generationsRef.current.scrollTop =
            generationsRef.current.scrollHeight;
        }, 25);
      });

      const config = { attributes: false, childList: true, subtree: false };
      observer.observe(generationsRef.current, config);

      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    if (O.isSome(selectedConnection)) {
      socketRef.current.send(
        JSON.stringify({
          role: "models",
          content: "",
        })
      );
    }
  }, [selectedConnection]);

  return (
    <div className="window">
      <div className="page">
        <div className="navigation">
          <div className="name">Symphony</div>

          <div className="right">
            <div className="connections">
              {connections.map((connection) => (
                <div
                  key={connection.name}
                  className={cx("connection", {
                    selected: pipe(
                      selectedConnection,
                      O.map(
                        (selectedConnection) =>
                          selectedConnection.name === connection.name
                      ),
                      O.getOrElse(() => false)
                    ),
                  })}
                  onClick={() => {
                    setSelectedConnection(O.some(connection));
                  }}
                >
                  <div
                    className="avatar"
                    style={{ backgroundColor: connection.color }}
                  />
                  <div className="name">{connection.name}</div>
                </div>
              ))}
            </div>

            <div
              className="menu"
              onClick={() => {
                setIsHistoryVisible(!isHistoryVisible);
                socketRef.current.send(
                  JSON.stringify({
                    role: "history",
                    content: "",
                  })
                );
              }}
            >
              {isHistoryVisible ? <XIcon /> : <ThreeBarsIcon />}
            </div>
          </div>
        </div>

        <div className="conversation">
          <div className="generations" ref={generationsRef}>
            {generations.map((generation: Generation) => (
              <Generation
                key={generation.id}
                {...{ generation, socketRef, connections }}
              />
            ))}
          </div>
        </div>

        <div className="controls">
          <input
            className="input"
            placeholder="Send a message"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                const message = {
                  role: "user",
                  content: (event.target as HTMLInputElement).value,
                };

                socketRef.current.send(JSON.stringify(message));

                setTimeout(() => {
                  (event.target as HTMLInputElement).value = "";
                }, 10);
              }
            }}
          />
        </div>
      </div>

      <div className={cx("history", { visible: isHistoryVisible })}>
        <div className="bar">
          <div className="name">History</div>

          <div
            className={cx("finetune")}
            onClick={() => {
              setFinetune(true);
            }}
          >
            <div className="icon">
              <GoalIcon />
            </div>
            <div className="tooltip">Fine-tune</div>
          </div>
        </div>

        <div className="conversations">
          <div
            className="conversation"
            onClick={() => {
              setGenerations([]);
              socketRef.current.send(
                JSON.stringify({
                  role: "new",
                  content: "",
                })
              );
            }}
          >
            <div className="top">
              <div className="timestamp">Now</div>
            </div>
            <div className="content">Start a new conversation!</div>
          </div>

          <div className="line" />

          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cx("conversation", {
                selected: generations
                  .map((generation) => generation.conversationId)
                  .includes(conversation.id),
              })}
              onClick={() => {
                socketRef.current.send(
                  JSON.stringify({
                    role: "switch",
                    content: conversation.id,
                  })
                );
              }}
            >
              <div className="top">
                <div className="timestamp">
                  {format(
                    parseISO(conversation.timestamp),
                    "dd MMM yyyy, hh:mmaa"
                  )}
                </div>

                {generations
                  .map((generation) => generation.conversationId)
                  .includes(conversation.id) && (
                  <div
                    className="delete"
                    onClick={() => {
                      socketRef.current.send(
                        JSON.stringify({
                          role: "deleteConversation",
                          content: conversation.id,
                        })
                      );
                    }}
                  >
                    <TrashIcon size={14} />
                  </div>
                )}
              </div>
              <div className="content">{conversation.message.content}</div>
            </div>
          ))}
        </div>
      </div>

      {O.isSome(selectedConnection) && (
        <div className="personalize">
          <div className="connection">
            <div className="top">
              <div className="left">
                <div
                  className="avatar"
                  style={{
                    backgroundColor: selectedConnection.value.color,
                  }}
                />
                <div className="name">{selectedConnection.value.name}</div>
              </div>

              <div className="model">
                <div className="choice">{selectedConnection.value.modelId}</div>

                {selectedConnection.value.name !== "user" && (
                  <div className="options">
                    <div className="description">
                      Select a model to use for the assistant.
                    </div>

                    {models
                      .filter((model: Model) => model.id.includes("gpt"))
                      .map((model: Model) => (
                        <div
                          key={model.id}
                          className="option"
                          onClick={() => {
                            setSelectedConnection(
                              O.some(
                                produce(selectedConnection.value, (draft) => {
                                  draft.modelId = model.id;
                                })
                              )
                            );
                          }}
                        >
                          <div
                            className={cx("check", {
                              selected:
                                model.id === selectedConnection.value.modelId,
                            })}
                          >
                            <CheckIcon />
                          </div>
                          <div className="label">{model.id}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <textarea
              className="input"
              value={selectedConnection.value.description}
              onChange={(event) => {
                setSelectedConnection(
                  O.some(
                    produce(selectedConnection.value, (draft) => {
                      draft.description = event.target.value;
                    })
                  )
                );
              }}
              placeholder="What would you like the assistant to know about you?"
            />

            <div className="actions">
              <div
                className="discard"
                onClick={() => {
                  setSelectedConnection(O.none);
                }}
              >
                Discard changes
              </div>

              <div
                className="save"
                onClick={() => {
                  socketRef.current.send(
                    JSON.stringify({
                      role: "personalize",
                      content: selectedConnection.value,
                    })
                  );
                }}
              >
                Save changes
              </div>
            </div>
          </div>
        </div>
      )}

      {finetune && (
        <div className="alert">
          <div className="dialog">
            <div className="content">
              {`Would you like to fine-tune ${pipe(
                connections,
                getAssistantFromConnections,
                getModelIdFromAssistant
              )} using ${conversations.length} conversations?`}
            </div>

            <div className="actions">
              <div
                className="discard"
                onClick={() => {
                  setFinetune(false);
                }}
              >
                Go Back
              </div>

              <div
                className="save"
                onClick={() => {
                  socketRef.current.send(
                    JSON.stringify({
                      role: "finetune",
                      content: "",
                    })
                  );
                  setFinetune(false);
                }}
              >
                Confirm
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <div className="error">{this.state.error.toString()}</div>;
    } else {
      return this.props.children;
    }
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
