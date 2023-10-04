import * as React from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import * as ReactDOM from "react-dom/client";
import * as cx from "classnames";
import { encodeFunctionName, decodeFunctionName } from "../utils/functions";
import { Connection, Generation } from "../utils/types";
import "./index.scss";
import { parseISO, format } from "date-fns";
import {
  XIcon,
  ThreeBarsIcon,
  TrashIcon,
  DiscussionClosedIcon,
} from "@primer/octicons-react";
import { pipe } from "fp-ts/lib/function";
import * as AR from "fp-ts/Array";
import * as O from "fp-ts/Option";

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

  const textAreaRef = useRef(null);

  useEffect(() => {
    textAreaRef.current.style.height = "inherit";
    const scrollHeight = textAreaRef.current.scrollHeight;
    textAreaRef.current.style.height = scrollHeight + "px";

    // Set cursor to the end of the content
    const length = textAreaRef.current.value.length;
    textAreaRef.current.setSelectionRange(length, length);
  }, []);

  return (
    <div className="editing">
      <textarea
        className={cx("input", {
          function:
            generation.message.function_call ||
            generation.message.role === "function",
        })}
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
        }}
        ref={textAreaRef}
        autoFocus={true}
      />

      <div className="actions">
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

            const updatedMessage = {
              ...generation.message,
              content,
            };

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

  return (
    <div
      className={cx("message", { editing: isEditing })}
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
      ) : message.function_call ? (
        <div className="function">
          <div className="name">
            {`Calling ${decodeFunctionName(message.function_call.name)}`}
          </div>

          <Suspense>
            <ErrorBoundary>
              <Interface props={JSON.parse(message.function_call.arguments)} />
            </ErrorBoundary>
          </Suspense>
        </div>
      ) : message.role === "function" ? (
        <div className="function">
          <div className="name">
            {`Output of ${decodeFunctionName(message.name)}`}
          </div>

          <Suspense>
            <ErrorBoundary>
              <Interface props={JSON.parse(message.content)} />
            </ErrorBoundary>
          </Suspense>
        </div>
      ) : (
        <div className="content">{message.content}</div>
      )}
    </div>
  );
};

const App = () => {
  const socketRef = useRef(null);
  const [generations, setGenerations] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [connections, setConnections] = useState([
    {
      name: "user",
      color: "#eb5528",
    },
  ]);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3001");

    socket.addEventListener("open", () => {
      console.log("Connected to Symphony Service");
      socket.send(JSON.stringify({ role: "restore", content: "" }));
      setConnections((connections) => [
        ...connections,
        {
          name: "assistant",
          color: "#d4d4d4",
        },
      ]);
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
      } else if (message.role === "delete") {
        const { content: deletedGeneration } = message;
        setConversations((conversations) =>
          conversations.filter(
            (conversation) =>
              conversation.id !== deletedGeneration.conversationId
          )
        );
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

  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesRef.current) {
      const observer = new MutationObserver(() => {
        setTimeout(() => {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }, 25);
      });

      const config = { attributes: false, childList: true, subtree: false };
      observer.observe(messagesRef.current, config);

      return () => observer.disconnect();
    }
  }, []);

  return (
    <div className="window">
      <div className="page">
        <div className="navigation">
          <div className="name">Symphony</div>

          <div className="right">
            <div className="connections">
              {connections.map((connection) => (
                <div className="connection">
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
          <div className="messages" ref={messagesRef}>
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

          <div className={cx("finetune")}>
            <div className="icon">
              <DiscussionClosedIcon />
            </div>
            <div className="tooltip">Pick for fine-tuning</div>
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
                          role: "delete",
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
