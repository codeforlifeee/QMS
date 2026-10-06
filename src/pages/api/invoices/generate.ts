import type { APIRoute } from 'astro';
import { invoiceRepo } from '../../../data/invoiceRepo.js';
import { getRepo } from '../../../data/repo.js';
import { toEngineInput } from '../../../data/schema.js';
import { priceQuotation } from '../../../pricing/engine.js';

export const prerender = false;

/**
 * POST /api/invoices/generate
 * Body: { quotationId: string }
 * Builds an invoice draft from an accepted quotation.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body?.quotationId) return json({ error: 'quotationId is required' }, 400);

  const repo = await getRepo();
  const q = await repo.get(body.quotationId);
  if (!q) return json({ error: 'Quotation not found' }, 404);

  let total = 0;
  try {
    const r = priceQuotation(toEngineInput(q));
    total = Number(r.grandTotal.minor ?? 0);
  } catch {
    return json({ error: 'Could not price quotation' }, 400);
  }

  const inv = await invoiceRepo.create({
    quotation_id: q.id,
    lead_id: q.lead_id || null,
    client_name: q.client?.name || 'Client',
    client_email: q.client?.email || '',
    client_phone: q.client?.phone || '',
    items: [
      {
        description: `${q.title || 'Travel package'}${q.destination ? ' — ' + q.destination : ''}`,
        quantity: 1,
        unit_price: total,
        amount: total,
      },
    ],
    subtotal: total,
    tax_amount: 0,
    total,
    currency: (q.quoteCurrency as any) || 'INR',
    status: 'draft',
    issued_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
    notes: '',
  });

  return json({ ok: true, invoice: inv });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
