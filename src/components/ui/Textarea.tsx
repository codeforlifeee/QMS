import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, helperText, error, id, ...rest },
  ref,
) {
  const taId = id || `ta-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={taId} className="mb-1.5 block text-xs font-semibold text-[color:var(--color-ink)]">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={taId}
        className={cn(
          'min-h-[88px] w-full rounded-xl border bg-[color:var(--color-surface)] px-3.5 py-2.5 text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted-ink)]/70 transition-colors focus:outline-none focus:border-[color:var(--color-brand-orange)] focus:ring-2 focus:ring-[color:var(--color-brand-orange)]/20',
          error ? 'border-[color:var(--color-danger)]' : 'border-[color:var(--color-hairline)]',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p className="mt-1 text-xs text-[color:var(--color-danger)]">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-[color:var(--color-muted-ink)]">{helperText}</p>
      ) : null}
    </div>
  );
});
