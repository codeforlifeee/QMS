import type { APIRoute } from 'astro';
import { notificationRepo } from '../../../../data/notificationRepo.js';

export const prerender = false;

export const PUT: APIRoute = async ({ params }) => {
  const n = await notificationRepo.markRead(params.id!);
  if (!n) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  return new Response(JSON.stringify({ ok: true, notification: n }), { headers: { 'content-type': 'application/json' } });
};
