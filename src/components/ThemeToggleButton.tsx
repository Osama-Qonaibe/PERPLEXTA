import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useResolvedTheme } from '../hooks/useResolvedTheme';
import { triggerHaptic } from '../utils/haptics';

export interface ThemeToggleButtonProps {
  variant?: 'icon-button' | 'segmented' | 'dropdown';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  variant = 'icon-button',
  className = '',
  size = 'md',
  showLabel = false,
}) => {
  const { resolvedTheme, isDark, theme, setTheme, toggleTheme } = useResolvedTheme();
  const contextApp = useAppContext();

  const language = contextApp?.language || 'ar';
  const t = contextApp?.t || ((key: string) => key);

  if (variant === 'segmented') {
    return (
      <div 
        className={`flex items-center gap-1.5 p-1 bg-[var(--bg-input)] rounded-[var(--radius-sm)] border border-[var(--border-main)] transition-theme ${className}`}
        role="radiogroup"
        aria-label={language === 'ar' ? 'اختيار الثيم' : 'Select Theme'}
      >
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            setTheme('light');
          }}
          role="radio"
          aria-checked={theme === 'light'}
          aria-label={t('lightMode') || (language === 'ar' ? 'الثيم الفاتح' : 'Light Mode')}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[calc(var(--radius-sm)-2px)] text-[11px] font-bold uppercase tracking-wider transition-theme cursor-pointer select-none ${
            theme === 'light'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm font-black'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <Sun size={14} className="shrink-0" />
          <span>{t('lightMode') || (language === 'ar' ? 'فاتح' : 'Light')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            setTheme('dark');
          }}
          role="radio"
          aria-checked={theme === 'dark'}
          aria-label={t('darkMode') || (language === 'ar' ? 'الثيم الداكن' : 'Dark Mode')}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[calc(var(--radius-sm)-2px)] text-[11px] font-bold uppercase tracking-wider transition-theme cursor-pointer select-none ${
            theme === 'dark'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm font-black'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <Moon size={14} className="shrink-0" />
          <span>{t('darkMode') || (language === 'ar' ? 'داكن' : 'Dark')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            setTheme('system');
          }}
          role="radio"
          aria-checked={theme === 'system'}
          aria-label={t('systemMode') || (language === 'ar' ? 'حسب النظام' : 'System Theme')}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[calc(var(--radius-sm)-2px)] text-[11px] font-bold uppercase tracking-wider transition-theme cursor-pointer select-none ${
            theme === 'system'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm font-black'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <Monitor size={14} className="shrink-0" />
          <span>{t('systemMode') || (language === 'ar' ? 'النظام' : 'System')}</span>
        </button>
      </div>
    );
  }

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  const buttonDimensions = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-10 h-10';

  return (
    <button
      type="button"
      onClick={() => {
        triggerHaptic('medium');
        toggleTheme();
      }}
      aria-label={
        isDark
          ? (language === 'ar' ? 'تفعيل الثيم الفاتح' : 'Switch to Light Mode')
          : (language === 'ar' ? 'تفعيل الثيم الداكن' : 'Switch to Dark Mode')
      }
      aria-pressed={isDark}
      className={`flex items-center justify-center gap-2 ${buttonDimensions} rounded-[8px] bg-transparent border border-[var(--border-main)] hover:bg-[var(--surface-subtle)] active:scale-95 transition-theme group shrink-0 cursor-pointer ${className}`}
    >
      {isDark ? (
        <Sun size={iconSize} className="text-[var(--text-muted)] group-hover:text-[var(--fg-accent)] transition-theme" />
      ) : (
        <Moon size={iconSize} className="text-[var(--text-muted)] group-hover:text-[var(--fg-accent)] transition-theme" />
      )}
      {showLabel && (
        <span className="text-xs font-bold text-[var(--text-primary)]">
          {isDark
            ? (language === 'ar' ? 'فاتح' : 'Light')
            : (language === 'ar' ? 'داكن' : 'Dark')}
        </span>
      )}
    </button>
  );
};

export default ThemeToggleButton;
