import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Lead, PriorityBucket } from '../data/leadSchema.js';
import { PRIORITY_BUCKETS, LEAD_SOURCES, CALL_STATUSES } from '../data/leadSchema.js';
import { showToast } from '../components/Toast.js';
import { AddLeadForm } from './AddLeadForm.js';
import { Filter, RefreshCw, Plus, X, Trash2, Settings } from 'lucide-react';
import { formatPhone, copyAndToast } from '../lib/contact.js';
import { SheetSettingsModal } from './SheetSettingsModal.js';

const BUCKET_COLORS: Record<PriorityBucket, string> = {
  'Untouched Leads': '#6366f1',
  'Call Not Connected': '#f59e0b',
  'In Progress': '#3b82f6',
  'My Hot': '#ef4444',
  'Warm Lead': '#22c55e',
  Rejected: '#6b7280',
};

type SortKey = 'name' | 'date_new' | 'date_old' | 'updated';

export default function PipelineView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSheetSettings, setShowSheetSettings] = useState(false);

  const [bucketFilter, setBucketFilter] = useState<PriorityBucket | ''>('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date_new');

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data.leads ?? []);
    } catch {}
    setLoading(false);
  }, []);

  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  
  const handleResizeStart = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.pageX;
    const th = (e.target as HTMLElement).closest('th');
    const startWidth = th ? th.getBoundingClientRect().width : 100;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(30, startWidth + (moveEvent.pageX - startX));
      setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/leads/sync', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        await fetchLeads();
        if (data.errors && data.errors.length > 0) {
          showToast(`Synced ${data.imported} leads. Errors: ${data.errors[0]}`, 'error');
        } else {
          showToast(`Synced ${data.imported} leads from Google Sheet`, 'success');
        }
      } else {
        showToast(`Sync error: ${data.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Sync failed: ${err.message}`, 'error');
    }
    setSyncing(false);
  };

  const handleDeleteLead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete lead');
      showToast('Lead deleted successfully', 'success');
      fetchLeads();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => { if (l.city) set.add(l.city); });
    return Array.from(set).sort();
  }, [leads]);

  const uniqueMonths = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => { if (l.travelling_month) set.add(l.travelling_month); });
    return Array.from(set).sort();
  }, [leads]);

  const uniqueSources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => { if (l.source) set.add(l.source); });
    return Array.from(set).sort();
  }, [leads]);

  const activeFilterCount = [bucketFilter, sourceFilter, cityFilter, monthFilter, statusFilter, dateFrom, dateTo]
    .filter(Boolean).length;

  const clearFilters = () => {
    setBucketFilter('');
    setSourceFilter('');
    setCityFilter('');
    setMonthFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setSortBy('date_new');
  };

  const filtered = useMemo(() => {
    let result = leads.filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.customer_name.toLowerCase().includes(q) &&
          !formatPhone(l.phone).includes(q) &&
          !(l.city ?? '').toLowerCase().includes(q) &&
          !(l.email ?? '').toLowerCase().includes(q)
        ) return false;
      }
      if (bucketFilter && l.priority_bucket !== bucketFilter) return false;
      if (sourceFilter && l.source !== sourceFilter) return false;
      if (cityFilter && l.city !== cityFilter) return false;
      if (monthFilter && l.travelling_month !== monthFilter) return false;
      if (statusFilter && l.latest_status !== statusFilter) return false;
      if (dateFrom) {
        const d = new Date(l.created_at);
        if (d < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const d = new Date(l.created_at);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59);
        if (d > to) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.customer_name.localeCompare(b.customer_name);
        case 'date_old': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'updated': return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'date_new':
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [leads, search, bucketFilter, sourceFilter, cityFilter, monthFilter, statusFilter, dateFrom, dateTo, sortBy]);

  return (
    <div className="crm-pipeline">

      {/* ── Toolbar ── */}
      <div className="crm-toolbar">
        <div className="crm-toolbar-left">
          <h2>Lead Pipeline</h2>
          <span className="crm-count">{filtered.length} leads</span>
        </div>
        <div className="crm-toolbar-right">
          <input
            type="search"
            placeholder="Search name, phone, city, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="crm-search"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="crm-select"
          >
            <option value="date_new">Newest First</option>
            <option value="date_old">Oldest First</option>
            <option value="updated">Recently Updated</option>
            <option value="name">Name A–Z</option>
          </select>
          <button
            className={`btn btn-sm ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} style={{ marginRight: 4 }} />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          <button className="btn btn-sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw size={14} style={{ marginRight: 4 }} />
            {syncing ? 'Syncing...' : 'Sync Sheet'}
          </button>
          <button className="btn btn-sm" onClick={() => setShowSheetSettings(true)} title="Sheet Settings">
            <Settings size={14} />
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => setShowAddLead(true)}>
            <Plus size={14} style={{ marginRight: 4 }} />
            Add Lead
          </button>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-grid">
            <div className="filter-field">
              <label>Bucket</label>
              <select value={bucketFilter} onChange={(e) => setBucketFilter(e.target.value as PriorityBucket | '')}>
                <option value="">All Buckets</option>
                {PRIORITY_BUCKETS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label>Call Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                {CALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label>Source</label>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                <option value="">All Sources</option>
                {(uniqueSources.length > 0 ? uniqueSources : LEAD_SOURCES as unknown as string[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label>City</label>
              <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                <option value="">All Cities</option>
                {uniqueCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label>Travelling Month</label>
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                <option value="">All Months</option>
                {uniqueMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label>Created From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Created To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button className="btn btn-sm filter-clear" onClick={clearFilters}>
              <X size={13} style={{ marginRight: 4 }} />
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {showAddLead && (
        <AddLeadForm
          onSave={() => { setShowAddLead(false); fetchLeads(); }}
          onClose={() => setShowAddLead(false)}
        />
      )}

      {showSheetSettings && (
        <SheetSettingsModal onClose={() => setShowSheetSettings(false)} />
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="crm-loading">Loading leads...</div>
      ) : (
        <div className="crm-list-view">
          <table className="crm-table">
            <thead>
              <tr>
                <th style={{ width: colWidths.name, minWidth: colWidths.name, maxWidth: colWidths.name }}>Name<div className="crm-resizer" onMouseDown={(e) => handleResizeStart(e, 'name')} /></th>
                <th style={{ width: colWidths.phone, minWidth: colWidths.phone, maxWidth: colWidths.phone }}>Phone<div className="crm-resizer" onMouseDown={(e) => handleResizeStart(e, 'phone')} /></th>
                <th style={{ width: colWidths.email, minWidth: colWidths.email, maxWidth: colWidths.email }}>Email<div className="crm-resizer" onMouseDown={(e) => handleResizeStart(e, 'email')} /></th>
                <th style={{ width: colWidths.city, minWidth: colWidths.city, maxWidth: colWidths.city }}>City<div className="crm-resizer" onMouseDown={(e) => handleResizeStart(e, 'city')} /></th>
                <th style={{ width: colWidths.pax, minWidth: colWidths.pax, maxWidth: colWidths.pax }}>Pax<div className="crm-resizer" onMouseDown={(e) => handleResizeStart(e, 'pax')} /></th>
                <th style={{ width: colWidths.month, minWidth: colWidths.month, maxWidth: colWidths.month }}>Month<div className="crm-resizer" onMouseDown={(e) => handleResizeStart(e, 'month')} /></th>
                <th style={{ width: colWidths.source, minWidth: colWidths.source, maxWidth: colWidths.source }}>Source<div className="crm-resizer" onMouseDown={(e) => handleResizeStart(e, 'source')} /></th>
                <th style={{ width: colWidths.budget, minWidth: colWidths.budget, maxWidth: colWidths.budget }}>Budget<div className="crm-resizer" onMouseDown={(e) => handleResizeStart(e, 'budget')} /></th>
                <th style={{ width: colWidths.callTime, minWidth: colWidths.callTime, maxWidth: colWidths.callTime }}>Call Time<div className="crm-resizer" onMouseDown={(e) => handleResizeStart(e, 'callTime')} /></th>
                <th style={{ width: colWidths.status, minWidth: colWidths.status, maxWidth: colWidths.status }}>Status<div className="crm-resizer" onMouseDown={(e) => handleResizeStart(e, 'status')} /></th>
                <th style={{ width: colWidths.latestStatus, minWidth: colWidths.latestStatus, maxWidth: colWidths.latestStatus }}>Latest Status<div className="crm-resizer" onMouseDown={(e) => handleResizeStart(e, 'latestStatus')} /></th>
                <th style={{ width: colWidths.created, minWidth: colWidths.created, maxWidth: colWidths.created }}>Created<div className="crm-resizer" onMouseDown={(e) => handleResizeStart(e, 'created')} /></th>
                <th style={{ textAlign: 'right', width: colWidths.actions, minWidth: colWidths.actions, maxWidth: colWidths.actions }}>Actions<div className="crm-resizer" onMouseDown={(e) => handleResizeStart(e, 'actions')} /></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-muted-ink)' }}>
                    No leads match your current filters.
                  </td>
                </tr>
              ) : filtered.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => { window.location.href = `/leads/${lead.id}`; }}
                  className="crm-table-row"
                >
                  <td style={{ width: colWidths.name, minWidth: colWidths.name, maxWidth: colWidths.name }} className="crm-table-name">{lead.customer_name}</td>
                  <td
                    style={{ width: colWidths.phone, minWidth: colWidths.phone, maxWidth: colWidths.phone }}
                    onClick={(e) => {
                      const p = formatPhone(lead.phone);
                      if (!p) return;
                      e.stopPropagation();
                      copyAndToast(p, 'Phone copied');
                    }}
                    className={formatPhone(lead.phone) ? 'crm-copyable' : undefined}
                    title={formatPhone(lead.phone) ? 'Click to copy' : undefined}
                  >
                    {formatPhone(lead.phone) || '-'}
                  </td>
                  <td
                    style={{ width: colWidths.email, minWidth: colWidths.email, maxWidth: colWidths.email }}
                    onClick={(e) => {
                      if (!lead.email) return;
                      e.stopPropagation();
                      copyAndToast(lead.email, 'Email copied');
                    }}
                    className={lead.email ? 'crm-copyable' : undefined}
                    title={lead.email ? 'Click to copy' : undefined}
                  >
                    {lead.email || '-'}
                  </td>
                  <td style={{ width: colWidths.city, minWidth: colWidths.city, maxWidth: colWidths.city }}>{lead.city || '-'}</td>
                  <td style={{ width: colWidths.pax, minWidth: colWidths.pax, maxWidth: colWidths.pax }}>{lead.pax_summary || '-'}</td>
                  <td style={{ width: colWidths.month, minWidth: colWidths.month, maxWidth: colWidths.month }}>{lead.travelling_month || '-'}</td>
                  <td style={{ width: colWidths.source, minWidth: colWidths.source, maxWidth: colWidths.source }}>{lead.source || '-'}</td>
                  <td style={{ width: colWidths.budget, minWidth: colWidths.budget, maxWidth: colWidths.budget }}>{lead.budget || '-'}</td>
                  <td style={{ width: colWidths.callTime, minWidth: colWidths.callTime, maxWidth: colWidths.callTime }}>{lead.preferred_call_time || '-'}</td>
                  <td style={{ width: colWidths.status, minWidth: colWidths.status, maxWidth: colWidths.status }}>
                    <span
                      className="crm-bucket-pill"
                      style={{ background: BUCKET_COLORS[lead.priority_bucket] }}
                    >
                      {lead.priority_bucket}
                    </span>
                  </td>
                  <td style={{ width: colWidths.latestStatus, minWidth: colWidths.latestStatus, maxWidth: colWidths.latestStatus }}>{lead.latest_status || '-'}</td>
                  <td style={{ width: colWidths.created, minWidth: colWidths.created, maxWidth: colWidths.created }} className="crm-table-date">
                    {new Date(lead.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </td>
                  <td style={{ textAlign: 'right', width: colWidths.actions, minWidth: colWidths.actions, maxWidth: colWidths.actions }}>
                    <button
                      className="btn btn-sm crm-delete-btn"
                      onClick={(e) => handleDeleteLead(e, lead.id)}
                      title="Delete Lead"
                      style={{ color: 'var(--color-danger)', border: 'none', background: 'transparent', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
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
