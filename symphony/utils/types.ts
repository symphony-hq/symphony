import { UUID } from "crypto";

export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface Message {
  role: string;
  content: string;
  name?: string;
  function_call?: FunctionCall;
  timestamp?: string;
}

export interface Generation {
  id: UUID;
  conversationId: UUID;
  timestamp: string;
  message: Message;
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
