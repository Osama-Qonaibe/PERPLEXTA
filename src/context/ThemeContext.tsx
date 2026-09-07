import { secureStorage } from "@/lib/storage";
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ThemeSync } from '../utils/ThemeSync';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
  themeTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (secureStorage.getSync('perplexta_theme') as Theme) || (secureStorage.getSync('theme') as Theme) || 'system';
    } catch {
      return 'system';
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => ThemeSync.resolve(theme));
  const [themeTransitioning, setThemeTransitioning] = useState<boolean>(false);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeTransitioning(true);
    setThemeState(newTheme);
    try {
      secureStorage.set('perplexta_theme', newTheme);
      secureStorage.set('theme', newTheme);
    } catch (e) {}
    const res = ThemeSync.resolve(newTheme);
    setResolvedTheme(res);
    ThemeSync.apply(newTheme);

    requestAnimationFrame(() => {
      setTimeout(() => {
        setThemeTransitioning(false);
      }, 300);
    });
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        const res = ThemeSync.resolve('system');
        setResolvedTheme(res);
        ThemeSync.apply('system');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      (mediaQuery as any).addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        (mediaQuery as any).removeListener(handleChange);
      }
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, themeTransitioning }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeEngineProvider');
  }
  return context;
};
