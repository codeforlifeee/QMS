import type { APIRoute } from 'astro';
import { leadRepo } from '../../../data/leadRepo.js';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const lead = await leadRepo.get(params.id!);
  if (!lead) return json({ error: 'Lead not found' }, 404);

  const calls = await leadRepo.getCallHistory(params.id!);
  return json({ lead, calls });
};

export const PUT: APIRoute = async ({ params, request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const existing = await leadRepo.get(params.id!);
  if (!existing) return json({ error: 'Lead not found' }, 404);

  const updated = await leadRepo.update(params.id!, body);
  return json({ ok: true, lead: updated });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
