import type { CatalogProduct, CatalogTransport, CatalogCityTour } from './types.js';

/**
 * Catalog matching for the AI pipeline.
 *
 * `searchCatalog` in catalog.ts is deliberately strict: every query term must appear
 * somewhere in the record. That is correct for the interactive picker, where the agent
 * types a couple of words and wants precision. It is wrong for AI grounding, where the
 * query is whatever phrasing the client used — "Desert Safari with BBQ dinner" has no
 * catalog row containing "bbq", so a conjunctive match returns nothing at all.
 *
 * This module adds a tolerant, ranked matcher on top of the same data:
 *   1. drop filler words ("with", "tickets", "tour", "the"…) that carry no signal
 *   2. score each candidate on how many *significant* terms it covers
 *   3. accept the best candidate when coverage clears a threshold
 *   4. collapse near-duplicates (the catalog stores one row per transfer option, so
 *      "IMG Entry tickets" appears three times) so alternatives are genuinely different
 *
 * Scores are real 0..1 confidences, so the citation badges mean something.
 */

/** Words that appear in client phrasing but carry no matching signal. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'without',
  'from', 'by', 'into', 'per', 'plus',
  // travel-domain filler
  'ticket', 'tickets', 'tour', 'tours', 'trip', 'visit', 'visiting', 'entry', 'entrance',
  'pass', 'experience', 'package', 'combo', 'deal', 'day', 'half', 'full', 'full-day',
  'adult', 'adults', 'child', 'children', 'pax', 'person', 'people',
  'go', 'going', 'see', 'seeing', 'do', 'doing', 'some', 'any',
]);

/**
 * Markers that identify a row as a transfer/transport product rather than an
 * attraction. Multi-word entries are matched as phrases, single words as whole tokens.
 *
 * The spaced spellings matter: the Cost sheet writes "Airport Pick up -Dubai Airport
 * to Zone 1 (… Sheikh Zayed road / Downtown …)". Those long route descriptions mention
 * half of Dubai, so without the penalty they out-score real attractions for any query
 * that happens to name a road or district — "Sheikh Zayed Grand Mosque" lands on an
 * airport pickup.
 */
const TRANSFER_MARKERS = [
  'transfer',
  'transfers',
  'pickup',
  'drop',
  'pick up',
  'drop off',
  'dropoff',
  'one way',
  '1 way',
];

/* ------------------------------------------------------------------ *
 * IDF weighting
 * ------------------------------------------------------------------ *
 * Without this, matching "Ain Dubai" against a Dubai-only catalog scores every row
 * that contains "dubai" — which is most of them. Inverse document frequency gives a
 * term weight inversely proportional to how many products contain it, so "dubai"
 * contributes almost nothing while "khalifa" or "aquaventure" dominate. This is what
 * turns coverage scoring from "shares a word" into "shares the distinguishing word".
 *
 * The map is derived once per catalog array and cached by reference — catalog.ts keeps
 * one frozen array per process, so this computes a single time.
 */

const idfCache = new WeakMap<object, Map<string, number>>();

function idfFor(all: readonly CatalogProduct[]): Map<string, number> {
  const cached = idfCache.get(all as unknown as object);
  if (cached) return cached;

  const df = new Map<string, number>();
  for (const p of all) {
    const seen = new Set(tokenize(`${p.product} ${p.tour} ${p.category}`));
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }

  const n = Math.max(1, all.length);
  const idf = new Map<string, number>();
  for (const [term, freq] of df) {
    // Normalised so a term in ~1 product ≈ 1.0 and a term in >40% of products ≈ 0.
    const raw = Math.log(n / (freq + 1)) / Math.log(n);
    idf.set(term, Math.max(0, Math.min(1, raw)));
  }
  idfCache.set(all as unknown as object, idf);
  return idf;
}

/**
 * Weight for a query term.
 *
 * A term the catalog has never heard of ("bbq", "sheikh") is client phrasing, not a
 * discriminator — treating it as maximally rare would drag every real match's score
 * down ("Desert Safari with BBQ dinner" scoring 0.45 against an exact "Desert Safari"
 * row). It still costs something, though, or a query made entirely of unknown words
 * would match whatever single common term it happens to share with a row.
 */
const UNKNOWN_TERM_WEIGHT = 0.35;

function termWeight(idf: Map<string, number>, term: string): number {
  const w = idf.get(term);
  if (w === undefined) return UNKNOWN_TERM_WEIGHT;
  // Floor at a small value so a common-but-present term still nudges ranking.
  return Math.max(0.05, w);
}

