import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className,
}) => {
  const variantStyles = {
    default: 'bg-[var(--bg-accent-muted)] text-[var(--fg-accent)]',
    success: 'bg-[var(--scale-green-muted)] text-[var(--scale-green-emphasis)]',
    danger: 'bg-[var(--scale-red-muted)] text-[var(--scale-red-emphasis)]',
    warning: 'bg-[var(--scale-amber-muted)] text-[var(--scale-amber-emphasis)]',
    info: 'bg-[var(--scale-blue-muted)] text-[var(--scale-blue-emphasis)]',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] font-bold',
    md: 'px-3 py-1 text-xs font-bold',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border border-current/20',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};
