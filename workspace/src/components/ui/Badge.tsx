import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'danger' | 'attention' | 'info';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  icon,
  className = '',
  size = 'md',
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-[var(--bg-muted)] text-[var(--fg-muted)] border-[var(--border-default)]',
    success: 'bg-[var(--bg-success-muted)] text-[var(--fg-success)] border-transparent',
    danger: 'bg-[var(--bg-danger-muted)] text-[var(--fg-danger)] border-transparent',
    attention: 'bg-[var(--bg-attention-muted)] text-[var(--fg-attention)] border-transparent',
    info: 'bg-[var(--bg-info-muted)] text-[var(--fg-info)] border-transparent',
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-0.5 text-xs gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
