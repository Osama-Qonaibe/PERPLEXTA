import { safeStorageGet, safeStorageSet, safeStorageRemove } from "@/utils/safeStorage";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  MessageSquare,
  MessageCircle,
  Phone,
  PhoneCall,
  Video,
  Film,
  Play,
  Send,
  Share2,
  CheckCircle2,
  MapPin,
  Loader2,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  Link,
  Check,
  Rocket,
  BarChart2,
  Globe,
  Users,
  Lock,
  Edit,
  Trash2,
  Bookmark,
  Flag,
  EyeOff,
  MoreVertical,
  Clapperboard,
  Camera
} from 'lucide-react';
import { toast } from 'sonner';
import ReactPlayer from 'react-player';
import { BulletinAd, BulletinAdComment } from '../../server/db/types';

const Player = ReactPlayer as any;
import { AdDirectChat } from './AdDirectChat';
import { AdInsightsTab } from './AdInsightsTab';
import { HighlightText } from './HighlightText';
import { MediaFormatPlayer } from './MediaFormatPlayer';
import { getMediaUrl } from '../utils/mediaUtils';

export interface PostFeedProps {
  ads: BulletinAd[];
  loading: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  isRtl: boolean;
  token: string | null;
  user: any;
  searchQuery?: string;
  onToggleLike: (adId: number) => void;
  onToggleComments: (adId: number) => void;
  expandedAdId: number | null;
  commentsMap: Record<number, BulletinAdComment[]>;
  loadingCommentsAdId: number | null;
  newCommentText: string;
  setNewCommentText: (val: string) => void;
  onAddComment: (adId: number, parentId?: number) => void;
  replyToCommentId: number | null;
  setReplyToCommentId: (id: number | null) => void;
  onMessageAdvertiser: (ad: BulletinAd) => void;
  messagingAdId: number | null;
  onInquire?: (ad: BulletinAd) => void;
  onWhatsApp: (ad: BulletinAd, e: React.MouseEvent) => void;
  onShare: (ad: BulletinAd) => void;
  onOpenPageDetail?: (pageId: number) => void;
  onOpenLightbox: (imgUrl: string) => void;
  onCreateAdClick: () => void;
  onBoostAd?: (ad: BulletinAd) => void;
  onEditAd?: (ad: BulletinAd) => void;
  onDeleteAd?: (ad: BulletinAd) => void;
  onToggleSave?: (ad: BulletinAd) => void;
  onReportAd?: (ad: BulletinAd) => void;
}

