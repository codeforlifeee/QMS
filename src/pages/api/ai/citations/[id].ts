import type { APIRoute } from 'astro';
import { jsonRepo } from '../../../../data/repo.js';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response('Missing id', { status: 400 });

  const citations = await jsonRepo.getCitations(id);
  return new Response(JSON.stringify(citations || {}), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;
  if (!id) return new Response('Missing id', { status: 400 });

  try {
    const citations = await request.json();
    await jsonRepo.saveCitations(id, citations);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
