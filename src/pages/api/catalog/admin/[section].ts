import type { APIRoute } from 'astro';
import { productsAdmin, transportAdmin, cityToursAdmin, hotelsAdmin } from '../../../../catalog/catalogAdmin.js';

export const prerender = false;

type Section = 'products' | 'transport' | 'city-tours' | 'hotels';

function pick(section: string | undefined) {
  if (section === 'products') return productsAdmin;
  if (section === 'transport') return transportAdmin;
  if (section === 'city-tours') return cityToursAdmin;
  if (section === 'hotels') return hotelsAdmin;
  return null;
}

export const GET: APIRoute = async ({ params }) => {
  const api = pick(params.section);
  if (!api) return json({ error: 'Unknown section' }, 404);
  const rows = await api.list();
  return json({ ok: true, rows });
};

export const POST: APIRoute = async ({ params, request }) => {
  const api = pick(params.section);
  if (!api) return json({ error: 'Unknown section' }, 404);
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  const row = await (api as any).create(body);
  return json({ ok: true, row });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
