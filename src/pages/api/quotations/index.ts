import type { APIRoute } from 'astro';
import { getRepo } from '../../../data/repo.js';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const repo = await getRepo();
  const leadId = url.searchParams.get('lead_id');

  const quotations = leadId ? await repo.listByLead(leadId) : await repo.list();

  return new Response(JSON.stringify({ ok: true, quotations }), {
    headers: { 'content-type': 'application/json' },
  });
};
