import { loadCatalog, loadTransport, loadCityTours } from '../../catalog/catalog.js';
import { matchProducts, matchCityTours, matchTransport } from '../../catalog/match.js';
import type { CatalogProduct, CatalogTransport, CatalogCityTour } from '../../catalog/types';
import type { ParsedIntent } from './parse';

/**
 * Step 2 — grounding. Deterministic, no LLM.
 *
 * Each item the parser extracted is looked up in the local catalog via
 * `src/catalog/match.ts`, which is tolerant of client phrasing ("Desert Safari with
 * BBQ dinner" still reaches the "Desert Safari" row) while refusing to pass off a
 * generic word match as a confident hit. The confidence that comes back is a real
 * 0..1 number, so the citation badges and the "needs review" warnings mean something.
 */

export interface GroundedAlternative {
  readonly id: string;
  readonly name: string;
  readonly costAed: number;
  readonly score: number;
}

interface GroundedBase {
  readonly intentItem: string;
  readonly matchScore: number;
  readonly matchSource: string;
  readonly alternatives: readonly GroundedAlternative[];
  readonly unmatched: boolean;
}

export interface GroundedActivity extends GroundedBase {
  readonly kind: 'activity';
  readonly dayNumber?: number;
  readonly notes?: string;
  readonly product?: CatalogProduct;
  readonly cityTour?: CatalogCityTour;
}

export interface GroundedTransfer extends GroundedBase {
  readonly kind: 'transfer';
  readonly transferType: 'airport' | 'intercity' | 'sightseeing';
  readonly product?: CatalogTransport;
}

export interface GroundedHotel extends GroundedBase {
  readonly kind: 'hotel';
  readonly roomType?: string;
  readonly nights?: number;
}

export type GroundedItem = GroundedActivity | GroundedTransfer | GroundedHotel;

export async function groundIntent(intent: ParsedIntent): Promise<GroundedItem[]> {
  const [catalog, transports, cityTours] = await Promise.all([
    loadCatalog(),
    loadTransport(),
    loadCityTours(),
  ]);

  const items: GroundedItem[] = [];
  const preferLocation = locationFor(intent.destination);
  const pax = Math.max(1, (intent.adults || 0) + (intent.children || 0));

  for (const act of intent.activities) {
    items.push(groundActivity(act, catalog, cityTours, preferLocation));
  }

  for (const tr of intent.transfers) {
    const query = tr.route || `${tr.type} transfer`;
    const r = matchTransport(transports, query, {
      transferType: tr.type,
      pax,
    });
    items.push({
      kind: 'transfer',
      intentItem: query,
      transferType: tr.type,
      ...(r.best ? { product: r.best.item } : {}),
      matchScore: r.best?.score ?? 0,
      matchSource: r.best ? 'App Sheet: TRANSPORT' : 'Manual',
      alternatives: r.alternatives.map((a) => ({
        id: a.item.id,
        name: `${a.item.route} — ${a.item.vehicleSize}`,
        costAed: a.item.rateAed,
        score: a.score,
      })),
      unmatched: !r.best,
    });
  }

  for (const h of intent.hotels) {
    items.push({
      kind: 'hotel',
      intentItem: h.name,
      ...(h.roomType ? { roomType: h.roomType } : {}),
      ...(h.nights !== undefined ? { nights: h.nights } : {}),
      matchScore: 0,
      matchSource: 'Manual (no hotel catalog)',
      alternatives: [],
      unmatched: true,
    });
  }

  return items;
}

function groundActivity(
  act: { name: string; dayNumber?: number; notes?: string },
  catalog: readonly CatalogProduct[],
  cityTours: readonly CatalogCityTour[],
  preferLocation: string | undefined,
): GroundedActivity {
  const prod = matchProducts(catalog, act.name, {
    ...(preferLocation ? { preferLocation } : {}),
  });
  const tour = matchCityTours(cityTours, act.name);

  const alternatives: GroundedAlternative[] = [
    ...prod.alternatives.map((a) => ({
      id: a.item.id,
      name: a.item.product,
      costAed: a.item.costAed,
      score: a.score,
    })),
    ...tour.alternatives.map((a) => ({
      id: a.item.id,
      name: a.item.name,
      costAed: a.item.rateAed,
      score: a.score,
    })),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const base = {
    kind: 'activity' as const,
    intentItem: act.name,
    ...(act.dayNumber !== undefined ? { dayNumber: act.dayNumber } : {}),
    ...(act.notes ? { notes: act.notes } : {}),
    alternatives,
  };

  const prodScore = prod.best?.score ?? 0;
  const tourScore = tour.best?.score ?? 0;

  /**
   * Arbitrate between the product catalog and the (much smaller) city-tour catalog.
   *
   * "tour" is a stopword for matching — it is filler in most attraction names — which
   * means "Dubai City Tour" reduces to "dubai city" and scores a perfect 1.0 against
   * both the real AED 45 city tour and an unrelated "EXPO CITY" pavilion. The phrase
   * in the client's own words is the tie-breaker the scorer threw away, so check it
   * here: when they asked for a tour, a tour that matches at all wins the tie.
   */
  const asksForTour = /\btour\b/i.test(act.name);
  const tourWins = tour.best && (asksForTour ? tourScore >= prodScore : tourScore > prodScore + 0.1);

  if (tour.best && tourWins) {
    return {
      ...base,
      cityTour: tour.best.item,
      matchScore: tourScore,
      matchSource: 'App Sheet: CITY TOURS',
      unmatched: false,
    };
  }

  if (prod.best) {
    return {
      ...base,
      product: prod.best.item,
      matchScore: prodScore,
      matchSource: prod.best.item.sourceSheet || 'Package Calculator: Cost sheet',
      unmatched: false,
    };
  }

  return { ...base, matchScore: 0, matchSource: '', unmatched: true };
}

/** Map a free-text destination onto a catalog location, when it maps cleanly. */
function locationFor(destination: string): string | undefined {
  const d = (destination || '').toLowerCase();
  if (d.includes('abu dhabi')) return 'Abu Dhabi';
  if (d.includes('dubai')) return 'Dubai';
  return undefined;
}
