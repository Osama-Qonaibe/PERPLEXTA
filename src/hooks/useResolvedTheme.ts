import { useTheme, Theme } from '../context/ThemeContext';
import { useAppContext } from '../context/AppContext';

export interface UseResolvedThemeReturn {
  resolvedTheme: 'dark' | 'light';
  isDark: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  themeTransitioning: boolean;
}

/**
 * Custom hook to standardize theme access across the application.
 * Derives the active resolved theme ('dark' | 'light') and control methods
 * directly from the single source of truth in ThemeContext / AppContext.
 */
export function useResolvedTheme(): UseResolvedThemeReturn {
  const themeCtx = useTheme();
  const appCtx = useAppContext();

  const theme: Theme = themeCtx?.theme || appCtx?.theme || 'system';
  const setTheme = themeCtx?.setTheme || appCtx?.setTheme || (() => {});
  const resolvedTheme: 'dark' | 'light' = themeCtx?.resolvedTheme || appCtx?.resolvedTheme || 'dark';
  const themeTransitioning = themeCtx?.themeTransitioning ?? appCtx?.themeTransitioning ?? false;

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return {
    resolvedTheme,
    isDark,
    theme,
    setTheme,
    toggleTheme,
    themeTransitioning,
  };
}

export default useResolvedTheme;