/**
 * How well a query term is present in a tokenised field, 0..1.
 *
 * Token-aware on purpose. A naive `includes` scores "Ain Dubai" against
 * "Safari Park ... Tr(ain)" — the substring is there but the word is not. We accept:
 *   exact token          "safari" in {safari, park}        -> 1.0
 *   token prefix/suffix  "aquavent" ~ "aquaventure"        -> 0.85 (needs 4+ chars)
 *   inside a longer token "skydive" contains "dive"        -> 0.6  (needs 4+ chars)
 * Short terms (<4 chars) must match a whole token, which is what kills the
 * "ain" / "train" false positive.
 */
function termPresence(term: string, tokens: ReadonlySet<string>, joined: string): number {
  if (tokens.has(term)) return 1;
  if (term.length < 4) return 0; // short terms require a whole-token hit
  for (const tok of tokens) {
    if (tok.length >= 4 && (tok.startsWith(term) || term.startsWith(tok))) return 0.85;
  }
  // Last resort: the term lives inside a compound token ("skydive" -> "dive").
  return joined.includes(term) ? 0.6 : 0;
}

export interface MatchCandidate<T> {
  readonly item: T;
  /** 0..1 — fraction of significant query terms covered, weighted by field importance. */
  readonly score: number;
  /** Human-readable reason, used in warnings and the sources panel. */
  readonly matchedOn: string;
}

export interface MatchResult<T> {
  readonly best?: MatchCandidate<T>;
  readonly alternatives: readonly MatchCandidate<T>[];
}

/**
 * Minimum score to accept a product match.
 *
 * Tuned against the real catalog: legitimate loose matches land at 0.60 and above
 * ("Desert Safari with BBQ dinner" -> "Desert Safari" scores 0.60; "IMG World of
 * Adventures" -> "IMG Entry tickets" scores 0.79), while coincidental ones sit below
 * 0.45 ("Sheikh Zayed Grand Mosque" -> "Grand Helicopter tour" scores 0.39).
 *
 * Erring high is deliberate. A rejected match becomes an explicit "add this manually"
 * warning; an accepted wrong one becomes a real price on a real line, which an agent
 * skimming the draft can send to a client without noticing.
 */
export const PRODUCT_MATCH_THRESHOLD = 0.45;

export interface ProductMatchOptions {
  /** Prefer rows from this location (e.g. "Dubai") without excluding others. */
  readonly preferLocation?: string;
  /** Minimum score to accept a match. Defaults to PRODUCT_MATCH_THRESHOLD. */
  readonly threshold?: number;
  /** Penalise transfer-style rows. Default true when matching an activity. */
  readonly penaliseTransfers?: boolean;
  readonly limit?: number;
}

/* ------------------------------------------------------------------ *
 * Tokenisation
 * ------------------------------------------------------------------ */

export function tokenize(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);
}

/** Query terms worth matching on. Falls back to all terms if everything was filler. */
export function significantTerms(query: string): string[] {
  const all = tokenize(query);
  const kept = all.filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return kept.length > 0 ? kept : all;
}

/* ------------------------------------------------------------------ *
 * Products
 * ------------------------------------------------------------------ */

