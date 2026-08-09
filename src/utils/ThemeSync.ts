export type ThemeMode = 'dark' | 'light' | 'system';

export const getResolvedTheme = (theme: ThemeMode): 'dark' | 'light' => {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

export const applyThemeWithRAF = (theme: ThemeMode) => {
  if (typeof window === 'undefined') return;

  const resolved = getResolvedTheme(theme);
  const isDark = resolved === 'dark';

  requestAnimationFrame(() => {
    const root = document.documentElement;
    const meta = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]');

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      if (meta) meta.setAttribute('content', '#0b0b0d');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      if (meta) meta.setAttribute('content', '#f8fafc');
    }

    // Remove any legacy inline style overrides on root so index.css rules control tokens cleanly
    root.style.backgroundColor = '';
    root.style.color = '';
  });
};

export const ThemeSync = {
  apply: applyThemeWithRAF,
  resolve: getResolvedTheme,
};

export default ThemeSync;
