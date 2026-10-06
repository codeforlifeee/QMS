import type { APIRoute } from 'astro';
import { syncFromSheet } from '../../../lib/sheetSync';

export const POST: APIRoute = async () => {
  try {
    const result = await syncFromSheet();
    console.log('✅ Webhook triggered! Synced from Google Sheets:', result);
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
