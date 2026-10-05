import type { APIRoute } from 'astro';
import { getRepo } from '../../../../data/repo.js';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response('Missing id', { status: 400 });
  const repo = await getRepo();
  const chat = await repo.getChat(id);
  return new Response(JSON.stringify(chat || { quotationId: id, turns: [], provider: 'groq' }), {
    headers: { 'content-type': 'application/json' }
  });
};
