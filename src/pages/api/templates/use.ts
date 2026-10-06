import type { APIRoute } from 'astro';
import { templateRepo } from '../../../data/templateRepo.js';
import { getRepo, newId, newToken } from '../../../data/repo.js';
import type { StoredQuotation } from '../../../data/schema.js';

export const prerender = false;

/**
 * POST /api/templates/use
 * Body: { templateId: string, lead_id?: string, overrides?: Partial<StoredQuotation> }
 * Creates a new draft quotation from the template and returns it.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  if (!body?.templateId) return json({ error: 'templateId is required' }, 400);
  const tpl = await templateRepo.get(body.templateId);
  if (!tpl) return json({ error: 'Template not found' }, 404);

  const now = new Date().toISOString();
  const id = newId();
  const token = newToken();

  // Build a draft quote from the template data, overriding client-specific fields.
  const base = (tpl.template_data || {}) as Partial<StoredQuotation>;
  const q: StoredQuotation = {
    ...(base as StoredQuotation),
    id,
    token,
    status: 'draft',
    reference: `TG-${new Date().getFullYear()}-${id.slice(-6).toUpperCase()}`,
    title: body.overrides?.title || base.title || tpl.name,
    createdAt: now,
    updatedAt: now,
    version: 1,
    lead_id: body.lead_id || base.lead_id,
    client: body.overrides?.client || base.client || { name: '', phone: '', email: '' },
    pax: body.overrides?.pax || base.pax || { adults: 2, children: 0, infants: 0 },
    travelStart: body.overrides?.travelStart || base.travelStart || new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
    travelEnd: body.overrides?.travelEnd || base.travelEnd || new Date(Date.now() + 35 * 86400_000).toISOString().slice(0, 10),
    destination: base.destination || tpl.destination || '',
    days: (base.days as any) || [],
    lines: (base.lines as any) || [],
    quoteCurrency: (base.quoteCurrency as any) || 'INR',
    fx: base.fx || {},
    pricingMode: (base.pricingMode as any) || 'per_person',
    ...body.overrides,
  } as StoredQuotation;

  const repo = await getRepo();
  await repo.save(q);
  await templateRepo.incrementUsage(tpl.id);
  return json({ ok: true, quotation: q, editUrl: `/edit/${q.id}` });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
