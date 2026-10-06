import type { APIRoute } from 'astro';
import { taskRepo } from '../../../data/taskRepo.js';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const tasks = await taskRepo.list();
  const status = url.searchParams.get('status');
  const leadId = url.searchParams.get('lead_id');
  const quotationId = url.searchParams.get('quotation_id');
  const filtered = tasks.filter((t) => {
    if (status && t.status !== status) return false;
    if (leadId && t.lead_id !== leadId) return false;
    if (quotationId && t.quotation_id !== quotationId) return false;
    return true;
  });
  return json({ ok: true, tasks: filtered });
};

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body?.title) return json({ error: 'title is required' }, 400);
  const t = await taskRepo.create({
    title: String(body.title),
    description: String(body.description || ''),
    due_date: body.due_date || null,
    due_time: body.due_time || null,
    priority: body.priority || 'medium',
    status: body.status || 'pending',
    lead_id: body.lead_id || null,
    quotation_id: body.quotation_id || null,
  });
  return json({ ok: true, task: t });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
