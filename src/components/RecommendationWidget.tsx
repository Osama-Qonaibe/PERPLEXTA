import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Compass, 
  Sliders, 
  Zap, 
  BookOpen, 
  Megaphone, 
  RefreshCw, 
  X, 
  Tag, 
  ChevronRight,
  MapPin,
  Clock
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getMediaUrl } from '../utils/mediaUtils';
import { BulletinAvatar } from './BulletinAvatar';
import { RecommendationPreferencesModal } from './RecommendationPreferencesModal';

interface RecommendationItem {
  recommendation_id: string;
  item_type: 'bulletin' | 'tool' | 'page';
  item_id: any;
  score: number;
  match_percentage: number;
  reasons_en: string[];
  reasons_ar: string[];
  data: any;
}

interface RecommendationWidgetProps {
  variant?: 'full' | 'compact' | 'bulletin' | 'tools' | 'banner';
  title?: string;
  subtitle?: string;
  limit?: number;
  filterType?: 'all' | 'bulletin' | 'tool';
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
      if (!res.ok) {
        setItems([]);
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setItems([]);
        return;
      }
      const data = await res.json();

      if (data && data.success && Array.isArray(data.items)) {
        setItems(data.items);
      } else if (data && data.success && Array.isArray(data.recommendations)) {
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
        navigate(`/bulletin?ad_id=${item.item_id}`);
      }
    } else if (item.item_type === 'page') {
      navigate(`/bulletin?tab=pages&page_id=${item.item_id}`);
    } else if (item.item_type === 'tool') {
      navigate(`/chat?tool=${item.data?.tool_id || item.item_id}`);
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
      case 'bulletin': return <Megaphone size={14} className="text-amber-500" />;
      case 'page': return <BookOpen size={14} className="text-[var(--fg-success)]" />;
      case 'tool': return <Zap size={14} className="text-blue-500" />;
      default: return <Sparkles size={14} className="text-accent" />;
    }
  };

  const getTypeBadgeText = (type: string) => {
    if (language === 'ar') {
      switch (type) {
        case 'bulletin': return 'منشور/خدمة';
        case 'page': return 'صفحة تجارية';
        case 'tool': return 'أداة ذكية';
        default: return 'توصية';
      }
    } else {
      switch (type) {
        case 'bulletin': return 'Feed Post';
        case 'page': return 'Verified Page';
        case 'tool': return 'AI Tool';
        default: return 'Recommended';
      }
    }
  };

  const formatPublishedTime = (createdAt?: string) => {
    if (!createdAt) return language === 'ar' ? 'تم النشر الآن' : 'Published just now';
    try {
      const diff = Date.now() - new Date(createdAt).getTime();
      if (isNaN(diff) || diff < 60000) return language === 'ar' ? 'تم النشر الآن' : 'Published just now';
      if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return language === 'ar' ? `منذ ${mins} دقيقة` : `${mins}m ago`;
      }
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return language === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
      }
      return language === 'ar' ? 'تم النشر الآن' : 'Published just now';
    } catch (e) {
      return language === 'ar' ? 'تم النشر الآن' : 'Published just now';
    }
  };

  if (!token || !user) return null;

  return (
    <div className={`w-full ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5 pb-2.5 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
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
                  ? (language === 'ar' ? 'إعلانات موصى بها' : 'Recommended Ads')
                  : (language === 'ar' ? 'توصيات مخصصة لك' : 'Recommended For You'))}
              </span>
              <span className="ui-badge-pill shrink-0">
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
            className="ui-btn-pill text-[11px] py-1 px-2.5"
            title={language === 'ar' ? 'تعديل تفضيلات التوصيات' : 'Customize preferences'}
          >
            <Sliders size={12} className="text-accent shrink-0" />
            <span>{language === 'ar' ? 'تخصيص' : 'Customize'}</span>
          </button>

          <button
            onClick={fetchRecommendations}
            disabled={isLoading}
            className="ui-btn-icon-circle w-7 h-7"
            title={language === 'ar' ? 'تحديث التوصيات' : 'Refresh'}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin text-accent' : ''} />
          </button>
        </div>
      </div>

      {/* Category Tabs (only if full variant and not bulletin-only) */}
      {variant === 'full' && !isBulletinOnly && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 mb-3 text-xs font-semibold snap-x touch-pan-x px-0.5">
          {[
            { id: 'all', label_ar: 'الكل', label_en: 'All Picks', icon: <Compass size={14} /> },
            { id: 'bulletin', label_ar: 'فيرال بوك (Viralbook)', label_en: 'Viralbook Feeds & Ads', icon: <Megaphone size={14} /> },
            { id: 'tool', label_ar: 'أدوات الذكاء الاصطناعي', label_en: 'AI Tools', icon: <Zap size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id as any)}
              className={`snap-start flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-theme border text-xs cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-[var(--surface-subtle)] text-accent border-accent/40 font-extrabold shadow-2xs ring-1 ring-accent/30'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-gray-300'
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
        <div className={isBulletinOnly || variant === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'}>
          {Array.from({ length: limit > 4 ? 4 : limit }).map((_, i) => (
            <div key={`rec-widget-skel-${i}`} className="h-16 sm:h-20 rounded-xl bg-gray-100 dark:bg-white/[0.03] animate-pulse p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-white/[0.06] rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="w-3/4 h-3 bg-gray-200 dark:bg-white/[0.06] rounded" />
                <div className="w-1/2 h-2.5 bg-gray-200 dark:bg-white/[0.06] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-center text-xs text-red-400">
          {error}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="py-5 px-3 text-center space-y-2">
          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center mx-auto text-accent">
            <Megaphone size={16} />
          </div>
          <h4 className="text-xs font-bold text-[var(--text-primary)]">
            {language === 'ar' ? 'لا تتوفر إعلانات موصى بها حالياً' : 'No ad recommendations currently'}
          </h4>
          <p className="text-[11px] text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
            {language === 'ar' 
              ? 'تصفح الإعلانات والخدمات لتدريب المحرك الذكي، أو خصص اهتماماتك مباشرة' 
              : 'Browse ads or adjust your preferences to train your recommendation vector.'}
          </p>
          <div className="pt-1">
            <button
              onClick={() => setIsPrefModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-accent/10 hover:bg-accent/20 text-accent font-bold text-[11px] transition-theme border border-accent/20 cursor-pointer"
            >
              {language === 'ar' ? 'تخصيص تفضيلاتي الآن' : 'Set My Preferences'}
            </button>
          </div>
        </div>
      ) : (
        /* Items Grid */
        <div className={isBulletinOnly || variant === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'}>
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
              const isToolItem = item.item_type === 'tool';
              const timeAgoText = formatPublishedTime(item.data?.created_at);

              /* SLEEK DISTRACTION-FREE COMPACT CARD FOR BULLETIN ADS & TOOLS */
              return (
                <motion.div
                  key={`rec-item-compact-${item.recommendation_id || item.item_id || recIdx}-${recIdx}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleItemClick(item)}
                  className="group relative p-2.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-accent/10 border border-[var(--border-main)] hover:border-accent/40 transition-all flex items-center justify-between gap-3 cursor-pointer overflow-hidden shadow-2xs group-hover:shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {isToolItem ? (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 shadow-2xs">
                        <Zap size={18} />
                      </div>
                    ) : (
                      <div className="relative shrink-0">
                        <BulletinAvatar
                          src={mediaUrl}
                          alt={titleText}
                          size="md"
                        />
                      </div>
                    )}

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

                      <div className="flex items-center gap-2 mt-1 text-[10px] font-extrabold flex-wrap">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <Clock size={10} className="shrink-0" />
                          <span>{timeAgoText}</span>
                        </span>

                        {cityText && (
                          <span className="flex items-center gap-0.5 text-[var(--text-muted)] font-bold">
                            <MapPin size={10} className="text-accent shrink-0" />
                            <span className="truncate max-w-[80px]">{cityText}</span>
                          </span>
                        )}

                        {price > 0 && (
                          <span className="text-[10px] font-black text-accent ms-auto">
                            ${price}
                          </span>
                        )}
                      </div>
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

                    <div className="w-6 h-6 rounded-lg bg-[var(--surface-card)] border border-[var(--border-main)] group-hover:border-accent group-hover:text-accent text-[var(--text-muted)] flex items-center justify-center transition-all shrink-0">
                      <ChevronRight size={13} className={dir === 'rtl' ? 'rotate-180' : ''} />
                    </div>
                  </div>
                </motion.div>
              );
            }

            /* STANDARD FULL GRID CARD FOR OTHER VARIANTS */
            const isTool = item.item_type === 'tool';
            return (
              <motion.div
                key={`rec-item-full-${item.recommendation_id || item.item_id || recIdx}-${recIdx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleItemClick(item)}
                className="group relative rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-accent/40 transition-theme hover:shadow-md p-3 flex flex-col justify-between cursor-pointer overflow-hidden"
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

                  <div className="flex items-center gap-1 text-[10px] font-semibold text-accent bg-accent/[0.06] border border-accent/10 px-2 py-1 rounded-md mb-2.5 truncate">
                    <Tag size={10} className="shrink-0 text-accent" />
                    <span className="truncate">{reasonText}</span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    {isTool ? (
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 shadow-2xs">
                        <Zap size={20} />
                      </div>
                    ) : (
                      <BulletinAvatar
                        src={mediaUrl}
                        alt={titleText}
                        size="md"
                        onClick={() => handleItemClick(item)}
                      />
                    )}

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
                  className="w-full mt-3 pt-2 sm:pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-xs text-accent font-bold hover:text-accent group-hover:translate-x-0.5 transition-theme text-start cursor-pointer"
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
