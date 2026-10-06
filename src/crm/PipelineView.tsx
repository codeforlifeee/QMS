import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Lead, PriorityBucket } from '../data/leadSchema.js';
import { PRIORITY_BUCKETS, LEAD_SOURCES, CALL_STATUSES } from '../data/leadSchema.js';
import { showToast } from '../components/Toast.js';
import { AddLeadForm } from './AddLeadForm.js';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';

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
  const [stats, setStats] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'pipeline' | 'list'>('list');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
      setStats(data.stats ?? {});
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const leadId = String(active.id);
    const newBucket = String(over.id) as PriorityBucket;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.priority_bucket === newBucket) return;
    const previous = lead.priority_bucket;
    // Optimistic update
    setLeads((cur) => cur.map((l) => (l.id === leadId ? { ...l, priority_bucket: newBucket } : l)));
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ priority_bucket: newBucket }),
      });
      if (!res.ok) throw new Error('Update failed');
      showToast(`Moved to ${newBucket}`, 'success');
    } catch {
      // Revert
      setLeads((cur) => cur.map((l) => (l.id === leadId ? { ...l, priority_bucket: previous } : l)));
      showToast('Failed to move lead', 'error');
    }
  }

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
          !(l.phone ?? '').includes(q) &&
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
            placeholder="Search name, phone, city, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="crm-search"
          />
          <button
            className={`btn btn-sm ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
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
          <button className="btn btn-sm btn-primary" onClick={() => setShowAddLead(true)}>
            + Add Lead
          </button>
        </div>
      </div>

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
              <label>Latest Status</label>
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
            <div className="filter-field">
              <label>Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
                <option value="date_new">Newest First</option>
                <option value="date_old">Oldest First</option>
                <option value="updated">Recently Updated</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button className="btn btn-sm filter-clear" onClick={clearFilters}>
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

      {loading ? (
        <div className="crm-loading">Loading leads...</div>
      ) : view === 'pipeline' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="crm-board">
            {PRIORITY_BUCKETS.map((bucket) => {
              const bl = bucketLeads(bucket);
              return (
                <DroppableColumn key={bucket} bucket={bucket} color={BUCKET_COLORS[bucket]} count={bl.length}>
                  {bl.length === 0 && <div className="crm-column-empty">Drop here</div>}
                  {bl.map((lead) => (
                    <DraggableLeadCard key={lead.id} lead={lead} />
                  ))}
                </DroppableColumn>
              );
            })}
          </div>
        </DndContext>
      ) : (
        <div className="crm-list-view">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>City</th>
                <th>Pax</th>
                <th>Month</th>
                <th>Source</th>
                <th>Status</th>
                <th>Latest Status</th>
                <th>Created</th>
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
                  <td>{lead.email || '-'}</td>
                  <td>{lead.city || '-'}</td>
                  <td>{lead.pax_summary || '-'}</td>
                  <td>{lead.travelling_month || '-'}</td>
                  <td>{lead.source || '-'}</td>
                  <td>
                    <span
                      className="crm-bucket-pill"
                      style={{ background: BUCKET_COLORS[lead.priority_bucket] }}
                    >
                      {lead.priority_bucket}
                    </span>
                  </td>
                  <td>{lead.latest_status || '-'}</td>
                  <td className="crm-table-date">
                    {new Date(lead.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
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
      {lead.latest_status && (
        <div className="crm-card-tag">{lead.latest_status}</div>
      )}
      {lead.travelling_month && (
        <div className="crm-card-tag" style={{ marginTop: 2 }}>{lead.travelling_month}</div>
      )}
    </a>
  );
}

function DraggableLeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${isDragging ? 1.5 : 0}deg)`,
        opacity: isDragging ? 0.85 : 1,
        boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.15)' : undefined,
        zIndex: isDragging ? 50 : undefined,
      }
    : {};
  return (
    <div
      ref={setNodeRef}
      style={{ ...style, position: 'relative', touchAction: 'none' }}
    >
      <span
        {...listeners}
        {...attributes}
        aria-label="Drag lead"
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          cursor: 'grab',
          color: '#94A3B8',
          padding: 2,
        }}
      >
        <GripVertical size={14} />
      </span>
      <LeadCard lead={lead} />
    </div>
  );
}

function DroppableColumn({
  bucket, color, count, children,
}: {
  bucket: PriorityBucket;
  color: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket });
  return (
    <div
      ref={setNodeRef}
      className="crm-column"
      style={{
        outline: isOver ? `2px dashed ${color}` : undefined,
        background: isOver ? `${color}0f` : undefined,
        transition: 'background 0.15s, outline 0.15s',
      }}
    >
      <div className="crm-column-header">
        <span className="crm-column-dot" style={{ background: color }} />
        <span className="crm-column-title">{bucket}</span>
        <span className="crm-column-count">{count}</span>
      </div>
      <div className="crm-column-body">{children}</div>
    </div>
  );
}
