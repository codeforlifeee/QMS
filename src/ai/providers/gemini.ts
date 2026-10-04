import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LlmProvider, ChatMessage, LlmOptions, LlmResponse, ToolCall } from '../provider';

/**
 * The two UI-facing Gemini options this app exposes:
 *   - gemini-3.5-flash      — current Flash model
 *   - gemini-3.5-flash-lite — current Flash Lite model (the user-typed alias
 *                              "gemini-3.1-flash-lite" is normalized to this)
 *
 * The 2.5 generation was retired for new users (404 as of 2026-10), so we always
 * resolve to a 3.5 id.
 */
function resolveGeminiModel(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('lite')) return 'gemini-3.5-flash-lite';
  return 'gemini-3.5-flash';
}

export class GeminiProvider implements LlmProvider {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-3.5-flash') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = resolveGeminiModel(modelName);
  }

  async chat(messages: ChatMessage[], opts: LlmOptions): Promise<LlmResponse> {
    const model = this.client.getGenerativeModel({ model: this.modelName });

    const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    const lastMessage = history.length > 0 ? history.pop()?.parts?.[0]?.text || '' : '';

    const tools = opts.tools
      ? [
          {
            functionDeclarations: opts.tools.map((t) => ({
              name: t.name,
              description: t.description,
              parameters: t.input_schema as any,
            })),
          },
        ]
      : undefined;

    const chat = model.startChat({
      history,
      // The v1beta API expects a Content object; a bare string gets rejected with
      // "Invalid value at 'system_instruction'". Wrap it as a Content shape — the SDK's
      // TS types want a `role`, though the server ignores it on system_instruction.
      systemInstruction: systemMessage
        ? ({ role: 'user', parts: [{ text: systemMessage }] } as const)
        : undefined,
      generationConfig: {
        temperature: opts.temperature ?? 0,
        maxOutputTokens: opts.maxTokens || 4096,
        responseMimeType: opts.jsonSchema ? 'application/json' : 'text/plain',
      },
      tools: tools,
    });

    const result = await chat.sendMessage(lastMessage);
    const response = result.response;

    let toolCalls: ToolCall[] = [];
    const calls = response.functionCalls();
    if (calls) {
      toolCalls = calls.map((c) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: c.name,
        input: c.args,
      }));
    }

    return {
      content: response.text(),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
      provider: 'gemini',
      model: this.modelName,
    };
  }

  async *chatStream(messages: ChatMessage[], opts: LlmOptions): AsyncIterable<string> {
    const model = this.client.getGenerativeModel({ model: this.modelName });

    const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    const lastMessage = history.length > 0 ? history.pop()?.parts?.[0]?.text || '' : '';

    const chat = model.startChat({
      history,
      systemInstruction: systemMessage
        ? ({ role: 'user', parts: [{ text: systemMessage }] } as const)
        : undefined,
      generationConfig: {
        temperature: opts.temperature ?? 0,
        maxOutputTokens: opts.maxTokens || 4096,
      },
    });

    const result = await chat.sendMessageStream(lastMessage);

    for await (const chunk of result.stream) {
      yield chunk.text();
    }
  }
}
