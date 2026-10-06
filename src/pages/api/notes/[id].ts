import type { APIRoute } from 'astro';
import { noteRepo } from '../../../data/noteRepo.js';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  let patch: any;
  try { patch = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  const n = await noteRepo.update(params.id!, patch);
  if (!n) return json({ error: 'Not found' }, 404);
  return json({ ok: true, note: n });
};

export const DELETE: APIRoute = async ({ params }) => {
  await noteRepo.remove(params.id!);
  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
