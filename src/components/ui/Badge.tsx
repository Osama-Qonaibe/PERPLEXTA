import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-gray-800 text-gray-300 border-gray-700',
    success: 'bg-emerald-900/40 text-emerald-400 border-emerald-800',
    warning: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
    danger: 'bg-red-900/40 text-red-400 border-red-800',
    info: 'bg-blue-900/40 text-blue-400 border-blue-800',
  };

  const sizes: Record<string, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center border rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}
