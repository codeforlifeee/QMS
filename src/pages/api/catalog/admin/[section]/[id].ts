import type { APIRoute } from 'astro';
import { productsAdmin, transportAdmin, cityToursAdmin } from '../../../../../catalog/catalogAdmin.js';

export const prerender = false;

function pick(section: string | undefined) {
  if (section === 'products') return productsAdmin;
  if (section === 'transport') return transportAdmin;
  if (section === 'city-tours') return cityToursAdmin;
  return null;
}

export const PUT: APIRoute = async ({ params, request }) => {
  const api = pick(params.section);
  if (!api) return json({ error: 'Unknown section' }, 404);
  let patch: any;
  try { patch = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  const row = await (api as any).update(params.id!, patch);
  if (!row) return json({ error: 'Not found' }, 404);
  return json({ ok: true, row });
};

export const DELETE: APIRoute = async ({ params }) => {
  const api = pick(params.section);
  if (!api) return json({ error: 'Unknown section' }, 404);
  const ok = await (api as any).remove(params.id!);
  return json({ ok });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
