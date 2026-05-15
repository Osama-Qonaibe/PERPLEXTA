import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    secondary: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    outline: 'bg-transparent border border-gray-800 text-gray-400'
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-[4px] border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
