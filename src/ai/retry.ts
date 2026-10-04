/**
 * Retry for LLM calls.
 *
 * Free-tier providers (Groq, Gemini) rate-limit aggressively and occasionally return a
 * 5xx mid-stream. A single generation makes two model calls, so without a retry the
 * whole quotation fails on a blip that would have succeeded a second later.
 *
 * Only transient faults are retried — a bad API key or a malformed request will fail
 * the same way every time, and retrying it just makes the user wait longer for the
 * same error.
 */

const TRANSIENT_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529]);

const TRANSIENT_PATTERNS = [
  /rate.?limit/i,
  /too many requests/i,
  /overloaded/i,
  /timeout|timed out/i,
  /temporarily unavailable/i,
  /service unavailable/i,
  /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up/i,
  /fetch failed/i,
];

export function isTransient(err: unknown): boolean {
  if (!err) return false;
  const e = err as { status?: number; statusCode?: number; code?: unknown; message?: unknown };
  const status = e.status ?? e.statusCode;
  if (typeof status === 'number' && TRANSIENT_STATUS.has(status)) return true;
  const text = `${typeof e.code === 'string' ? e.code : ''} ${String(e.message ?? err)}`;
  return TRANSIENT_PATTERNS.some((p) => p.test(text));
}

export interface RetryOptions {
  /** Total attempts, including the first. Default 3. */
  readonly attempts?: number;
  /** Base delay in ms; doubles each attempt. Default 500. */
  readonly baseDelayMs?: number;
  /** Called before each retry — useful for surfacing a warning to the caller. */
  readonly onRetry?: (attempt: number, err: unknown) => void;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { attempts = 3, baseDelayMs = 500, onRetry } = opts;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === attempts || !isTransient(err)) throw err;
      onRetry?.(attempt, err);
      // Exponential backoff with jitter so parallel callers don't sync up.
      const delay = baseDelayMs * 2 ** (attempt - 1);
      const jitter = Math.random() * baseDelayMs;
      await sleep(delay + jitter);
    }
  }
  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
