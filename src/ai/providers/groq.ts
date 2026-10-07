import Groq from 'groq-sdk';
import type { LlmProvider, ChatMessage, LlmOptions, LlmResponse } from '../provider';

export class GroqProvider implements LlmProvider {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey, dangerouslyAllowBrowser: true });
  }

  async chat(messages: ChatMessage[], opts: LlmOptions): Promise<LlmResponse> {
    // Groq's json_object mode errors unless the word "JSON" appears somewhere in the
    // prompt. If the caller asked for a JSON schema but didn't mention JSON themselves,
    // we patch the system message so the request doesn't 400 at the API.
    const needsJsonHint =
      !!opts.jsonSchema &&
      !messages.some((m) => /json/i.test(m.content));
    const prepped = needsJsonHint
      ? messages.map((m, i) =>
          i === 0 && m.role === 'system'
            ? { ...m, content: `${m.content}\n\nRespond with valid JSON only.` }
            : m,
        )
      : messages;

    const formattedMessages = prepped.map(m => {
      const base: any = { role: m.role, content: m.content };
      if (m.name) base.name = m.name;
      if (m.tool_call_id) base.tool_call_id = m.tool_call_id;
      if (m.tool_calls) {
        base.tool_calls = m.tool_calls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.input) }
        }));
      }
      return base;
    });

    // Convert tools if provided
    let tools = undefined;
    if (opts.tools && opts.tools.length > 0) {
      tools = opts.tools.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema as any,
        }
      }));
    }

    // json_object + tools is not a supported combination — tools take precedence.
    const useJsonMode = !!opts.jsonSchema && !tools;
    const response = await this.client.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: formattedMessages,
      max_completion_tokens: opts.maxTokens || 4096,
      temperature: opts.temperature ?? 0,
      response_format: useJsonMode ? { type: 'json_object' } : undefined,
      tools: tools,
    });

    const choice = response.choices[0];
    const message = choice?.message;
    
    let toolCalls: any[] = [];
    if (message?.tool_calls) {
      toolCalls = message.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments),
      }));
    }

    return {
      content: message?.content || '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      },
      provider: 'groq',
      model: response.model,
    };
  }

  async *chatStream(messages: ChatMessage[], opts: LlmOptions): AsyncIterable<string> {
    const formattedMessages = messages.map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

    const stream = await this.client.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: formattedMessages,
      max_completion_tokens: opts.maxTokens || 4096,
      temperature: opts.temperature ?? 0,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  }
}
