import Anthropic from '@anthropic-ai/sdk';
import type { LlmProvider, ChatMessage, LlmOptions, LlmResponse } from '../provider';

export class ClaudeProvider implements LlmProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages: ChatMessage[], opts: LlmOptions): Promise<LlmResponse> {
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const tools = opts.tools?.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Tool.InputSchema,
    }));

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      system: systemMessage,
      messages: userMessages,
      max_tokens: opts.maxTokens || 4096,
      temperature: opts.temperature ?? 0,
      tools,
    });

    let content = '';
    const toolCalls = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input,
        });
      }
    }

    return {
      content,
      toolCalls,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      provider: 'claude',
      model: response.model,
    };
  }

  async *chatStream(messages: ChatMessage[], opts: LlmOptions): AsyncIterable<string> {
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const stream = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      system: systemMessage,
      messages: userMessages,
      max_tokens: opts.maxTokens || 4096,
      temperature: opts.temperature ?? 0,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}
