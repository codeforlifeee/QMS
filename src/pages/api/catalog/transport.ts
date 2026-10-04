import type { APIRoute } from 'astro';
import { loadTransport, searchTransport } from '../../../catalog/catalog.js';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  const route = url.searchParams.get('route') ?? undefined;
  const vehicleSize = url.searchParams.get('vehicleSize') ?? undefined;
  const supplier = url.searchParams.get('supplier') ?? undefined;
  const rawLimit = Number(url.searchParams.get('limit') ?? 10);
  const limit = Math.min(50, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 10));

  const transport = await loadTransport();
  const results = searchTransport(transport, q, { route, vehicleSize, supplier }, limit);

  return new Response(
    JSON.stringify({
      results,
      total: transport.length,
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
