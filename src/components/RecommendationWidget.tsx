import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Compass, 
  Sliders, 
  ShoppingBag, 
  Zap, 
  BookOpen, 
  Megaphone, 
  RefreshCw, 
  X, 
  Tag, 
  ChevronRight,
  MapPin,
  Building2
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getMediaUrl } from '../utils/mediaUtils';
import { RecommendationPreferencesModal } from './RecommendationPreferencesModal';

interface RecommendationItem {
  recommendation_id: string;
  item_type: 'marketplace' | 'bulletin' | 'tool' | 'blog';
  item_id: any;
  score: number;
  match_percentage: number;
  reasons_en: string[];
  reasons_ar: string[];
  data: any;
}

interface RecommendationWidgetProps {
  variant?: 'full' | 'compact' | 'marketplace' | 'bulletin' | 'tools' | 'banner';
  title?: string;
  subtitle?: string;
  limit?: number;
  filterType?: 'all' | 'marketplace' | 'bulletin' | 'tool' | 'blog';
  onOpenPreferences?: () => void;
  onAdClick?: (adId: number) => void;
  className?: string;
}

export const RecommendationWidget: React.FC<RecommendationWidgetProps> = ({
  variant = 'full',
  title,
  subtitle,
  limit = 6,
  filterType = 'all',
  onOpenPreferences,
  onAdClick,
  className = ''
}) => {
  const { language, dir, token, user } = useAppContext();
  const navigate = useNavigate();

  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(filterType);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [isPrefModalOpen, setIsPrefModalOpen] = useState<boolean>(false);

  const isBulletinOnly = filterType === 'bulletin' || variant === 'bulletin';

  const fetchRecommendations = async () => {
    if (!token || !user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const headers: any = { 'Authorization': `Bearer ${token}` };
      const endpoint = (filterType && filterType !== 'all')
        ? `/api/recommendations/${filterType}`
        : `/api/recommendations?limit=${limit * 2}`;

      const res = await fetch(endpoint, { headers });
      const data = await res.json();

      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      } else if (data.success && Array.isArray(data.recommendations)) {
        setItems(data.recommendations);
      } else {
        setItems([]);
      }
    } catch (err: any) {
      console.error('[RecommendationWidget] Fetch error:', err);
      setError(language === 'ar' ? 'فشل تحميل التوصيات' : 'Failed loading recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchRecommendations();
    }
  }, [token, user?.id, filterType]);

  const handleTrackInteraction = async (item: RecommendationItem, actionType: string) => {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/recommendations/track', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          item_type: item.item_type,
          item_id: typeof item.item_id === 'number' ? item.item_id : null,
          item_key: typeof item.item_id === 'string' ? item.item_id : null,
          action_type: actionType,
          category: item.data?.category_en || item.data?.category || ''
        })
      });
    } catch (err) {
      // Non-blocking track
    }
  };

  const handleDismiss = async (item: RecommendationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedKeys(prev => new Set(prev).add(item.recommendation_id));

    if (token) {
      try {
        await fetch('/api/recommendations/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            item_type: item.item_type,
            item_id: typeof item.item_id === 'number' ? item.item_id : null,
            item_key: typeof item.item_id === 'string' ? item.item_id : null,
            feedback_type: 'not_interested'
          })
        });
      } catch (err) {
        // Ignore background error
      }
    }
  };

  const handleItemClick = (item: RecommendationItem) => {
    handleTrackInteraction(item, 'click');

    if (item.item_type === 'bulletin' || isBulletinOnly) {
      if (onAdClick && typeof item.item_id === 'number') {
        onAdClick(item.item_id);
      } else {
        navigate(`/bulletin?id=${item.item_id}`);
      }
    } else if (item.item_type === 'marketplace') {
      navigate(`/marketplace?id=${item.item_id}`);
    } else if (item.item_type === 'tool') {
      navigate(`/chat?tool=${item.data?.tool_id || item.item_id}`);
    } else if (item.item_type === 'blog') {
      navigate(`/blog/${item.data?.slug || item.item_id}`);
    }
  };

  // Filter items based on active tab and dismissed items
  const visibleItems = items
    .filter(i => !dismissedKeys.has(i.recommendation_id))
    .filter(i => (filterType && filterType !== 'all') ? i.item_type === filterType : (activeCategory === 'all' ? true : i.item_type === activeCategory))
    .slice(0, limit);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'marketplace': return <ShoppingBag size={14} className="text-emerald-500" />;
      case 'bulletin': return <Megaphone size={14} className="text-amber-500" />;
      case 'tool': return <Zap size={14} className="text-blue-500" />;
      case 'blog': return <BookOpen size={14} className="text-purple-500" />;
      default: return <Sparkles size={14} className="text-emerald-500" />;
    }
  };

  const getTypeBadgeText = (type: string) => {
    if (language === 'ar') {
      switch (type) {
        case 'marketplace': return 'منتج رقمي';
        case 'bulletin': return 'إعان/خدمة';
        case 'tool': return 'أداة ذكية';
        case 'blog': return 'مقال';
        default: return 'توصية';
      }
    } else {
      switch (type) {
        case 'marketplace': return 'Digital Product';
        case 'bulletin': return 'Service Ad';
        case 'tool': return 'AI Tool';
        case 'blog': return 'Article';
        default: return 'Recommended';
      }
    }
  };

  if (!token || !user) return null;

  return (
    <div className={`w-full ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5 pb-2.5 border-b border-gray-100 dark:border-gray-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            {isBulletinOnly ? (
              <Megaphone size={16} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            ) : (
              <Sparkles size={16} className="text-emerald-500 animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
              <span>
                {title || (isBulletinOnly
                  ? (language === 'ar' ? 'تفضيلات الإعلانات المخصصة' : 'Recommended Ads')
                  : (language === 'ar' ? 'توصيات مخصصة لك' : 'Recommended For You'))}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                {language === 'ar' ? 'محرك ذكي' : 'Smart AI'}
              </span>
            </h3>
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] truncate">
              {subtitle || (isBulletinOnly
                ? (language === 'ar' ? 'إعلانات وخدمات مقترحة وفقاً لتفضيلاتك' : 'Tailored ad suggestions based on your interests')
                : (language === 'ar' ? 'مقترحات مخصصة بناءً على سلوكك واهتماماتك' : 'Tailored suggestions based on activity'))}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 ms-auto">
          <button
            onClick={() => {
              if (onOpenPreferences) onOpenPreferences();
              else setIsPrefModalOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:text-emerald-500 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all shadow-2xs cursor-pointer"
            title={language === 'ar' ? 'تعديل تفضيلات التوصيات' : 'Customize preferences'}
          >
            <Sliders size={12} className="text-emerald-500 shrink-0" />
            <span>{language === 'ar' ? 'تخصيص' : 'Customize'}</span>
          </button>

          <button
            onClick={fetchRecommendations}
            disabled={isLoading}
            className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-emerald-500 hover:border-emerald-500/40 transition-all cursor-pointer"
            title={language === 'ar' ? 'تحديث التوصيات' : 'Refresh'}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin text-emerald-500' : ''} />
          </button>
        </div>
      </div>

      {/* Category Tabs (only if full variant and not bulletin-only) */}
      {variant === 'full' && !isBulletinOnly && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 mb-3.5 text-xs font-semibold">
          {[
            { id: 'all', label_ar: 'الكل', label_en: 'All Picks', icon: <Compass size={13} /> },
            { id: 'marketplace', label_ar: 'المنتجات الرقمية', label_en: 'Digital Products', icon: <ShoppingBag size={13} /> },
            { id: 'bulletin', label_ar: 'الخدمات والإعلانات', label_en: 'Services & Ads', icon: <Megaphone size={13} /> },
            { id: 'tool', label_ar: 'أدوات الذكاء الاصطناعي', label_en: 'AI Tools', icon: <Zap size={13} /> },
            { id: 'blog', label_ar: 'مقالات ومعرفة', label_en: 'Insights & Articles', icon: <BookOpen size={13} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all duration-200 border text-xs ${
                activeCategory === tab.id
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold shadow-2xs'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.icon}
              <span>{language === 'ar' ? tab.label_ar : tab.label_en}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className={isBulletinOnly || variant === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'}>
          {Array.from({ length: limit > 4 ? 4 : limit }).map((_, i) => (
            <div key={i} className="h-16 sm:h-20 rounded-xl bg-gray-100 dark:bg-gray-800/60 animate-pulse p-3 flex items-center gap-3">
              <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="w-3/4 h-3.5 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-center text-xs text-red-400">
          {error}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="p-5 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-center space-y-2">
          <Megaphone size={24} className="mx-auto text-emerald-500/40" />
          <h4 className="text-xs font-bold text-[var(--text-primary)]">
            {language === 'ar' ? 'لا تتوفر إعلانات موصى بها حالياً' : 'No ad recommendations currently'}
          </h4>
          <p className="text-[11px] text-[var(--text-muted)] max-w-xs mx-auto">
            {language === 'ar' 
              ? 'تصفح الإعلانات والخدمات لتدريب المحرك الذكي، أو خصص اهتماماتك مباشرة' 
              : 'Browse ads or adjust your preferences to train your recommendation vector.'}
          </p>
          <button
            onClick={() => setIsPrefModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            {language === 'ar' ? 'تخصيص تفضيلاتي الآن' : 'Set My Preferences'}
          </button>
        </div>
      ) : (
        /* Items Grid */
        <div className={isBulletinOnly || variant === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'}>
          {visibleItems.map(item => {
            const reasonText = language === 'ar' 
              ? (item.reasons_ar?.[0] || 'توصية مخصصة')
              : (item.reasons_en?.[0] || 'Recommended for you');

            const titleText = language === 'ar'
              ? (item.data?.title || item.data?.title_ar || item.data?.name_ar || item.data?.title_en || '')
              : (item.data?.title_en || item.data?.title || item.data?.name_en || '');

            const mediaUrl = getMediaUrl(item.data?.image_url || item.data?.video_url || item.data?.icon);
            const price = item.data?.price_amount || item.data?.price || item.data?.price_usd || 0;
            const cityText = item.data?.location_city || item.data?.city || '';

            if (isBulletinOnly || variant === 'compact') {
              /* SLEEK SIDEBAR COMPACT CARD FOR BULLETIN ADS */
              return (
                <motion.div
                  key={item.recommendation_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleItemClick(item)}
                  className="group relative p-2.5 sm:p-3 rounded-xl bg-gray-50/60 dark:bg-gray-900/60 hover:bg-white dark:hover:bg-[#222225] border border-gray-200/80 dark:border-gray-800 hover:border-emerald-500/50 transition-all duration-300 flex items-center justify-between gap-2.5 cursor-pointer shadow-2xs hover:shadow-md overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {mediaUrl ? (
                      <img
                        src={mediaUrl}
                        alt={titleText}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                        title={language === 'ar' ? 'عرض تفاصيل التوصية' : 'View recommendation details'}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0 bg-black/10 cursor-pointer hover:opacity-90 hover:scale-105 transition-all"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 cursor-pointer hover:bg-emerald-500/20 transition-all"
                      >
                        <Megaphone size={18} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                        className="text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors truncate cursor-pointer"
                      >
                        {titleText}
                      </h4>

                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {cityText && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                            <MapPin size={10} className="text-emerald-500 shrink-0" />
                            <span className="truncate max-w-[80px]">{cityText}</span>
                          </span>
                        )}

                        <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          <Sparkles size={9} />
                          {item.match_percentage}% {language === 'ar' ? 'توافق' : 'Match'}
                        </span>

                        {price > 0 && (
                          <span className="text-[10px] font-black text-emerald-500 ms-auto">
                            ${price}
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate mt-0.5 font-medium">
                        {reasonText}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleDismiss(item, e)}
                      className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title={language === 'ar' ? 'غير مهتم' : 'Not interested'}
                    >
                      <X size={12} />
                    </button>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                      }}
                      title={language === 'ar' ? 'التفاصيل' : 'Details'}
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                    >
                      <ChevronRight size={14} className={dir === 'rtl' ? 'rotate-180' : ''} />
                    </button>
                  </div>
                </motion.div>
              );
            }

            /* STANDARD FULL GRID CARD FOR OTHER VARIANTS */
            return (
              <motion.div
                key={item.recommendation_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleItemClick(item)}
                className="group relative rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-emerald-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 p-3 flex flex-col justify-between cursor-pointer overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                      {getTypeIcon(item.item_type)}
                      <span>{getTypeBadgeText(item.item_type)}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Sparkles size={10} />
                        {item.match_percentage}% {language === 'ar' ? 'توافق' : 'Match'}
                      </span>

                      <button
                        onClick={(e) => handleDismiss(item, e)}
                        className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title={language === 'ar' ? 'غير مهتم' : 'Not interested'}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.06] border border-emerald-500/10 px-2 py-1 rounded-md mb-2.5 truncate">
                    <Tag size={10} className="shrink-0 text-emerald-500" />
                    <span className="truncate">{reasonText}</span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    {mediaUrl ? (
                      <img
                        src={mediaUrl}
                        alt={titleText}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                        title={language === 'ar' ? 'عرض تفاصيل التوصية' : 'View details'}
                        className="w-12 h-12 rounded-xl object-cover border border-[var(--border)] shrink-0 bg-black/10 cursor-pointer hover:opacity-90 hover:scale-105 transition-all"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                        className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 cursor-pointer hover:bg-emerald-500/20 transition-all"
                      >
                        {getTypeIcon(item.item_type)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                        className="text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors line-clamp-2 leading-tight cursor-pointer"
                      >
                        {titleText}
                      </h4>
                      {price > 0 ? (
                        <p className="text-[11px] font-extrabold text-emerald-500 mt-1">
                          ${price} USD
                        </p>
                      ) : (
                        <p className="text-[10px] font-medium text-[var(--text-muted)] mt-1 truncate">
                          {item.data?.category_en || item.data?.category_ar || item.data?.category || (language === 'ar' ? 'متاح الآن' : 'Available now')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(item);
                  }}
                  className="w-full mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-xs text-emerald-500 font-bold hover:text-emerald-400 group-hover:translate-x-0.5 transition-all text-start cursor-pointer"
                >
                  <span className="text-[11px]">
                    {language === 'ar' ? 'التفاصيل واستكشاف المحتوى' : 'View Details & Explore'}
                  </span>
                  <ChevronRight size={14} className={dir === 'rtl' ? 'rotate-180' : ''} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Embedded Preferences Modal */}
      <RecommendationPreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
        onSaved={fetchRecommendations}
      />
    </div>
  );
};
