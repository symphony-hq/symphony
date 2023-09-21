import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.scss";
import cx from "classnames";

const Message = ({ message }) => {
  return (
    <div className="message">
      <div className={cx("avatar", { user: message.role === "user" })} />
      {message.function_call ? (
        <div className="function">
          <div className="name">{`Calling ${message.function_call.name.replace(
            "-",
            "."
          )}`}</div>
          <pre className="json">
            {JSON.stringify(
              JSON.parse(message.function_call.arguments),
              null,
              2
            )}
          </pre>
        </div>
      ) : message.role === "function" ? (
        <div className="function">
          <div className="name">{`Output of ${message.name}`}</div>
          <pre className="json">
            {JSON.stringify(JSON.parse(message.content), null, 2)}
          </pre>
        </div>
      ) : (
        <div className="content">{message.content}</div>
      )}
    </div>
  );
};

const ChainOfThought = ({ messages }) => {
  return (
    <details open>
      <summary>Chain of Thought</summary>
      {messages.map((message, index) => (
        <Message key={index} {...{ message }} />
      ))}
    </details>
  );
};

const App = () => {
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");

    socket.addEventListener("open", () => {
      console.log("Connected to Symphony Service");
      setIsConnected(true);
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      setMessages((messages) => [...messages, message]);
    });

    socket.addEventListener("close", (event) => {
      console.log("Service connection closed ", event.code);
      setIsConnected(false);
    });

    socket.addEventListener("error", (event) => {
      console.error("WebSocket error: ", event);
    });

    socketRef.current = socket;

    return () => socket.close();
  }, []);

  const messagesRef = useRef();
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  });

  return (
    <div className="page">
      <div className="navigation">
        <div className="name">Symphony</div>
        <div className={cx("status", { connected: isConnected })}>
          <div className="tooltip">
            {isConnected ? "Connected" : "Disconnected"}
          </div>
        </div>
      </div>

      <div className="conversation">

        <div className="messages" ref={messagesRef}>
          {messages.map((message, index, allMessages) => {
            if (message.role === "user") {
              // Find all function messages after this user message and before the next user message
              const functionMessages = [];
              for (let i = index + 1; i < allMessages.length; i++) {
                if (allMessages[i].role === "user") break;
                if (
                  allMessages[i].function_call ||
                  allMessages[i].role === "function"
                ) {
                  functionMessages.push(allMessages[i]);
                }
              }
              return (
                <React.Fragment key={index}>
                  <Message {...{ message }} />
                  {functionMessages.length > 0 && (
                    <ChainOfThought messages={functionMessages} />
                  )}
                </React.Fragment>
              );
            } else if (!message.function_call && message.role !== "function") {
              return <Message key={index} {...{ message }} />;
            }
          })}
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
                content: event.target.value,
              };

              socketRef.current.send(JSON.stringify(message));
              setMessages((messages) => [...messages, message]);

              setTimeout(() => {
                event.target.value = "";
              }, [10]);
            }
          }}
        />
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
