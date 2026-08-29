import React, { useState } from 'react';
import { Store, User, CheckCircle2 } from 'lucide-react';
import { getMediaUrl } from '../utils/mediaUtils';

export interface BulletinAvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isPage?: boolean;
  isOnline?: boolean;
  verified?: boolean;
  fallbackText?: string;
  fallbackIcon?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

const SIZE_CONFIGS = {
  sm: {
    container: 'w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] border-[1.5px]',
    text: 'text-[10px]',
    iconSize: 14,
    badgeSize: 10,
    badgePadding: 'p-[1.5px]',
    badgeOffset: '-bottom-0.5 -end-0.5',
    onlineDot: 'w-2.5 h-2.5',
  },
  md: {
    container: 'w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] border-2',
    text: 'text-xs',
    iconSize: 18,
    badgeSize: 11,
    badgePadding: 'p-[2px]',
    badgeOffset: '-bottom-0.5 -end-0.5',
    onlineDot: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'w-16 h-16 min-w-[64px] min-h-[64px] max-w-[64px] max-h-[64px] border-[3px]',
    text: 'text-sm',
    iconSize: 24,
    badgeSize: 14,
    badgePadding: 'p-[2.5px]',
    badgeOffset: 'bottom-0 end-0',
    onlineDot: 'w-4 h-4',
  },
  xl: {
    container: 'w-20 h-20 sm:w-24 sm:h-24 min-w-[80px] min-h-[80px] max-w-[96px] max-h-[96px] border-4',
    text: 'text-base sm:text-lg',
    iconSize: 32,
    badgeSize: 18,
    badgePadding: 'p-1',
    badgeOffset: 'bottom-1 end-1',
    onlineDot: 'w-5 h-5',
  },
};

export const BulletinAvatar: React.FC<BulletinAvatarProps> = ({
  src,
  alt = '',
  size = 'md',
  isPage = false,
  isOnline = false,
  verified = false,
  fallbackText,
  fallbackIcon,
  className = '',
  onClick,
  title,
}) => {
  const [hasError, setHasError] = useState(false);
  const config = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  const resolvedUrl = src ? getMediaUrl(src) : null;
  const isClickable = Boolean(onClick);

  const displayInitial = fallbackText
    ? fallbackText.charAt(0).toUpperCase()
    : alt
    ? alt.charAt(0).toUpperCase()
    : '';

  return (
    <div
      onClick={onClick}
      title={title || alt}
      className={`relative shrink-0 select-none ${isClickable ? 'cursor-pointer' : ''}`}
    >
      <div
        className={`relative aspect-square rounded-full object-cover border-accent/40 shadow-sm shrink-0 bg-white dark:bg-gray-800 overflow-hidden flex items-center justify-center transition-theme ${
          config.container
        } ${isClickable ? 'hover:opacity-90 hover:scale-105' : ''} ${className}`}
      >
        {resolvedUrl && !hasError ? (
          <img
            src={resolvedUrl}
            alt={alt}
            onError={() => setHasError(true)}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-accent/10 text-accent font-extrabold">
            {fallbackIcon ? (
              fallbackIcon
            ) : displayInitial ? (
              <span className={`font-black ${config.text}`}>{displayInitial}</span>
            ) : isPage ? (
              <Store size={config.iconSize} className="text-accent" />
            ) : (
              <User size={config.iconSize} className="text-accent" />
            )}
          </div>
        )}
      </div>

      {isOnline && (
        <span
          className={`absolute bottom-0 end-0 rounded-full bg-accent border-2 border-white dark:border-[#1a1a1c] shadow-xs ${config.onlineDot}`}
        />
      )}

      {(isPage || verified) && !isOnline && (
        <span
          className={`absolute ${config.badgeOffset} bg-accent text-white rounded-full ${config.badgePadding} border border-white dark:border-[#18181b] shadow-xs flex items-center justify-center`}
          title={isPage ? 'Commercial Page' : 'Verified'}
        >
          <CheckCircle2 size={config.badgeSize} className="stroke-[3]" />
        </span>
      )}
    </div>
  );
};
