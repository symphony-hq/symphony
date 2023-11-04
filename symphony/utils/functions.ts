import { Connection } from "./types";
import * as O from "fp-ts/Option";
import * as AR from "fp-ts/Array";
import { pipe } from "fp-ts/function";

export const encodeFunctionName = (name: string): string => {
  return name.replace(".", "-");
};

export const decodeFunctionName = (name: string): string => {
  return name.replace("-", ".");
};

export const getNameFromFunction = (name: string): string => {
  return name.slice(0, -3);
};

export const getColor = (): string => {
  const colors = ["#EB5528", "#79D760", "#EB55F7", "#3A063E"];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const getAssistantFromConnections = (
  connections: Connection[]
): O.Option<Connection> =>
  pipe(
    connections,
    AR.findFirst((connection) => connection.name === "assistant")
  );

export const getUserFromConnections = (
  connections: Connection[]
): O.Option<Connection> =>
  pipe(
    connections,
    AR.findFirst((connection) => connection.name === "user")
  );

export const getDescriptionFromConnection = (
  connection: O.Option<Connection>
): O.Option<string> =>
  pipe(
    connection,
    O.map((connection) => connection.description)
  );

export const getModelIdFromAssistant = (
  assistant: O.Option<Connection>
): string =>
  pipe(
    assistant,
    O.map((assistant) => assistant.modelId),
    O.getOrElse(() => "gpt-4")
  );

export const getSystemDescription = (
  assistantDescription: O.Option<string>,
  userDescription: O.Option<string>
): string => {
  const assistant = pipe(
    assistantDescription,
    O.getOrElse(
      () => "You are a friendly assistant. Keep your responses short."
    )
  );

  const user = pipe(
    userDescription,
    O.getOrElse(() => "I'm a user. I'm here to talk to you.")
  );

  return `${assistant} ${user}`;
};
