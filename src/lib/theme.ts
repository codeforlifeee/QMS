/* Theme management: light / dark / system with localStorage persistence. */

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'qms-theme';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === 'light' || v === 'dark') return v;
  return 'light';
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.setAttribute('data-theme', resolved);
}

export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent('qms-theme-change', { detail: { theme } }));
}

/* Snippet to run before any React hydration, inlined in <head> as an IIFE string. */
export const themeBootstrapScript = `
(function(){try{
  var v = localStorage.getItem('${STORAGE_KEY}') || 'light';
  var isDark = v === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}catch(e){}})();
`;
