import type { APIRoute } from 'astro';
import { jsonRepo } from '../../../../data/repo.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await request.json();
    await jsonRepo.saveChat(session.quotationId, session);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
