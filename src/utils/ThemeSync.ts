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

  // Single-source requestAnimationFrame-based update loop for CSS variables, classList, and meta tags
  // ensuring zero-flicker transitions across all elements and sections simultaneously.
  requestAnimationFrame(() => {
    const root = document.documentElement;
    const meta = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]');

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.setProperty('--bg-base', '#000000');
      root.style.setProperty('--bg-surface', '#0A0A0A');
      root.style.setProperty('--bg-secondary', '#141414');
      root.style.setProperty('--bg-dropdown', '#141414');
      root.style.setProperty('--bg-hover', '#1F1F1F');
      root.style.setProperty('--bg-input', '#1A1A1A');
      root.style.setProperty('--text-primary', '#FFFFFF');
      root.style.setProperty('--text-secondary', '#B3B3B3');
      root.style.setProperty('--text-muted', '#808080');
      root.style.setProperty('--border-subtle', '#2A2A2A');
      root.style.setProperty('--border-main', '#333333');
      root.style.setProperty('--border', '#333333');
      root.style.setProperty('--pwa-theme-color', '#000000');
      root.style.setProperty('color-scheme', 'dark');
      root.style.backgroundColor = '#000000';
      root.style.color = '#FFFFFF';
      if (meta) meta.setAttribute('content', '#000000');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.setProperty('--bg-base', '#FFFFFF');
      root.style.setProperty('--bg-surface', '#FFFFFF');
      root.style.setProperty('--bg-secondary', '#F5F5F5');
      root.style.setProperty('--bg-dropdown', '#FFFFFF');
      root.style.setProperty('--bg-hover', '#EFEFEF');
      root.style.setProperty('--bg-input', '#F5F5F5');
      root.style.setProperty('--text-primary', '#000000');
      root.style.setProperty('--text-secondary', '#4D4D4D');
      root.style.setProperty('--text-muted', '#808080');
      root.style.setProperty('--border-subtle', '#E5E5E5');
      root.style.setProperty('--border-main', '#D4D4D4');
      root.style.setProperty('--border', '#E5E5E5');
      root.style.setProperty('--pwa-theme-color', '#FFFFFF');
      root.style.setProperty('color-scheme', 'light');
      root.style.backgroundColor = '#FFFFFF';
      root.style.color = '#000000';
      if (meta) meta.setAttribute('content', '#FFFFFF');
    }
  });
};

export const ThemeSync = {
  apply: applyThemeWithRAF,
  resolve: getResolvedTheme,
};

export default ThemeSync;
