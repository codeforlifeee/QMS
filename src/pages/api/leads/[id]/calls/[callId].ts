import type { APIRoute } from 'astro';
import { getSupabase } from '../../../../../data/supabase.js';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { id: lead_id, callId } = params;
  if (!lead_id || !callId) return json({ error: 'Missing ids' }, 400);

  const sb = getSupabase();
  const { data, error } = await sb
    .from('call_responses')
    .update({
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
    })
    .eq('id', callId)
    .eq('lead_id', lead_id)
    .select()
    .single();

  if (error) {
    return json({ error: error.message || 'Failed to update call response' }, 500);
  }

  return json({ ok: true, call: data }, 200);
};

export const DELETE: APIRoute = async ({ params }) => {
  const { id: lead_id, callId } = params;
  if (!lead_id || !callId) return json({ error: 'Missing ids' }, 400);

  const sb = getSupabase();
  const { error } = await sb
    .from('call_responses')
    .delete()
    .eq('id', callId)
    .eq('lead_id', lead_id);

  if (error) {
    return json({ error: error.message || 'Failed to delete call response' }, 500);
  }

  return json({ ok: true }, 200);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
