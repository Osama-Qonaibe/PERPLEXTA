import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  MapPin
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getMediaUrl } from '../utils/mediaUtils';
import { BulletinAvatar } from './BulletinAvatar';
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

  const [rotationOffset, setRotationOffset] = useState<number>(0);

  const filteredItems = items
    .filter(i => !dismissedKeys.has(i.recommendation_id))
    .filter(i => (filterType && filterType !== 'all') ? i.item_type === filterType : (activeCategory === 'all' ? true : i.item_type === activeCategory));

  useEffect(() => {
    if (!isBulletinOnly && variant !== 'compact') return;
    if (filteredItems.length <= 3) return;

    const timer = setInterval(() => {
      setRotationOffset(prev => (prev + 1) % filteredItems.length);
    }, 30000); // 30 seconds rotation

    return () => clearInterval(timer);
  }, [filteredItems.length, isBulletinOnly, variant]);

  const visibleItems = React.useMemo(() => {
    if (!isBulletinOnly && variant !== 'compact') {
      return filteredItems.slice(0, limit);
    }
    if (filteredItems.length === 0) return [];
    const sliceCount = Math.min(3, filteredItems.length);
    const result = [];
    for (let i = 0; i < sliceCount; i++) {
      const idx = (rotationOffset + i) % filteredItems.length;
      result.push(filteredItems[idx]);
    }
    return result;
  }, [filteredItems, rotationOffset, limit, isBulletinOnly, variant]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'marketplace': return <ShoppingBag size={14} className="text-accent" />;
      case 'bulletin': return <Megaphone size={14} className="text-amber-500" />;
      case 'tool': return <Zap size={14} className="text-blue-500" />;
      case 'blog': return <BookOpen size={14} className="text-purple-500" />;
      default: return <Sparkles size={14} className="text-accent" />;
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
          <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
            {isBulletinOnly ? (
              <Megaphone size={16} className="text-accent " />
            ) : (
              <Sparkles size={16} className="text-accent animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
              <span>
                {title || (isBulletinOnly
                  ? (language === 'ar' ? 'تفضيلات الإعلانات المخصصة' : 'Recommended Ads')
                  : (language === 'ar' ? 'توصيات مخصصة لك' : 'Recommended For You'))}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] bg-accent/10 text-accent border border-accent/20 shrink-0">
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
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:text-accent hover:border-accent/40 hover:bg-accent/5 transition-theme shadow-2xs cursor-pointer"
            title={language === 'ar' ? 'تعديل تفضيلات التوصيات' : 'Customize preferences'}
          >
            <Sliders size={12} className="text-accent shrink-0" />
            <span>{language === 'ar' ? 'تخصيص' : 'Customize'}</span>
          </button>

          <button
            onClick={fetchRecommendations}
            disabled={isLoading}
            className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-accent hover:border-accent/40 transition-theme cursor-pointer"
            title={language === 'ar' ? 'تحديث التوصيات' : 'Refresh'}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin text-accent' : ''} />
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-theme border text-xs ${
                activeCategory === tab.id
                  ? 'bg-accent/10 text-accent border-accent/30 font-bold shadow-2xs'
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
            <div key={`rec-widget-skel-${i}`} className="h-16 sm:h-20 rounded-xl bg-gray-100 dark:bg-gray-800/60 animate-pulse p-3 flex items-center gap-3">
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
          <Megaphone size={24} className="mx-auto text-accent/40" />
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
            className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent text-white font-bold text-xs transition-theme shadow-xs cursor-pointer"
          >
            {language === 'ar' ? 'تخصيص تفضيلاتي الآن' : 'Set My Preferences'}
          </button>
        </div>
      ) : (
        /* Items Grid */
        <div className={isBulletinOnly || variant === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'}>
          {visibleItems.map((item, recIdx) => {
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
                  key={`rec-item-compact-${item.recommendation_id || item.item_id || recIdx}-${recIdx}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleItemClick(item)}
                  className="group relative p-2.5 sm:p-3 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-main)] hover:border-[var(--border-accent)] transition-theme flex items-center justify-between gap-2.5 cursor-pointer shadow-2xs overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <BulletinAvatar
                      src={mediaUrl}
                      alt={titleText}
                      size="md"
                      onClick={() => handleItemClick(item)}
                    />

                    <div className="min-w-0 flex-1">
                      <h4 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                        className="text-xs font-bold text-[var(--text-primary)] group-hover:text-accent transition-colors truncate cursor-pointer"
                      >
                        {titleText}
                      </h4>

                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {cityText && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                            <MapPin size={10} className="text-accent shrink-0" />
                            <span className="truncate max-w-[80px]">{cityText}</span>
                          </span>
                        )}

                        <span className="text-[10px] font-extrabold text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded-[6px] flex items-center gap-0.5">
                          <Sparkles size={9} />
                          {item.match_percentage}% {language === 'ar' ? 'توافق' : 'Match'}
                        </span>

                        {price > 0 && (
                          <span className="text-[10px] font-black text-accent ms-auto">
                            ${price}
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-accent dark:text-accent truncate mt-0.5 font-medium">
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
                      className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent hover:text-white transition-theme cursor-pointer"
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
                key={`rec-item-full-${item.recommendation_id || item.item_id || recIdx}-${recIdx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleItemClick(item)}
                className="group relative rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-accent/40 transition-theme hover:shadow-lg hover:shadow-none p-3 flex flex-col justify-between cursor-pointer overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                      {getTypeIcon(item.item_type)}
                      <span>{getTypeBadgeText(item.item_type)}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-extrabold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-[6px] flex items-center gap-0.5">
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

                  <div className="flex items-center gap-1 text-[10px] font-semibold text-accent dark:text-accent bg-accent/[0.06] border border-accent/10 px-2 py-1 rounded-md mb-2.5 truncate">
                    <Tag size={10} className="shrink-0 text-accent" />
                    <span className="truncate">{reasonText}</span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <BulletinAvatar
                      src={mediaUrl}
                      alt={titleText}
                      size="md"
                      onClick={() => handleItemClick(item)}
                    />

                    <div className="min-w-0 flex-1">
                      <h4 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                        className="text-xs font-bold text-[var(--text-primary)] group-hover:text-accent transition-colors line-clamp-2 leading-tight cursor-pointer"
                      >
                        {titleText}
                      </h4>
                      {price > 0 ? (
                        <p className="text-[11px] font-extrabold text-accent mt-1">
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
                  className="w-full mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-xs text-accent font-bold hover:text-accent group-hover:translate-x-0.5 transition-theme text-start cursor-pointer"
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
