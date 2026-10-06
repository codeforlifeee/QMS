import type { APIRoute } from 'astro';
import { templateRepo } from '../../../data/templateRepo.js';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const t = await templateRepo.get(params.id!);
  if (!t) return json({ error: 'Not found' }, 404);
  return json({ ok: true, template: t });
};

export const PUT: APIRoute = async ({ params, request }) => {
  let patch: any;
  try { patch = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  const updated = await templateRepo.update(params.id!, patch);
  if (!updated) return json({ error: 'Not found' }, 404);
  return json({ ok: true, template: updated });
};

export const DELETE: APIRoute = async ({ params }) => {
  await templateRepo.remove(params.id!);
  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
