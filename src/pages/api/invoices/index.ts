import type { APIRoute } from 'astro';
import { invoiceRepo } from '../../../data/invoiceRepo.js';

export const prerender = false;

export const GET: APIRoute = async () => {
  const invoices = await invoiceRepo.list();
  return json({ ok: true, invoices });
};

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body?.client_name) return json({ error: 'client_name is required' }, 400);
  const items = Array.isArray(body.items) ? body.items : [];
  const subtotal = items.reduce((s: number, it: any) => s + (it.amount || 0), 0);
  const inv = await invoiceRepo.create({
    quotation_id: body.quotation_id || null,
    lead_id: body.lead_id || null,
    client_name: String(body.client_name),
    client_email: String(body.client_email || ''),
    client_phone: String(body.client_phone || ''),
    items,
    subtotal,
    tax_amount: Number(body.tax_amount || 0),
    total: Number(body.total || subtotal + (body.tax_amount || 0)),
    currency: body.currency || 'INR',
    status: body.status || 'draft',
    issued_date: body.issued_date || new Date().toISOString().slice(0, 10),
    due_date: body.due_date || new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
    notes: String(body.notes || ''),
  });
  return json({ ok: true, invoice: inv });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
