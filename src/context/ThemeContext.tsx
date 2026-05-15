import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';
type Theme = 'dark' | 'light';

interface ThemeContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  dir: 'rtl' | 'ltr';
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isMobile: boolean;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeContext');
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem('language') as Language) || 'ar'
  );
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) || 'dark'
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('language', lang);
    setLanguageState(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const setTheme = (t: Theme) => {
    localStorage.setItem('theme', t);
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
  };

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        language, setLanguage,
        theme, setTheme,
        dir: language === 'ar' ? 'rtl' : 'ltr',
        isSidebarOpen, setIsSidebarOpen,
        isMobile,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
