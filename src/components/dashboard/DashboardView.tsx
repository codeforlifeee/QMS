import { useState } from 'react';
import {
  Users, Flame, TrendingUp, CalendarClock, FileText, Sparkles, FilePlus,
  Contact as ContactIcon, RefreshCw, ArrowRight, Clock, CheckCircle2,
} from 'lucide-react';
import { KPICard } from '../ui/KPICard';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { Sparkline } from '../charts/Sparkline';
import { FunnelChart } from '../charts/FunnelChart';
import { DonutChart } from '../charts/DonutChart';
import { RevenueArea } from '../charts/AreaChart';
import { Avatar } from '../ui/Avatar';

export interface DashboardViewProps {
  stats: Record<string, number>;
  totalLeads: number;
  followUpCount: number;
  recentLeads: Array<{ id: string; customer_name: string; city?: string | null; priority_bucket: string; updated_at: string; created_at: string; source?: string | null }>;
  recentQuotes: Array<{ id: string; title: string; reference: string; clientName: string; nights: number; total: string }>;
  totalQuotes: number;
  sources: Array<{ name: string; value: number }>;
  lastSync?: { time: string; source: string } | null;
}

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const rand = (seed: number) => {
  let x = seed;
  return () => (x = (x * 9301 + 49297) % 233280) / 233280;
};

function makeSpark(seed: number): number[] {
  const r = rand(seed);
  const base = 20 + r() * 10;
  return Array.from({ length: 14 }, (_, i) => Math.max(0, base + Math.sin(i / 2 + seed) * 8 + (r() - 0.5) * 6));
}

const daysLabel = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString();
};

