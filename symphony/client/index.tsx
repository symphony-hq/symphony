import * as React from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import * as ReactDOM from "react-dom/client";
import * as cx from "classnames";
import { encodeFunctionName, decodeFunctionName } from "../utils/functions";
import { Message } from "../utils/types";
import "./index.scss";

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

const Message = ({ message }: { message: Message }) => {
  const Interface = getInterface(
    message.function_call ? message.function_call.name : message.name,
    message.function_call ? "Request" : "Response"
  );

  return (
    <div className="message">
      <div className={cx("avatar", { user: message.role === "user" })} />
      {message.function_call ? (
        <div className="function">
          <div className="name">
            {`Calling ${decodeFunctionName(message.function_call.name)}`}
          </div>

          <Suspense>
            <Interface props={JSON.parse(message.function_call.arguments)} />
          </Suspense>
        </div>
      ) : message.role === "function" ? (
        <div className="function">
          <div className="name">
            {`Output of ${decodeFunctionName(message.name)}`}
          </div>

          <Suspense>
            <Interface props={JSON.parse(message.content)} />
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
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3001");

    socket.addEventListener("open", () => {
      console.log("Connected to Symphony Service");
      socket.send(JSON.stringify({ role: "restore", content: "" }));
      setIsConnected(true);
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      setMessages((messages: Message[]) => [...messages, message]);
    });

    socket.addEventListener("close", (event) => {
      console.log("Disconnected from Symphony Service", event.code);
      setIsConnected(false);
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
          {messages.map((message: Message, index) => (
            <Message key={index} {...{ message }} />
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
              setMessages((messages) => [...messages, message]);

              setTimeout(() => {
                (event.target as HTMLInputElement).value = "";
              }, 10);
            }
          }}
        />
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
