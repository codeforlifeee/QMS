import {
  searchCatalog,
  searchTransport,
  searchCityTours,
  loadCatalog,
  loadTransport,
  loadCityTours,
} from '../../catalog/catalog.js';

/**
 * The agent's single search tool. Returns a compact representation that keeps the
 * context window small — just the fields the model needs to reason and propose a line.
 * Costs are returned in BOTH minor units (as stored) and a decimal-string the model
 * can paste straight into a proposed line's adultRate.
 */
export async function executeSearchTool(args: {
  query: string;
  type: 'activity' | 'transfer' | 'hotel';
}) {
  const query = (args.query || '').trim();
  if (!query) return { results: [] };

  if (args.type === 'activity') {
    const [catalog, cityTours] = await Promise.all([loadCatalog(), loadCityTours()]);
    const products = searchCatalog(catalog, query, {}, 5).map((p) => ({
      kind: 'product' as const,
      id: p.id,
      name: p.product,
      tour: p.tour,
      category: p.category,
      location: p.location,
      supplier: p.supplier,
      costAedMinor: p.costAed,
      costAed: fromMinor(p.costAed),
      childCostAed: p.childCostAed != null ? fromMinor(p.childCostAed) : null,
      source: p.sourceSheet || 'Catalog',
    }));
    const tours = searchCityTours(cityTours, query, {}, 3).map((t) => ({
      kind: 'cityTour' as const,
      id: t.id,
      name: t.name,
      type: t.type,
      costAedMinor: t.rateAed,
      costAed: fromMinor(t.rateAed),
      source: 'City tours',
    }));
    return { results: [...products, ...tours].slice(0, 6) };
  }

  if (args.type === 'transfer') {
    const transports = await loadTransport();
    const results = searchTransport(transports, query, {}, 5).map((t) => ({
      kind: 'transport' as const,
      id: t.id,
      route: t.route,
      vehicleSize: t.vehicleSize,
      supplier: t.supplier,
      costAedMinor: t.rateAed,
      costAed: fromMinor(t.rateAed),
      source: 'Transport catalog',
    }));
    return { results };
  }

  return { results: [], note: 'Hotel catalog not yet imported — set hotel pricing manually.' };
}

function fromMinor(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(Math.round(minor));
  const major = Math.floor(abs / 100);
  const cents = abs % 100;
  return `${sign}${major}.${cents.toString().padStart(2, '0')}`;
}

export const SEARCH_TOOL_SCHEMA = {
  name: 'search_catalog',
  description:
    'Search the internal catalog for pricing. Returns matches with their id, name, supplier, and cost in AED (both raw minor-units and a decimal string). Use this before proposing any line that touches pricing.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: "Search terms, e.g. 'Burj Khalifa', 'Airport to Hotel', 'desert safari'.",
      },
      type: {
        type: 'string',
        enum: ['activity', 'transfer', 'hotel'],
        description: 'What kind of catalog to search.',
      },
    },
    required: ['query', 'type'],
  },
};
