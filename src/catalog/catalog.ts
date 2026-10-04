import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  CatalogDefaults,
  CatalogProduct,
  CatalogTransport,
  CatalogCityTour,
  SearchFilters,
  SearchHit,
} from './types.js';

/**
 * Catalog loader + scored substring search.
 *
 * Scope: server-only. The whole catalog (~400 products, ~130 KB) is read into memory
 * once per server process and cached. The browser calls `/api/catalog/search`
 * instead of downloading the file, so new rows added later don't bloat the editor
 * payload.
 *
 * Search algorithm — intentionally simple:
 *   - case-insensitive substring on product + tour + category
 *   - weights: product-name hit = 3, tour hit = 2, category hit = 1
 *   - hard filters apply after scoring (location, category, transfer option)
 *   - top N by score, ties broken by product name
 *
 * At 400 rows this is comfortably <5ms per call — no need for an index or trie, no
 * need for pgvector. If the catalog grows past a few thousand rows the same shape
 * can be swapped for a MiniSearch index without touching callers.
 */

const DATA_DIR = path.resolve(process.cwd(), 'data', 'catalog');

let cachedProducts: readonly CatalogProduct[] | null = null;
let cachedDefaults: CatalogDefaults | null = null;
let cachedTransport: readonly CatalogTransport[] | null = null;
let cachedCityTours: readonly CatalogCityTour[] | null = null;

async function readJson<T>(file: string): Promise<T> {
  const raw = await readFile(file, 'utf8');
  return JSON.parse(raw) as T;
}

export async function loadCatalog(): Promise<readonly CatalogProduct[]> {
  if (cachedProducts) return cachedProducts;
  try {
    cachedProducts = await readJson<CatalogProduct[]>(path.join(DATA_DIR, 'products.json'));
  } catch {
    cachedProducts = []; // allow the app to boot before the first import
  }
  return cachedProducts;
}

export async function loadDefaults(): Promise<CatalogDefaults | null> {
  if (cachedDefaults) return cachedDefaults;
  try {
    cachedDefaults = await readJson<CatalogDefaults>(path.join(DATA_DIR, 'defaults.json'));
  } catch {
    cachedDefaults = null;
  }
  return cachedDefaults;
}

export async function loadTransport(): Promise<readonly CatalogTransport[]> {
  if (cachedTransport) return cachedTransport;
  try {
    cachedTransport = await readJson<CatalogTransport[]>(path.join(DATA_DIR, 'transport.json'));
  } catch {
    cachedTransport = [];
  }
  return cachedTransport;
}

export async function loadCityTours(): Promise<readonly CatalogCityTour[]> {
  if (cachedCityTours) return cachedCityTours;
  try {
    cachedCityTours = await readJson<CatalogCityTour[]>(path.join(DATA_DIR, 'city-tours.json'));
  } catch {
    cachedCityTours = [];
  }
  return cachedCityTours;
}

/** Test-only. Clears the module cache so a fresh fixture is picked up. */
export function _resetCache(): void {
  cachedProducts = null;
  cachedDefaults = null;
  cachedTransport = null;
  cachedCityTours = null;
}

/* ---------- search ---------- */

/**
 * Returns up to `limit` matches, highest score first. An empty query returns the
 * first `limit` products that satisfy the filters (useful for "browse mode").
 */
export function searchCatalog(
  all: readonly CatalogProduct[],
  query: string,
  filters: SearchFilters = {},
  limit = 20,
): CatalogProduct[] {
  const filtered = applyFilters(all, filters);
  const q = query.trim().toLowerCase();

  if (!q) {
    return filtered.slice(0, limit);
  }

  const terms = q.split(/\s+/).filter(Boolean);
  const hits: SearchHit[] = [];
  for (const product of filtered) {
    const score = scoreProduct(product, terms);
    if (score > 0) hits.push({ product, score });
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.product.product.localeCompare(b.product.product);
  });

  return hits.slice(0, limit).map((h) => h.product);
}

