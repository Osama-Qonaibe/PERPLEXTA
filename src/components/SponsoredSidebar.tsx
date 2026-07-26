import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface Advertisement {
  id: number;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  image_url: string;
  target_url: string;
  sponsor_name: string | null;
  badge_text_ar: string | null;
  badge_text_en: string | null;
  position: string;
  display_order: number;
  is_active: boolean;
  click_count: number;
  impression_count: number;
}

export const SponsoredSidebar: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, token } = useAppContext();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [hiddenAdIds, setHiddenAdIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const res = await fetch('/api/ads?position=sidebar');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.ads)) {
            setAds(data.ads);

            // Record impression for each loaded ad
            data.ads.forEach((ad: Advertisement) => {
              fetch(`/api/ads/${ad.id}/impression`, { method: 'POST' }).catch(() => {});
            });
          }
        }
      } catch (err) {
        console.error('[SponsoredSidebar] Failed to load ads:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAds();
  }, []);

  const handleAdClick = (ad: Advertisement, e: React.MouseEvent) => {
    e.preventDefault();
    // Track click count
    fetch(`/api/ads/${ad.id}/click`, { method: 'POST' }).catch(() => {});

    if (ad.target_url.startsWith('http://') || ad.target_url.startsWith('https://')) {
      window.open(ad.target_url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(ad.target_url);
    }
  };

  const handleDismissAd = (adId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setHiddenAdIds((prev) => [...prev, adId]);
  };

  const visibleAds = ads.filter((ad) => !hiddenAdIds.includes(ad.id));

  if (isLoading || visibleAds.length === 0) {
    return null;
  }

  const isRtl = language === 'ar';

  return (
    <div
      className={`hidden xl:flex flex-col h-full w-72 p-3 space-y-3.5 shrink-0 overflow-y-auto scrollbar-none transition-all duration-300 ${className}`}
    >
      {visibleAds.map((ad) => {
        const title = isRtl ? ad.title_ar : ad.title_en;
        const description = isRtl ? ad.description_ar : ad.description_en;
        const badge = isRtl ? (ad.badge_text_ar || 'مُموَّل') : (ad.badge_text_en || 'Sponsored');

        return (
          <div
            key={ad.id}
            onClick={(e) => handleAdClick(ad, e)}
            className="group relative cursor-pointer rounded-xl border border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-sm p-3 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all duration-300 flex flex-col gap-2.5"
          >
            {/* Dismiss X button */}
            <button
              onClick={(e) => handleDismissAd(ad.id, e)}
              title={isRtl ? 'إخفاء الإعلان' : 'Hide Ad'}
              className="absolute top-2 end-2 z-10 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm"
            >
              <X size={12} />
            </button>

            {/* Ad Image Container */}
            <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200/40 dark:border-gray-800/40">
              <img
                src={ad.image_url}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              {badge && (
                <span className="absolute bottom-1.5 start-1.5 bg-black/75 backdrop-blur-md text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-[4px] border border-emerald-500/30 tracking-tight">
                  {badge}
                </span>
              )}
            </div>

            {/* Ad Details */}
            <div className="flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug group-hover:text-emerald-500 transition-colors">
                  {title}
                </h4>
                <ExternalLink size={12} className="text-gray-400 group-hover:text-emerald-500 shrink-0 mt-0.5" />
              </div>

              {ad.sponsor_name && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400/90 truncate">
                  {ad.sponsor_name}
                </span>
              )}

              {description && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
