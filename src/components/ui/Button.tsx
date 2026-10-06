import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors transition-transform duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-brand-orange)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary: 'bg-[color:var(--color-brand-orange)] text-white hover:bg-[color:var(--color-brand-orange-hover)]',
        secondary: 'bg-[color:var(--color-brand-teal)] text-white hover:bg-[color:var(--color-brand-teal-hover)]',
        outline: 'border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-tint)]',
        ghost: 'bg-transparent text-[color:var(--color-ink)] hover:bg-[color:var(--color-tint)]',
        danger: 'bg-[color:var(--color-danger)] text-white hover:brightness-110',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : leftIcon ? (
        <span className="inline-flex" aria-hidden="true">{leftIcon}</span>
      ) : null}
      {children}
      {!loading && rightIcon ? <span className="inline-flex" aria-hidden="true">{rightIcon}</span> : null}
    </button>
  );
});

export { buttonVariants };
