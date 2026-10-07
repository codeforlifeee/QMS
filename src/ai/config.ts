import type { LlmProvider } from './provider';
import { ClaudeProvider } from './providers/claude';
import { GroqProvider } from './providers/groq';
import { GeminiProvider } from './providers/gemini';
import { OpenAIProvider } from './providers/openai';

/**
 * Resolve a provider by alias.
 *
 * Known aliases accepted from the UI dropdown:
 *   claude, groq, openai
 *   gemini, gemini-flash, gemini-flash-lite, gemini-2.5-flash, gemini-2.5-flash-lite,
 *     and the older gemini-3.5-flash / gemini-3.1-flash-lite names still used by stored chats
 */
export function getProvider(name?: string): LlmProvider {
  const providerName = (name || import.meta.env.AI_PROVIDER || 'groq').toLowerCase();

  if (providerName === 'claude') {
    const key = import.meta.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
    return new ClaudeProvider(key);
  }

  if (providerName === 'groq') {
    const key = import.meta.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY is not set');
    return new GroqProvider(key);
  }

  if (providerName.startsWith('openai')) {
    const key = import.meta.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set');
    const model = providerName.includes('mini') ? 'gpt-4o-mini' : 'gpt-4o';
    return new OpenAIProvider(key, model);
  }

  if (providerName.startsWith('gemini')) {
    const key = import.meta.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    // The GeminiProvider resolves aliases to real model ids internally.
    return new GeminiProvider(key, providerName);
  }

  throw new Error(`Unsupported AI provider: ${providerName}`);
}

export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  if (import.meta.env.ANTHROPIC_API_KEY) providers.push('claude');
  if (import.meta.env.GROQ_API_KEY) providers.push('groq');
  if (import.meta.env.GEMINI_API_KEY) providers.push('gemini');
  if (import.meta.env.OPENAI_API_KEY) providers.push('openai');
  return providers;
}
