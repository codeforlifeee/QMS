import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, helperText, error, id, children, ...rest },
  ref,
) {
  const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={selectId} className="mb-1.5 block text-xs font-semibold text-[color:var(--color-ink)]">
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'h-10 w-full appearance-none rounded-xl border px-3.5 pr-10 text-sm transition-colors focus:outline-none focus:border-[color:var(--color-brand-orange)] focus:ring-2 focus:ring-[color:var(--color-brand-orange)]/20',
          'bg-[color:var(--color-surface)] text-[color:var(--color-ink)]',
          error ? 'border-[color:var(--color-danger)]' : 'border-[color:var(--color-hairline)]',
          'bg-[url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 20 20\'><path fill=\'none\' stroke=\'%23475569\' stroke-width=\'1.75\' stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M5 7.5l5 5 5-5\'/></svg>")] bg-no-repeat bg-[right_0.75rem_center]',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-[color:var(--color-danger)]">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-[color:var(--color-muted-ink)]">{helperText}</p>
      ) : null}
    </div>
  );
});
