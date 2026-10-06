import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { ReactNode } from 'react';

export interface KPICardProps {
  label: string;
  value: ReactNode;
  trend?: number;
  trendLabel?: string;
  icon?: ReactNode;
  sparkline?: ReactNode;
  highlight?: boolean;
  className?: string;
}

export function KPICard({ label, value, trend, trendLabel, icon, sparkline, highlight, className }: KPICardProps) {
  const dir = trend === undefined ? 'flat' : trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat';
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 bg-[color:var(--color-surface)] shadow-[var(--shadow-soft-sm)] transition-all hover:shadow-[var(--shadow-soft-md)]',
        highlight ? 'border-[color:var(--color-brand-orange)]/40 bg-gradient-to-br from-[color:var(--color-brand-orange)]/5 to-transparent' : 'border-[color:var(--color-hairline)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted-ink)]">{label}</div>
          <div className="mt-1.5 font-heading text-2xl font-bold text-[color:var(--color-ink)] tabular-nums">{value}</div>
        </div>
        {icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-tint)] text-[color:var(--color-muted-ink)]" aria-hidden="true">
            {icon}
          </div>
        ) : null}
      </div>
      {(trend !== undefined || sparkline) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          {trend !== undefined ? (
            <div
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                dir === 'up'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : dir === 'down'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                    : 'bg-[color:var(--color-tint)] text-[color:var(--color-muted-ink)]',
              )}
              aria-label={`${trend > 0 ? 'Up' : trend < 0 ? 'Down' : 'Flat'} ${Math.abs(trend)}%`}
            >
              {dir === 'up' ? <ArrowUp className="h-3 w-3" /> : dir === 'down' ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {Math.abs(trend)}%
              {trendLabel ? <span className="ml-0.5 font-normal opacity-70">{trendLabel}</span> : null}
            </div>
          ) : <span />}
          {sparkline ? <div className="h-8 w-20 shrink-0">{sparkline}</div> : null}
        </div>
      )}
    </div>
  );
}
