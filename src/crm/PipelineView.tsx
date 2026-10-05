import { useState, useEffect, useCallback } from 'react';
import type { Lead, PriorityBucket } from '../data/leadSchema.js';
import { PRIORITY_BUCKETS } from '../data/leadSchema.js';
import { showToast } from '../components/Toast.js';

const BUCKET_COLORS: Record<PriorityBucket, string> = {
  'Untouched Leads': '#6366f1',
  'Call Not Connected': '#f59e0b',
  'In Progress': '#3b82f6',
  'My Hot': '#ef4444',
  'Warm Lead': '#22c55e',
  Rejected: '#6b7280',
};

export default function PipelineView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data.leads ?? []);
      setStats(data.stats ?? {});
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/leads/sync', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        await fetchLeads();
        showToast(`Synced ${data.imported} leads from Google Sheet`, 'success');
      } else {
        showToast(`Sync error: ${data.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Sync failed: ${err.message}`, 'error');
    }
    setSyncing(false);
  };

  const filtered = leads.filter(
    (l) =>
      !search ||
      l.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.city?.toLowerCase().includes(search.toLowerCase()),
  );

  const bucketLeads = (bucket: PriorityBucket) =>
    filtered.filter((l) => l.priority_bucket === bucket);

  return (
    <div className="crm-pipeline">
      <div className="crm-toolbar">
        <div className="crm-toolbar-left">
          <h2>Lead Pipeline</h2>
          <span className="crm-count">{filtered.length} leads</span>
        </div>
        <div className="crm-toolbar-right">
          <input
            type="search"
            placeholder="Search name, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="crm-search"
          />
          <div className="crm-view-toggle">
            <button
              className={`btn btn-sm ${view === 'pipeline' ? 'active' : ''}`}
              onClick={() => setView('pipeline')}
            >
              Board
            </button>
            <button
              className={`btn btn-sm ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >
              List
            </button>
          </div>
          <button className="btn btn-sm" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Sheet'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="crm-loading">Loading leads...</div>
      ) : view === 'pipeline' ? (
        <div className="crm-board">
          {PRIORITY_BUCKETS.map((bucket) => {
            const bl = bucketLeads(bucket);
            return (
              <div key={bucket} className="crm-column">
                <div className="crm-column-header">
                  <span
                    className="crm-column-dot"
                    style={{ background: BUCKET_COLORS[bucket] }}
                  />
                  <span className="crm-column-title">{bucket}</span>
                  <span className="crm-column-count">{stats[bucket] ?? 0}</span>
                </div>
                <div className="crm-column-body">
                  {bl.length === 0 && <div className="crm-column-empty">No leads</div>}
                  {bl.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="crm-list-view">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>City</th>
                <th>Month</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => { window.location.href = `/leads/${lead.id}`; }}
                  className="crm-table-row"
                >
                  <td className="crm-table-name">{lead.customer_name}</td>
                  <td>{lead.phone || '-'}</td>
                  <td>{lead.city || '-'}</td>
                  <td>{lead.travelling_month || '-'}</td>
                  <td>
                    <span
                      className="crm-bucket-pill"
                      style={{ background: BUCKET_COLORS[lead.priority_bucket] }}
                    >
                      {lead.priority_bucket}
                    </span>
                  </td>
                  <td className="crm-table-date">
                    {new Date(lead.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <a href={`/leads/${lead.id}`} className="crm-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="crm-card-name">{lead.customer_name}</div>
      <div className="crm-card-meta">
        {lead.phone && <span>{lead.phone}</span>}
        {lead.city && <span>{lead.city}</span>}
      </div>
      {lead.travelling_month && (
        <div className="crm-card-tag">{lead.travelling_month}</div>
      )}
    </a>
  );
}
