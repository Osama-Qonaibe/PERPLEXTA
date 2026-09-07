import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'action' | 'status';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, className, children, ...props }, ref) => {
    const variantStyles = {
      primary: 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90 active:scale-[0.98] shadow-sm',
      secondary: 'bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-main)] hover:border-[var(--border-accent)] hover:bg-[var(--surface-subtle)] active:scale-[0.98]',
      ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] active:scale-[0.98]',
      destructive: 'bg-[var(--bg-danger-muted)] text-[var(--fg-danger)] border border-[var(--fg-danger)]/20 hover:bg-[var(--bg-danger-emphasis)] hover:text-white',
      action: 'p-2 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--surface-card)] text-[var(--text-muted)] hover:text-[var(--fg-accent)] hover:border-[var(--border-accent)] hover:bg-[var(--surface-subtle)] active:scale-95',
      status: 'bg-[var(--status-info-subtle)] text-[var(--status-info)] border border-[var(--status-info)]',
    };

    const sizeStyles = {
      xs: 'h-7 px-2 text-[11px] font-bold rounded-[var(--radius-sm)]',
      sm: 'h-8 px-3 text-xs font-bold rounded-[var(--radius-sm)]',
      md: 'h-9 px-4 text-sm font-bold rounded-[var(--radius-sm)]',
      lg: 'h-11 px-6 text-base font-bold rounded-[var(--radius-md)]',
      icon: 'w-8 h-8 p-0 flex items-center justify-center rounded-[var(--radius-sm)]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 font-bold transition-all duration-150 ease-in-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-outline)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

