import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false, glow = false }) => {
  return (
    <div className={`
      bg-[#141416] border border-gray-800/60 rounded-lg p-6
      transition-all duration-600 ease-sovereign-cubic
      ${hover ? 'hover:border-emerald-500/30 lg:hover:bg-[#1a1a1c]' : ''}
      ${glow ? 'shadow-[0_0_30px_rgba(16,185,129,0.05)]' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};
