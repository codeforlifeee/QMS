import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const sideMap = {
  top: '-top-2 left-1/2 -translate-x-1/2 -translate-y-full',
  bottom: '-bottom-2 left-1/2 -translate-x-1/2 translate-y-full',
  left: 'top-1/2 -translate-y-1/2 -left-2 -translate-x-full',
  right: 'top-1/2 -translate-y-1/2 -right-2 translate-x-full',
};

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <span
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      {open ? (
        <span
          role="tooltip"
          className={cn(
            'absolute z-50 whitespace-nowrap rounded-md bg-[color:var(--color-ink)] px-2 py-1 text-xs font-medium text-[color:var(--color-canvas)] shadow-[var(--shadow-soft-md)] pointer-events-none',
            sideMap[side],
            className,
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
