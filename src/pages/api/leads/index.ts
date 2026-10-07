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

  try {
    const lead = await leadRepo.create({
      date: new Date().toISOString().split('T')[0], // Providing default date
      customer_name: body.customer_name,
      phone: body.phone || null,
      email: body.email || null,
      city: body.city || null,
      travelling_month: body.travelling_month || null,
      planning_with: body.planning_with || null,
      pax_summary: body.pax_summary || null,
      special_arrangements: body.special_arrangements || null,
      source: body.source || null,
      priority_bucket: body.priority_bucket || 'Untouched Leads',
    });

    return json({ ok: true, lead }, 201);
  } catch (error: any) {
    return json({ error: error.message || 'Failed to create lead' }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
