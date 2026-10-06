import type { APIRoute } from 'astro';
import { taskRepo } from '../../../data/taskRepo.js';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const t = await taskRepo.get(params.id!);
  if (!t) return json({ error: 'Not found' }, 404);
  return json({ ok: true, task: t });
};

export const PUT: APIRoute = async ({ params, request }) => {
  let patch: any;
  try { patch = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  const t = await taskRepo.update(params.id!, patch);
  if (!t) return json({ error: 'Not found' }, 404);
  return json({ ok: true, task: t });
};

export const DELETE: APIRoute = async ({ params }) => {
  await taskRepo.remove(params.id!);
  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
