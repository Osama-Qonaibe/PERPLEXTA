export type ThemeMode = 'dark' | 'light' | 'system';

export const getResolvedTheme = (theme: ThemeMode): 'dark' | 'light' => {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

export const loadAndApplyCustomTheme = async (resolved: 'dark' | 'light') => {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/theme-customizations');
    if (res.ok) {
      const data = await res.json();
      const modeTokens = data.customizations?.[resolved] || {};
      const root = document.documentElement;
      for (const [key, val] of Object.entries(modeTokens)) {
        if (typeof val === 'string' && val) {
          root.style.setProperty(key, val);
        }
      }
    }
  } catch (err) {
    // Fallback silently
  }
};

export const applyThemeWithRAF = (theme: ThemeMode) => {
  if (typeof window === 'undefined') return;

  const resolved = getResolvedTheme(theme);
  const isDark = resolved === 'dark';

  const root = document.documentElement;
  const meta = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]');

  if (isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
    if (meta) meta.setAttribute('content', '#181715');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    if (meta) meta.setAttribute('content', '#faf9f5');
  }

  // Load and apply custom theme tokens from DB
  loadAndApplyCustomTheme(resolved);

  // Synchronize Sovereign Template
  try {
    const savedTemplate = localStorage.getItem('perplexta_template');
    if (savedTemplate && !root.hasAttribute('data-template')) {
      root.setAttribute('data-template', savedTemplate);
    }
  } catch {
    // Ignore sandbox storage error
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('perplexta_theme_updated', () => {
    const theme = (localStorage.getItem('perplexta_theme') || 'dark') as ThemeMode;
    applyThemeWithRAF(theme);
  });
}

export const ThemeSync = {
  apply: applyThemeWithRAF,
  resolve: getResolvedTheme,
};

export default ThemeSync;
