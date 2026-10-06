import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Contact, FileText, Sparkles, BarChart3, Calendar,
  Package, Receipt, Settings, PanelLeftClose, PanelLeftOpen, Layout,
} from 'lucide-react';
import { cn } from '../../lib/cn';

interface NavItem { href: string; label: string; icon: any; matcher?: (p: string) => boolean }

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Main',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard, matcher: (p) => p === '/' },
      { href: '/leads', label: 'Leads', icon: Contact, matcher: (p) => p.startsWith('/leads') },
      { href: '/quotations', label: 'Quotations', icon: FileText, matcher: (p) => p === '/quotations' || p.startsWith('/edit') || p === '/new' },
      { href: '/quotations/generate', label: 'AI Generator', icon: Sparkles, matcher: (p) => p.startsWith('/quotations/generate') },
      { href: '/templates', label: 'Templates', icon: Layout, matcher: (p) => p.startsWith('/templates') },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3, matcher: (p) => p.startsWith('/analytics') },
      { href: '/calendar', label: 'Calendar', icon: Calendar, matcher: (p) => p.startsWith('/calendar') },
      { href: '/catalog', label: 'Catalog', icon: Package, matcher: (p) => p.startsWith('/catalog') },
      { href: '/invoices', label: 'Invoices', icon: Receipt, matcher: (p) => p.startsWith('/invoices') },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/settings', label: 'Settings', icon: Settings, matcher: (p) => p.startsWith('/settings') }],
  },
];

const STORAGE_KEY = 'qms-sidebar-collapsed';

export function Sidebar({ currentPath }: { currentPath: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORAGE_KEY) === '1'); } catch {}
    const openHandler = () => setMobileOpen(true);
    const closeHandler = () => setMobileOpen(false);
    window.addEventListener('qms-sidebar-open', openHandler);
    window.addEventListener('qms-sidebar-close', closeHandler);
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('qms-sidebar-open', openHandler);
      window.removeEventListener('qms-sidebar-close', closeHandler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
      document.documentElement.style.setProperty('--sidebar-width', next ? '72px' : '240px');
      return next;
    });
  }

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '72px' : '240px');
  }, [collapsed]);

  const nav = (
    <>
      <div className="flex items-center justify-between px-4 h-14 border-b border-[color:var(--color-hairline)]">
        <a href="/" className="flex items-center gap-2 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-orange)] text-white font-heading font-bold">T</span>
          {!collapsed && (
            <span className="min-w-0">
              <div className="font-heading text-sm font-bold text-[color:var(--color-ink)] truncate">Traverse Globe</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-ink)]">QMS</div>
            </span>
          )}
        </a>
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Main navigation">
        {groups.map((g, gi) => (
          <div key={g.label} className={gi > 0 ? 'mt-5' : ''}>
            {!collapsed && (
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-muted-ink)]">
                {g.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = item.matcher ? item.matcher(currentPath) : currentPath === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                        active
                          ? 'bg-[color:var(--color-brand-orange)]/10 text-[color:var(--color-brand-orange)]'
                          : 'text-[color:var(--color-muted-ink)] hover:bg-[color:var(--color-tint)] hover:text-[color:var(--color-ink)]',
                        collapsed && 'justify-center',
                      )}
                    >
                      {active && (
                        <span aria-hidden="true" className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[color:var(--color-brand-orange)]" />
                      )}
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-[color:var(--color-hairline)] p-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs font-semibold text-[color:var(--color-muted-ink)] hover:bg-[color:var(--color-tint)] hover:text-[color:var(--color-ink)]',
            collapsed && 'justify-center',
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
          {!collapsed && <kbd className="ml-auto rounded border border-[color:var(--color-hairline)] px-1.5 py-0.5 text-[10px]">⌘B</kbd>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Sidebar"
        className={cn(
          'hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] transition-[width] duration-200',
          collapsed ? 'w-[72px]' : 'w-[240px]',
        )}
      >
        {nav}
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="relative flex h-full w-[260px] flex-col border-r border-[color:var(--color-hairline)] bg-[color:var(--color-surface)]">
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
