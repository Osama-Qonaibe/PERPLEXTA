import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { resolveImageUrl } from '../../utils/imageResolver';
import { NotificationIconRenderer } from '../../utils/imageProcessor';
import { Sparkles, Cpu } from 'lucide-react';

export interface LogoProps {
  size?: number;
  className?: string;
  showName?: boolean;
  nameClassName?: string;
  fallbackType?: 'cpu' | 'sparkles';
}

export const Logo: React.FC<LogoProps> = ({
  size = 32,
  className = '',
  showName = false,
  nameClassName = 'font-bold text-sm text-[var(--text-primary)] font-sans tracking-tight',
  fallbackType = 'cpu'
}) => {
  const { siteSettings, theme, language } = useAppContext();
  const isRtl = language === 'ar';

  const rawLogo = (theme === 'light' && siteSettings?.logoLightBase64) 
    ? siteSettings?.logoLightBase64 
    : siteSettings?.logoBase64;
  const logoUrl = rawLogo ? resolveImageUrl(rawLogo, 'general') : null;
  const displayName = isRtl 
    ? (siteSettings?.siteNameAr || siteSettings?.siteName || 'بيربليكستا') 
    : (siteSettings?.siteName || 'Perplexta');

  const fallback = fallbackType === 'cpu' ? (
    <div 
      className="rounded-[var(--radius-sm)] bg-[var(--bg-accent-muted)] border border-[var(--border-main)] flex items-center justify-center text-accent shadow-2xs"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <Cpu size={Math.round(size * 0.5)} />
    </div>
  ) : (
    <div 
      className="rounded-[var(--radius-sm)] bg-[var(--bg-accent-muted)] border border-[var(--border-main)] flex items-center justify-center text-accent shadow-2xs"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <Sparkles size={Math.round(size * 0.5)} />
    </div>
  );

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {logoUrl ? (
        <NotificationIconRenderer
          src={logoUrl}
          alt={displayName}
          size={size}
          className="rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--surface-subtle)]"
          fallbackIcon={fallback}
        />
      ) : (
        fallback
      )}
      {showName && (
        <span className={nameClassName}>
          {displayName}
        </span>
      )}
    </div>
  );
};