export function matchProducts(
  all: readonly CatalogProduct[],
  query: string,
  opts: ProductMatchOptions = {},
): MatchResult<CatalogProduct> {
  const {
    preferLocation,
    threshold = PRODUCT_MATCH_THRESHOLD,
    penaliseTransfers = true,
    limit = 4,
  } = opts;

  const terms = significantTerms(query);
  if (terms.length === 0) return { alternatives: [] };

  const idf = idfFor(all);
  // Total distinguishing signal available in this query. Scores are a fraction of
  // this, so covering "dubai" alone can never look like a confident match.
  const totalWeight = terms.reduce((sum, t) => sum + termWeight(idf, t), 0);
  if (totalWeight <= 0) return { alternatives: [] };

  // "sky dive" should still reach "Skydive at the Desert dropzone", and "waterpark"
  // should reach "Water Park". Test the glued form as an extra signal.
  const glued = terms.length > 1 ? terms.join('') : '';
  const phrase = terms.join(' ');

  /**
   * When most of the query is vocabulary the catalog has never seen, the client is
   * naming something we don't stock. "Sheikh Zayed Grand Mosque" shares only the
   * generic "grand" with the catalog and would otherwise land on "Grand Helicopter
   * tour". Discounting by the unknown share turns that into an honest miss, which the
   * pipeline reports as a warning instead of a wrong price.
   */
  const unknownShare = terms.filter((t) => !idf.has(t)).length / terms.length;
  const vocabularyPenalty = unknownShare > 0.5 ? 1 - unknownShare : 1;

  /**
   * How distinctive the query is *as a phrase*. A phrase-level hit on "skydive" (one
   * product) deserves near-full confidence; one on "dubai" (half the catalog) does
   * not. Measured on the glued form too, so "sky dive" inherits "skydive"'s rarity.
   */
  const phraseSpecificity = Math.min(
    1,
    0.45 + Math.max(termWeight(idf, phrase), glued ? termWeight(idf, glued) : 0),
  );

  const scored: MatchCandidate<CatalogProduct>[] = [];

  for (const p of all) {
    const name = p.product.toLowerCase();
    const nameTokens = new Set(tokenize(p.product));
    const tourTokens = new Set(tokenize(p.tour));
    const catTokens = new Set(tokenize(p.category));
    const nameGlued = name.replace(/[^a-z0-9]/g, '');
    const tourGlued = p.tour.toLowerCase().replace(/[^a-z0-9]/g, '');
    const catGlued = p.category.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Weighted coverage: each term earns its IDF weight scaled by how cleanly it is
    // present, and by which field it landed in.
    let earned = 0;
    let nameHits = 0;
    let bestMatchedIdf = 0;
    for (const t of terms) {
      const w = termWeight(idf, t);
      const inName = termPresence(t, nameTokens, nameGlued);
      if (inName > 0) {
        earned += w * inName;
        nameHits++;
        bestMatchedIdf = Math.max(bestMatchedIdf, w);
        continue;
      }
      const inTour = termPresence(t, tourTokens, tourGlued);
      if (inTour > 0) {
        earned += w * inTour * 0.7;
        bestMatchedIdf = Math.max(bestMatchedIdf, w * 0.7);
        continue;
      }
      const inCat = termPresence(t, catTokens, catGlued);
      if (inCat > 0) {
        earned += w * inCat * 0.35;
        bestMatchedIdf = Math.max(bestMatchedIdf, w * 0.35);
      }
    }

    // Coverage alone is a ratio, so IDF cancels out for a single-term query and
    // "Dubai" would score a confident 1.00 against any Dubai row. Temper coverage by
    // how distinctive the strongest matched term actually is.
    const specificity = Math.min(1, 0.45 + bestMatchedIdf);
    let score = (earned / totalWeight) * specificity;

    // Whole-phrase hits are far stronger evidence than the sum of their parts — but
    // only when the phrase itself is distinctive. "skydive" naming one product earns
    // the boost; "dubai" appearing in half the catalog must not.
    if (name === phrase) {
      score = Math.max(score, phraseSpecificity);
    } else if (glued.length >= 5 && nameGlued.includes(glued)) {
      score = Math.max(score, 0.9 * phraseSpecificity);
    } else if (phrase.length >= 5 && name.includes(phrase)) {
      score = Math.max(score, 0.85 * phraseSpecificity);
    }

    if (score <= 0) continue;

    // Require at least one term to land in the product name itself. Matching only via
    // tour/category means we found a neighbour, not the thing that was asked for.
    if (nameHits === 0) score *= 0.4;

    if (penaliseTransfers && isTransferRow(nameTokens, name) && !queryWantsTransfer(terms)) {
      score *= 0.45;
    }

    if (preferLocation && p.location.toLowerCase() === preferLocation.toLowerCase()) {
      score = Math.min(1, score + 0.05);
    }

    score *= vocabularyPenalty;

    scored.push({
      item: p,
      score,
      matchedOn: describeMatch(terms, nameTokens, tourTokens, catTokens, nameGlued),
    });
  }

  // Ties are common: the catalog carries several variants of the same attraction
  // ("BURJ KHALIFA 124 FLOOR" vs "BURJ KHALIFA - THE LOUNGE") that score identically
  // against a bare "Burj Khalifa". Break towards the cheaper row — it is the standard
  // product in practice, and it is the safe direction to be wrong in when the agent
  // may not check. Pricier variants stay one click away in `alternatives`.
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.item.costAed - b.item.costAed ||
      a.item.product.localeCompare(b.item.product),
  );

  // Collapse rows that are the same product under a different transfer option so the
  // alternatives list offers real choices rather than three copies of one row.
  const deduped = dedupeBy(scored, (c) => c.item.product.toLowerCase().trim());

  const top = deduped[0];
  const best = top && top.score >= threshold ? top : undefined;
  return {
    best,
    alternatives: deduped.slice(best ? 1 : 0, limit),
  };
}

/**
 * Token-aware so "Skydive at the Desert dropzone" is not read as a transfer just
 * because "dropzone" contains "drop".
 */
function isTransferRow(nameTokens: ReadonlySet<string>, nameLower: string): boolean {
  for (const m of TRANSFER_MARKERS) {
    if (m.includes(' ')) {
      if (nameLower.includes(m)) return true;
    } else if (nameTokens.has(m)) {
      return true;
    }
  }
  return false;
}

function queryWantsTransfer(terms: readonly string[]): boolean {
  return terms.some((t) => t === 'transfer' || t === 'transfers' || t === 'pickup' || t === 'drop');
}

