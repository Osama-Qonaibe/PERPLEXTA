import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    const variantStyles = {
      primary: 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90 active:opacity-80',
      secondary: 'bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-main)]',
      danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
      ghost: 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent',
    };

    const sizeStyles = {
      sm: 'h-8 px-3 text-xs font-semibold inline-flex items-center justify-center gap-1.5',
      md: 'h-[34px] sm:h-[36px] px-3.5 sm:px-4 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2',
      lg: 'h-10 px-5 text-sm sm:text-base font-bold inline-flex items-center justify-center gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={clsx(
          'rounded-[var(--radius)] transition-all duration-180 cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-[var(--focus-outline)] focus:ring-offset-2',
          'active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
