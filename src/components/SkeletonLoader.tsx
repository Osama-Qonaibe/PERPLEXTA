import React from 'react';

interface SkeletonLoaderProps {
  type?: 'chat-history' | 'main-content' | 'card' | 'text';
  count?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  type = 'chat-history', 
  count = 5,
  className = ''
}) => {
  if (type === 'chat-history') {
    return (
      <div className={`space-y-1.5 px-3 py-2 w-full ${className}`}>
        {[...Array(count)].map((_, i) => (
          <div 
            key={i} 
            className="flex items-center gap-3 w-full h-11 px-3 rounded-[4px] bg-[var(--bg-hover)]/40 border border-transparent animate-shimmer"
          >
            <div className="w-4 h-4 rounded-[4px] bg-[var(--border-subtle)] shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-[var(--border-subtle)] rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'main-content') {
    return (
      <div className={`max-w-4xl mx-auto p-6 space-y-6 animate-shimmer rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] ${className}`}>
        <div className="space-y-3">
          <div className="h-7 bg-[var(--border-subtle)] rounded-md w-1/3" />
          <div className="h-4 bg-[var(--border-subtle)] rounded w-2/3" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 space-y-3 animate-shimmer">
              <div className="w-8 h-8 rounded bg-[var(--border-subtle)]" />
              <div className="h-3 bg-[var(--border-subtle)] rounded w-1/2" />
              <div className="h-2 bg-[var(--border-subtle)] rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-shimmer h-4 rounded bg-[var(--border-subtle)] w-full ${className}`} />
  );
};
