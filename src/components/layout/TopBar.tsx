import { useEffect, useState } from 'react';
import { Menu, Search, ChevronRight } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { NotificationCenter } from './NotificationCenter';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/cn';

interface Crumb { label: string; href?: string }

function buildCrumbs(path: string): Crumb[] {
  if (path === '/') return [{ label: 'Dashboard' }];
  const parts = path.split('/').filter(Boolean);
  const out: Crumb[] = [{ label: 'Dashboard', href: '/' }];
  let acc = '';
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i] ?? '';
    acc += '/' + seg;
    let label = seg;
    if (label === 'leads') label = 'Leads';
    else if (label === 'quotations') label = 'Quotations';
    else if (label === 'generate') label = 'AI Generator';
    else if (label === 'edit') label = 'Edit';
    else if (label === 'new') label = 'New Quote';
    else if (label === 'settings') label = 'Settings';
    else label = decodeURIComponent(label);
    out.push({ label, href: i < parts.length - 1 ? acc : undefined });
  }
  return out;
}

export function TopBar({ currentPath, userName = 'Traverse Globe' }: { currentPath: string; userName?: string }) {
  const crumbs = buildCrumbs(currentPath);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openSidebar = () => window.dispatchEvent(new Event('qms-sidebar-open'));
  const openCommand = () => window.dispatchEvent(new Event('qms-command-open'));

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-14 border-b border-[color:var(--color-hairline)] px-4 lg:px-6 flex items-center gap-3 transition-colors',
        scrolled ? 'glass' : 'bg-[color:var(--color-surface)]',
      )}
    >
      <button
        type="button"
        onClick={openSidebar}
        aria-label="Open navigation"
        className="lg:hidden -ml-1 rounded-lg p-2 hover:bg-[color:var(--color-tint)]"
      >
        <Menu className="h-5 w-5" />
      </button>

      <nav aria-label="Breadcrumb" className="hidden sm:flex items-center min-w-0 text-sm">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center min-w-0">
            {i > 0 && <ChevronRight className="mx-1.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-muted-ink)]" aria-hidden="true" />}
            {c.href ? (
              <a href={c.href} className="truncate text-[color:var(--color-muted-ink)] hover:text-[color:var(--color-ink)]">{c.label}</a>
            ) : (
              <span className="truncate font-semibold text-[color:var(--color-ink)]">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        onClick={openCommand}
        aria-label="Search (Cmd+K)"
        className="hidden md:inline-flex items-center gap-2 rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-tint)] px-3 h-9 text-sm text-[color:var(--color-muted-ink)] hover:bg-[color:var(--color-surface)] min-w-[220px]"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search leads, quotes…</span>
        <kbd className="rounded border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] px-1.5 py-0.5 text-[10px] font-semibold">⌘K</kbd>
      </button>

      <button
        type="button"
        onClick={openCommand}
        aria-label="Search"
        className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-[color:var(--color-tint)]"
      >
        <Search className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
      </button>

      <NotificationCenter />

      <ThemeToggle />

      <Avatar name={userName} size="sm" />
    </header>
  );
}
