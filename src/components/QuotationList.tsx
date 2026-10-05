import { useState, useEffect, useMemo } from 'react';
import { showToast } from './Toast';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Client {
  name: string;
  phone: string;
  email: string;
}

interface Pax {
  adults: number;
  children: number;
  infants: number;
}

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const ALL_STATUSES: Status[] = ['draft', 'sent', 'accepted', 'expired', 'void'];

type SortKey = 'newest' | 'oldest' | 'updated' | 'title' | 'client' | 'nights_desc' | 'nights_asc';

function paxSummary(pax: Pax): string {
  const bits: string[] = [`${pax.adults} Adult${pax.adults === 1 ? '' : 's'}`];
  if (pax.children > 0) bits.push(`${pax.children} Child${pax.children === 1 ? '' : 'ren'}`);
  if (pax.infants > 0) bits.push(`${pax.infants} Infant${pax.infants === 1 ? '' : 's'}`);
  return bits.join(', ');
}

function nightsCount(days: unknown[]): number {
  return Math.max(0, days.length - 1);
}

function pillClass(status: Status): string {
  switch (status) {
    case 'draft':
      return 'pill pill-draft';
    case 'sent':
      return 'pill pill-sent';
    case 'accepted':
      return 'pill pill-accepted';
    case 'expired':
      return 'pill pill-expired';
    case 'void':
      return 'pill pill-void';
    default:
      return 'pill';
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function QuotationList() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [statusFilter, setStatusFilter] = useState<Status | ''>('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [fromLeadFilter, setFromLeadFilter] = useState<'' | 'yes' | 'no'>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [nightsMin, setNightsMin] = useState('');
  const [nightsMax, setNightsMax] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('newest');

  useEffect(() => {
    fetch('/api/quotations')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setQuotations(data.quotations);
        } else {
          showToast('Failed to load quotations', 'error');
        }
      })
      .catch(() => showToast('Failed to load quotations', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const uniqueDestinations = useMemo(() => {
    const set = new Set<string>();
    quotations.forEach((q) => { if (q.destination) set.add(q.destination); });
    return Array.from(set).sort();
  }, [quotations]);

  const uniqueCurrencies = useMemo(() => {
    const set = new Set<string>();
    quotations.forEach((q) => { if (q.quoteCurrency) set.add(q.quoteCurrency); });
    return Array.from(set).sort();
  }, [quotations]);

  const activeFilterCount = [statusFilter, destinationFilter, currencyFilter, fromLeadFilter, dateFrom, dateTo, nightsMin, nightsMax]
    .filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter('');
    setDestinationFilter('');
    setCurrencyFilter('');
    setFromLeadFilter('');
    setDateFrom('');
    setDateTo('');
    setNightsMin('');
    setNightsMax('');
    setSortBy('newest');
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    let result = quotations.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;

      if (q) {
        const haystack = [item.title, item.reference, item.client?.name, item.destination]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (destinationFilter && item.destination !== destinationFilter) return false;
      if (currencyFilter && item.quoteCurrency !== currencyFilter) return false;

      if (fromLeadFilter === 'yes' && !item.lead_id) return false;
      if (fromLeadFilter === 'no' && item.lead_id) return false;

      if (dateFrom) {
        const d = new Date(item.createdAt);
        if (d < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const d = new Date(item.createdAt);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59);
        if (d > to) return false;
      }

      const nights = nightsCount(item.days);
      if (nightsMin && nights < parseInt(nightsMin)) return false;
      if (nightsMax && nights > parseInt(nightsMax)) return false;

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
  }, [quotations, search, statusFilter, destinationFilter, currencyFilter, fromLeadFilter, dateFrom, dateTo, nightsMin, nightsMax, sortBy]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;

    try {
      const res = await fetch('/api/quotations/save', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Delete failed');

      setQuotations((prev) => prev.filter((q) => q.id !== id));
      showToast('Quotation deleted', 'success');
    } catch {
      showToast('Failed to delete quotation', 'error');
    }
  };

  if (loading) {
    return (
      <div className="empty" style={{ padding: '32px', textAlign: 'center' }}>
        Loading quotations...
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="quot-toolbar">
        <div className="quot-toolbar-left">
          <span className="crm-count">{filtered.length} quotation{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="quot-toolbar-right">
          <input
            type="search"
            placeholder="Search title, reference, client, destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="crm-search"
            style={{ width: 280 }}
          />
          <button
            className={`btn btn-sm ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-grid">
            <div className="filter-field">
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | '')}>
                <option value="">All Statuses</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label>Destination</label>
              <select value={destinationFilter} onChange={(e) => setDestinationFilter(e.target.value)}>
                <option value="">All Destinations</option>
                {uniqueDestinations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label>Currency</label>
              <select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
                <option value="">All Currencies</option>
                {uniqueCurrencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label>From Lead</label>
              <select value={fromLeadFilter} onChange={(e) => setFromLeadFilter(e.target.value as '' | 'yes' | 'no')}>
                <option value="">All</option>
                <option value="yes">Linked to Lead</option>
                <option value="no">No Lead</option>
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
              <label>Min Nights</label>
              <input
                type="number"
                min="0"
                placeholder="Any"
                value={nightsMin}
                onChange={(e) => setNightsMin(e.target.value)}
              />
            </div>
            <div className="filter-field">
              <label>Max Nights</label>
              <input
                type="number"
                min="0"
                placeholder="Any"
                value={nightsMax}
                onChange={(e) => setNightsMax(e.target.value)}
              />
            </div>
            <div className="filter-field">
              <label>Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="updated">Recently Updated</option>
                <option value="title">Title A-Z</option>
                <option value="client">Client A-Z</option>
                <option value="nights_desc">Most Nights</option>
                <option value="nights_asc">Fewest Nights</option>
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

      {/* List */}
      {filtered.length === 0 ? (
        <div className="empty">
          <p>No quotations match your filters.</p>
        </div>
      ) : (
        filtered.map((q) => (
          <article key={q.id} className="quotation-card">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="title">{q.title || 'Untitled'}</div>
              <div className="meta">
                <span className={pillClass(q.status)}>{q.status}</span>
                {' · '}
                {q.reference}
                {' · '}
                {q.client?.name}
                {' · '}
                {paxSummary(q.pax)}, {nightsCount(q.days)}N
                {q.destination && (
                  <span
                    className="pill"
                    style={{ marginLeft: 6, background: '#ecfdf5', color: '#065f46' }}
                  >
                    {q.destination}
                  </span>
                )}
                {q.lead_id && (
                  <a
                    href={`/leads/${q.lead_id}`}
                    className="pill"
                    style={{
                      marginLeft: 6,
                      background: '#e0f2fe',
                      color: '#0369a1',
                      textDecoration: 'none',
                    }}
                  >
                    From Lead
                  </a>
                )}
                {q.version > 1 && (
                  <span
                    className="pill"
                    style={{ marginLeft: 6, background: '#f3e8ff', color: '#7c3aed' }}
                  >
                    v{q.version}
                  </span>
                )}
              </div>
              <div className="meta" style={{ marginTop: 4 }}>
                Created {formatDate(q.createdAt)}
                {q.quoteCurrency && <span style={{ marginLeft: 8, opacity: 0.7 }}>{q.quoteCurrency}</span>}
              </div>
            </div>

            <div className="actions">
              <a href={`/edit/${q.id}`} className="btn btn-sm">
                Edit
              </a>
              <a href={`/q/${q.token}`} className="btn btn-sm">
                Share
              </a>
              <a href={`/api/pdf/${q.token}`} className="btn btn-sm">
                PDF
              </a>
              <button
                className="btn btn-sm"
                style={{ color: 'var(--app-bad)', borderColor: 'var(--app-bad)' }}
                onClick={() => handleDelete(q.id)}
              >
                Delete
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
