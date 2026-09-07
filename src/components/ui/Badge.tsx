import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps {
  variant?: 'default' | 'accent' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'xs' | 'sm' | 'md';
  hasPulse?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'sm',
  hasPulse = false,
  children,
  className,
}) => {
  const variantStyles = {
    default: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-main)]',
    accent: 'bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] border-[var(--border-accent)]/30',
    success: 'bg-[var(--bg-success-muted)] text-[var(--fg-success)] border-[var(--fg-success)]/20',
    danger: 'bg-[var(--bg-danger-muted)] text-[var(--fg-danger)] border-[var(--fg-danger)]/20',
    warning: 'bg-[var(--bg-warning-muted)] text-[var(--fg-warning)] border-[var(--fg-warning)]/20',
    info: 'bg-[var(--bg-info-muted)] text-[var(--fg-info)] border-[var(--fg-info)]/20',
  };

  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-[var(--radius-xs)]',
    sm: 'px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-[var(--radius-xs)]',
    md: 'px-2.5 py-1 text-xs font-bold rounded-[var(--radius-sm)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {hasPulse && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0 animate-pulse',
            variant === 'accent' && 'bg-[var(--fg-accent)] shadow-[0_0_4px_var(--fg-accent)]',
            variant === 'success' && 'bg-[var(--fg-success)] shadow-[0_0_4px_var(--fg-success)]',
            variant === 'danger' && 'bg-[var(--fg-danger)] shadow-[0_0_4px_var(--fg-danger)]',
            variant === 'warning' && 'bg-[var(--fg-warning)] shadow-[0_0_4px_var(--fg-warning)]',
            variant === 'info' && 'bg-[var(--fg-info)] shadow-[0_0_4px_var(--fg-info)]',
            variant === 'default' && 'bg-[var(--text-muted)]'
          )}
        />
      )}
      {children}
    </span>
  );
};

