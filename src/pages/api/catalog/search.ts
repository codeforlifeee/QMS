import type { APIRoute } from 'astro';
import { facets, loadCatalog, searchCatalog } from '../../../catalog/catalog.js';

export const prerender = false;

/**
 * `GET /api/catalog/search?q=&loc=&cat=&limit=`
 *
 * Returns at most `limit` matching products (default 10, max 50) and the full facet
 * list for the current catalog. The picker calls this on every debounced keystroke;
 * at 400 rows the lookup is <5ms, so there's no need to cache per-request.
 */
export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  const location = url.searchParams.get('loc') ?? undefined;
  const category = url.searchParams.get('cat') ?? undefined;
  const transferOption = url.searchParams.get('transfer') ?? undefined;
  const rawLimit = Number(url.searchParams.get('limit') ?? 10);
  const limit = Math.min(50, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 10));

  const catalog = await loadCatalog();
  const results = searchCatalog(catalog, q, { location, category, transferOption }, limit);

  return new Response(
    JSON.stringify({
      results,
      facets: facets(catalog),
      total: catalog.length,
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'private, max-age=60',
      },
    },
  );
};
