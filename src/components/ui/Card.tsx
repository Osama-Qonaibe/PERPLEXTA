import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'flat' | 'outlined';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', className, children, ...props }, ref) => {
    const variantStyles = {
      elevated: 'bg-[var(--surface-card)] border border-[var(--border-main)] shadow-sm',
      flat: 'bg-[var(--surface-subtle)]',
      outlined: 'bg-transparent border border-[var(--border-main)]',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-[var(--radius)] p-4 transition-all duration-180',
          variantStyles[variant],
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
