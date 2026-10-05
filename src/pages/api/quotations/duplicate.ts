import type { APIRoute } from 'astro';
import { getRepo, newId, newToken } from '../../../data/repo.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { id } = body ?? {};
  if (!id) return json({ error: 'id is required' }, 400);

  const repo = await getRepo();
  const source = await repo.get(id);
  if (!source) return json({ error: 'Quotation not found' }, 404);

  const now = new Date().toISOString();
  const sourceVersion = (source as any).version ?? 1;

  const duplicate = {
    ...source,
    id: newId(),
    token: newToken(),
    status: 'draft' as const,
    reference: `${source.reference}-v${sourceVersion + 1}`,
    version: sourceVersion + 1,
    parent_id: source.id,
    createdAt: now,
    updatedAt: now,
    sentAt: undefined,
    viewCount: 0,
    firstViewedAt: undefined,
  };

  await repo.save(duplicate);

  return json({ ok: true, quotationId: duplicate.id, version: duplicate.version });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
