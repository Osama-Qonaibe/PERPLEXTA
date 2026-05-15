import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div
    className={`bg-[var(--bg-surface,#1a1a1a)] border border-[var(--border,#2a2a2a)] rounded-lg p-4 ${onClick ? 'cursor-pointer hover:border-emerald-500/30 transition-all duration-600' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);
