import { useEffect, useMemo, useState } from 'react';
import {
  Filter, LayoutGrid, Table as TableIcon, Sparkles, FilePlus, Edit3, Share2,
  Download, Trash2, FileText, Users, MapPin, Clock, Calendar, X,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { SearchInput } from './ui/SearchInput';
import { SegmentedControl } from './ui/SegmentedControl';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import { showToast } from './ui/Toast';
import { cn } from '../lib/cn';

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

const STATUS_VARIANT: Record<Status, 'warning' | 'info' | 'success' | 'default' | 'danger'> = {
  draft: 'warning',
  sent: 'info',
  accepted: 'success',
  expired: 'default',
  void: 'danger',
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
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

export default function QuotationList() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'card' | 'table'>('card');
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
        if (data.ok) setQuotations(data.quotations);
        else showToast('Failed to load quotations', 'error');
      })
      .catch(() => showToast('Failed to load quotations', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const uniqueDestinations = useMemo(() => {
    const s = new Set<string>();
    quotations.forEach((q) => { if (q.destination) s.add(q.destination); });
    return [...s].sort();
  }, [quotations]);

  const uniqueCurrencies = useMemo(() => {
    const s = new Set<string>();
    quotations.forEach((q) => { if (q.quoteCurrency) s.add(q.quoteCurrency); });
    return [...s].sort();
  }, [quotations]);

  const activeFilterCount = [destinationFilter, currencyFilter, fromLeadFilter, dateFrom, dateTo, nightsMin, nightsMax]
    .filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter(''); setDestinationFilter(''); setCurrencyFilter(''); setFromLeadFilter('');
    setDateFrom(''); setDateTo(''); setNightsMin(''); setNightsMax(''); setSortBy('newest');
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = quotations.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (q) {
        const hay = [item.title, item.reference, item.client?.name, item.destination]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (destinationFilter && item.destination !== destinationFilter) return false;
      if (currencyFilter && item.quoteCurrency !== currencyFilter) return false;
      if (fromLeadFilter === 'yes' && !item.lead_id) return false;
      if (fromLeadFilter === 'no' && item.lead_id) return false;
      if (dateFrom && new Date(item.createdAt) < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo); to.setHours(23, 59, 59);
        if (new Date(item.createdAt) > to) return false;
      }
      const n = nightsCount(item.days);
      if (nightsMin && n < parseInt(nightsMin, 10)) return false;
      if (nightsMax && n > parseInt(nightsMax, 10)) return false;
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
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return result;
  }, [quotations, search, statusFilter, destinationFilter, currencyFilter, fromLeadFilter, dateFrom, dateTo, nightsMin, nightsMax, sortBy]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    quotations.forEach((q) => { c[q.status] = (c[q.status] || 0) + 1; });
    return c;
  }, [quotations]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this quotation? This cannot be undone.')) return;
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
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[color:var(--color-ink)]">Quotations</h1>
          <p className="text-sm text-[color:var(--color-muted-ink)] mt-0.5">
            {loading ? 'Loading…' : `${filtered.length} of ${quotations.length} quotation${quotations.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<FilePlus className="h-4 w-4" />} onClick={() => (window.location.href = '/new')}>Manual quote</Button>
          <Button size="sm" leftIcon={<Sparkles className="h-4 w-4" />} onClick={() => (window.location.href = '/quotations/generate')}>AI generate</Button>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <Chip active={statusFilter === ''} onClick={() => setStatusFilter('')}>
          All <span className="ml-1 opacity-70">({quotations.length})</span>
        </Chip>
        {ALL_STATUSES.map((s) => (
          <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
            {STATUS_LABEL[s]} <span className="ml-1 opacity-70">({statusCounts[s] || 0})</span>
          </Chip>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[240px] max-w-md">
          <SearchInput
            placeholder="Search title, reference, client, destination…"
            value={search}
            onChange={setSearch}
          />
        </div>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="max-w-[180px]">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="updated">Recently updated</option>
          <option value="title">Title A→Z</option>
          <option value="client">Client A→Z</option>
          <option value="nights_desc">Nights (longest)</option>
          <option value="nights_asc">Nights (shortest)</option>
        </Select>
        <Button
          variant={showFilters ? 'primary' : 'outline'}
          size="sm"
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
        </Button>
        <SegmentedControl
          aria-label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'card', label: 'Cards', icon: <LayoutGrid className="h-4 w-4" /> },
            { value: 'table', label: 'Table', icon: <TableIcon className="h-4 w-4" /> },
          ]}
        />
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card variant="flat" className="bg-[color:var(--color-tint)] border-dashed">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select label="Destination" value={destinationFilter} onChange={(e) => setDestinationFilter(e.target.value)}>
              <option value="">All destinations</option>
              {uniqueDestinations.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Select label="Currency" value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
              <option value="">All currencies</option>
              {uniqueCurrencies.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="From a lead?" value={fromLeadFilter} onChange={(e) => setFromLeadFilter(e.target.value as any)}>
              <option value="">Any origin</option>
              <option value="yes">Only quotes from leads</option>
              <option value="no">Only standalone quotes</option>
            </Select>
            <Input label="Min nights" type="number" min={0} value={nightsMin} onChange={(e) => setNightsMin(e.target.value)} />
            <Input label="Max nights" type="number" min={0} value={nightsMax} onChange={(e) => setNightsMax(e.target.value)} />
            <Input label="Created from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input label="Created to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <div className="flex items-end">
              <Button variant="ghost" size="sm" leftIcon={<X className="h-4 w-4" />} onClick={clearFilters}>Clear filters</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} padding="md">
              <Skeleton className="h-5 w-2/3 mb-3" />
              <Skeleton variant="text" className="w-full mb-2" />
              <Skeleton variant="text" className="w-5/6 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title={quotations.length === 0 ? 'Create your first quotation' : 'No quotations match your filters'}
          description={quotations.length === 0
            ? 'Generate one with AI, build one manually, or import from a lead.'
            : 'Try adjusting your search or clearing filters.'}
          action={quotations.length === 0 ? (
            <>
              <Button size="sm" leftIcon={<Sparkles className="h-4 w-4" />} onClick={() => (window.location.href = '/quotations/generate')}>AI generate</Button>
              <Button size="sm" variant="outline" leftIcon={<FilePlus className="h-4 w-4" />} onClick={() => (window.location.href = '/new')}>Manual quote</Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>
          )}
        />
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((q) => (
            <QuoteCard key={q.id} q={q} onDelete={() => handleDelete(q.id)} />
          ))}
        </div>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-tint)] text-[11px] uppercase tracking-wide font-bold text-[color:var(--color-muted-ink)]">
                <tr>
                  <th className="text-left px-4 py-2.5">Title</th>
                  <th className="text-left px-4 py-2.5">Reference</th>
                  <th className="text-left px-4 py-2.5">Client</th>
                  <th className="text-left px-4 py-2.5">Destination</th>
                  <th className="text-left px-4 py-2.5">Pax</th>
                  <th className="text-left px-4 py-2.5">Nights</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">Created</th>
                  <th className="text-right px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-hairline)]">
                {filtered.map((q) => (
                  <tr key={q.id} className="hover:bg-[color:var(--color-tint)]/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[color:var(--color-ink)]">
                      <a href={`/edit/${q.id}`} className="hover:text-[color:var(--color-brand-orange)]">{q.title || 'Untitled'}</a>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[color:var(--color-muted-ink)]">{q.reference}</td>
                    <td className="px-4 py-3">{q.client?.name || '—'}</td>
                    <td className="px-4 py-3">{q.destination || '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{paxSummary(q.pax)}</td>
                    <td className="px-4 py-3 tabular-nums">{nightsCount(q.days)}N</td>
                    <td className="px-4 py-3"><Badge size="sm" variant={STATUS_VARIANT[q.status]}>{STATUS_LABEL[q.status]}</Badge></td>
                    <td className="px-4 py-3 text-xs text-[color:var(--color-muted-ink)] whitespace-nowrap">{formatDate(q.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconLink href={`/edit/${q.id}`} label="Edit"><Edit3 className="h-4 w-4" /></IconLink>
                        <IconLink href={`/q/${q.token}`} label="Share"><Share2 className="h-4 w-4" /></IconLink>
                        <IconLink href={`/api/pdf/${q.token}`} label="PDF"><Download className="h-4 w-4" /></IconLink>
                        <button
                          type="button"
                          onClick={() => handleDelete(q.id)}
                          aria-label="Delete"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--color-danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function IconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--color-muted-ink)] hover:bg-[color:var(--color-tint)] hover:text-[color:var(--color-ink)]"
    >
      {children}
    </a>
  );
}

function QuoteCard({ q, onDelete }: { q: Quotation; onDelete: () => void }) {
  const nights = nightsCount(q.days);
  return (
    <Card variant="interactive" padding="none" className="group flex flex-col overflow-hidden">
      <a href={`/edit/${q.id}`} className="block">
        <div
          className="h-24 bg-gradient-to-br from-[color:var(--color-brand-orange)]/20 via-[color:var(--color-brand-teal)]/20 to-[color:var(--color-brand-green)]/20 flex items-center justify-center relative"
        >
          <FileText className="h-10 w-10 text-[color:var(--color-ink)]/30 group-hover:scale-110 transition-transform" />
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <Badge size="sm" variant={STATUS_VARIANT[q.status]}>{STATUS_LABEL[q.status]}</Badge>
            {q.lead_id && <Badge size="sm" variant="info">From lead</Badge>}
            {q.version > 1 && <Badge size="sm" variant="outline">v{q.version}</Badge>}
          </div>
          <div className="absolute bottom-2 right-2">
            <Badge size="sm" variant="outline">{q.quoteCurrency || 'INR'}</Badge>
          </div>
        </div>
      </a>
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="min-w-0">
          <a href={`/edit/${q.id}`} className="block min-w-0">
            <h3 className="font-heading font-semibold text-[color:var(--color-ink)] text-base truncate group-hover:text-[color:var(--color-brand-orange)] transition-colors">{q.title || 'Untitled'}</h3>
          </a>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[color:var(--color-muted-ink)]">
            <span className="font-mono truncate">{q.reference}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <MetaRow icon={<Users className="h-3.5 w-3.5" />}>{q.client?.name || 'No client'}</MetaRow>
          <MetaRow icon={<MapPin className="h-3.5 w-3.5" />}>{q.destination || 'No destination'}</MetaRow>
          <MetaRow icon={<Clock className="h-3.5 w-3.5" />}>{nights}N · {paxSummary(q.pax)}</MetaRow>
          <MetaRow icon={<Calendar className="h-3.5 w-3.5" />}>{formatDate(q.createdAt)}</MetaRow>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-[color:var(--color-hairline)]">
          <div className="flex items-center gap-1">
            <IconLink href={`/edit/${q.id}`} label="Edit"><Edit3 className="h-4 w-4" /></IconLink>
            <IconLink href={`/q/${q.token}`} label="Share link"><Share2 className="h-4 w-4" /></IconLink>
            <IconLink href={`/api/pdf/${q.token}`} label="Download PDF"><Download className="h-4 w-4" /></IconLink>
          </div>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete quotation"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--color-danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function MetaRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0 text-[color:var(--color-muted-ink)]">
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}
