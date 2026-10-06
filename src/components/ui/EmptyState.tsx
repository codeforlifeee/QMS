import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 px-6 text-center', className)}>
      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-tint)] text-[color:var(--color-muted-ink)]" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h3 className="font-heading text-lg font-semibold text-[color:var(--color-ink)]">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-[color:var(--color-muted-ink)]">{description}</p> : null}
      {action ? <div className="mt-2 flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