export const PostFeed: React.FC<PostFeedProps> = ({
  ads,
  loading,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  isRtl,
  token,
  user,
  searchQuery,
  onToggleLike,
  onToggleComments,
  expandedAdId,
  commentsMap,
  loadingCommentsAdId,
  newCommentText,
  setNewCommentText,
  onAddComment,
  onMessageAdvertiser,
  messagingAdId,
  onInquire,
  onWhatsApp,
  onShare,
  onOpenPageDetail,
  onOpenLightbox,
  onCreateAdClick,
  onBoostAd,
  onEditAd,
  onDeleteAd,
  onToggleSave,
  onReportAd,
  replyToCommentId,
  setReplyToCommentId
}) => {
  // Track expanded text for long descriptions per ad
  const [expandedTextIds, setExpandedTextIds] = useState<Record<number, boolean>>({});
  const [activeShareMenuId, setActiveShareMenuId] = useState<number | null>(null);
  const [copiedAdId, setCopiedAdId] = useState<number | null>(null);
  const [activeChatAdId, setActiveChatAdId] = useState<number | null>(null);
  const [hiddenAdIds, setHiddenAdIds] = useState<number[]>(() => {
    const saved = safeStorageGet('perplexta_hidden_ads');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeMoreMenuId, setActiveMoreMenuId] = useState<number | null>(null);

  const handleHideAd = (adId: number) => {
    const newHidden = [...hiddenAdIds, adId];
    setHiddenAdIds(newHidden);
    safeStorageSet('perplexta_hidden_ads', JSON.stringify(newHidden));
    toast.success(isRtl ? 'تم إخفاء هذا المنشور من خلاصتك' : 'Post hidden from your feed');
    setActiveMoreMenuId(null);
  };
  const [activeInsightsAdId, setActiveInsightsAdId] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Copy Direct Ad Link Helper
  const handleCopyLink = (ad: BulletinAd) => {
    const shareUrl = `${window.location.origin}/bulletin?ad=${ad.id}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedAdId(ad.id);
        toast.success(
          isRtl ? 'تم نسخ رابط الإعلان الحصري بنجاح!' : 'Ad direct link copied to clipboard!'
        );
        setTimeout(() => {
          setCopiedAdId(null);
          setActiveShareMenuId(null);
        }, 1800);
      }).catch(() => {
        fallbackCopyText(shareUrl, ad.id);
      });
    } else {
      fallbackCopyText(shareUrl, ad.id);
    }

    fetch(`/api/bulletin/ads/${ad.id}/share`, { method: 'POST' }).catch(() => {});
  };

  const fallbackCopyText = (text: string, adId: number) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setCopiedAdId(adId);
      toast.success(
        isRtl ? 'تم نسخ رابط الإعلان بنجاح!' : 'Ad direct link copied!'
      );
      setTimeout(() => {
        setCopiedAdId(null);
        setActiveShareMenuId(null);
      }, 1800);
    } catch (err) {
      toast.error(isRtl ? 'تعذر نسخ الرابط تلقائياً' : 'Could not copy link automatically');
    }
    document.body.removeChild(textarea);
  };

  // WhatsApp Quick Share Helper
  const handleWhatsAppShare = (ad: BulletinAd) => {
    const shareUrl = `${window.location.origin}/bulletin?ad=${ad.id}`;
    const text = encodeURIComponent(
      isRtl
        ? `شاهِد هذا الإعلان المميز على المنصة: "${ad.title}"\n${shareUrl}`
        : `Check out this promotion: "${ad.title}"\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
    fetch(`/api/bulletin/ads/${ad.id}/share`, { method: 'POST' }).catch(() => {});
  };

  // Intersection Observer for Infinite Scroll
  const isRequestingRef = useRef(false);

  useEffect(() => {
    if (!onLoadMore || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isRequestingRef.current) {
          isRequestingRef.current = true;
          onLoadMore();
          setTimeout(() => {
            isRequestingRef.current = false;
          }, 1000);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [onLoadMore, hasMore, loading, loadingMore]);

  const toggleTextExpand = (adId: number) => {
    setExpandedTextIds(prev => ({ ...prev, [adId]: !prev[adId] }));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-5 w-full touch-pan-y">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="rounded-2xl bg-white dark:bg-[#1a1a1c] p-4 border border-gray-200 dark:border-gray-800 animate-pulse space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
              </div>
            </div>
            <div className="aspect-square w-full bg-gray-200 dark:bg-gray-800 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-[#1a1a1c] rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 w-full">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
          <Megaphone size={32} />
        </div>
        <h3 className="text-base font-bold">
          {isRtl ? 'لا توجد إعلانات مطابقة حالياً' : 'No Ads Available'}
        </h3>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          {isRtl
            ? 'كن أول من ينشر إعلانه ويصل للعملاء في فلسطين والوطن العربي!'
            : 'Be the first to create an ad campaign and reach thousands!'}
        </p>
        <button
          onClick={onCreateAdClick}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-theme"
        >
          {isRtl ? 'أنشئ إعلانك الآن' : 'Create Ad Now'}
        </button>
      </div>
    );
  }

  const visibleAds = ads.filter(ad => !hiddenAdIds.includes(ad.id));

  return (
    <div className="grid grid-cols-1 gap-5 w-full touch-pan-y">
      {visibleAds.map((ad) => {
        const isTextExpanded = !!expandedTextIds[ad.id];
        const isLongText = ad.description && ad.description.length > 140;

        return (
          <motion.article
            key={(ad as any)._virtualId || ad.id}
            id={`bulletin-ad-${ad.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-theme flex flex-col overflow-hidden touch-pan-y"
          >
            {/* Creator Ad Insights Drawer Panel (Moved to top) */}
            <AnimatePresence>
              {activeInsightsAdId === ad.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-emerald-500/30 bg-gray-950 p-1 sm:p-2 overflow-hidden"
                >
                  <AdInsightsTab
                    adId={ad.id}
                    isRtl={isRtl}
                    token={token}
                    onBoostClick={onBoostAd ? () => onBoostAd(ad) : undefined}
                    onClose={() => setActiveInsightsAdId(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header: Author / Merchant Page info */}
            <div className="p-3 sm:p-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={
                      getMediaUrl(ad.author_avatar) ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
                    }
                    alt={ad.author_name}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.fallback) {
                        target.dataset.fallback = 'true';
                        target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
                      }
                    }}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                  />
                  {ad.page_id && (
                    <span
                      className="absolute -bottom-0.5 -end-0.5 bg-emerald-500 text-white rounded-full p-[2px] border border-white dark:border-[#18181b]"
                      title={isRtl ? 'صفحة تجارية معتمدة' : 'Verified Business Page'}
                    >
                      <CheckCircle2 size={10} />
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4
                      onClick={() =>
                        ad.page_id && onOpenPageDetail && onOpenPageDetail(ad.page_id)
                      }
                      className={`text-xs font-extrabold truncate text-gray-900 dark:text-gray-100 ${
                        ad.page_id ? 'cursor-pointer hover:text-emerald-500 transition-colors' : ''
                      }`}
                    >
                      {ad.author_name}
                    </h4>
                    <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 pt-0.5">
                    <span className="flex items-center gap-0.5 font-medium">
                      <MapPin size={10} className="text-emerald-500 shrink-0" />
                      {ad.location_city || 'فلسطين'}
                    </span>
                    <span>•</span>
                    <span className="font-medium">
                      {new Date(ad.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                    </span>
                    <span>•</span>
                    <span 
                      className="flex items-center gap-0.5 font-medium cursor-help"
                      title={
                        ad.audience === 'friends' ? (isRtl ? 'الجمهور: الأصدقاء' : 'Audience: Friends') :
                        ad.audience === 'only_me' ? (isRtl ? 'الجمهور: أنا فقط' : 'Audience: Only Me') :
                        (isRtl ? 'الجمهور: العامة' : 'Audience: Public')
                      }
                    >
                      {ad.audience === 'friends' ? (
                        <Users size={10} className="text-blue-500 shrink-0" />
                      ) : ad.audience === 'only_me' ? (
                        <Lock size={10} className="text-amber-500 shrink-0" />
                      ) : (
                        <Globe size={10} className="text-gray-400 dark:text-gray-500 shrink-0" />
                      )}
                      <span className="text-[9px]">
                        {ad.audience === 'friends' ? (isRtl ? 'الأصدقاء' : 'Friends') :
                         ad.audience === 'only_me' ? (isRtl ? 'أنا فقط' : 'Only Me') :
                         (isRtl ? 'عام' : 'Public')}
                      </span>
                    </span>
                    {ad.is_boosted && (
                      <>
                        <span>•</span>
                        <span className="text-amber-500 font-bold">{isRtl ? 'مُموَّل' : 'Sponsored'}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {ad.is_ai_generated && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400 text-[10px] font-black flex items-center gap-1 shadow-sm">
                    <Sparkles size={11} className="text-indigo-500 animate-pulse" />
                    <span>{isRtl ? 'بواسطة AI' : 'AI-Generated'}</span>
                  </span>
                )}
                {ad.ad_format && ad.ad_format !== 'post' && (
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black flex items-center gap-1 shadow-sm ${
                    ad.ad_format === 'reel' 
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400' 
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {ad.ad_format === 'reel' ? <Clapperboard size={11} className="text-purple-500" /> : <Camera size={11} className="text-emerald-500" />}
                    <span>{ad.ad_format === 'reel' ? (isRtl ? 'ريلز' : 'Reel') : (isRtl ? 'قصة' : 'Story')}</span>
                  </span>
                )}
                {ad.is_boosted && (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border border-amber-500/40 text-amber-500 dark:text-amber-400 text-[10px] font-black flex items-center gap-1 shadow-sm">
                    <Rocket size={11} className="text-amber-500 animate-bounce" />
                    <span className="hidden sm:inline">{isRtl ? 'مُموَّل VIP' : 'Boosted'}</span>
                  </span>
                )}

                {/* Creator Ad Insights Toggle Button */}
                {user && (user.id === ad.user_id || user.is_admin) && (
                  <button
                    onClick={() => setActiveInsightsAdId(activeInsightsAdId === ad.id ? null : ad.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-theme shadow-sm ${
                      activeInsightsAdId === ad.id
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-400/40'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}
                    title={isRtl ? 'عرض إحصائيات ورؤى الإعلان للمنشئ' : 'View Ad Insights for Creators'}
                  >
                    <BarChart2 size={12} className="shrink-0" />
                    <span className="whitespace-nowrap">{isRtl ? 'إحصائيات' : 'Insights'}</span>
                  </button>
                )}

                {/* Edit & Delete Actions for Owners */}
                {user && (user.id === ad.user_id || user.is_admin) && (
                  <div className="flex items-center gap-1">
                    {onEditAd && (
                      <button
                        onClick={() => onEditAd(ad)}
                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-theme border border-transparent hover:border-emerald-500/20"
                        title={isRtl ? 'تعديل المنشور' : 'Edit Post'}
                      >
                        <Edit size={12} />
                      </button>
                    )}
                    {onDeleteAd && (
                      <button
                        onClick={() => onDeleteAd(ad)}
                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-theme border border-transparent hover:border-red-500/20"
                        title={isRtl ? 'حذف المنشور' : 'Delete Post'}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}

                {/* Save Toggle Button */}
                {user && onToggleSave && (
                  <button
                    onClick={() => onToggleSave(ad)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-theme border ${
                      ad.user_has_saved
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30'
                        : 'bg-gray-100 dark:bg-gray-800/80 text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'
                    }`}
                    title={ad.user_has_saved ? (isRtl ? 'إزالة من المحفوظات' : 'Remove from Saved') : (isRtl ? 'حفظ في المحفوظات' : 'Save to Board')}
                  >
                    <Bookmark size={12} className={ad.user_has_saved ? "fill-current" : ""} />
                  </button>
                )}

                {ad.page_id && onOpenPageDetail && (
                  <button
                    onClick={() => onOpenPageDetail(ad.page_id!)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-extrabold transition-theme"
                  >
                    {isRtl ? 'زيارة الصفحة' : 'Visit Page'}
                  </button>
                )}

                {onBoostAd && (
                  <button
                    onClick={() => onBoostAd(ad)}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500 hover:to-emerald-500 text-amber-600 dark:text-amber-400 hover:text-white font-black text-[10px] flex items-center gap-1 border border-amber-500/30 transition-theme shadow-sm"
                    title={isRtl ? 'تمويل وتنشيط الإعلان لزيادة الوصول' : 'Boost Post for Higher Visibility'}
                  >
                    <Rocket size={11} className="shrink-0" />
                    <span className="whitespace-nowrap">{ad.is_boosted ? (isRtl ? 'تمديد' : 'Extend') : (isRtl ? 'تمويل' : 'Boost')}</span>
                  </button>
                )}

                {/* More Actions Menu */}
                <div className="relative shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMoreMenuId(activeMoreMenuId === ad.id ? null : ad.id);
                    }}
                    className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-theme flex items-center justify-center border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    title={isRtl ? 'المزيد من الخيارات' : 'More options'}
                  >
                    <MoreVertical size={14} />
                  </button>

                  <AnimatePresence>
                    {activeMoreMenuId === ad.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-30" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMoreMenuId(null);
                          }} 
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 8 }}
                          className="absolute end-0 top-full mt-2 w-52 bg-white dark:bg-[#1a1a1c] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl shadow-black/10 z-40 overflow-hidden py-1.5"
                        >
                          <button
                            onClick={() => handleHideAd(ad.id)}
                            className="w-full px-4 py-2.5 text-start text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors"
                          >
                            <EyeOff size={15} className="text-gray-400" />
                            <span>{isRtl ? 'إخفاء هذا المنشور' : 'Hide this post'}</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              if (onReportAd) onReportAd(ad);
                              setActiveMoreMenuId(null);
                            }}
                            className="w-full px-4 py-2.5 text-start text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                          >
                            <Flag size={15} className="text-red-400" />
                            <span>{isRtl ? 'إبلاغ عن محتوى غير لائق' : 'Report content'}</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Content: Title, Text & Hashtags */}
            <div className="p-3.5 space-y-2 flex-1">
              <h3 className="text-xs font-black text-gray-900 dark:text-gray-100 leading-snug">
                <HighlightText text={ad.title} query={searchQuery} />
              </h3>

              <div className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed space-y-1">
                <p className={isLongText && !isTextExpanded ? 'line-clamp-3' : ''}>
                  <HighlightText text={ad.description} query={searchQuery} />
                </p>

                {isLongText && (
                  <button
                    onClick={() => toggleTextExpand(ad.id)}
                    className="text-emerald-500 font-bold hover:underline inline-flex items-center gap-1 text-[10px]"
                  >
                    <span>
                      {isTextExpanded
                        ? isRtl
                          ? 'عرض أقل'
                          : 'Show Less'
                        : isRtl
                        ? 'عرض المزيد...'
                        : 'See More...'}
                    </span>
                    {isTextExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </div>

              {ad.hashtags && ad.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {ad.hashtags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <HighlightText text={tag.startsWith('#') ? tag : `#${tag}`} query={searchQuery} />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Media Image: Aspect ratio based on format */}
            {ad.image_url && !ad.video_url && (
              <div
                onClick={() => onOpenLightbox(getMediaUrl(ad.image_url))}
                className={`relative w-full bg-gray-100 dark:bg-gray-900 cursor-pointer overflow-hidden group border-y border-gray-100 dark:border-gray-800/60 transition-theme touch-pan-y ${
                  ad.ad_format === 'reel' || ad.ad_format === 'story' 
                    ? 'aspect-[9/16] max-h-[550px] mx-auto' 
                    : ad.ad_format === 'video' || ad.ad_format === 'instream'
                    ? 'aspect-video'
                    : ad.ad_format === 'banner'
                    ? 'aspect-[21/9]'
                    : 'aspect-square'
                }`}
              >
                <img
                  src={getMediaUrl(ad.image_url)}
                  alt={ad.title || 'Advertisement image'}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = 'true';
                      target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80';
                    }
                  }}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none touch-pan-y"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-black/80 text-xs font-bold shadow-lg text-gray-800 dark:text-white flex items-center gap-1.5 backdrop-blur-md">
                    <Sparkles size={13} className="text-emerald-500" />
                    <span>{isRtl ? 'عرض بصورة مكبرة' : 'Expand Image'}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Promotional Video / Reels Media Section with Multi-Format Player */}
            {ad.video_url && (
              <div className="p-3 border-b border-gray-100 dark:border-gray-800/60 bg-black/95 text-white rounded-b-xl">
                <div className="flex items-center justify-between pb-2 text-[11px] font-extrabold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Film size={14} className="animate-pulse text-emerald-400" />
                    <span>{isRtl ? 'وسائط العرض / الفيديو الترويجي' : 'Media / Promotional Video'}</span>
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono">
                    {ad.ad_format === 'reel' ? 'REELS (9:16)' : ad.ad_format === 'story' ? 'STORY (9:16)' : 'VIDEO (16:9)'}
                  </span>
                </div>

                <MediaFormatPlayer
                  url={getMediaUrl(ad.video_url)}
                  adFormat={ad.ad_format || 'feed'}
                  posterUrl={getMediaUrl(ad.image_url)}
                  title={ad.title}
                  isRtl={isRtl}
                  className={ad.ad_format === 'reel' || ad.ad_format === 'story' ? 'max-h-[520px] mx-auto' : ''}
                />
              </div>
            )}

            {/* Social Engagement Actions Bar */}
            <div className="p-2.5 bg-gray-50/60 dark:bg-[#18181b]/60 flex items-center justify-between gap-1 text-xs text-gray-500 dark:text-gray-400">
              {/* Like Button */}
              <button
                onClick={() => onToggleLike(ad.id)}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-theme ${
                  ad.user_has_liked
                    ? 'text-red-500 bg-red-500/10'
                    : 'hover:bg-gray-200/60 dark:hover:bg-gray-800'
                }`}
              >
                <Heart size={15} className={ad.user_has_liked ? 'fill-red-500' : ''} />
                <span className="text-[11px]">{ad.likes_count}</span>
              </button>

              {/* Comments Toggle Button */}
              <button
                onClick={() => onToggleComments(ad.id)}
                className="flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-bold hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-theme"
              >
                <MessageSquare size={15} />
                <span className="text-[11px]">{ad.comments_count}</span>
              </button>

              {/* Direct Chat / Message Advertiser */}
              <button
                onClick={() => {
                  setActiveChatAdId(activeChatAdId === ad.id ? null : ad.id);
                  if (onMessageAdvertiser) onMessageAdvertiser(ad);
                }}
                disabled={messagingAdId === ad.id}
                className={`px-3 py-1.5 rounded-lg text-white font-bold flex items-center justify-center gap-1.5 transition-theme shadow-sm shrink-0 ${
                  activeChatAdId === ad.id
                    ? 'bg-emerald-600 ring-2 ring-emerald-400/50 shadow-emerald-500/30'
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                }`}
                title={isRtl ? 'مراسلة مشفرة للمعلن في محادثة خاصة' : 'Encrypted Message Advertiser'}
              >
                {messagingAdId === ad.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <MessageCircle size={14} />
                )}
                <span className="text-[11px] whitespace-nowrap hidden sm:inline">
                  {isRtl ? 'مراسلة مشفرة' : 'Encrypted Chat'}
                </span>
              </button>



              {/* WhatsApp Button */}
              {ad.whatsapp_number && (
                <button
                  onClick={(e) => onWhatsApp(ad, e)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center gap-1 hover:bg-emerald-700 transition-theme shadow-sm shrink-0"
                  title={isRtl ? 'تواصل عبر الواتساب' : 'WhatsApp Contact'}
                >
                  <Phone size={13} />
                  <span className="hidden sm:inline">واتساب</span>
                </button>
              )}

              {/* Direct Phone Call Button */}
              {ad.phone_number && (
                <a
                  href={`tel:${ad.phone_number}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-theme shadow-sm shrink-0"
                  title={isRtl ? `اتصال مباشر: ${ad.phone_number}` : `Call: ${ad.phone_number}`}
                >
                  <PhoneCall size={13} />
                  <span className="hidden sm:inline">{isRtl ? 'اتصال' : 'Call'}</span>
                </a>
              )}

              {/* Share & Copy Menu Dropdown */}
              <div className="relative shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveShareMenuId(activeShareMenuId === ad.id ? null : ad.id);
                  }}
                  className={`p-1.5 rounded-lg transition-theme flex items-center gap-1 shrink-0 ${
                    activeShareMenuId === ad.id
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}
                  title={isRtl ? 'مشاركة ورابط الإعلان' : 'Share & Copy Link'}
                >
                  <Share2 size={15} />
                </button>

                <AnimatePresence>
                  {activeShareMenuId === ad.id && (
                    <>
                      {/* Backdrop to close popup */}
                      <div
                        className="fixed inset-0 z-30"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveShareMenuId(null);
                        }}
                      />

                      {/* Share Popover Menu */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute bottom-full mb-2 ${
                          isRtl ? 'left-0' : 'right-0'
                        } z-40 w-52 bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-1.5 space-y-1 text-xs`}
                      >
                        <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800/80 text-[10px] font-extrabold text-gray-400 dark:text-gray-500 flex items-center justify-between">
                          <span>{isRtl ? 'قائمة مشاركة الإعلان' : 'Share Options'}</span>
                          <span className="text-emerald-500 font-bold">#{ad.id}</span>
                        </div>

                        {/* Copy Link Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(ad);
                          }}
                          className={`w-full px-3 py-2.5 rounded-xl text-start font-bold flex items-center justify-between transition-colors ${
                            copiedAdId === ad.id
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800/80 text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {copiedAdId === ad.id ? (
                              <Check size={15} className="text-emerald-500 shrink-0" />
                            ) : (
                              <Copy size={15} className="text-emerald-500 shrink-0" />
                            )}
                            <span className="text-xs">
                              {copiedAdId === ad.id
                                ? (isRtl ? 'تم نسخ الرابط!' : 'Link Copied!')
                                : (isRtl ? 'نسخ رابط الإعلان' : 'Copy Link')}
                            </span>
                          </div>
                          {copiedAdId === ad.id ? (
                            <span className="text-[10px] font-extrabold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                              {isRtl ? 'تم' : 'Copied'}
                            </span>
                          ) : (
                            <Link size={12} className="text-gray-400" />
                          )}
                        </button>

                        {/* WhatsApp Direct Share */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWhatsAppShare(ad);
                            setActiveShareMenuId(null);
                          }}
                          className="w-full px-3 py-2.5 rounded-xl text-start font-bold flex items-center justify-between hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors text-gray-700 dark:text-gray-200"
                        >
                          <div className="flex items-center gap-2.5">
                            <Phone size={15} className="text-emerald-500 shrink-0" />
                            <span className="text-xs">{isRtl ? 'مشاركة عبر واتساب' : 'Share to WhatsApp'}</span>
                          </div>
                          <span className="text-[10px] font-mono text-gray-400">WA</span>
                        </button>

                        {/* Native OS / Other Apps Share */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onShare(ad);
                            setActiveShareMenuId(null);
                          }}
                          className="w-full px-3 py-2.5 rounded-xl text-start font-bold flex items-center justify-between hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors text-gray-700 dark:text-gray-200"
                        >
                          <div className="flex items-center gap-2.5">
                            <Share2 size={15} className="text-emerald-500 shrink-0" />
                            <span className="text-xs">{isRtl ? 'تطبيقات أخرى' : 'Other Applications'}</span>
                          </div>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Interactive Comments Drawer */}
            <AnimatePresence>
              {expandedAdId === ad.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 dark:border-gray-800 p-3 bg-gray-50/90 dark:bg-gray-900/50 space-y-3"
                >
                  <h5 className="text-[11px] font-extrabold text-gray-500 flex items-center gap-1">
                    <MessageSquare size={13} className="text-emerald-500" />
                    <span>{isRtl ? 'التعليقات والتفاعلات:' : 'Comments & Discussion:'}</span>
                  </h5>

                  {loadingCommentsAdId === ad.id ? (
                    <div className="text-center py-2 text-xs text-gray-400 flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin text-emerald-500" />
                      <span>{isRtl ? 'جاري تحميل التعليقات...' : 'Loading comments...'}</span>
                    </div>
                  ) : (commentsMap[ad.id] || []).length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic text-center py-1">
                      {isRtl ? 'لا توجد تعليقات بعد، كن أول من يعلق!' : 'No comments yet. Be the first!'}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pe-1 scrollbar-thin">
                      {(commentsMap[ad.id] || []).map((comment) => (
                        <div
                          key={comment.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-[#1a1a1c] border border-gray-100 dark:border-gray-800 text-[11px] space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between font-bold text-emerald-500">
                            <span>{comment.author_name}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setReplyToCommentId(comment.id)}
                                className="text-[9px] text-gray-500 hover:text-emerald-500"
                              >
                                {isRtl ? 'رد' : 'Reply'}
                              </button>
                              <span className="text-[9px] text-gray-400 font-normal">
                                {new Date(comment.created_at).toLocaleTimeString(
                                  isRtl ? 'ar-EG' : 'en-US',
                                  { hour: '2-digit', minute: '2-digit' }
                                )}
                              </span>
                            </div>
                          </div>
                          <p className={`text-gray-700 dark:text-gray-300 leading-normal ${comment.parent_id ? 'pl-4 border-l-2 border-emerald-500/20' : ''}`}>
                            {comment.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onAddComment(ad.id, replyToCommentId || undefined);
                        }
                      }}
                      placeholder={replyToCommentId ? (isRtl ? 'اكتب ردك...' : 'Write a reply...') : (isRtl ? 'اكتب تعليقك هنا...' : 'Write a comment...')}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      onClick={() => onAddComment(ad.id, replyToCommentId || undefined)}
                      disabled={!newCommentText.trim()}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-xs transition-theme shadow-sm"
                    >
                      {isRtl ? 'إرسال' : 'Send'}
                    </button>
                    {replyToCommentId && (
                      <button 
                        onClick={() => setReplyToCommentId(null)}
                        className="text-[10px] text-gray-500"
                      >
                        {isRtl ? 'إلغاء' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Real-time E2E Encrypted Direct Inquiry Drawer */}
            <AnimatePresence>
              {activeChatAdId === ad.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 dark:border-gray-800 p-2 sm:p-3 bg-gray-100/80 dark:bg-gray-900/90"
                >
                  <AdDirectChat
                    ad={ad}
                    onClose={() => setActiveChatAdId(null)}
                    isCompact={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.article>
        );
      })}

      {/* Infinite Scroll Intersection Observer Sentinel */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="col-span-full py-6 text-center flex flex-col items-center justify-center gap-2"
        >
          {loadingMore ? (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-5 py-2.5 rounded-full border border-emerald-500/20 shadow-sm animate-pulse">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
              <span>{isRtl ? 'جاري تحميل المزيد من الإعلانات...' : 'Fetching more advertisements...'}</span>
            </div>
          ) : (
            <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5 opacity-80">
              <Loader2 size={12} className="animate-spin" />
              <span>{isRtl ? 'تمرير لأسفل لتحميل المزيد...' : 'Scroll down to load more...'}</span>
            </div>
          )}
        </div>
      )}

      {!hasMore && ads.length > 0 && (
        <div className="col-span-full py-6 text-center text-xs font-bold text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800/80 mt-4">
          <span>{isRtl ? '✨ وصلت إلى نهاية جميع الإعلانات المتاحة' : '✨ You have reached the end of all available ads'}</span>
        </div>
      )}
    </div>
  );
};
