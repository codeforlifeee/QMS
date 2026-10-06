import type { APIRoute } from 'astro';
import { templateRepo } from '../../../data/templateRepo.js';

export const prerender = false;

export const GET: APIRoute = async () => {
  const templates = await templateRepo.list();
  return json({ ok: true, templates });
};

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  if (!body?.name) return json({ error: 'name is required' }, 400);

  const t = await templateRepo.create({
    name: String(body.name),
    description: String(body.description || ''),
    category: String(body.category || 'General'),
    destination: String(body.destination || ''),
    duration: Number(body.duration || 0),
    thumbnail_url: body.thumbnail_url || null,
    template_data: body.template_data || {},
  });
  return json({ ok: true, template: t });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
