import type { APIRoute } from 'astro';
import { leadRepo } from '../../../data/leadRepo.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (Array.isArray(body)) {
    const results = [];
    for (const entry of body) {
      if (!entry.customer_name && !entry.name) continue;
      const lead = await leadRepo.create({
        customer_name: entry.customer_name || entry.name,
        phone: entry.phone,
        email: entry.email,
        city: entry.city,
        travelling_month: entry.travelling_month,
        pax_summary: entry.pax_summary,
        special_arrangements: entry.special_arrangements,
        priority_bucket: 'Untouched Leads',
      });
      results.push(lead.id);
    }
    return json({ ok: true, created: results.length, ids: results }, 201);
  }

  if (!body.customer_name && !body.name) {
    return json({ error: 'customer_name is required' }, 400);
  }

  const lead = await leadRepo.create({
    customer_name: body.customer_name || body.name,
    phone: body.phone,
    email: body.email,
    city: body.city,
    travelling_month: body.travelling_month,
    pax_summary: body.pax_summary,
    special_arrangements: body.special_arrangements,
    priority_bucket: 'Untouched Leads',
  });

  return json({ ok: true, lead }, 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
