import { cn } from '../../lib/cn';

export interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  className?: string;
}

const colorMap = {
  default: 'bg-[color:var(--color-brand-orange)]',
  success: 'bg-[color:var(--color-success)]',
  warning: 'bg-[color:var(--color-warning)]',
  danger: 'bg-[color:var(--color-danger)]',
};

export function ProgressBar({ value, max = 100, variant = 'default', showLabel, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn('w-full', className)}>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--color-tint)]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorMap[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel ? (
        <div className="mt-1 text-xs tabular-nums text-[color:var(--color-muted-ink)]">{Math.round(pct)}%</div>
      ) : null}
    </div>
  );
}
