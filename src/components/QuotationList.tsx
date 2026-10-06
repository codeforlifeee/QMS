import { useEffect, useMemo, useState } from 'react';
import {
  Filter, Sparkles, FilePlus, Edit3, Share2,
  Download, Trash2, FileText, RefreshCw, X,
} from 'lucide-react';
import { showToast } from './ui/Toast';

interface Client { name: string; phone: string; email: string }
interface Pax { adults: number; children: number; infants: number }
type Status = 'draft' | 'sent' | 'accepted' | 'expired' | 'void';

interface Quotation {
  id: string;
  token: string;
  status: Status;
  reference: string;
  title: string;
  destination: string;
  lead_id?: string | null;
  client: Client;
  pax: Pax;
  days: unknown[];
  lines: unknown[];
  quoteCurrency: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  parent_id?: string | null;
}

const ALL_STATUSES: Status[] = ['draft', 'sent', 'accepted', 'expired', 'void'];
type SortKey = 'newest' | 'oldest' | 'updated' | 'title' | 'client' | 'nights_desc' | 'nights_asc';

const STATUS_COLORS: Record<Status, string> = {
  draft: '#f59e0b',
  sent: '#3b82f6',
  accepted: '#22c55e',
  expired: '#6b7280',
  void: '#ef4444',
};

const STATUS_LABEL: Record<Status, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  expired: 'Expired',
  void: 'Void',
};

function paxSummary(pax: Pax): string {
  const bits = [`${pax.adults}A`];
  if (pax.children > 0) bits.push(`${pax.children}C`);
  if (pax.infants > 0) bits.push(`${pax.infants}I`);
  return bits.join('+');
}
function nightsCount(days: unknown[]): number { return Math.max(0, days.length - 1); }
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
  catch { return iso; }
}

