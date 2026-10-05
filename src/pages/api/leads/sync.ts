import type { APIRoute } from 'astro';
import { syncFromSheet } from '../../../lib/sheetSync.js';

export const prerender = false;

export const POST: APIRoute = async () => {
  try {
    const result = await syncFromSheet();
    return json({ ok: true, ...result });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
