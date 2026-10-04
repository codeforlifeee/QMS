import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { matchProducts, matchTransport, significantTerms, tokenize } from './match.js';
import type { CatalogProduct, CatalogTransport } from './types.js';

/**
 * These tests pin the behaviours that the naive conjunctive search got wrong, so a
 * future tweak to the scoring can't silently regress AI grounding quality.
 */

const products = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'data/catalog/products.json'), 'utf8'),
) as CatalogProduct[];

function bestFor(query: string): { name: string; score: number } | null {
  const r = matchProducts(products, query, { preferLocation: 'Dubai' });
  return r.best ? { name: r.best.item.product, score: r.best.score } : null;
}

describe('tokenize / significantTerms', () => {
  it('splits on punctuation and hyphens', () => {
    expect(tokenize('Burj Khalifa - At the Top (124th)')).toEqual([
      'burj', 'khalifa', 'at', 'the', 'top', '124th',
    ]);
  });

  it('drops filler words that carry no matching signal', () => {
    expect(significantTerms('visit the Burj Khalifa tickets')).toEqual(['burj', 'khalifa']);
  });

  it('keeps every term when the query is entirely filler', () => {
    expect(significantTerms('the tour')).toEqual(['the', 'tour']);
  });
});

describe('matchProducts', () => {
  it('matches an exact attraction name with full confidence', () => {
    const r = bestFor('Burj Khalifa');
    expect(r?.name.toLowerCase()).toContain('burj khalifa');
    expect(r!.score).toBeGreaterThan(0.9);
  });

  it('breaks a tie between variants towards the cheaper row', () => {
    // The catalog has several Burj Khalifa products that score identically against a
    // bare "Burj Khalifa"; the standard ticket must win over the premium lounge.
    const r = matchProducts(products, 'Burj Khalifa', { preferLocation: 'Dubai', limit: 4 });
    const alts = r.alternatives.filter((a) => a.score === r.best!.score);
    for (const a of alts) {
      expect(r.best!.item.costAed).toBeLessThanOrEqual(a.item.costAed);
    }
  });

  it('tolerates extra client phrasing the catalog never uses', () => {
    // "bbq" appears in no product; it must not sink the real Desert Safari row.
    const r = bestFor('Desert Safari with BBQ dinner');
    expect(r?.name).toContain('Desert Safari');
  });

  it('matches when the client name is longer than the catalog name', () => {
    // Catalog has "IMG Entry tickets" — the client says the full park name.
    const r = bestFor('IMG World of Adventures');
    expect(r?.name).toContain('IMG');
  });

  it('bridges spacing differences ("sky dive" -> "Skydive")', () => {
    // The catalog spells it both ways — "Skydive at the Desert dropzone" from the Cost
    // sheet and "... — Sky Dive" from ADVENTURES. Either is a correct resolution; what
    // matters is that the spacing difference does not cause a miss.
    const r = bestFor('sky dive');
    expect(r?.name.toLowerCase().replace(/\s/g, '')).toContain('skydive');
  });

  it('does not match a short term inside an unrelated longer word', () => {
    // "ain" must not match "Tr(ain)" — the old substring scorer picked a Safari Park
    // row for this query with full confidence.
    const r = matchProducts(products, 'Ain Dubai', { preferLocation: 'Dubai' });
    expect(r.best?.item.product.toLowerCase() ?? '').not.toContain('train');
  });

  it('discounts a city name that appears across most of the catalog', () => {
    // Matching only "dubai" in a Dubai-heavy catalog is weak evidence. It may still
    // return a row, but it must never present as a high-confidence match the way a
    // distinctive attraction name does — the citation badge colour depends on this.
    const generic = matchProducts(products, 'Dubai', { preferLocation: 'Dubai' });
    const specific = matchProducts(products, 'Burj Khalifa', { preferLocation: 'Dubai' });
    expect(generic.best?.score ?? 0).toBeLessThan(0.75);
    expect(generic.best!.score).toBeLessThan(specific.best!.score);
  });

  it('reports a miss when the attraction is genuinely not stocked', () => {
    const r = matchProducts(products, 'Sheikh Zayed Grand Mosque', { preferLocation: 'Dubai' });
    expect(r.best).toBeUndefined();
  });

  it('collapses rows that differ only by transfer option', () => {
    const r = matchProducts(products, 'IMG', { preferLocation: 'Dubai', limit: 4 });
    const names = [r.best, ...r.alternatives].filter(Boolean).map((c) => c!.item.product);
    expect(new Set(names).size).toBe(names.length);
  });

  it('does not treat "dropzone" as a transfer row', () => {
    const r = bestFor('skydive');
    // Would score 0.45x lower if the transfer penalty false-fired on "drop".
    expect(r!.score).toBeGreaterThan(0.8);
  });
});

describe('matchTransport', () => {
  const fleet: CatalogTransport[] = [
    { id: 't1', supplier: 'Parmar', route: 'DXB Airport to Dubai Hotel', vehicleSize: 'Standard Sedan', rateAed: 15000 },
    { id: 't2', supplier: 'Parmar', route: 'DXB Airport to Dubai Hotel', vehicleSize: '15 Seater', rateAed: 40000 },
    { id: 't3', supplier: 'Parmar', route: 'Dubai to Abu Dhabi', vehicleSize: 'Standard Sedan', rateAed: 60000 },
  ];

  it('picks the smallest vehicle that seats the party', () => {
    const r = matchTransport(fleet, 'Airport to Hotel', { transferType: 'airport', pax: 3 });
    expect(r.best?.item.vehicleSize).toBe('Standard Sedan');
  });

  it('upgrades the vehicle when the party does not fit', () => {
    const r = matchTransport(fleet, 'Airport to Hotel', { transferType: 'airport', pax: 12 });
    expect(r.best?.item.vehicleSize).toBe('15 Seater');
  });

  it('credits an airport route even with no literal term overlap', () => {
    const r = matchTransport(fleet, 'pickup on arrival', { transferType: 'airport', pax: 2 });
    expect(r.best?.item.route).toContain('Airport');
  });

  it('returns no match against an empty fleet', () => {
    expect(matchTransport([], 'Airport to Hotel', { transferType: 'airport' }).best).toBeUndefined();
  });
});
