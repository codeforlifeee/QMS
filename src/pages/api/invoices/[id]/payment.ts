import type { APIRoute } from 'astro';
import { invoiceRepo } from '../../../../data/invoiceRepo.js';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  if (typeof body?.amount !== 'number' || body.amount <= 0) {
    return json({ error: 'amount (minor units) is required' }, 400);
  }
  const inv = await invoiceRepo.recordPayment(params.id!, {
    date: body.date || new Date().toISOString(),
    amount: body.amount,
    method: String(body.method || 'Bank Transfer'),
    reference: String(body.reference || ''),
    notes: String(body.notes || ''),
  });
  if (!inv) return json({ error: 'Not found' }, 404);
  return json({ ok: true, invoice: inv });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
