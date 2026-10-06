import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { ReactNode } from 'react';

export interface ChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function Chip({ children, active, onClick, onRemove, className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
        active
          ? 'bg-[color:var(--color-brand-orange)] text-white border-[color:var(--color-brand-orange)]'
          : 'bg-[color:var(--color-surface)] text-[color:var(--color-ink)] border-[color:var(--color-hairline)] hover:bg-[color:var(--color-tint)]',
        onClick ? 'cursor-pointer' : '',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Remove filter"
          className="rounded-full hover:bg-black/10 p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}
