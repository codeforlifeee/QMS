import type { APIRoute } from 'astro';
import { jsonRepo } from '../../../../data/repo.js';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response('Missing id', { status: 400 });
  const chat = await jsonRepo.getChat(id);
  return new Response(JSON.stringify(chat || { quotationId: id, turns: [], provider: 'groq' }), {
    headers: { 'content-type': 'application/json' }
  });
};
