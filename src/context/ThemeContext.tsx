import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Language, Theme } from '../types/user.types';
import { translations } from '../constants/translations';

interface ThemeContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  dir: 'rtl' | 'ltr';
  t: (key: string, params?: Record<string, any>) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      return (localStorage.getItem('language') as Language) || 'ar';
    } catch (e) {
      return 'ar';
    }
  });

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('theme') as Theme) || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    localStorage.setItem('theme', theme);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [language, theme]);

  const dir = useMemo(() => language === 'ar' ? 'rtl' : 'ltr', [language]);

  const t = (key: string, params?: Record<string, any>) => {
    const langSet = translations[language] as any;
    let text = langSet[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  };

  return (
    <ThemeContext.Provider value={{
      language, setLanguage, theme, setTheme, dir, t
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
