import type { APIRoute } from 'astro';
import { getProvider } from '../../../ai/config.js';
import { generateQuotation } from '../../../ai/pipeline/index.js';
import { jsonRepo } from '../../../data/repo.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { prompt, provider: providerName } = body ?? {};
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return json({ error: 'Prompt is required' }, 400);
  }

  let provider;
  try {
    provider = getProvider(providerName);
  } catch (err: any) {
    return json({ error: err?.message || 'Provider setup failed' }, 400);
  }

  try {
    const result = await generateQuotation(prompt, provider);
    await jsonRepo.save(result.quotation);
    await jsonRepo.saveCitations(result.quotation.id, result.citations);

    const grounded = Object.keys(result.citations).length;
    return json({
      ok: true,
      quotationId: result.quotation.id,
      citations: result.citations,
      warnings: result.warnings,
      usage: result.usage,
      summary: {
        days: result.quotation.days.length,
        lines: result.quotation.lines.length,
        groundedLines: grounded,
        unpricedLines: result.quotation.lines.filter((l) => l.adultRate === '0.00').length,
      },
    });
  } catch (err: any) {
    const message = err?.message || String(err);
    const detail = err?.response?.data || err?.cause?.message;
    return json(
      { error: message, detail: detail ? String(detail).slice(0, 500) : undefined },
      500,
    );
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
