import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const sheetId = url.searchParams.get('sheetId');
  if (!sheetId) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing sheetId' }), { status: 400 });
  }

  // @ts-ignore
  const apiKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.GOOGLE_SHEETS_API_KEY) || process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'GOOGLE_SHEETS_API_KEY not set' }), { status: 500 });
  }

  try {
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}&fields=sheets.properties.title`;
    const res = await fetch(sheetsUrl);
    
    if (!res.ok) {
      const errorText = await res.text();
      return new Response(JSON.stringify({ ok: false, error: `Sheets API ${res.status}: ${errorText}` }), { status: res.status });
    }

    const data = await res.json();
    const tabs = data.sheets?.map((sheet: any) => sheet.properties.title) || [];
    
    return new Response(JSON.stringify({ ok: true, tabs }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