function describeMatch(
  terms: readonly string[],
  nameTokens: ReadonlySet<string>,
  tourTokens: ReadonlySet<string>,
  catTokens: ReadonlySet<string>,
  nameGlued: string,
): string {
  const where: string[] = [];
  if (terms.some((t) => termPresence(t, nameTokens, nameGlued) > 0)) where.push('product');
  if (terms.some((t) => termPresence(t, tourTokens, '') > 0)) where.push('tour');
  if (terms.some((t) => termPresence(t, catTokens, '') > 0)) where.push('category');
  return where.length ? where.join('+') : 'none';
}

function dedupeBy<T>(items: readonly T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * City tours
 * ------------------------------------------------------------------ */

export function matchCityTours(
  all: readonly CatalogCityTour[],
  query: string,
  opts: { threshold?: number; limit?: number } = {},
): MatchResult<CatalogCityTour> {
  const { threshold = PRODUCT_MATCH_THRESHOLD, limit = 3 } = opts;
  const terms = significantTerms(query);
  if (terms.length === 0) return { alternatives: [] };

  const scored: MatchCandidate<CatalogCityTour>[] = [];
  for (const c of all) {
    const name = c.name.toLowerCase();
    let earned = 0;
    let hits = 0;
    for (const t of terms) {
      if (name.includes(t)) {
        earned += 1;
        hits++;
      } else if (c.type.includes(t)) {
        earned += 0.4;
        hits++;
      }
    }
    if (hits === 0) continue;
    let score = earned / terms.length;
    const q = terms.join(' ');
    if (name === q) score = 1;
    else if (name.includes(q)) score = Math.min(1, score + 0.15);
    scored.push({ item: c, score, matchedOn: 'cityTour' });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  const best = top && top.score >= threshold ? top : undefined;
  return { best, alternatives: scored.slice(best ? 1 : 0, limit) };
}

/* ------------------------------------------------------------------ *
 * Transport
 * ------------------------------------------------------------------ */

export interface TransportMatchOptions {
  /** e.g. "airport" | "intercity" | "sightseeing" — steers route preference. */
  readonly transferType?: string;
  /** Total travellers, used to pick a vehicle that actually fits. */
  readonly pax?: number;
  readonly threshold?: number;
  readonly limit?: number;
}

/** Seat capacity parsed out of labels like "15 Seater", "Standard Sedan", "Minivan". */
function capacityOf(vehicleSize: string): number {
  const v = vehicleSize.toLowerCase();
  const n = /(\d+)\s*seat/.exec(v)?.[1];
  if (n) return Number(n);
  if (v.includes('sedan') || v.includes('car')) return 3;
  if (v.includes('minivan') || v.includes('van')) return 6;
  if (v.includes('bus') || v.includes('coach')) return 40;
  return 4;
}

export function matchTransport(
  all: readonly CatalogTransport[],
  query: string,
  opts: TransportMatchOptions = {},
): MatchResult<CatalogTransport> {
  const { transferType, pax, threshold = 0.25, limit = 3 } = opts;
  if (all.length === 0) return { alternatives: [] };

  const terms = significantTerms(query);
  const airportish = ['airport', 'dxb', 'auh', 'shj', 'terminal', 'arrival', 'departure'];

  const scored: MatchCandidate<CatalogTransport>[] = [];
  for (const t of all) {
    const route = t.route.toLowerCase();
    const vehicle = t.vehicleSize.toLowerCase();

    let earned = 0;
    let hits = 0;
    for (const term of terms) {
      if (route.includes(term)) {
        earned += 1;
        hits++;
      } else if (vehicle.includes(term)) {
        earned += 0.5;
        hits++;
      }
    }

    // Even with no literal term overlap an airport route is a reasonable default for
    // an airport transfer, so give type-based credit.
    let score = terms.length > 0 ? earned / terms.length : 0;
    if (transferType === 'airport' && airportish.some((a) => route.includes(a))) {
      score = Math.max(score, 0.55);
      hits++;
    }
    if (hits === 0) continue;

    // Prefer the smallest vehicle that still seats the party.
    if (pax && pax > 0) {
      const cap = capacityOf(t.vehicleSize);
      if (cap >= pax) {
        const slack = cap - pax;
        score += slack <= 2 ? 0.12 : slack <= 6 ? 0.05 : 0;
      } else {
        score *= 0.5; // too small — keep as a fallback but demote
      }
    }

    scored.push({ item: t, score: Math.min(1, score), matchedOn: 'route' });
  }

  scored.sort((a, b) => b.score - a.score || a.item.rateAed - b.item.rateAed);
  const top = scored[0];
  const best = top && top.score >= threshold ? top : undefined;
  return { best, alternatives: scored.slice(best ? 1 : 0, limit) };
}
