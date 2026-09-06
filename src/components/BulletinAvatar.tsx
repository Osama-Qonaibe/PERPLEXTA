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
    container: 'w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] rounded-[8px] border-[1.5px]',
    text: 'text-[10px]',
    iconSize: 14,
    badgeSize: 10,
    badgePadding: 'p-[1.5px]',
    badgeOffset: '-bottom-0.5 -end-0.5',
    onlineDot: 'w-2.5 h-2.5 rounded-[3px]',
    innerRadius: 'rounded-[6px]',
  },
  md: {
    container: 'w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] rounded-[8px] border-2',
    text: 'text-xs',
    iconSize: 16,
    badgeSize: 11,
    badgePadding: 'p-[2px]',
    badgeOffset: '-bottom-0.5 -end-0.5',
    onlineDot: 'w-3 h-3 rounded-[3px]',
    innerRadius: 'rounded-[6px]',
  },
  lg: {
    container: 'w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-[10px] border-[2.5px]',
    text: 'text-sm',
    iconSize: 22,
    badgeSize: 13,
    badgePadding: 'p-[2px]',
    badgeOffset: 'bottom-0 end-0',
    onlineDot: 'w-3.5 h-3.5 rounded-[4px]',
    innerRadius: 'rounded-[8px]',
  },
  xl: {
    container: 'w-20 h-20 sm:w-24 sm:h-24 min-w-[80px] min-h-[80px] max-w-[96px] max-h-[96px] rounded-[12px] border-3',
    text: 'text-base sm:text-lg',
    iconSize: 30,
    badgeSize: 16,
    badgePadding: 'p-1',
    badgeOffset: 'bottom-1 end-1',
    onlineDot: 'w-4 h-4 rounded-[4px]',
    innerRadius: 'rounded-[10px]',
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
        className={`relative aspect-square object-cover border-accent/40 shadow-sm shrink-0 bg-white dark:bg-gray-800 overflow-hidden flex items-center justify-center transition-theme ${
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
            className={`w-full h-full object-cover ${config.innerRadius}`}
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
          className={`absolute bottom-0 end-0 bg-accent border-2 border-white dark:border-[#1a1a1c] shadow-xs ${config.onlineDot}`}
        />
      )}

      {(isPage || verified) && !isOnline && (
        <span
          className={`absolute ${config.badgeOffset} bg-accent text-white rounded-[4px] ${config.badgePadding} border border-white dark:border-[#18181b] shadow-xs flex items-center justify-center`}
          title={isPage ? 'Commercial Page' : 'Verified'}
        >
          <CheckCircle2 size={config.badgeSize} className="stroke-[3]" />
        </span>
      )}
    </div>
  );
};
