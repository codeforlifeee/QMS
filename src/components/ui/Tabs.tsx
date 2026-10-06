import { createContext, useContext, useState, type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface TabsContext { value: string; setValue: (v: string) => void }
const Ctx = createContext<TabsContext | null>(null);

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
}

export function Tabs({ defaultValue, value: controlled, onValueChange, children, className, ...rest }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;
  const setValue = (v: string) => { if (controlled === undefined) setInternal(v); onValueChange?.(v); };
  return (
    <Ctx.Provider value={{ value, setValue }}>
      <div className={cn('', className)} {...rest}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn('flex gap-1 border-b border-[color:var(--color-hairline)] overflow-x-auto', className)}
      {...rest}
    />
  );
}

export interface TabsTriggerProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'onClick'> {
  value: string;
}

export function TabsTrigger({ value, className, children, ...rest }: TabsTriggerProps) {
  const ctx = useContext(Ctx)!;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setValue(value)}
      className={cn(
        'relative px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors -mb-px',
        active
          ? 'text-[color:var(--color-brand-orange)] border-b-2 border-[color:var(--color-brand-orange)]'
          : 'text-[color:var(--color-muted-ink)] hover:text-[color:var(--color-ink)] border-b-2 border-transparent',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, ...rest }: TabsContentProps) {
  const ctx = useContext(Ctx)!;
  if (ctx.value !== value) return null;
  return <div role="tabpanel" className={cn('pt-4', className)} {...rest} />;
}
