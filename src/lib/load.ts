import { jsonRepo } from '../data/repo.js';
import { toEngineInput } from '../data/schema.js';
import type { StoredQuotation } from '../data/schema.js';
import { priceQuotation } from '../pricing/engine.js';
import type { QuoteResult } from '../pricing/types.js';

export interface LoadedQuotation {
  readonly q: StoredQuotation;
  readonly result: QuoteResult;
}

/** Loads a quotation by share token and prices it. Returns null when not found. */
export async function loadByToken(token: string | undefined): Promise<LoadedQuotation | null> {
  if (!token) return null;
  const q = await jsonRepo.getByToken(token);
  if (!q) return null;
  return { q, result: priceQuotation(toEngineInput(q)) };
}

/** Loads a quotation by id and prices it. */
export async function loadById(id: string | undefined): Promise<LoadedQuotation | null> {
  if (!id) return null;
  const q = await jsonRepo.get(id);
  if (!q) return null;
  return { q, result: priceQuotation(toEngineInput(q)) };
}
