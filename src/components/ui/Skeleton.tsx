import { cn } from '../../lib/cn';
import type { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'rect' | 'text' | 'circle';
}

export function Skeleton({ className, variant = 'rect', ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'skeleton-pulse bg-[color:var(--color-tint)]',
        variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded h-4' : 'rounded-xl',
        className,
      )}
      {...rest}
    />
  );
}
