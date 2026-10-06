import type { APIRoute } from 'astro';
import { notificationRepo } from '../../../data/notificationRepo.js';

export const prerender = false;

export const PUT: APIRoute = async () => {
  const count = await notificationRepo.markAllRead();
  return new Response(JSON.stringify({ ok: true, count }), { headers: { 'content-type': 'application/json' } });
};
