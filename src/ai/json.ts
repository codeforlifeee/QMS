/**
 * Tolerant JSON extraction from model output.
 *
 * Even in JSON mode, models wrap output in ``` fences or prepend a sentence often
 * enough that a bare `JSON.parse` loses whole generations. This recovers the common
 * cases rather than failing the pipeline over formatting.
 */
export function extractJson<T = unknown>(raw: string): T | null {
  const text = (raw ?? '').trim();
  if (!text) return null;

  const attempts = [
    text,
    // fenced block, with or without a language tag
    /```(?:json)?\s*([\s\S]*?)\s*```/.exec(text)?.[1],
    // first balanced-looking object or array in the string
    sliceBetween(text, '{', '}'),
    sliceBetween(text, '[', ']'),
  ];

  for (const candidate of attempts) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // try the next recovery strategy
    }
  }
  return null;
}

function sliceBetween(text: string, open: string, close: string): string | undefined {
  const start = text.indexOf(open);
  const end = text.lastIndexOf(close);
  if (start < 0 || end <= start) return undefined;
  return text.slice(start, end + 1);
}
