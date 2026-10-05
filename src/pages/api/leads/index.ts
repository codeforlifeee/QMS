import type { APIRoute } from 'astro';
import { leadRepo } from '../../../data/leadRepo.js';
import type { PriorityBucket } from '../../../data/leadSchema.js';
import { PRIORITY_BUCKETS } from '../../../data/leadSchema.js';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const bucket = url.searchParams.get('bucket') as PriorityBucket | null;
  if (bucket && !PRIORITY_BUCKETS.includes(bucket)) {
    return json({ error: 'Invalid bucket' }, 400);
  }
  const leads = await leadRepo.list(bucket ?? undefined);
  const stats = await leadRepo.getStats();
  return json({ leads, stats });
};

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.customer_name) return json({ error: 'customer_name is required' }, 400);

  const lead = await leadRepo.create({
    customer_name: body.customer_name,
    phone: body.phone,
    email: body.email,
    city: body.city,
    travelling_month: body.travelling_month,
    planning_with: body.planning_with,
    pax_summary: body.pax_summary,
    special_arrangements: body.special_arrangements,
    source: body.source,
    priority_bucket: body.priority_bucket || 'Untouched Leads',
  });

  return json({ ok: true, lead }, 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
