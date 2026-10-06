import type { APIRoute } from 'astro';
import { getRepo } from '../../../data/repo.js';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const repo = await getRepo();
  const q = await repo.get(params.id!);
  if (!q) {
    return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ ok: true, quotation: q }), {
    headers: { 'content-type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing id' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  try {
    const repo = await getRepo();
    const existing = await repo.get(id);
    if (!existing) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    await repo.remove(id);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Delete failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
