import type { APIRoute } from 'astro';
import { notificationRepo } from '../../../data/notificationRepo.js';

export const prerender = false;

export const GET: APIRoute = async () => {
  const count = await notificationRepo.unreadCount();
  return new Response(JSON.stringify({ count }), { headers: { 'content-type': 'application/json' } });
};
