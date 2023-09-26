export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface Message {
  role: string;
  content: string;
  name?: string;
  function_call?: FunctionCall;
  timestamp?: number;
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
