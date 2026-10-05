import { getSupabase } from './supabase.js';
import type { Lead, CallResponse, PriorityBucket } from './leadSchema.js';
import { callStatusToBucket } from './leadSchema.js';

export const leadRepo = {
  async list(bucket?: PriorityBucket): Promise<Lead[]> {
    const sb = getSupabase();
    let q = sb.from('leads').select('*').order('updated_at', { ascending: false });
    if (bucket) q = q.eq('priority_bucket', bucket);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Lead[];
  },

  async get(id: string): Promise<Lead | null> {
    const sb = getSupabase();
    const { data, error } = await sb.from('leads').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Lead) ?? null;
  },

  async create(lead: Partial<Lead>): Promise<Lead> {
    const sb = getSupabase();
    const { data, error } = await sb.from('leads').insert(lead).select().single();
    if (error) throw error;
    return data as Lead;
  },

  async update(id: string, patch: Partial<Lead>): Promise<Lead> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('leads')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Lead;
  },

  async upsertByExternalId(lead: Partial<Lead> & { external_id: string }): Promise<Lead> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('leads')
      .upsert(lead, { onConflict: 'external_id' })
      .select()
      .single();
    if (error) throw error;
    return data as Lead;
  },

  async getCallHistory(leadId: string): Promise<CallResponse[]> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('call_responses')
      .select('*')
      .eq('lead_id', leadId)
      .order('call_date_time', { ascending: false });
    if (error) throw error;
    return (data ?? []) as CallResponse[];
  },

  async addCallResponse(call: Partial<CallResponse>): Promise<CallResponse> {
    const sb = getSupabase();
    const { data, error } = await sb.from('call_responses').insert(call).select().single();
    if (error) throw error;
    const saved = data as CallResponse;

    // Auto-update lead's priority_bucket based on call_status
    if (saved.call_status && saved.lead_id) {
      const newBucket = callStatusToBucket(saved.call_status as any);
      await sb
        .from('leads')
        .update({
          priority_bucket: newBucket,
          latest_status: saved.call_status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', saved.lead_id);
    }

    return saved;
  },

  async getFollowUpsDue(): Promise<(CallResponse & { lead: Lead })[]> {
    const sb = getSupabase();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb
      .from('call_responses')
      .select('*, lead:leads(*)')
      .lte('next_follow_up', today)
      .order('next_follow_up', { ascending: true });
    if (error) throw error;
    return (data ?? []) as any;
  },

  async getStats(): Promise<Record<PriorityBucket, number>> {
    const sb = getSupabase();
    const { data, error } = await sb.from('leads').select('priority_bucket');
    if (error) throw error;
    const counts: Record<string, number> = {
      'Untouched Leads': 0,
      'Call Not Connected': 0,
      'In Progress': 0,
      'My Hot': 0,
      'Warm Lead': 0,
      Rejected: 0,
    };
    for (const row of data ?? []) {
      counts[row.priority_bucket] = (counts[row.priority_bucket] || 0) + 1;
    }
    return counts as Record<PriorityBucket, number>;
  },
};