export function DashboardView(props: DashboardViewProps) {
  const { stats, totalLeads, followUpCount, recentLeads, recentQuotes, totalQuotes, sources, lastSync } = props;
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const stages = [
    { label: 'Untouched', count: stats['Untouched'] ?? 0 },
    { label: 'My Hot', count: stats['My Hot'] ?? 0 },
    { label: 'In Progress', count: stats['In Progress'] ?? 0 },
    { label: 'Nurture', count: stats['Nurture'] ?? 0 },
    { label: 'Closed Won', count: stats['Closed Won'] ?? 0 },
  ];

  const revenueData = Array.from({ length: 10 }, (_, i) => ({
    label: `D${i + 1}`,
    value: 80000 + Math.round(Math.sin(i / 2) * 30000 + (i * 8000)),
  }));

  async function syncLeads() {
    setSyncing(true);
    try {
      const res = await fetch('/api/webhooks/sheets?source=manual', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast.show(`Imported ${data.imported} new leads from Google Sheets`, 'success');
        setTimeout(() => window.location.reload(), 900);
      } else {
        toast.show('Error syncing leads. Check the console.', 'error');
      }
    } catch {
      toast.show('Network error syncing leads.', 'error');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[color:var(--color-ink)]">
            {greet()}! <span className="text-[color:var(--color-muted-ink)] font-normal">Here&apos;s your day at a glance.</span>
          </h1>
          <p className="text-sm text-[color:var(--color-muted-ink)] mt-0.5">{today}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<RefreshCw className={syncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />} loading={syncing} onClick={syncLeads}>
              Sync leads
            </Button>
            <Button size="sm" leftIcon={<Sparkles className="h-4 w-4" />} onClick={() => (window.location.href = '/quotations/generate')}>
              Generate quote
            </Button>
          </div>
          {lastSync && (
            <span className="text-[10px] text-[color:var(--color-muted-ink)] mr-2">
              Last synced: {new Date(lastSync.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
              {' '}({lastSync.source === 'manual' ? 'Manual' : 'Auto'})
            </span>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KPICard
          label="Total leads"
          value={totalLeads}
          trend={totalLeads ? 12 : undefined}
          trendLabel="30d"
          icon={<Users className="h-4 w-4" />}
          sparkline={<Sparkline data={makeSpark(1)} />}
          highlight
        />
        <KPICard
          label="Hot leads"
          value={stats['My Hot'] ?? 0}
          trend={(stats['My Hot'] ?? 0) > 0 ? 8 : undefined}
          icon={<Flame className="h-4 w-4" />}
          sparkline={<Sparkline data={makeSpark(2)} color="#EF4444" />}
        />
        <KPICard
          label="In progress"
          value={stats['In Progress'] ?? 0}
          trend={-3}
          icon={<TrendingUp className="h-4 w-4" />}
          sparkline={<Sparkline data={makeSpark(3)} color="#3B82F6" />}
        />
        <KPICard
          label="Follow-ups due"
          value={followUpCount}
          icon={<CalendarClock className="h-4 w-4" />}
          sparkline={<Sparkline data={makeSpark(4)} color="#F59E0B" />}
        />
        <KPICard
          label="Quotations"
          value={totalQuotes}
          trend={totalQuotes ? 5 : undefined}
          icon={<FileText className="h-4 w-4" />}
          sparkline={<Sparkline data={makeSpark(5)} color="#10B981" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div>
              <CardTitle>Lead conversion funnel</CardTitle>
              <p className="text-xs text-[color:var(--color-muted-ink)]">Current pipeline distribution</p>
            </div>
            <Badge variant="outline" size="sm">Live</Badge>
          </CardHeader>
          <FunnelChart stages={stages} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Lead sources</CardTitle>
              <p className="text-xs text-[color:var(--color-muted-ink)]">Where leads come from</p>
            </div>
          </CardHeader>
          <DonutChart data={sources} centerLabel="Leads" centerValue={totalLeads} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div>
              <CardTitle>Quotations this month</CardTitle>
              <p className="text-xs text-[color:var(--color-muted-ink)]">Revenue trend (illustrative)</p>
            </div>
            <Badge variant="brand" size="sm">INR</Badge>
          </CardHeader>
          <RevenueArea data={revenueData} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Quick actions</CardTitle>
              <p className="text-xs text-[color:var(--color-muted-ink)]">Shortcuts for frequent tasks</p>
            </div>
          </CardHeader>
          <div className="grid grid-cols-2 gap-2">
            <a href="/leads" className="group flex flex-col gap-2 rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] p-3 hover:border-[#075056] hover:bg-[#075056]/5 transition-colors">
              <ContactIcon className="h-5 w-5 text-[color:var(--color-brand-teal)]" />
              <span className="text-sm font-semibold text-[color:var(--color-ink)]">View leads</span>
            </a>
            <a href="/quotations/generate" className="group flex flex-col gap-2 rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] p-3 hover:border-[#075056] hover:bg-[#075056]/5 transition-colors">
              <Sparkles className="h-5 w-5 text-[color:var(--color-brand-teal)]" />
              <span className="text-sm font-semibold text-[color:var(--color-ink)]">AI generate</span>
            </a>
            <a href="/new" className="group flex flex-col gap-2 rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] p-3 hover:border-[#075056] hover:bg-[#075056]/5 transition-colors">
              <FilePlus className="h-5 w-5 text-[color:var(--color-brand-teal)]" />
              <span className="text-sm font-semibold text-[color:var(--color-ink)]">Manual quote</span>
            </a>
            <a href="/quotations" className="group flex flex-col gap-2 rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] p-3 hover:border-[#075056] hover:bg-[#075056]/5 transition-colors">
              <FileText className="h-5 w-5 text-[color:var(--color-brand-teal)]" />
              <span className="text-sm font-semibold text-[color:var(--color-ink)]">All quotes</span>
            </a>
          </div>
        </Card>
      </div>

      {/* Lists row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent leads</CardTitle>
              <p className="text-xs text-[color:var(--color-muted-ink)]">Latest additions and updates</p>
            </div>
            <a href="/leads" className="text-xs font-semibold text-ink hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </a>
          </CardHeader>
          {recentLeads.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No leads yet"
              description="Sync from Google Sheets or add leads manually."
              action={<>
                <Button size="sm" variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={syncLeads} loading={syncing}>Sync leads</Button>
                <Button size="sm" onClick={() => (window.location.href = '/leads')}>Add lead</Button>
              </>}
            />
          ) : (
            <ul className="divide-y divide-[color:var(--color-hairline)] -mx-5">
              {recentLeads.map((l) => (
                <li key={l.id}>
                  <a href={`/leads/${l.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[color:var(--color-tint)] transition-colors">
                    <Avatar name={l.customer_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[color:var(--color-ink)] truncate">{l.customer_name}</div>
                      <div className="text-xs text-[color:var(--color-muted-ink)] truncate">
                        {l.city || 'No city'} · <Badge size="sm" variant={l.priority_bucket === 'My Hot' ? 'danger' : l.priority_bucket === 'In Progress' ? 'info' : 'default'}>{l.priority_bucket}</Badge>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-[color:var(--color-muted-ink)] inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(l.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent quotations</CardTitle>
              <p className="text-xs text-[color:var(--color-muted-ink)]">Latest drafts and sent quotes</p>
            </div>
            <a href="/quotations" className="text-xs font-semibold text-ink hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </a>
          </CardHeader>
          {recentQuotes.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No quotations yet"
              description="Create your first quotation with AI or build one manually."
              action={<>
                <Button size="sm" variant="outline" onClick={() => (window.location.href = '/new')}>Manual quote</Button>
                <Button size="sm" leftIcon={<Sparkles className="h-4 w-4" />} onClick={() => (window.location.href = '/quotations/generate')}>AI generate</Button>
              </>}
            />
          ) : (
            <ul className="divide-y divide-[color:var(--color-hairline)] -mx-5">
              {recentQuotes.map((q) => (
                <li key={q.id}>
                  <a href={`/edit/${q.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[color:var(--color-tint)] transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-teal)]/10 text-[color:var(--color-brand-teal)]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[color:var(--color-ink)] truncate">{q.title || 'Untitled'}</div>
                      <div className="text-xs text-[color:var(--color-muted-ink)] truncate">
                        {q.reference} · {q.clientName} · {q.nights}N
                      </div>
                    </div>
                    <span className="shrink-0 font-heading text-sm font-bold text-[color:var(--color-ink)] tabular-nums">{q.total}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Activity feed placeholder */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Activity</CardTitle>
            <p className="text-xs text-[color:var(--color-muted-ink)]">Latest events across your workspace</p>
          </div>
        </CardHeader>
        <ol className="relative border-l-2 border-[color:var(--color-hairline)] ml-2 space-y-4 pl-5">
          <li className="relative">
            <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-brand-green)] text-white"><CheckCircle2 className="h-3 w-3" /></span>
            <div className="text-sm"><strong>{totalLeads}</strong> leads tracked in your pipeline</div>
            <div className="text-xs text-[color:var(--color-muted-ink)]">Just now</div>
          </li>
          <li className="relative">
            <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-brand-orange)] text-white"><Sparkles className="h-3 w-3" /></span>
            <div className="text-sm">AI pipeline ready — generate quotations from leads in seconds</div>
            <div className="text-xs text-[color:var(--color-muted-ink)]">Today</div>
          </li>
          <li className="relative">
            <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-brand-teal)] text-white"><FileText className="h-3 w-3" /></span>
            <div className="text-sm"><strong>{totalQuotes}</strong> quotations saved</div>
            <div className="text-xs text-[color:var(--color-muted-ink)]">Today</div>
          </li>
        </ol>
      </Card>
    </div>
  );
}
