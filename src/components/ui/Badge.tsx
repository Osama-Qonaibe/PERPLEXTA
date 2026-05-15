import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'accent' | 'danger' | 'warning' | 'muted';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'accent', className = '' }) => {
  const variantClass = {
    accent: 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]',
    danger: 'bg-[rgba(244,63,94,0.1)] text-[var(--danger)] border border-[rgba(244,63,94,0.2)]',
    warning: 'bg-[rgba(251,191,36,0.1)] text-[var(--warning)] border border-[rgba(251,191,36,0.2)]',
    muted: 'bg-[var(--bg-overlay)] text-[var(--text-muted)] border border-[var(--border)]',
  }[variant];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-medium ${variantClass} ${className}`}>
      {children}
    </span>
  );
};
