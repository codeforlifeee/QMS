import { describe, it, expect, beforeAll } from 'vitest';
import { _resetCache, facets, loadCatalog, loadDefaults, searchCatalog } from './catalog.js';
import type { CatalogProduct } from './types.js';

/**
 * Tests the imported catalog + the search ranking.
 *
 * These run against the real `data/catalog/products.json` because the file is the
 * contract between the importer and the editor — the goal is to catch "the importer
 * broke" and "search no longer finds Burj Khalifa" in the same breath.
 */

describe('catalog data', () => {
  let catalog: readonly CatalogProduct[];
  beforeAll(async () => {
    _resetCache();
    catalog = await loadCatalog();
  });

  it('loaded a non-trivial number of products', () => {
    // We imported 417 from the current file; a sync may change this, but a sudden
    // drop would mean the importer broke.
    expect(catalog.length).toBeGreaterThan(300);
  });

  it('every row has the required fields', () => {
    for (const p of catalog) {
      expect(p.id).toMatch(/^p_[0-9a-f]{12}$/);
      expect(p.product).toBeTruthy();
      expect(p.costAed).toBeGreaterThan(0);
      expect(Number.isInteger(p.costAed)).toBe(true); // minor units — no floats
    }
  });

  it('exposes the house defaults the Calculator used', async () => {
    const d = await loadDefaults();
    expect(d).not.toBeNull();
    expect(d!.markupPct).toBeCloseTo(0.15, 2);
    expect(d!.fxAedPerUsd).toBeCloseTo(3.65, 2);
    expect(d!.fxInrPerUsd).toBeGreaterThan(80);
  });

  it('facets are derived from the data', () => {
    const f = facets(catalog);
    expect(f.locations).toContain('Dubai');
    expect(f.categories.length).toBeGreaterThan(5);
    expect(new Set(f.locations).size).toBe(f.locations.length); // deduped
  });
});

describe('search', () => {
  let catalog: readonly CatalogProduct[];
  beforeAll(async () => {
    catalog = await loadCatalog();
  });

  it('finds Burj Khalifa', () => {
    const hits = searchCatalog(catalog, 'burj khalifa');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.product.toLowerCase()).toContain('burj khalifa');
  });

  it('finds Palm Monorail by partial match', () => {
    const hits = searchCatalog(catalog, 'monorail');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => /monorail/i.test(h.product))).toBe(true);
  });

  it('finds Desert Safari', () => {
    const hits = searchCatalog(catalog, 'desert safari');
    expect(hits.length).toBeGreaterThan(0);
    // every hit should contain both terms somewhere
    for (const h of hits) {
      const combined = (h.product + ' ' + h.tour + ' ' + h.category).toLowerCase();
      expect(combined).toMatch(/desert/);
      expect(combined).toMatch(/safari/);
    }
  });

  it('ranks a direct product-name hit above a category-only hit', () => {
    const hits = searchCatalog(catalog, 'monorail');
    // The top row should have "monorail" in the product name, not just a category
    expect(hits[0]!.product.toLowerCase()).toContain('monorail');
  });

  it('location filter restricts results', () => {
    const abu = searchCatalog(catalog, '', { location: 'Abu Dhabi' }, 500);
    expect(abu.length).toBeGreaterThan(0);
    for (const h of abu) expect(h.location).toBe('Abu Dhabi');
  });

  it('empty query returns the first `limit` filtered rows (browse mode)', () => {
    const first5 = searchCatalog(catalog, '', {}, 5);
    expect(first5).toHaveLength(5);
  });

  it('requires every term to match somewhere, not just one', () => {
    // "burj unicorn" should return nothing — "unicorn" is not in any product
    const hits = searchCatalog(catalog, 'burj unicorn');
    expect(hits).toHaveLength(0);
  });

  it('honours the limit', () => {
    const hits = searchCatalog(catalog, '', {}, 7);
    expect(hits.length).toBeLessThanOrEqual(7);
  });
});
