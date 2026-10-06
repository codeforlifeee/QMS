import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, helperText, error, leftIcon, rightIcon, id, ...rest },
  ref,
) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-[color:var(--color-ink)]">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted-ink)]" aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
          className={cn(
            'h-10 w-full rounded-xl border bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted-ink)]/70 transition-colors focus:outline-none focus:border-[color:var(--color-brand-orange)] focus:ring-2 focus:ring-[color:var(--color-brand-orange)]/20',
            leftIcon ? 'pl-10' : 'pl-3.5',
            rightIcon ? 'pr-10' : 'pr-3.5',
            error
              ? 'border-[color:var(--color-danger)] focus:border-[color:var(--color-danger)] focus:ring-[color:var(--color-danger)]/20'
              : 'border-[color:var(--color-hairline)]',
            className,
          )}
          {...rest}
        />
        {rightIcon ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted-ink)]" aria-hidden="true">
            {rightIcon}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-[color:var(--color-danger)]">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-help`} className="mt-1 text-xs text-[color:var(--color-muted-ink)]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});
