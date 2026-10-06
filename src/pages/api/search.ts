import type { APIRoute } from 'astro';
import { getRepo } from '../../data/repo.js';
import { templateRepo } from '../../data/templateRepo.js';

export const prerender = false;

/**
 * GET /api/search?q=...
 * Lightweight substring search across leads, quotations, and templates.
 */
export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get('q') || '').toLowerCase().trim();
  if (!q) return json({ ok: true, results: [] });

  const results: Array<{ group: string; id: string; label: string; description?: string; href: string }> = [];

  // Quotations
  try {
    const repo = await getRepo();
    const quotations = await repo.list();
    for (const quote of quotations) {
      const hay = `${quote.title} ${quote.reference} ${quote.client?.name || ''} ${quote.destination || ''}`.toLowerCase();
      if (hay.includes(q)) {
        results.push({
          group: 'Quotations',
          id: quote.id,
          label: quote.title || quote.reference,
          description: `${quote.reference} · ${quote.client?.name || ''}`,
          href: `/edit/${quote.id}`,
        });
      }
      if (results.filter((r) => r.group === 'Quotations').length >= 6) break;
    }
  } catch { /* swallow */ }

  // Leads
  try {
    const { leadRepo } = await import('../../data/leadRepo.js');
    const leads = await leadRepo.list();
    for (const l of leads as any[]) {
      const hay = `${l.customer_name || ''} ${l.phone || ''} ${l.email || ''} ${l.city || ''}`.toLowerCase();
      if (hay.includes(q)) {
        results.push({
          group: 'Leads',
          id: l.id,
          label: l.customer_name || 'Lead',
          description: [l.city, l.phone].filter(Boolean).join(' · '),
          href: `/leads/${l.id}`,
        });
      }
      if (results.filter((r) => r.group === 'Leads').length >= 6) break;
    }
  } catch { /* swallow */ }

  // Templates
  try {
    const templates = await templateRepo.list();
    for (const t of templates) {
      const hay = `${t.name} ${t.description} ${t.destination} ${t.category}`.toLowerCase();
      if (hay.includes(q)) {
        results.push({
          group: 'Templates',
          id: t.id,
          label: t.name,
          description: `${t.category} · ${t.destination || 'Any'} · ${t.duration}N`,
          href: '/templates',
        });
      }
      if (results.filter((r) => r.group === 'Templates').length >= 4) break;
    }
  } catch { /* swallow */ }

  return json({ ok: true, results });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
