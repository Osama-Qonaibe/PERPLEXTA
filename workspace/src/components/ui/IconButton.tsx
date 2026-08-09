import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  ariaLabel: string;
  active?: boolean;
  variant?: 'default' | 'ghost' | 'accent';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  ariaLabel,
  active = false,
  variant = 'ghost',
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'w-10 h-10 flex items-center justify-center rounded-[var(--radius-sm)] transition-all duration-200';
  
  const variantStyles = {
    default: 'bg-[var(--bg-muted)] border border-[var(--border-default)] text-[var(--fg-default)] hover:bg-[var(--bg-overlay)]',
    ghost: 'bg-transparent text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-overlay)]',
    accent: 'bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] border border-[var(--border-accent-emphasis)]',
  };

  const activeStyles = active ? 'text-[var(--fg-accent)] bg-[var(--bg-accent-muted)] border-[var(--border-accent-emphasis)]' : '';

  return (
    <button
      aria-label={ariaLabel}
      disabled={disabled}
      className={`${baseClasses} ${variantStyles[variant]} ${activeStyles} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};

export default IconButton;
