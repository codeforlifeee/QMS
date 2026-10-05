import type { QuotationRepo } from './repo.js';
import type { StoredQuotation } from './schema.js';
import type { CitationMap } from '../ai/citations.js';
import { getSupabase } from './supabase.js';

export const supabaseRepo: QuotationRepo = {
  async list() {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('quotations')
      .select('data')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => r.data as StoredQuotation);
  },

  async listByLead(leadId) {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('quotations')
      .select('data')
      .eq('lead_id', leadId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => r.data as StoredQuotation);
  },

  async get(id) {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('quotations')
      .select('data')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data?.data as StoredQuotation) ?? null;
  },

  async getByToken(token) {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('quotations')
      .select('data')
      .eq('token', token)
      .maybeSingle();
    if (error) throw error;
    return (data?.data as StoredQuotation) ?? null;
  },

  async save(q) {
    const sb = getSupabase();
    const row = {
      id: q.id,
      token: q.token,
      lead_id: (q as any).lead_id ?? null,
      status: q.status,
      reference: q.reference,
      data: q,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from('quotations').upsert(row, { onConflict: 'id' });
    if (error) throw error;
  },

  async remove(id) {
    const sb = getSupabase();
    const { error } = await sb.from('quotations').delete().eq('id', id);
    if (error) throw error;
  },

  async getCitations(id) {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('citations')
      .select('data')
      .eq('quotation_id', id)
      .maybeSingle();
    if (error) throw error;
    return (data?.data as CitationMap) ?? null;
  },

  async saveCitations(id, citations) {
    const sb = getSupabase();
    const { error } = await sb
      .from('citations')
      .upsert({ quotation_id: id, data: citations }, { onConflict: 'quotation_id' });
    if (error) throw error;
  },

  async getChat(id) {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('chat_sessions')
      .select('data')
      .eq('quotation_id', id)
      .maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  },

  async saveChat(id, session) {
    const sb = getSupabase();
    const { error } = await sb
      .from('chat_sessions')
      .upsert({ quotation_id: id, data: session }, { onConflict: 'quotation_id' });
    if (error) throw error;
  },
};
