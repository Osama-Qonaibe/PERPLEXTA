import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div
      className={`bg-[var(--bg-surface,#1a1a1a)] border border-[var(--border,#2a2a2a)] rounded-[8px] transition-all duration-[600ms] ${
        padding ? 'p-4' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
