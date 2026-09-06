import React from 'react';

export interface SkeletonLoaderProps {
  type?: 
    | 'chat-history' 
    | 'sidebar-user' 
    | 'sidebar-nav'
    | 'reel-actions' 
    | 'reel-desktop-actions'
    | 'reel-reactions-bar' 
    | 'reel-comments' 
    | 'reel-insights' 
    | 'reel-card' 
    | 'main-content' 
    | 'card' 
    | 'text';
  count?: number;
  className?: string;
  isSidebarOpen?: boolean;
  isMobile?: boolean;
  isRtl?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  type = 'chat-history', 
  count = 5,
  className = '',
  isSidebarOpen = true,
  isMobile = false,
  isRtl = true
}) => {
  // 1. Sidebar Chat History Skeleton
  if (type === 'chat-history') {
    return (
      <div className={`space-y-1 w-full ${className}`}>
        {[...Array(count)].map((_, i) => (
          <div 
            key={`skel-history-${i}`} 
            className={`flex items-center w-full ${isMobile ? 'h-[33px] px-2' : 'h-11'} rounded-[4px] bg-[var(--surface-subtle)]/40 border border-transparent animate-shimmer overflow-hidden`}
          >
            <div className={`${isMobile ? 'w-7' : 'w-[56px]'} h-full flex-shrink-0 flex items-center justify-center`}>
              <div className={`${isMobile ? 'w-7 h-7' : 'w-10 h-10'} rounded-[4px] bg-[var(--border-subtle)]/60 shrink-0`} />
            </div>
            {isSidebarOpen && (
              <div className={`flex-1 min-w-0 ${isRtl ? 'mr-1' : 'ml-1'} pr-3 space-y-1.5`}>
                <div 
                  className="h-3 bg-[var(--border-subtle)]/70 rounded"
                  style={{ width: `${Math.max(45, 80 - (i % 3) * 15)}%` }} 
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 2. Sidebar User Session / Profile Skeleton
  if (type === 'sidebar-user') {
    return (
      <div className={`flex items-center w-full ${isMobile ? 'h-[36px] px-2' : 'h-[44px]'} overflow-hidden flex-shrink-0 ${className}`}>
        <div className={`${isMobile ? 'w-7' : 'w-[56px]'} ${isMobile ? 'h-[36px]' : 'h-[44px]'} flex-shrink-0 flex items-center justify-center`}>
          <div className={`${isMobile ? 'w-7 h-7' : 'w-10 h-10'} rounded-[4px] bg-[var(--border-subtle)]/70 animate-shimmer`} />
        </div>
        {isSidebarOpen && (
          <div className={`flex flex-col min-w-0 flex-1 ${isRtl ? 'pr-1.5' : 'pl-1.5'} space-y-1`}>
            <div className="h-3 bg-[var(--border-subtle)]/80 rounded w-2/3 animate-shimmer" />
            <div className="h-2 bg-[var(--border-subtle)]/50 rounded w-1/3 animate-shimmer" />
          </div>
        )}
      </div>
    );
  }

  // 3. Sidebar Navigation Links Skeleton
  if (type === 'sidebar-nav') {
    return (
      <div className={`space-y-1 w-full ${className}`}>
        {[...Array(count)].map((_, i) => (
          <div 
            key={`skel-nav-${i}`}
            className={`flex items-center w-full ${isMobile ? 'h-10 px-3' : 'h-11 px-3'} rounded-[4px] bg-[var(--surface-subtle)]/30 animate-shimmer`}
          >
            <div className="w-5 h-5 rounded-[4px] bg-[var(--border-subtle)]/60 shrink-0" />
            {isSidebarOpen && (
              <div className={`flex-1 ${isRtl ? 'mr-3' : 'ml-3'}`}>
                <div className="h-3 bg-[var(--border-subtle)]/70 rounded w-1/2" />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 4. Mobile Reel Action Buttons Column Skeleton
  if (type === 'reel-actions') {
    return (
      <div className={`flex flex-col items-center gap-3.5 pointer-events-none ${className}`}>
        {/* Avatar Placeholder */}
        <div className="relative mb-1">
          <div className="w-10 h-10 rounded-full bg-zinc-800/80 border-2 border-white/20 animate-shimmer" />
          <div className="absolute -bottom-1 start-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-zinc-700 animate-shimmer" />
        </div>

        {/* 4 Action Icons + Counter Placeholders */}
        {[...Array(4)].map((_, i) => (
          <div key={`skel-reel-act-${i}`} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-black/60 border border-white/10 backdrop-blur-md animate-shimmer flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-white/20" />
            </div>
            <div className="w-7 h-2.5 rounded-full bg-white/30 backdrop-blur-sm animate-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  // 5. Desktop Reel Action Rail Skeleton
  if (type === 'reel-desktop-actions') {
    return (
      <div className={`flex flex-col items-center gap-4 pointer-events-none ${className}`}>
        {[...Array(4)].map((_, i) => (
          <div key={`skel-desk-act-${i}`} className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full bg-zinc-900/80 border border-white/15 backdrop-blur-xl shadow-xl animate-shimmer flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-white/20" />
            </div>
            <div className="w-8 h-3 rounded-full bg-zinc-700/80 animate-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  // 6. Desktop Reel Reactions Bar & Counter Row Skeleton
  if (type === 'reel-reactions-bar') {
    return (
      <div className={`space-y-2.5 w-full ${className}`}>
        {/* Counter Row Skeleton */}
        <div className="px-4 py-2 flex items-center justify-between animate-shimmer">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1 rtl:space-x-reverse">
              <div className="w-4 h-4 rounded-full bg-[var(--border-subtle)]" />
              <div className="w-4 h-4 rounded-full bg-[var(--border-subtle)]" />
            </div>
            <div className="w-10 h-3 rounded bg-[var(--border-subtle)]" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-3 rounded bg-[var(--border-subtle)]" />
            <div className="w-14 h-3 rounded bg-[var(--border-subtle)]" />
          </div>
        </div>

        {/* Action Buttons Row Skeleton */}
        <div className="px-2 py-1.5 flex items-center gap-2 border-y border-[var(--border-main)]">
          <div className="flex-1 h-9 rounded-xl bg-[var(--surface-subtle)] animate-shimmer" />
          <div className="flex-1 h-9 rounded-xl bg-[var(--surface-subtle)] animate-shimmer" />
          <div className="flex-1 h-9 rounded-xl bg-[var(--surface-subtle)] animate-shimmer" />
        </div>
      </div>
    );
  }

  // 7. Reel Comments List Skeleton
  if (type === 'reel-comments') {
    return (
      <div className={`space-y-3.5 w-full ${className}`}>
        {[...Array(count)].map((_, i) => (
          <div key={`skel-comment-${i}`} className="flex gap-2.5 items-start animate-shimmer">
            <div className="w-8 h-8 rounded-full bg-[var(--border-subtle)]/80 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="bg-[var(--surface-subtle)] rounded-2xl p-3 border border-[var(--border-main)] space-y-2">
                <div className="h-3 bg-[var(--border-subtle)]/90 rounded w-1/3" />
                <div className="h-2.5 bg-[var(--border-subtle)]/60 rounded w-4/5" />
                {i % 2 === 0 && <div className="h-2.5 bg-[var(--border-subtle)]/40 rounded w-3/5" />}
              </div>
              <div className="flex items-center gap-3 px-2">
                <div className="h-2 bg-[var(--border-subtle)]/50 rounded w-12" />
                <div className="h-2 bg-[var(--border-subtle)]/60 rounded w-10" />
                <div className="h-2 bg-[var(--border-subtle)]/50 rounded w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 8. Reel Insights / Analytics Metrics Grid Skeleton
  if (type === 'reel-insights') {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 w-full ${className}`}>
        {[...Array(6)].map((_, i) => (
          <div 
            key={`skel-insight-${i}`}
            className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] flex flex-col items-center text-center space-y-2 animate-shimmer"
          >
            <div className="w-5 h-5 rounded-full bg-[var(--border-subtle)]" />
            <div className="h-5 bg-[var(--border-subtle)]/90 rounded w-12" />
            <div className="h-2.5 bg-[var(--border-subtle)]/60 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  // 9. Full Reel Card Placeholder
  if (type === 'reel-card') {
    return (
      <div className={`relative w-full h-[calc(100dvh-80px)] flex items-center justify-center bg-black/95 ${className}`}>
        <div className="relative w-full max-w-md h-full bg-zinc-950 flex flex-col justify-between p-4 animate-shimmer overflow-hidden">
          {/* Top Bar Skeleton */}
          <div className="flex items-center justify-between z-10">
            <div className="w-20 h-7 rounded-full bg-zinc-800" />
            <div className="w-8 h-8 rounded-full bg-zinc-800" />
          </div>

          {/* Bottom Captions & Action Skeleton */}
          <div className="flex items-end justify-between gap-4 z-10">
            <div className="flex-1 space-y-2.5">
              <div className="h-3.5 bg-zinc-800 rounded w-1/3" />
              <div className="h-3 bg-zinc-800/80 rounded w-3/4" />
              <div className="h-3 bg-zinc-800/60 rounded w-1/2" />
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800" />
              <div className="w-10 h-10 rounded-full bg-zinc-800" />
              <div className="w-10 h-10 rounded-full bg-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 10. Main Content Page Skeleton
  if (type === 'main-content') {
    return (
      <div className={`max-w-4xl mx-auto p-6 space-y-6 animate-shimmer rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] ${className}`}>
        <div className="space-y-3">
          <div className="h-7 bg-[var(--border-subtle)] rounded-md w-1/3" />
          <div className="h-4 bg-[var(--border-subtle)] rounded w-2/3" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {[...Array(3)].map((_, i) => (
            <div key={`skel-card-${i}`} className="h-32 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 space-y-3 animate-shimmer">
              <div className="w-8 h-8 rounded bg-[var(--border-subtle)]" />
              <div className="h-3 bg-[var(--border-subtle)] rounded w-1/2" />
              <div className="h-2 bg-[var(--border-subtle)] rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 11. Generic Card Skeleton
  if (type === 'card') {
    return (
      <div className={`p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] space-y-3 animate-shimmer ${className}`}>
        <div className="h-4 bg-[var(--border-subtle)] rounded w-1/3" />
        <div className="h-3 bg-[var(--border-subtle)]/70 rounded w-full" />
        <div className="h-3 bg-[var(--border-subtle)]/50 rounded w-2/3" />
      </div>
    );
  }

  // 12. Fallback Text Line Skeleton
  return (
    <div className={`animate-shimmer h-4 rounded bg-[var(--border-subtle)] w-full ${className}`} />
  );
};

export default SkeletonLoader;

