import type { LlmProvider } from '../provider';
import type { StoredQuotation } from '../../data/schema';
import { parseIntent } from './parse.js';
import { groundIntent } from './ground.js';
import { buildQuotation } from './build.js';
import { narrateDays } from './narrate.js';
import type { CitationMap } from '../citations.js';
import type { ParsedIntent } from './parse';

export interface GenerationResult {
  readonly quotation: StoredQuotation;
  readonly citations: CitationMap;
  readonly warnings: readonly string[];
  readonly intent: ParsedIntent;
  readonly usage: {
    readonly parse: { inputTokens: number; outputTokens: number };
    readonly narrate: { inputTokens: number; outputTokens: number };
    readonly totalInputTokens: number;
    readonly totalOutputTokens: number;
    readonly llmCalls: number;
  };
}

/**
 * Four-step pipeline, two LLM calls.
 *
 *   1. parse    (LLM)  natural language -> ParsedIntent
 *   2. ground   (pure) each intent item -> catalog row + confidence
 *   3. build    (pure) grounded rows    -> StoredQuotation + CitationMap
 *   4. narrate  (LLM)  day titles and prose in a single pass
 *
 * Only the two ends touch a model. Everything that determines a *price* is
 * deterministic code reading the catalog, which is what makes the output trustworthy
 * and reproducible. Narration failures degrade to plain "Day 1" titles rather than
 * failing the generation, so a rate-limited provider still yields a usable draft.
 */
export async function generateQuotation(
  userPrompt: string,
  provider: LlmProvider,
): Promise<GenerationResult> {
  const parsed = await parseIntent(userPrompt, provider);
  const grounded = await groundIntent(parsed.intent);
  const built = await buildQuotation(parsed.intent, grounded);
  const narrated = await narrateDays(built.quotation, provider);

  const warnings = [...parsed.warnings, ...built.warnings, ...narrated.warnings];

  return {
    quotation: narrated.quotation,
    citations: built.citations,
    warnings,
    intent: parsed.intent,
    usage: {
      parse: parsed.usage,
      narrate: narrated.usage,
      totalInputTokens: parsed.usage.inputTokens + narrated.usage.inputTokens,
      totalOutputTokens: parsed.usage.outputTokens + narrated.usage.outputTokens,
      llmCalls: 2,
    },
  };
}
