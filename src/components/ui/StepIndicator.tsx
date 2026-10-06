import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface Step { label: string; description?: string }

export interface StepIndicatorProps {
  steps: Step[];
  current: number;
  className?: string;
}

export function StepIndicator({ steps, current, className }: StepIndicatorProps) {
  return (
    <ol className={cn('flex items-center w-full gap-2', className)} aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.label} className="flex-1 flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                  done
                    ? 'bg-[color:var(--color-brand-green)] border-[color:var(--color-brand-green)] text-white'
                    : active
                      ? 'bg-[color:var(--color-brand-orange)] border-[color:var(--color-brand-orange)] text-white animate-pulse'
                      : 'bg-[color:var(--color-surface)] border-[color:var(--color-hairline)] text-[color:var(--color-muted-ink)]',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <div className="min-w-0">
                <div className={cn('text-xs font-semibold truncate', active || done ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-muted-ink)]')}>
                  {step.label}
                </div>
                {step.description ? <div className="text-[11px] text-[color:var(--color-muted-ink)] truncate">{step.description}</div> : null}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-0.5 flex-1 rounded', done ? 'bg-[color:var(--color-brand-green)]' : 'bg-[color:var(--color-hairline)]')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
