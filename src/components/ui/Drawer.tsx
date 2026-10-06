import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  side?: 'right' | 'left';
  children: ReactNode;
  width?: string;
  footer?: ReactNode;
}

export function Drawer({ open, onClose, title, side = 'right', children, width = 'max-w-md', footer }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute inset-0 bg-black/40" />
      <div
        className={cn(
          'absolute top-0 bottom-0 flex w-full flex-col bg-[color:var(--color-surface)] shadow-[var(--shadow-soft-xl)]',
          side === 'right' ? 'right-0' : 'left-0',
          width,
        )}
      >
        <div className="flex items-center justify-between border-b border-[color:var(--color-hairline)] p-5">
          <h2 className="font-heading text-lg font-semibold text-[color:var(--color-ink)]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-[color:var(--color-tint)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-[color:var(--color-hairline)] p-4">{footer}</div>}
      </div>
    </div>
  );
}
