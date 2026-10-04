import type { APIRoute } from 'astro';
import { jsonRepo } from '../../../data/repo.js';
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

  const q = await jsonRepo.getByToken(token);
  if (!q) return new Response('Quotation not found', { status: 404 });

  // Rebuild the print URL from this request's own origin so dev + production both work.
  // Astro's `url.origin` already includes the scheme and host (e.g. http://localhost:4321).
  // The `?pdf=1` flag is a signal to the print page that nothing extra should be shown.
  const printUrl = new URL(`/print/${token}`, url.origin);
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

  // A filename a client would recognise — reference + a slug of the title.
  const slug = q.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const filename = `${q.reference}-${slug}.pdf`;

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
