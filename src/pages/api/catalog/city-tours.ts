import type { APIRoute } from 'astro';
import { loadCityTours, searchCityTours } from '../../../catalog/catalog.js';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  const typeParam = url.searchParams.get('type');
  const type = (typeParam === 'sharing' || typeParam === 'private') ? typeParam : undefined;
  const rawLimit = Number(url.searchParams.get('limit') ?? 10);
  const limit = Math.min(50, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 10));

  const cityTours = await loadCityTours();
  const results = searchCityTours(cityTours, q, { type }, limit);

  return new Response(
    JSON.stringify({
      results,
      total: cityTours.length,
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'private, max-age=60',
      },
    }
  );
};
