import type { APIRoute } from 'astro';
import { getRepo } from '../../../data/repo.js';
import { renderPdf } from '../../../pdf/render.js';

export const prerender = false;

/**
 * `GET /api/pdf/:token` — one-click PDF download.
 *
 * This replaces the browser's print dialog for the common path. The response is a
 * real vector PDF with no browser-added headers, no page numbers, no shrink-to-fit:
 * exactly the preview, at A4.
 *
 * The browser-print path at `/print/:token?print=1` stays available for anyone who
 * wants to actually print on paper.
 */
export const GET: APIRoute = async ({ params, url, request }) => {
  const token = params.token;
  if (!token) return new Response('Missing token', { status: 400 });

  const repo = await getRepo();
  const q = await repo.getByToken(token);
  if (!q) return new Response('Quotation not found', { status: 404 });

  // Rebuild the print URL. When on Render (behind a proxy), url.origin might resolve
  // incorrectly to https://localhost. We bypass the load balancer by hitting our own local port.
  const port = process.env.PORT || 4321;
  const origin = process.env.RENDER ? `http://127.0.0.1:${port}` : url.origin;
  const printUrl = new URL(`/print/${token}`, origin);
  printUrl.searchParams.set('pdf', '1');

  // Pass the Accept-Language header through so Intl.NumberFormat renders INR with the
  // same grouping the user sees in the editor.
  const accept = request.headers.get('accept-language');
  if (accept) printUrl.searchParams.set('lang', accept.split(',')[0] ?? 'en-IN');

  let pdf: Uint8Array;
  try {
    pdf = await renderPdf({ url: printUrl.toString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(`PDF rendering failed: ${msg}`, { status: 500 });
  }

  const sanitize = (s: string) =>
    s.replace(/[^a-zA-Z0-9]+/g, '').slice(0, 40);

  const customerName = sanitize(q.client?.name || 'Customer');
  const destination = sanitize(q.destination || 'Trip');

  let travelMonth = '';
  if (q.travelStart) {
    const d = new Date(q.travelStart + 'T00:00:00');
    const mon = d.toLocaleString('en', { month: 'short' });
    travelMonth = `${mon}${d.getFullYear()}`;
  }

  const filename = [customerName, destination, travelMonth, q.reference]
    .filter(Boolean)
    .join('_') + '.pdf';

  return new Response(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${filename}"`,
      // Short cache so a quick re-click reuses the file; long enough to feel instant,
      // short enough that editing the quotation and re-downloading shows the new one.
      'cache-control': 'private, max-age=5',
    },
  });
};
