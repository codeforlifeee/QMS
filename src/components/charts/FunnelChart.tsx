import { cn } from '../../lib/cn';

export interface FunnelStage { label: string; count: number }

export function FunnelChart({ stages, className }: { stages: FunnelStage[]; className?: string }) {
  const top = Math.max(1, ...stages.map((s) => s.count));
  const colors = [
    'from-sky-500/80 to-sky-400/80',
    'from-indigo-500/80 to-indigo-400/80',
    'from-amber-500/80 to-amber-400/80',
    'from-rose-500/80 to-rose-400/80',
    'from-emerald-500/80 to-emerald-400/80',
    'from-teal-500/80 to-teal-400/80',
  ];
  return (
    <div className={cn('space-y-2', className)}>
      {stages.map((s, i) => {
        const pct = (s.count / top) * 100;
        const prevPct = i === 0 ? 100 : ((stages[i - 1]?.count ?? 0) / top) * 100;
        const dropRate = i === 0 ? 0 : prevPct === 0 ? 0 : Math.max(0, Math.round(((prevPct - pct) / prevPct) * 100));
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-[color:var(--color-ink)]">{s.label}</span>
              <span className="tabular-nums text-[color:var(--color-muted-ink)]">
                {s.count}
                {i > 0 && dropRate > 0 && <span className="ml-2 text-rose-600 dark:text-rose-400">-{dropRate}%</span>}
              </span>
            </div>
            <div className="relative h-7 w-full rounded-lg bg-[color:var(--color-tint)] overflow-hidden">
              <div
                className={cn('h-full rounded-lg bg-gradient-to-r transition-all duration-500', colors[i % colors.length])}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
