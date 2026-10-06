import type { APIRoute } from 'astro';
import { getRepo } from '../../../../data/repo.js';
import { DEFAULT_COMMISSION, computeCommission, type CommissionInfo } from '../../../../data/commission.js';
import { toEngineInput } from '../../../../data/schema.js';
import { priceQuotation } from '../../../../pricing/engine.js';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const repo = await getRepo();
  const q = await repo.get(params.id!);
  if (!q) return json({ error: 'Not found' }, 404);
  const commission: CommissionInfo = ((q as any).commission as CommissionInfo | undefined) ?? DEFAULT_COMMISSION;
  return json({ ok: true, commission });
};

export const PUT: APIRoute = async ({ params, request }) => {
  let patch: Partial<CommissionInfo>;
  try { patch = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const repo = await getRepo();
  const q = await repo.get(params.id!);
  if (!q) return json({ error: 'Not found' }, 404);

  const current: CommissionInfo = ((q as any).commission as CommissionInfo | undefined) ?? DEFAULT_COMMISSION;
  let total = 0;
  try {
    total = Number(priceQuotation(toEngineInput(q)).grandTotal.minor ?? 0);
  } catch { /* leave 0 */ }

  const supplierPct = patch.supplier_commission_pct ?? current.supplier_commission_pct;
  const agentPct = patch.agent_commission_pct ?? current.agent_commission_pct;
  const computed = computeCommission(total, supplierPct, agentPct);

  const next: CommissionInfo = {
    ...current,
    ...patch,
    supplier_commission_pct: supplierPct,
    agent_commission_pct: agentPct,
    supplier_commission_amount: computed.supplier_commission_amount,
    agent_commission_amount: computed.agent_commission_amount,
    updatedAt: new Date().toISOString(),
  };

  const nextQuote: any = { ...q, commission: next, updatedAt: new Date().toISOString() };
  await repo.save(nextQuote);

  return json({ ok: true, commission: next });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