function applyFilters(
  all: readonly CatalogProduct[],
  filters: SearchFilters,
): readonly CatalogProduct[] {
  const { location, category, transferOption } = filters;
  if (!location && !category && !transferOption) return all;
  return all.filter(
    (p) =>
      (!location || p.location === location) &&
      (!category || p.category === category) &&
      (!transferOption || p.transferOption === transferOption),
  );
}

/**
 * A product scores by how many of the search terms land where. Scoring per term
 * (not just once per product) so a two-word query like "burj khalifa" rewards rows
 * that match both — "Burj Khalifa Level 124" beats a row that only matches "Burj".
 */
function scoreProduct(product: CatalogProduct, terms: readonly string[]): number {
  const name = product.product.toLowerCase();
  const tour = product.tour.toLowerCase();
  const category = product.category.toLowerCase();

  let total = 0;
  for (const term of terms) {
    let perTerm = 0;
    if (name.includes(term)) perTerm = Math.max(perTerm, 3);
    if (tour.includes(term)) perTerm = Math.max(perTerm, 2);
    if (category.includes(term)) perTerm = Math.max(perTerm, 1);
    if (perTerm === 0) return 0; // every term must match somewhere
    total += perTerm;
  }
  return total;
}

export interface TransportSearchFilters {
  readonly route?: string;
  readonly vehicleSize?: string;
  readonly supplier?: string;
}

export function searchTransport(
  all: readonly CatalogTransport[],
  query: string,
  filters: TransportSearchFilters = {},
  limit = 20,
): CatalogTransport[] {
  const { route, vehicleSize, supplier } = filters;
  const filtered = all.filter(
    (t) =>
      (!route || t.route === route) &&
      (!vehicleSize || t.vehicleSize === vehicleSize) &&
      (!supplier || t.supplier === supplier),
  );

  const q = query.trim().toLowerCase();
  if (!q) return filtered.slice(0, limit);

  const terms = q.split(/\s+/).filter(Boolean);
  const hits: { transport: CatalogTransport; score: number }[] = [];
  for (const t of filtered) {
    let score = 0;
    const r = t.route.toLowerCase();
    const s = t.supplier.toLowerCase();
    const v = t.vehicleSize.toLowerCase();

    for (const term of terms) {
      let perTerm = 0;
      if (r.includes(term)) perTerm = Math.max(perTerm, 3);
      if (s.includes(term)) perTerm = Math.max(perTerm, 2);
      if (v.includes(term)) perTerm = Math.max(perTerm, 1);
      if (perTerm === 0) {
        score = 0;
        break;
      }
      score += perTerm;
    }
    if (score > 0) hits.push({ transport: t, score });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit).map((h) => h.transport);
}

export interface CityTourSearchFilters {
  readonly type?: 'sharing' | 'private';
}

export function searchCityTours(
  all: readonly CatalogCityTour[],
  query: string,
  filters: CityTourSearchFilters = {},
  limit = 20,
): CatalogCityTour[] {
  const { type } = filters;
  const filtered = all.filter((c) => (!type || c.type === type));

  const q = query.trim().toLowerCase();
  if (!q) return filtered.slice(0, limit);

  const terms = q.split(/\s+/).filter(Boolean);
  const hits: { tour: CatalogCityTour; score: number }[] = [];
  for (const c of filtered) {
    let score = 0;
    const n = c.name.toLowerCase();
    const t = c.type.toLowerCase();

    for (const term of terms) {
      let perTerm = 0;
      if (n.includes(term)) perTerm = Math.max(perTerm, 3);
      if (t.includes(term)) perTerm = Math.max(perTerm, 2);
      if (perTerm === 0) {
        score = 0;
        break;
      }
      score += perTerm;
    }
    if (score > 0) hits.push({ tour: c, score });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit).map((h) => h.tour);
}

/* ---------- facet options ---------- */

export interface Facets {
  readonly locations: readonly string[];
  readonly categories: readonly string[];
}

/** Values the picker's filter chips should offer, derived from the catalog itself. */
export function facets(all: readonly CatalogProduct[]): Facets {
  const locations = new Set<string>();
  const categories = new Set<string>();
  for (const p of all) {
    locations.add(p.location);
    categories.add(p.category);
  }
  return {
    locations: [...locations].sort(),
    categories: [...categories].sort(),
  };
}
