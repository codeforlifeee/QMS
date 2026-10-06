import type { APIRoute } from 'astro';
import { getRepo } from '../../../data/repo.js';
import { toEngineInput } from '../../../data/schema.js';
import { priceQuotation } from '../../../pricing/engine.js';

export const prerender = false;

/**
 * GET /api/ai/quality-score?id=<quotation-id>
 *
 * Returns a 0-10 quality score with sub-scores and suggestions.
 * The heuristic runs locally; an LLM pass can later refine the
 * "suggestions" array without changing the response shape.
 */
export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'id is required' }, 400);

  const repo = await getRepo();
  const q = await repo.get(id);
  if (!q) return json({ error: 'Not found' }, 404);

  const breakdown = scoreQuotation(q);
  return json({ ok: true, score: breakdown.score, breakdown });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

interface Breakdown {
  score: number; // 0..10
  completeness: number;
  itinerary: number;
  pricing: number;
  commonItems: number;
  suggestions: string[];
}

function scoreQuotation(q: any): Breakdown {
  const suggestions: string[] = [];

  // Completeness
  const hasClient = !!(q.client?.name && q.client?.phone);
  const hasDates = !!(q.travelStart && q.travelEnd);
  const hasPax = !!(q.pax?.adults && q.pax.adults > 0);
  const hasDestination = !!q.destination;
  const hasInclusions = Array.isArray(q.inclusions) && q.inclusions.length > 0;
  const hasExclusions = Array.isArray(q.exclusions) && q.exclusions.length > 0;
  const hasTerms = Array.isArray(q.terms) && q.terms.length > 0;
  const hasPaymentPolicy = Array.isArray(q.paymentPolicy) && q.paymentPolicy.length > 0;
  const completenessChecks = [hasClient, hasDates, hasPax, hasDestination, hasInclusions, hasExclusions, hasTerms, hasPaymentPolicy];
  const completeness = Math.round((completenessChecks.filter(Boolean).length / completenessChecks.length) * 10);
  if (!hasClient) suggestions.push('Add client name and phone number.');
  if (!hasInclusions) suggestions.push('Add an Inclusions list — clients expect to see what\'s covered.');
  if (!hasExclusions) suggestions.push('Add an Exclusions list to avoid misunderstandings.');
  if (!hasPaymentPolicy) suggestions.push('Add a payment policy so booking terms are clear.');
  if (!hasTerms) suggestions.push('Add Terms & Conditions.');

  // Itinerary balance
  const days = Array.isArray(q.days) ? q.days.length : 0;
  const lines = Array.isArray(q.lines) ? q.lines : [];
  const linesPerDay = days > 0 ? lines.length / days : 0;
  let itinerary = 5;
  if (days >= 2) itinerary += 1;
  if (linesPerDay >= 2) itinerary += 2;
  if (linesPerDay >= 3) itinerary += 1;
  if (days < 2) suggestions.push('A quotation usually spans at least 2 days.');
  if (linesPerDay < 2 && days > 0) suggestions.push('Each day could use at least 2 activities or inclusions for a balanced itinerary.');
  itinerary = Math.min(10, itinerary);

  // Pricing / margin
  const flatMarkup = typeof q.flatMarkupPct === 'number' ? q.flatMarkupPct : null;
  let pricing = 5;
  if (flatMarkup !== null) {
    pricing += 2;
    if (flatMarkup < 5) suggestions.push('Markup under 5% is unusually thin — consider raising to protect margin.');
    if (flatMarkup > 30) suggestions.push('Markup above 30% may price out the lead — compare with similar quotes.');
    if (flatMarkup >= 10 && flatMarkup <= 25) pricing += 2;
  } else {
    suggestions.push('Set an explicit markup percentage.');
  }
  let grandTotal = 0;
  try { grandTotal = Number(priceQuotation(toEngineInput(q)).grandTotal.minor ?? 0); } catch { /* skip */ }
  if (grandTotal > 0) pricing += 1;
  else suggestions.push('Pricing engine could not compute a total — check line items.');
  pricing = Math.min(10, pricing);

  // Common commercial items
  const inclusionsText = (q.inclusions || []).join(' ').toLowerCase();
  const exclusionsText = (q.exclusions || []).join(' ').toLowerCase();
  const combined = `${inclusionsText} ${exclusionsText}`;
  let commonItems = 0;
  if (/visa/.test(combined)) commonItems += 2.5;
  else suggestions.push('Mention visa handling (included or excluded).');
  if (/transfer|airport/.test(combined)) commonItems += 2.5;
  else suggestions.push('Clarify airport transfers.');
  if (/hotel|accommodation/.test(combined)) commonItems += 2.5;
  else suggestions.push('Clarify hotel accommodation terms.');
  if (/meals?|breakfast/.test(combined)) commonItems += 2.5;
  else suggestions.push('Clarify meal plan (e.g. breakfast included).');
  commonItems = Math.min(10, Math.round(commonItems));

  const weighted = (completeness * 0.3) + (itinerary * 0.25) + (pricing * 0.25) + (commonItems * 0.2);
  const score = Math.max(0, Math.min(10, Math.round(weighted * 10) / 10));

  return { score, completeness, itinerary, pricing, commonItems, suggestions };
}
