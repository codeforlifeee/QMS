import type { LlmProvider } from '../provider';
import type { StoredQuotation, StoredDay } from '../../data/schema';
import { extractJson } from '../json.js';
import { withRetry } from '../retry.js';

/**
 * Step 4 — narration. One LLM call produces both the day title and the day prose.
 *
 * These used to be two separate calls (one inside build, one in prose.ts), which
 * doubled the slowest part of generation for no benefit: the model needs exactly the
 * same context to write a title as to write the paragraph under it, and writing them
 * together keeps them consistent with each other.
 *
 * Non-fatal by design. A day whose narration is missing keeps its deterministic
 * "Day 3" title and empty prose — the agent can still send the quotation.
 */

export interface NarrationResult {
  readonly quotation: StoredQuotation;
  readonly usage: { inputTokens: number; outputTokens: number };
  readonly warnings: readonly string[];
}

interface DayNarration {
  readonly title?: string;
  readonly prose?: string;
}

const SYSTEM_PROMPT = `You write day-by-day copy for travel itineraries.

For each day you receive, return a title and a description:
- "title": 3-6 words, specific to that day's activities. Not "Day 3".
- "prose": 2-3 sentences, warm and concrete. Mention the actual activities listed.
  For a day with no activities, write about the destination at leisure.

Return ONLY a JSON object keyed by the exact day ids given:
{"<dayId>": {"title": "...", "prose": "..."}, ...}

No text outside the JSON, no code fences, no day ids that were not provided.`;

export async function narrateDays(
  quotation: StoredQuotation,
  provider: LlmProvider,
): Promise<NarrationResult> {
  const warnings: string[] = [];

  const context = {
    destination: quotation.destination,
    nights: quotation.days.length > 0 ? quotation.days.length - 1 : 0,
    pax: quotation.pax,
    days: quotation.days.map((d) => ({
      id: d.id,
      dayNumber: d.index,
      activities: quotation.lines
        .filter((l) => l.dayId === d.id)
        .map((l) => `${l.label} (${l.type.toLowerCase()})`),
    })),
  };

  let parsed: Record<string, DayNarration> | null = null;
  let usage = { inputTokens: 0, outputTokens: 0 };

  try {
    const response = await withRetry(
      () =>
        provider.chat(
          [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: JSON.stringify(context) },
          ],
          {
            temperature: 0.7,
            maxTokens: 4096,
            jsonSchema: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: { title: { type: 'string' }, prose: { type: 'string' } },
              },
            },
          },
        ),
      { onRetry: (n) => warnings.push(`Narration retry ${n} after a transient provider error`) },
    );
    usage = response.usage;
    parsed = extractJson<Record<string, DayNarration>>(response.content);
    if (!parsed) warnings.push('Narration returned unparseable output — day copy left blank');
  } catch (err: any) {
    warnings.push(`Narration failed (${err?.message || err}) — day copy left blank`);
  }

  const days: StoredDay[] = quotation.days.map((d) => {
    const n = parsed?.[d.id];
    const title = typeof n?.title === 'string' && n.title.trim() ? n.title.trim() : d.title;
    const prose = typeof n?.prose === 'string' && n.prose.trim() ? n.prose.trim() : d.prose;
    return { ...d, title, prose };
  });

  return { quotation: { ...quotation, days }, usage, warnings };
}
