import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

const CONFIG_PATH = path.resolve(process.cwd(), 'data', 'sheet_config.json');

export const GET: APIRoute = async () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return new Response(JSON.stringify({ ok: true, config }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  } catch (err) {
    console.error('Failed to read sheet config', err);
  }
  
  return new Response(JSON.stringify({
    ok: true,
    config: {
      sheetId: '1niYNMdUZsWGnH2BxsnmG8DtKUfI3gecWNKp4jkOGmPA',
      tabName: 'Custom+Deals'
    }
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    if (!data.sheetId || !data.tabName) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing sheetId or tabName' }), { status: 400 });
    }

    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ sheetId: data.sheetId, tabName: data.tabName }, null, 2));

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
