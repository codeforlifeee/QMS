import type { APIRoute } from 'astro';
import { notificationRepo } from '../../../data/notificationRepo.js';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)));
  const notifications = await notificationRepo.list(limit);
  return json({ ok: true, notifications });
};

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body?.title || !body?.type) return json({ error: 'title and type are required' }, 400);
  const n = await notificationRepo.create({
    type: body.type,
    title: String(body.title),
    message: String(body.message || ''),
    link: body.link || null,
  });
  return json({ ok: true, notification: n });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
