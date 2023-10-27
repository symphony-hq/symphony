import * as React from "react";
import "../styles/history.scss";
import { SearchIcon } from "@primer/octicons-react";

interface Request {
  query: string;
}
export function Request({ props }: { props: Request }) {
  return <div className="json">{JSON.stringify(props, null, 2)}</div>;
}

interface Response {
  messages: [];
}
export function Response({ props }: { props: Response }) {
  const { messages } = props;

  return (
    <div className="messages">
      {messages.map((message) => (
        <div key={message} className="message">
          <div className="icon">
            <SearchIcon size={20} />
          </div>
          <div className="content">{message}</div>
        </div>
      ))}
    </div>
  );
}
