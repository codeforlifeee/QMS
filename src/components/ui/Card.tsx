import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const cardVariants = cva(
  'rounded-2xl bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)]',
  {
    variants: {
      variant: {
        default: 'shadow-[var(--shadow-soft-sm)]',
        elevated: 'shadow-[var(--shadow-soft-md)]',
        interactive:
          'shadow-[var(--shadow-soft-sm)] transition-all duration-150 hover:shadow-[var(--shadow-soft-lg)] hover:-translate-y-0.5 cursor-pointer',
        flat: 'shadow-none',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-5',
        lg: 'p-6',
      },
    },
    defaultVariants: { variant: 'default', padding: 'md' },
  }
);

export interface CardProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, padding, ...rest },
  ref,
) {
  return <div ref={ref} className={cn(cardVariants({ variant, padding }), className)} {...rest} />;
});

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-3 flex items-center justify-between', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-heading text-base font-semibold text-[color:var(--color-ink)]', className)} {...rest} />;
}

export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-[color:var(--color-muted-ink)]', className)} {...rest} />;
}

export function CardContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-4 flex items-center justify-end gap-2', className)} {...rest} />;
}
