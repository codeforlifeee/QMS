import { Search, X } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange?: (value: string) => void;
  onClear?: () => void;
  loading?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, onChange, onClear, loading, value: controlled, defaultValue, ...rest },
  ref,
) {
  const [internal, setInternal] = useState<string>(String(defaultValue ?? ''));
  const value = controlled !== undefined ? String(controlled) : internal;
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[color:var(--color-muted-ink)]" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => {
          if (controlled === undefined) setInternal(e.target.value);
          onChange?.(e.target.value);
        }}
        className="h-10 w-full rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] pl-9 pr-9 text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted-ink)]/70 focus:outline-none focus:border-[color:var(--color-brand-orange)] focus:ring-2 focus:ring-[color:var(--color-brand-orange)]/20"
        {...rest}
      />
      {value && !loading ? (
        <button
          type="button"
          onClick={() => {
            if (controlled === undefined) setInternal('');
            onChange?.('');
            onClear?.();
          }}
          aria-label="Clear search"
          className="absolute right-2 rounded p-1 text-[color:var(--color-muted-ink)] hover:bg-[color:var(--color-tint)]"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
      {loading ? (
        <span className="absolute right-3 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-[color:var(--color-muted-ink)]" aria-hidden="true" />
      ) : null}
    </div>
  );
});
