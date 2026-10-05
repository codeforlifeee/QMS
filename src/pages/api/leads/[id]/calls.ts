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

  const call = await leadRepo.addCallResponse({
    lead_id: params.id!,
    call_date_time: body.call_date_time || new Date().toISOString(),
    called_by: body.called_by,
    call_status: body.call_status,
    call_progress: body.call_progress,
    wa_status: body.wa_status,
    destination_city: body.destination_city,
    travel_date: body.travel_date,
    total_adults: body.total_adults ?? 0,
    total_children: body.total_children ?? 0,
    child_ages: body.child_ages ?? [],
    total_nights: body.total_nights ?? 0,
    hotel_category: body.hotel_category,
    visa: body.visa,
    flights: body.flights,
    transfers_type: body.transfers_type,
    requirements: body.requirements,
    remarks: body.remarks,
    budget: body.budget,
    next_follow_up: body.next_follow_up,
    wa_link: body.wa_link,
    quote_link: body.quote_link,
    lead_source: body.lead_source,
    priority: body.priority,
  });

  return json({ ok: true, call }, 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
