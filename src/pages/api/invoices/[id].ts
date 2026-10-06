import type { APIRoute } from 'astro';
import { invoiceRepo } from '../../../data/invoiceRepo.js';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const inv = await invoiceRepo.get(params.id!);
  if (!inv) return json({ error: 'Not found' }, 404);
  return json({ ok: true, invoice: inv });
};

export const PUT: APIRoute = async ({ params, request }) => {
  let patch: any;
  try { patch = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  const inv = await invoiceRepo.update(params.id!, patch);
  if (!inv) return json({ error: 'Not found' }, 404);
  return json({ ok: true, invoice: inv });
};

export const DELETE: APIRoute = async ({ params }) => {
  await invoiceRepo.remove(params.id!);
  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
