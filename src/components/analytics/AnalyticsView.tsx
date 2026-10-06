import { useEffect, useMemo, useState } from 'react';
import {
  Users, Flame, FileText, DollarSign, Clock, TrendingUp, Download, Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { KPICard } from '../ui/KPICard';
import { Sparkline } from '../charts/Sparkline';
import { FunnelChart } from '../charts/FunnelChart';
import { DonutChart } from '../charts/DonutChart';
import { RevenueArea } from '../charts/AreaChart';
import { ProgressBar } from '../ui/ProgressBar';

type Period = '7d' | '30d' | '90d' | 'ytd';

interface Overview {
  period: string;
  windowDays: number;
  kpis: {
    totalLeads: number;
    leadsThisWindow: number;
    leadsPrevWindow: number;
    leadsDeltaPct: number;
    totalQuotes: number;
    conversionRate: number;
    acceptedCount: number;
    revenueThisWindow: number;
    revenueDeltaPct: number;
    avgQuoteValue: number;
    avgMarkupPct: number;
    followUpsDue: number;
  };
  statusCounts: Record<string, number>;
  funnel: Array<{ label: string; count: number }>;
  topDestinations: Array<{ name: string; value: number }>;
  topSources: Array<{ name: string; value: number }>;
  leadsOverTime: Array<{ label: string; value: number }>;
  quotesOverTime: Array<{ label: string; value: number }>;
  revenueOverTime: Array<{ label: string; value: number }>;
  agents: Array<{ name: string; quotes: number; accepted: number; revenue: number; conversion: number }>;
}

const fmtINR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function AnalyticsView() {
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/analytics/overview?period=${period}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('Failed to load')))
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [period]);

  const revenue = useMemo(() => data?.revenueOverTime ?? [], [data]);
  const leadsTrend = useMemo(() => data?.leadsOverTime.map((p) => p.value) ?? [], [data]);
  const quotesTrend = useMemo(() => data?.quotesOverTime.map((p) => p.value) ?? [], [data]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[] = ['metric,value'];
    const push = (k: string, v: any) => rows.push(`${k},${JSON.stringify(v)}`);
    push('period', data.period);
    push('total_leads', data.kpis.totalLeads);
    push('leads_this_window', data.kpis.leadsThisWindow);
    push('leads_delta_pct', data.kpis.leadsDeltaPct);
    push('total_quotes', data.kpis.totalQuotes);
    push('conversion_rate', data.kpis.conversionRate);
    push('revenue_this_window_minor', data.kpis.revenueThisWindow);
    push('revenue_delta_pct', data.kpis.revenueDeltaPct);
    for (const [k, v] of Object.entries(data.statusCounts)) push(`status_${k}`, v);
    for (const d of data.topDestinations) push(`destination_${d.name}`, d.value);
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qms-analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[color:var(--color-ink)]">Analytics</h1>
          <p className="text-sm text-[color:var(--color-muted-ink)] mt-0.5">Pipeline, conversion, and revenue insights.</p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            aria-label="Period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: '7d', label: '7D' },
              { value: '30d', label: '30D' },
              { value: '90d', label: '90D' },
              { value: 'ytd', label: 'YTD' },
            ]}
          />
          <Button size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={exportCsv} disabled={!data}>
            Export CSV
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      ) : error ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Analytics unavailable"
          description={error}
        />
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <KPICard
              label={`Leads · ${period}`}
              value={data.kpis.leadsThisWindow}
              trend={data.kpis.leadsDeltaPct}
              trendLabel={`of ${data.kpis.totalLeads}`}
              icon={<Users className="h-4 w-4" />}
              sparkline={leadsTrend.length ? <Sparkline data={leadsTrend} /> : undefined}
              highlight
            />
            <KPICard
              label="Conversion rate"
              value={`${data.kpis.conversionRate}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              sparkline={quotesTrend.length ? <Sparkline data={quotesTrend} color="#3B82F6" /> : undefined}
            />
            <KPICard
              label={`Revenue · ${period}`}
              value={fmtINR.format(Math.round(data.kpis.revenueThisWindow / 100))}
              trend={data.kpis.revenueDeltaPct}
              icon={<DollarSign className="h-4 w-4" />}
              sparkline={revenue.length ? <Sparkline data={revenue.map((p) => p.value)} color="#10B981" /> : undefined}
            />
            <KPICard
              label="Avg quote value"
              value={fmtINR.format(Math.round(data.kpis.avgQuoteValue / 100))}
              icon={<FileText className="h-4 w-4" />}
            />
            <KPICard
              label="Follow-ups due"
              value={data.kpis.followUpsDue}
              icon={<Clock className="h-4 w-4" />}
            />
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <Card className="lg:col-span-3">
              <CardHeader>
                <div>
                  <CardTitle>Revenue trend</CardTitle>
                  <p className="text-xs text-[color:var(--color-muted-ink)]">Accepted quotations in INR</p>
                </div>
                <Badge variant="brand" size="sm">INR</Badge>
              </CardHeader>
              {revenue.length > 0 ? (
                <RevenueArea data={revenue} color="#10B981" />
              ) : (
                <div className="py-12 text-center text-sm text-[color:var(--color-muted-ink)]">No accepted quotes in this window</div>
              )}
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Lead sources</CardTitle>
                  <p className="text-xs text-[color:var(--color-muted-ink)]">Volume by origin</p>
                </div>
              </CardHeader>
              <DonutChart
                data={data.topSources}
                centerLabel="Leads"
                centerValue={data.kpis.totalLeads}
              />
            </Card>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Lead funnel</CardTitle>
                  <p className="text-xs text-[color:var(--color-muted-ink)]">Pipeline distribution with drop-off</p>
                </div>
              </CardHeader>
              <FunnelChart stages={data.funnel} />
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Quotation status</CardTitle>
                  <p className="text-xs text-[color:var(--color-muted-ink)]">All-time counts</p>
                </div>
              </CardHeader>
              <ul className="space-y-2.5">
                {Object.entries(data.statusCounts).map(([k, v]) => {
                  const pct = data.kpis.totalQuotes ? (v / data.kpis.totalQuotes) * 100 : 0;
                  const variantMap: Record<string, 'warning' | 'info' | 'success' | 'default' | 'danger'> = {
                    draft: 'warning', sent: 'info', accepted: 'success', expired: 'default', void: 'danger',
                  };
                  return (
                    <li key={k} className="flex items-center gap-3">
                      <Badge size="sm" variant={variantMap[k] ?? 'default'}>{k}</Badge>
                      <div className="flex-1"><ProgressBar value={pct} variant={k === 'accepted' ? 'success' : k === 'void' ? 'danger' : 'default'} /></div>
                      <span className="text-sm tabular-nums text-[color:var(--color-muted-ink)] w-16 text-right">{v} · {Math.round(pct)}%</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          {/* Top destinations + agents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Top destinations</CardTitle>
                  <p className="text-xs text-[color:var(--color-muted-ink)]">Most quoted</p>
                </div>
              </CardHeader>
              {data.topDestinations.length === 0 ? (
                <p className="text-sm text-[color:var(--color-muted-ink)]">No destinations yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.topDestinations.map((d) => {
                    const max = data.topDestinations[0]?.value || 1;
                    const pct = (d.value / max) * 100;
                    return (
                      <li key={d.name} className="flex items-center gap-3">
                        <span className="text-sm font-semibold min-w-[6rem] truncate">{d.name}</span>
                        <div className="flex-1"><ProgressBar value={pct} /></div>
                        <span className="text-sm tabular-nums text-[color:var(--color-muted-ink)] w-8 text-right">{d.value}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Agent performance</CardTitle>
                  <p className="text-xs text-[color:var(--color-muted-ink)]">Quotes, accepted, conversion</p>
                </div>
              </CardHeader>
              {data.agents.length === 0 ? (
                <p className="text-sm text-[color:var(--color-muted-ink)]">No agent data yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wide text-[color:var(--color-muted-ink)] font-bold">
                      <tr>
                        <th className="py-2">Agent</th>
                        <th className="py-2 text-right">Quotes</th>
                        <th className="py-2 text-right">Accepted</th>
                        <th className="py-2 text-right">Conv.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--color-hairline)]">
                      {data.agents.map((a) => (
                        <tr key={a.name}>
                          <td className="py-2 font-semibold">{a.name}</td>
                          <td className="py-2 text-right tabular-nums">{a.quotes}</td>
                          <td className="py-2 text-right tabular-nums">{a.accepted}</td>
                          <td className="py-2 text-right tabular-nums">{Math.round(a.conversion)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[color:var(--color-muted-ink)]">
              <Loader2 className="h-3 w-3 animate-spin" /> Refreshing…
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
