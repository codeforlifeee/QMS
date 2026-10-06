import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { getStoredTheme, setTheme, type Theme } from '../../lib/theme';
import { cn } from '../../lib/cn';

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setLocal] = useState<Theme>('light');

  useEffect(() => { setLocal(getStoredTheme()); }, []);

  const cycle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    setLocal(next);
  };

  const Icon = theme === 'light' ? Sun : Moon;
  const labels: Record<Theme, string> = { light: 'Light', dark: 'Dark' };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${labels[theme]} (click to change)`}
      title={`Theme: ${labels[theme]}`}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl text-[color:var(--color-muted-ink)] hover:bg-[color:var(--color-tint)] hover:text-[color:var(--color-ink)] transition-colors',
        className,
      )}
    >
      <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
    </button>
  );
}
