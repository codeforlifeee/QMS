import type { APIRoute } from 'astro';
import { getRepo } from '../../../data/repo.js';
import { toEngineInput } from '../../../data/schema.js';
import { priceQuotation } from '../../../pricing/engine.js';

export const prerender = false;

/**
 * Aggregated analytics across quotations + leads. All work happens
 * server-side so the client only receives small summary rows.
 */
export const GET: APIRoute = async ({ url }) => {
  const period = url.searchParams.get('period') || '30d';
  const now = new Date();
  const windowDays = period === '7d' ? 7 : period === '90d' ? 90 : period === 'ytd' ? dayOfYear(now) : 30;
  const since = new Date(now.getTime() - windowDays * 86400_000);
  const prevSince = new Date(since.getTime() - windowDays * 86400_000);

  const repo = await getRepo();
  const quotations = await repo.list();

  // Build daily buckets for the active window.
  const dailyLeads: Record<string, number> = {};
  const dailyQuotes: Record<string, number> = {};
  const dailyRevenue: Record<string, number> = {}; // in INR minor units
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(since.getTime() + i * 86400_000);
    const key = iso(d);
    dailyLeads[key] = 0;
    dailyQuotes[key] = 0;
    dailyRevenue[key] = 0;
  }

  // Quotation stats
  const statusCounts: Record<string, number> = { draft: 0, sent: 0, accepted: 0, expired: 0, void: 0 };
  const destinationCounts: Record<string, number> = {};
  const agentStats: Record<string, { quotes: number; accepted: number; revenue: number }> = {};
  let totalRevenueThisWindow = 0;
  let totalAcceptedThisWindow = 0;
  let totalRevenuePrevWindow = 0;
  let avgMarkupSum = 0;
  let avgMarkupCount = 0;

  for (const q of quotations) {
    const createdAt = new Date(q.createdAt || q.updatedAt || now);
    const inWindow = createdAt >= since;
    const inPrev = !inWindow && createdAt >= prevSince;
    statusCounts[q.status] = (statusCounts[q.status] ?? 0) + 1;
    if (q.destination) destinationCounts[q.destination] = (destinationCounts[q.destination] ?? 0) + 1;
    const agent = (q as any).agentName || 'Unassigned';
    agentStats[agent] ??= { quotes: 0, accepted: 0, revenue: 0 };
    agentStats[agent].quotes += 1;

    let total = 0;
    try {
      const r = priceQuotation(toEngineInput(q));
      total = Number(r.grandTotal.minor ?? 0);
    } catch { /* ignore unpriceable */ }

    if (q.flatMarkupPct !== undefined) {
      avgMarkupSum += q.flatMarkupPct;
      avgMarkupCount++;
    }

    if (inWindow) {
      const dayKey = iso(createdAt);
      if (dayKey in dailyQuotes) dailyQuotes[dayKey]! += 1;
      if (q.status === 'accepted') {
        if (dayKey in dailyRevenue) dailyRevenue[dayKey]! += total;
        totalRevenueThisWindow += total;
        totalAcceptedThisWindow += 1;
        agentStats[agent].accepted += 1;
        agentStats[agent].revenue += total;
      }
    } else if (inPrev && q.status === 'accepted') {
      totalRevenuePrevWindow += total;
    }
  }

  // Leads (optional — Supabase may not be configured)
  let totalLeads = 0;
  let leadsThisWindow = 0;
  let leadsPrevWindow = 0;
  let followUpsDue = 0;
  const bucketCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  try {
    const { leadRepo } = await import('../../../data/leadRepo.js');
    const [stats, leads, followUps] = await Promise.all([
      leadRepo.getStats(),
      leadRepo.list(),
      leadRepo.getFollowUpsDue(),
    ]);
    Object.assign(bucketCounts, stats);
    totalLeads = leads.length;
    followUpsDue = followUps.length;
    for (const l of leads) {
      const created = new Date((l as any).created_at || now);
      if (created >= since) {
        leadsThisWindow++;
        const key = iso(created);
        if (key in dailyLeads) dailyLeads[key]! += 1;
      } else if (created >= prevSince) {
        leadsPrevWindow++;
      }
      const src = (l as any).source || 'Direct';
      sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
    }
  } catch { /* no supabase */ }

  const sentCount = statusCounts.sent ?? 0;
  const acceptedCount = statusCounts.accepted ?? 0;
  const conversionRate = sentCount + acceptedCount > 0
    ? (acceptedCount / (sentCount + acceptedCount)) * 100
    : 0;

  const avgQuoteValue = totalAcceptedThisWindow > 0 ? totalRevenueThisWindow / totalAcceptedThisWindow : 0;

  const topDestinations = Object.entries(destinationCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const topSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const funnel = [
    { label: 'Untouched', count: bucketCounts['Untouched Leads'] ?? bucketCounts['Untouched'] ?? 0 },
    { label: 'Called', count: bucketCounts['Call Not Connected'] ?? 0 },
    { label: 'In Progress', count: bucketCounts['In Progress'] ?? 0 },
    { label: 'Hot', count: bucketCounts['My Hot'] ?? 0 },
    { label: 'Warm', count: bucketCounts['Warm Lead'] ?? 0 },
    { label: 'Rejected', count: bucketCounts['Rejected'] ?? 0 },
  ];

  const trendDays = Object.keys(dailyLeads).sort();
  const leadsOverTime = trendDays.map((d) => ({ label: d.slice(5), value: dailyLeads[d] ?? 0 }));
  const quotesOverTime = trendDays.map((d) => ({ label: d.slice(5), value: dailyQuotes[d] ?? 0 }));
  const revenueOverTime = trendDays.map((d) => ({ label: d.slice(5), value: Math.round((dailyRevenue[d] ?? 0) / 100) }));

  const agentRows = Object.entries(agentStats)
    .map(([name, s]) => ({ name, ...s, conversion: s.quotes > 0 ? (s.accepted / s.quotes) * 100 : 0 }))
    .sort((a, b) => b.quotes - a.quotes);

  return json({
    period,
    windowDays,
    kpis: {
      totalLeads,
      leadsThisWindow,
      leadsPrevWindow,
      leadsDeltaPct: pctChange(leadsThisWindow, leadsPrevWindow),
      totalQuotes: quotations.length,
      conversionRate: Math.round(conversionRate * 10) / 10,
      acceptedCount: totalAcceptedThisWindow,
      revenueThisWindow: totalRevenueThisWindow,
      revenueDeltaPct: pctChange(totalRevenueThisWindow, totalRevenuePrevWindow),
      avgQuoteValue,
      avgMarkupPct: avgMarkupCount > 0 ? Math.round(avgMarkupSum / avgMarkupCount) : 0,
      followUpsDue,
    },
    statusCounts,
    funnel,
    topDestinations,
    topSources,
    leadsOverTime,
    quotesOverTime,
    revenueOverTime,
    agents: agentRows,
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
function iso(d: Date): string { return d.toISOString().slice(0, 10); }
function pctChange(a: number, b: number): number {
  if (b === 0) return a > 0 ? 100 : 0;
  return Math.round(((a - b) / b) * 1000) / 10;
}
function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400_000);
}
