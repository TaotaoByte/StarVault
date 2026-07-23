import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

export const themes: Record<ThemeMode, Record<string, string>> = {
  light: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f8fafc',
    '--bg-tertiary': '#f1f5f9',
    '--text-primary': '#0f172a',
    '--text-secondary': '#475569',
    '--text-tertiary': '#94a3b8',
    '--border': '#e2e8f0',
    '--accent': '#3b82f6',
    '--accent-hover': '#2563eb',
    '--success': '#22c55e',
    '--warning': '#f59e0b',
    '--danger': '#ef4444',
    '--github': '#24292f',
    '--card-shadow': '0 1px 3px rgba(0,0,0,0.1)',
  },
  dark: {
    '--bg-primary': '#0f172a',
    '--bg-secondary': '#1e293b',
    '--bg-tertiary': '#334155',
    '--text-primary': '#f8fafc',
    '--text-secondary': '#cbd5e1',
    '--text-tertiary': '#64748b',
    '--border': '#334155',
    '--accent': '#60a5fa',
    '--accent-hover': '#3b82f6',
    '--success': '#4ade80',
    '--warning': '#fbbf24',
    '--danger': '#f87171',
    '--github': '#f0f6fc',
    '--card-shadow': '0 1px 3px rgba(0,0,0,0.3)',
  },
};

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  const vars = themes[theme];
  for (const [key, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(key, value);
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('sv-theme') as ThemeMode | null;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('sv-theme', theme);
  }, [theme]);

  const setTheme = (value: ThemeMode) => setThemeState(value);
  const toggle = () => setThemeState(t => (t === 'light' ? 'dark' : 'light'));

  return { theme, setTheme, toggle };
}
