import { UUID } from "crypto";

export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface Tool {
  id: string;
  type: string;
  function: FunctionCall;
}

export interface Message {
  role: string;
  content: string;
  name: string;
  tool_call_id?: string;
  tool_calls?: Tool[];
}

export interface Generation {
  id: UUID;
  conversationId: UUID;
  timestamp: string;
  message: Message;
}

export interface Connection {
  name: string;
  color: string;
  description: string;
  modelId: string;
}

export interface Context {
  id: UUID;
  generations: Generation[];
  connections: Connection[];
}

export interface Property {
  type: string;
  description?: string;
  items?: {
    type: string;
  };
}

export interface Properties {
  [key: string]: Property;
}

export interface Descriptions {
  name: string;
  description?: string;
  parameters?: Properties;
  returns?: Properties;
}
