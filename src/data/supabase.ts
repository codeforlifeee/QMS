import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  // @ts-ignore
  const url = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.SUPABASE_URL) || process.env.SUPABASE_URL;
  // @ts-ignore
  const key = (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.SUPABASE_SERVICE_KEY || import.meta.env.SUPABASE_ANON_KEY)) || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');

  _client = createClient(url, key, {
    auth: { persistSession: false },
    realtime: {
      transport: typeof WebSocket !== 'undefined' ? WebSocket : class MockWebSocket {} as any
    }
  });
  return _client;
}

export function hasSupabase(): boolean {
  // @ts-ignore
  return !!(((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.SUPABASE_URL) || process.env.SUPABASE_URL) && ((typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.SUPABASE_SERVICE_KEY || import.meta.env.SUPABASE_ANON_KEY)) || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY));
}