export default function QuotationList() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [statusFilter, setStatusFilter] = useState<Status | ''>('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [fromLeadFilter, setFromLeadFilter] = useState<'' | 'yes' | 'no'>('');
  const [nightsMin, setNightsMin] = useState('');
  const [nightsMax, setNightsMax] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('newest');

  useEffect(() => {
    fetch('/api/quotations')
      .then((r) => r.json())
      .then((d) => setQuotations(d.quotations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const uniqueDestinations = useMemo(() => {
    return [...new Set(quotations.map((q) => q.destination).filter(Boolean))].sort();
  }, [quotations]);

  const uniqueCurrencies = useMemo(() => {
    return [...new Set(quotations.map((q) => q.quoteCurrency).filter(Boolean))].sort();
  }, [quotations]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    quotations.forEach((q) => { counts[q.status] = (counts[q.status] || 0) + 1; });
    return counts;
  }, [quotations]);

  const activeFilterCount = [statusFilter, destinationFilter, currencyFilter, fromLeadFilter, nightsMin, nightsMax, dateFrom, dateTo]
    .filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter('');
    setDestinationFilter('');
    setCurrencyFilter('');
    setFromLeadFilter('');
    setNightsMin('');
    setNightsMax('');
    setDateFrom('');
    setDateTo('');
  };

  const filtered = useMemo(() => {
    let result = quotations.filter((q) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !(q.title ?? '').toLowerCase().includes(s) &&
          !(q.reference ?? '').toLowerCase().includes(s) &&
          !(q.client?.name ?? '').toLowerCase().includes(s) &&
          !(q.destination ?? '').toLowerCase().includes(s)
        ) return false;
      }
      if (statusFilter && q.status !== statusFilter) return false;
      if (destinationFilter && q.destination !== destinationFilter) return false;
      if (currencyFilter && q.quoteCurrency !== currencyFilter) return false;
      if (fromLeadFilter === 'yes' && !q.lead_id) return false;
      if (fromLeadFilter === 'no' && q.lead_id) return false;
      const nights = nightsCount(q.days);
      if (nightsMin && nights < Number(nightsMin)) return false;
      if (nightsMax && nights > Number(nightsMax)) return false;
      if (dateFrom && new Date(q.createdAt) < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo); to.setHours(23, 59, 59);
        if (new Date(q.createdAt) > to) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'updated': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'title': return (a.title || '').localeCompare(b.title || '');
        case 'client': return (a.client?.name || '').localeCompare(b.client?.name || '');
        case 'nights_desc': return nightsCount(b.days) - nightsCount(a.days);
        case 'nights_asc': return nightsCount(a.days) - nightsCount(b.days);
        case 'newest':
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [quotations, search, statusFilter, destinationFilter, currencyFilter, fromLeadFilter, nightsMin, nightsMax, dateFrom, dateTo, sortBy]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this quotation?')) return;
    try {
      const res = await fetch(`/api/quotations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setQuotations((prev) => prev.filter((q) => q.id !== id));
        showToast('Quotation deleted', 'success');
      } else {
        showToast('Failed to delete', 'error');
      }
    } catch {
      showToast('Failed to delete', 'error');
    }
  }

  return (
    <div className="crm-pipeline">

      {/* ── Toolbar ── */}
      <div className="crm-toolbar">
        <div className="crm-toolbar-left">
          <h2>Quotations</h2>
          <span className="crm-count">
            {loading ? 'Loading…' : `${filtered.length} of ${quotations.length} quotation${quotations.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="crm-toolbar-right">
          <input
            type="search"
            placeholder="Search title, reference, client, destination…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="crm-search"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="crm-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="updated">Recently Updated</option>
            <option value="title">Title A→Z</option>
            <option value="client">Client A→Z</option>
            <option value="nights_desc">Nights (longest)</option>
            <option value="nights_asc">Nights (shortest)</option>
          </select>
          <button
            className={`btn btn-sm ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} style={{ marginRight: 4 }} />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          <button className="btn btn-sm" onClick={() => (window.location.href = '/new')}>
            <FilePlus size={14} style={{ marginRight: 4 }} />
            Manual Quote
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => (window.location.href = '/quotations/generate')}>
            <Sparkles size={14} style={{ marginRight: 4 }} />
            AI Generate
          </button>
        </div>
      </div>

      {/* ── Status chips ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0' }}>
        <button
          className={`btn btn-sm ${statusFilter === '' ? 'active' : ''}`}
          onClick={() => setStatusFilter('')}
        >
          All <span style={{ opacity: 0.65, marginLeft: 4 }}>({quotations.length})</span>
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            className={`btn btn-sm ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
          >
            {STATUS_LABEL[s]} <span style={{ opacity: 0.65, marginLeft: 4 }}>({statusCounts[s] || 0})</span>
          </button>
        ))}
      </div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-grid">
            <div className="filter-field">
              <label>Destination</label>
              <select value={destinationFilter} onChange={(e) => setDestinationFilter(e.target.value)}>
                <option value="">All destinations</option>
                {uniqueDestinations.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="filter-field">
              <label>Currency</label>
              <select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
                <option value="">All currencies</option>
                {uniqueCurrencies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="filter-field">
              <label>From a Lead?</label>
              <select value={fromLeadFilter} onChange={(e) => setFromLeadFilter(e.target.value as any)}>
                <option value="">Any origin</option>
                <option value="yes">Only from leads</option>
                <option value="no">Standalone only</option>
              </select>
            </div>
            <div className="filter-field">
              <label>Min Nights</label>
              <input type="number" min={0} value={nightsMin} onChange={(e) => setNightsMin(e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Max Nights</label>
              <input type="number" min={0} value={nightsMax} onChange={(e) => setNightsMax(e.target.value)} />
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

      {/* ── Table ── */}
      {loading ? (
        <div className="crm-loading">Loading quotations…</div>
      ) : (
        <div className="crm-list-view">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Reference</th>
                <th>Client</th>
                <th>Destination</th>
                <th>Pax</th>
                <th>Nights</th>
                <th>Status</th>
                <th>Created Time</th>
                <th>Last Modified</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-muted-ink)' }}>
                    <FileText style={{ display: 'inline-block', marginBottom: 8 }} size={28} />
                    <div>{quotations.length === 0 ? 'No quotations yet. Create your first one!' : 'No quotations match your filters.'}</div>
                  </td>
                </tr>
              ) : filtered.map((q) => (
                <tr key={q.id} className="crm-table-row">
                  <td className="crm-table-name">
                    <a href={`/edit/${q.id}`} style={{ color: 'inherit', textDecoration: 'none' }}
                      onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-brand-orange)')}
                      onMouseOut={(e) => (e.currentTarget.style.color = 'inherit')}
                    >
                      {q.title || 'Untitled'}
                    </a>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-muted-ink)' }}>{q.reference}</td>
                  <td>{q.client?.name || '—'}</td>
                  <td>{q.destination || '—'}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{paxSummary(q.pax)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{nightsCount(q.days)}N</td>
                  <td>
                    <span className="crm-bucket-pill" style={{ background: STATUS_COLORS[q.status] }}>
                      {STATUS_LABEL[q.status]}
                    </span>
                  </td>
                  <td className="crm-table-date">{formatDate(q.createdAt)}</td>
                  <td className="crm-table-date">{formatDate(q.updatedAt || q.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                      <a href={`/edit/${q.id}`} title="Edit"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ color: 'var(--color-muted-ink)' }}
                      ><Edit3 size={15} /></a>
                      <a href={`/q/${q.token}`} title="Share" target="_blank"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ color: 'var(--color-muted-ink)' }}
                      ><Share2 size={15} /></a>
                      <a href={`/api/pdf/${q.token}`} title="Download PDF"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ color: 'var(--color-muted-ink)' }}
                      ><Download size={15} /></a>
                      <button
                        type="button"
                        onClick={() => handleDelete(q.id)}
                        title="Delete"
                        style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--color-danger)', padding: 4 }}
                      ><Trash2 size={15} /></button>
                    </div>
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
