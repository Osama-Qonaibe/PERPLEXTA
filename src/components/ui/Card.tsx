import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'subpanel' | 'outlined' | 'flat';
  isHoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', isHoverable = false, className, children, ...props }, ref) => {
    const variantStyles = {
      elevated: 'bg-[var(--surface-card)] border border-[var(--border-main)] rounded-[var(--radius-md)] p-6 shadow-sm',
      subpanel: 'bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] p-4',
      outlined: 'bg-transparent border border-[var(--border-main)] rounded-[var(--radius-md)] p-5',
      flat: 'bg-[var(--surface-subtle)] border-none rounded-[var(--radius-sm)] p-4',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative transition-all duration-200',
          variantStyles[variant],
          isHoverable && 'hover:border-[var(--border-accent)] hover:shadow-md cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

