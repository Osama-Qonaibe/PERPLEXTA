import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', padding = true }) => {
  return (
    <div
      className={`bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius)] ${padding ? 'p-4' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
