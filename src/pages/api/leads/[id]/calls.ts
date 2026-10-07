import type { APIRoute } from 'astro';
import { leadRepo } from '../../../../data/leadRepo.js';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const lead = await leadRepo.get(params.id!);
  if (!lead) return json({ error: 'Lead not found' }, 404);

  try {
    const call = await leadRepo.addCallResponse({
      lead_id: params.id!,
      call_date_time: body.call_date_time || new Date().toISOString(),
      called_by: body.called_by || null,
      call_status: body.call_status || null,
      call_progress: body.call_progress || null,
      wa_status: body.wa_status || null,
      destination_city: body.destination_city || null,
      travel_date: body.travel_date || null,
      total_adults: body.total_adults ?? 0,
      total_children: body.total_children ?? 0,
      child_ages: body.child_ages ?? [],
      total_nights: body.total_nights ?? 0,
      hotel_category: body.hotel_category || null,
      visa: body.visa || null,
      flights: body.flights || null,
      transfers_type: body.transfers_type || null,
      requirements: body.requirements || null,
      remarks: body.remarks || null,
      budget: body.budget || null,
      next_follow_up: body.next_follow_up || null,
      wa_link: body.wa_link || null,
      quote_link: body.quote_link || null,
      lead_source: body.lead_source || null,
      priority: body.priority || null,
    });

    return json({ ok: true, call }, 201);
  } catch (error: any) {
    return json({ error: error.message || 'Failed to save call response' }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
