import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Bell, UserPlus, Phone, FileText, DollarSign, Receipt, RefreshCw, Sparkles, Info, Check, AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/cn';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

const ICON: Record<string, ReactNode> = {
  new_lead: <UserPlus className="h-4 w-4" />,
  follow_up_due: <Phone className="h-4 w-4" />,
  follow_up_overdue: <AlertTriangle className="h-4 w-4" />,
  quote_status: <FileText className="h-4 w-4" />,
  quote_viewed: <FileText className="h-4 w-4" />,
  payment_received: <DollarSign className="h-4 w-4" />,
  invoice_overdue: <Receipt className="h-4 w-4" />,
  sync_complete: <RefreshCw className="h-4 w-4" />,
  ai_complete: <Sparkles className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

function relTime(iso: string): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function dayBucket(iso: string): string {
  const d = new Date(iso); const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  const yDay = d.toDateString() === yest.toDateString();
  if (sameDay) return 'Today';
  if (yDay) return 'Yesterday';
  return 'Earlier';
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function refreshCount() {
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.count || 0);
    } catch { /* offline */ }
  }

  async function loadList() {
    try {
      const res = await fetch('/api/notifications?limit=50');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch { /* offline */ }
  }

  useEffect(() => {
    void refreshCount();
    const t = setInterval(refreshCount, 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open) void loadList();
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    setNotifications((cur) => cur.map((n) => n.id === id ? { ...n, read: true } : n));
    refreshCount();
  }
  async function markAllRead() {
    await fetch('/api/notifications/read-all', { method: 'PUT' });
    setNotifications((cur) => cur.map((n) => ({ ...n, read: true })));
    setCount(0);
  }

  const grouped = useMemo(() => {
    const g = new Map<string, AppNotification[]>();
    for (const n of notifications) {
      const b = dayBucket(n.createdAt);
      const list = g.get(b) || [];
      list.push(n);
      g.set(b, list);
    }
    return [...g.entries()];
  }, [notifications]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={`Notifications (${count} unread)`}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-[color:var(--color-muted-ink)] hover:bg-[color:var(--color-tint)] hover:text-[color:var(--color-ink)]"
      >
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[color:var(--color-brand-orange)] text-white text-[10px] font-bold inline-flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] shadow-[var(--shadow-soft-xl)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--color-hairline)]">
            <h3 className="font-heading text-sm font-bold">Notifications</h3>
            {count > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-semibold text-[color:var(--color-brand-orange)] hover:underline inline-flex items-center gap-1">
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Bell className="mx-auto h-6 w-6 text-[color:var(--color-muted-ink)] mb-2" />
                <p className="text-sm font-semibold">All caught up!</p>
                <p className="text-xs text-[color:var(--color-muted-ink)] mt-1">You&apos;ll see new leads, follow-ups, and quote updates here.</p>
              </div>
            ) : (
              grouped.map(([bucket, items]) => (
                <div key={bucket}>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-muted-ink)]">{bucket}</div>
                  <ul className="divide-y divide-[color:var(--color-hairline)]">
                    {items.map((n) => (
                      <li key={n.id}>
                        <a
                          href={n.link || '#'}
                          onClick={(e) => {
                            markRead(n.id);
                            if (!n.link) e.preventDefault();
                          }}
                          className={cn(
                            'flex items-start gap-3 px-4 py-3 hover:bg-[color:var(--color-tint)]',
                            !n.read && 'bg-[color:var(--color-brand-orange)]/[0.04]',
                          )}
                        >
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-tint)] text-[color:var(--color-muted-ink)]">
                            {ICON[n.type] || <Info className="h-4 w-4" />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn('text-sm font-semibold truncate flex-1', !n.read && 'text-[color:var(--color-ink)]')}>{n.title}</p>
                              {!n.read && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--color-brand-orange)]" />}
                            </div>
                            {n.message && <p className="text-xs text-[color:var(--color-muted-ink)] truncate">{n.message}</p>}
                            <p className="text-[10px] text-[color:var(--color-muted-ink)] mt-0.5">{relTime(n.createdAt)}</p>
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
