import type { APIRoute } from 'astro';
import { syncFromSheet } from '../../../lib/sheetSync';

export const POST: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const source = url.searchParams.get('source') || 'webhook';
    const result = await syncFromSheet(source);
    console.log(`✅ Webhook triggered [${source}]! Synced from Google Sheets:`, result);
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('❌ Sheet Sync Webhook Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
