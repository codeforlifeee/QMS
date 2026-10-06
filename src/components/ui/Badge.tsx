import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-[color:var(--color-tint)] text-[color:var(--color-ink)]',
        success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
        warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
        danger: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
        info: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
        brand: 'bg-[color:var(--color-brand-orange)]/15 text-[color:var(--color-brand-orange)]',
        outline: 'border border-[color:var(--color-hairline)] text-[color:var(--color-ink)]',
      },
      size: {
        sm: 'text-[11px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-1',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, size, ...rest },
  ref,
) {
  return <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...rest} />;
});
