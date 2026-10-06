import { LayoutDashboard, Contact, FileText, Sparkles, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/cn';

export function MobileTabBar({ currentPath }: { currentPath: string }) {
  const items = [
    { href: '/', label: 'Home', icon: LayoutDashboard, match: (p: string) => p === '/' },
    { href: '/leads', label: 'Leads', icon: Contact, match: (p: string) => p.startsWith('/leads') },
    { href: '/quotations', label: 'Quotes', icon: FileText, match: (p: string) => p === '/quotations' || p.startsWith('/edit') || p === '/new' },
    { href: '/quotations/generate', label: 'AI', icon: Sparkles, match: (p: string) => p.startsWith('/quotations/generate') },
    { href: '/settings', label: 'More', icon: MoreHorizontal, match: (p: string) => p.startsWith('/settings') },
  ];
  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 glass border-t border-[color:var(--color-hairline)] pb-safe"
    >
      <ul className="flex items-stretch">
        {items.map((it) => {
          const Icon = it.icon;
          const active = it.match(currentPath);
          return (
            <li key={it.href} className="flex-1">
              <a
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold',
                  active ? 'text-[color:var(--color-brand-orange)]' : 'text-[color:var(--color-muted-ink)]',
                )}
              >
                <Icon className="h-5 w-5" />
                {it.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
