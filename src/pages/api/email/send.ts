import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * POST /api/email/send
 *
 * If RESEND_API_KEY is set in the environment, delivers the email through
 * Resend. Otherwise returns `{ ok: false, fallback: 'mailto', mailto: '…' }`
 * so the UI can open the operator's mail client with a prefilled draft.
 *
 * Body: { to: string, subject: string, html?: string, text?: string, cc?: string[], bcc?: string[] }
 */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const to = String(body?.to || '').trim();
  const subject = String(body?.subject || '').trim();
  const html = typeof body?.html === 'string' ? body.html : undefined;
  const text = typeof body?.text === 'string' ? body.text : undefined;
  if (!to) return json({ error: 'to is required' }, 400);
  if (!subject) return json({ error: 'subject is required' }, 400);
  if (!html && !text) return json({ error: 'html or text body required' }, 400);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'noreply@localhost';

  if (!apiKey) {
    const bodyText = text ?? htmlToPlain(html ?? '');
    const url = new URL('mailto:' + to);
    url.searchParams.set('subject', subject);
    url.searchParams.set('body', bodyText);
    return json({ ok: false, fallback: 'mailto', mailto: url.toString(), reason: 'RESEND_API_KEY not configured' });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: html ?? undefined,
        text: text ?? undefined,
        cc: Array.isArray(body.cc) && body.cc.length ? body.cc : undefined,
        bcc: Array.isArray(body.bcc) && body.bcc.length ? body.bcc : undefined,
      }),
    });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      return json({ ok: false, error: data?.message || `Resend returned ${res.status}` }, 502);
    }
    return json({ ok: true, provider: 'resend', id: (data as any).id });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || 'Network error' }, 502);
  }
};

function htmlToPlain(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
