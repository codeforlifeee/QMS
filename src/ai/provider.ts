export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: object;
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface LlmOptions {
  temperature?: number;
  maxTokens?: number;
  jsonSchema?: object;
  tools?: ToolDefinition[];
}

export interface LlmResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: { inputTokens: number; outputTokens: number };
  provider: string;
  model: string;
}

export interface LlmProvider {
  chat(messages: ChatMessage[], opts: LlmOptions): Promise<LlmResponse>;
  chatStream(messages: ChatMessage[], opts: LlmOptions): AsyncIterable<string>;
}
