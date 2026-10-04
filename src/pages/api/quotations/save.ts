import type { APIRoute } from 'astro';
import { jsonRepo } from '../../../data/repo.js';
import type { StoredQuotation } from '../../../data/schema.js';

export const prerender = false;

/**
 * Autosave endpoint. The editor POSTs the entire quotation on every debounced change —
 * the payload is small (<10 KB) and the JSON repo is the canonical store, so a
 * last-writer-wins strategy is fine for a single-team local setup.
 *
 * There is deliberately no auth here: Phase 1 runs on localhost only. The passcode
 * gate goes on the Pages deployment, not inside the app.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = (await request.json()) as StoredQuotation;
    if (!payload?.id || !payload?.token) {
      return new Response('Missing id or token', { status: 400 });
    }
    await jsonRepo.save(payload);
    return new Response(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(`Save failed: ${msg}`, { status: 500 });
  }
};
