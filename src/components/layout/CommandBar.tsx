import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, LayoutDashboard, Contact, FileText, Sparkles, Settings, BarChart3, FilePlus, X,
  Layout, Calendar, Package, Receipt, Users,
} from 'lucide-react';
import { cn } from '../../lib/cn';

interface Command { id: string; label: string; description?: string; href: string; icon: any; group: string }

const STATIC_COMMANDS: Command[] = [
  { id: 'go-dashboard', label: 'Dashboard', description: 'Overview and recent activity', href: '/', icon: LayoutDashboard, group: 'Navigate' },
  { id: 'go-leads', label: 'Leads', description: 'Pipeline and lead management', href: '/leads', icon: Contact, group: 'Navigate' },
  { id: 'go-quotes', label: 'Quotations', description: 'All quotations', href: '/quotations', icon: FileText, group: 'Navigate' },
  { id: 'go-ai', label: 'AI Generator', description: 'Generate a quote from lead data', href: '/quotations/generate', icon: Sparkles, group: 'Navigate' },
  { id: 'go-templates', label: 'Templates', description: 'Reusable quotation templates', href: '/templates', icon: Layout, group: 'Navigate' },
  { id: 'go-analytics', label: 'Analytics', description: 'KPIs and pipeline insights', href: '/analytics', icon: BarChart3, group: 'Navigate' },
  { id: 'go-calendar', label: 'Calendar', description: 'Follow-ups and tasks', href: '/calendar', icon: Calendar, group: 'Navigate' },
  { id: 'go-catalog', label: 'Catalog', description: 'Suppliers and inventory', href: '/catalog', icon: Package, group: 'Navigate' },
  { id: 'go-invoices', label: 'Invoices', description: 'Invoice list and payments', href: '/invoices', icon: Receipt, group: 'Navigate' },
  { id: 'go-settings', label: 'Settings', description: 'Preferences and config', href: '/settings', icon: Settings, group: 'Navigate' },
  { id: 'new-quote', label: 'New Manual Quote', description: 'Create from scratch', href: '/new', icon: FilePlus, group: 'Create' },
  { id: 'ai-quote', label: 'Generate with AI', description: '4-step quote pipeline', href: '/quotations/generate', icon: Sparkles, group: 'Create' },
];

const GROUP_ICON: Record<string, any> = { Leads: Users, Quotations: FileText, Templates: Layout };

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [dynamicResults, setDynamicResults] = useState<Command[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    const openHandler = () => setOpen(true);
    window.addEventListener('qms-command-open', openHandler);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('qms-command-open', openHandler);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelected(0);
      setQuery('');
    }
  }, [open]);

  // Server-side search (debounced) for leads / quotes / templates.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) { setDynamicResults([]); return; }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        const rows: Command[] = (data.results || []).map((r: any) => ({
          id: `dyn-${r.group}-${r.id}`,
          label: r.label,
          description: r.description,
          href: r.href,
          group: r.group,
          icon: GROUP_ICON[r.group] || FileText,
        }));
        setDynamicResults(rows);
      } catch { /* abort or network */ }
      finally { setSearching(false); }
    }, 160);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, open]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const staticHits = !q
      ? STATIC_COMMANDS
      : STATIC_COMMANDS.filter((c) => c.label.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q));
    return [...staticHits, ...dynamicResults];
  }, [query, dynamicResults]);

  const grouped = useMemo(() => {
    const m = new Map<string, Command[]>();
    for (const c of results) {
      const arr = m.get(c.group) ?? [];
      arr.push(c);
      m.set(c.group, arr);
    }
    return [...m.entries()];
  }, [results]);

  function go(cmd?: Command) {
    const c = cmd ?? results[selected];
    if (!c) return;
    window.location.href = c.href;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(results.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(); }
  }

  if (!open) return null;

  let runningIndex = -1;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true" aria-label="Command palette">
      <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl rounded-2xl bg-[color:var(--color-surface)] shadow-[var(--shadow-soft-xl)] border border-[color:var(--color-hairline)] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[color:var(--color-hairline)] px-4">
          <Search className="h-4 w-4 text-[color:var(--color-muted-ink)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search leads, quotes, templates…"
            className="h-12 w-full bg-transparent text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted-ink)]/70 focus:outline-none"
          />
          {searching && <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent text-[color:var(--color-muted-ink)]" aria-hidden="true" />}
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1 text-[color:var(--color-muted-ink)] hover:bg-[color:var(--color-tint)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {grouped.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[color:var(--color-muted-ink)]">No results. Try searching for leads, quotes, or pages.</div>
          ) : grouped.map(([group, items]) => (
            <div key={group} className="mb-2">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-muted-ink)]">{group}</div>
              {items.map((c) => {
                runningIndex++;
                const idx = runningIndex;
                const active = idx === selected;
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => go(c)}
                    onMouseEnter={() => setSelected(idx)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                      active ? 'bg-[color:var(--color-brand-orange)]/10 text-[color:var(--color-brand-orange)]' : 'text-[color:var(--color-ink)]',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{c.label}</div>
                      {c.description && <div className="text-xs text-[color:var(--color-muted-ink)] truncate">{c.description}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="border-t border-[color:var(--color-hairline)] px-4 py-2 flex items-center gap-3 text-[11px] text-[color:var(--color-muted-ink)]">
          <span><kbd className="rounded border border-[color:var(--color-hairline)] bg-[color:var(--color-tint)] px-1.5 py-0.5">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border border-[color:var(--color-hairline)] bg-[color:var(--color-tint)] px-1.5 py-0.5">↵</kbd> select</span>
          <span><kbd className="rounded border border-[color:var(--color-hairline)] bg-[color:var(--color-tint)] px-1.5 py-0.5">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
