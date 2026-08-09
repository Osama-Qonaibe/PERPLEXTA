import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> & {
  Header: React.FC<{ children: React.ReactNode; className?: string }>;
  Body: React.FC<{ children: React.ReactNode; className?: string }>;
  Footer: React.FC<{ children: React.ReactNode; className?: string }>;
} = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[var(--bg-default)] border border-[var(--border-default)] rounded-[var(--radius-md)] transition-colors duration-150 ${onClick ? 'cursor-pointer hover:border-[var(--border-accent-emphasis)]' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

Card.Header = ({ children, className = '' }) => (
  <div className={`p-4 border-b border-[var(--border-muted)] ${className}`}>
    {children}
  </div>
);

Card.Body = ({ children, className = '' }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

Card.Footer = ({ children, className = '' }) => (
  <div className={`p-4 border-t border-[var(--border-muted)] bg-[var(--bg-muted)] rounded-b-[var(--radius-md)] ${className}`}>
    {children}
  </div>
);

export default Card;
