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

const STATUS_FILTERS: Array<{ label: string; value: Status | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Accepted', value: 'accepted' },
];

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
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');

  /* Fetch on mount */
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

  /* Filtered list */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return quotations.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (q) {
        const haystack = [item.title, item.reference, item.client?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [quotations, search, statusFilter]);

  /* Delete handler */
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

  /* ---- Render ---- */

  if (loading) {
    return (
      <div className="empty" style={{ padding: '32px', textAlign: 'center' }}>
        Loading quotations...
      </div>
    );
  }

  return (
    <div>
      {/* Search bar */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search by title, reference or client name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '1px solid var(--app-hairline)',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
          }}
        />
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className="pill"
            style={{
              cursor: 'pointer',
              border: 'none',
              background:
                statusFilter === f.value ? 'var(--app-teal)' : 'var(--app-tint)',
              color: statusFilter === f.value ? '#fff' : 'var(--app-teal)',
              padding: '4px 12px',
              fontSize: 12,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

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
