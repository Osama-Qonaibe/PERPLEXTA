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
      sm: 'px-3 py-1.5 text-xs font-semibold',
      md: 'px-4 py-2 text-sm font-semibold',
      lg: 'px-6 py-3 text-base font-bold',
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
