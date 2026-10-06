import type { APIRoute } from 'astro';
import { noteRepo, type NoteEntityType } from '../../../data/noteRepo.js';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const entityType = url.searchParams.get('entity_type') as NoteEntityType | null;
  const entityId = url.searchParams.get('entity_id');
  if (!entityType || !entityId) return json({ error: 'entity_type and entity_id are required' }, 400);
  const notes = await noteRepo.listFor(entityType, entityId);
  return json({ ok: true, notes });
};

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body?.content || !body?.entity_type || !body?.entity_id) {
    return json({ error: 'content, entity_type, entity_id are required' }, 400);
  }
  const n = await noteRepo.create({
    content: String(body.content),
    entity_type: body.entity_type,
    entity_id: String(body.entity_id),
    author_name: String(body.author_name || ''),
    pinned: !!body.pinned,
  });
  return json({ ok: true, note: n });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
