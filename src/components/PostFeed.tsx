import { safeStorageGet, safeStorageSet } from "@/utils/safeStorage";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  MessageSquare,
  MessageCircle,
  Phone,
  PhoneCall,
  Film,
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
import { toast } from '../context/NotificationContext';
import { BulletinAd, BulletinAdComment } from '../../server/db/types';
import { AdDirectChat } from './AdDirectChat';
import { AdInsightsTab } from './AdInsightsTab';
import { HighlightText } from './HighlightText';
import { MediaFormatPlayer } from './MediaFormatPlayer';
import { getMediaUrl } from '../utils/mediaUtils';
import { SOCIAL_COLORS } from '../constants/socialColors';
import { BulletinAvatar } from './BulletinAvatar';

const renderRichPostText = (text: string | null | undefined, searchQuery?: string) => {
  if (!text) return null;

  // Split text by whitespace boundaries
  const words = text.split(/(\s+)/);

  return (
    <>
      {words.map((word, idx) => {
        if (/^\s+$/.test(word)) {
          return <span key={idx}>{word}</span>;
        }

        // Mention @الجميع or @everyone
        if (word === '@الجميع' || word.toLowerCase() === '@everyone') {
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-1 font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-500/20 px-1.5 py-0.5 rounded-md border border-purple-500/25 mx-0.5 align-middle select-all shadow-xs"
            >
              <span>{word}</span>
              <span className="text-[10px]">📢</span>
            </span>
          );
        }

        // Mention @اشارة للمتابعين or @متابعين or @followers
        if (word === '@اشارة' || word === '@اشارة_للمتابعين' || word === '@اشارة للمتابعين' || word === '@متابعين' || word.toLowerCase() === '@followers') {
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-1 font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 px-1.5 py-0.5 rounded-md border border-blue-500/25 mx-0.5 align-middle select-all shadow-xs"
            >
              <span>{word}</span>
              <span className="text-[10px]">👥</span>
            </span>
          );
        }

        // Generic @mention
        if (word.startsWith('@') && word.length > 1) {
          return (
            <span
              key={idx}
              className="inline-flex items-center font-bold text-accent dark:text-accent bg-accent/10 px-1.5 py-0.5 rounded-md border border-accent/20 mx-0.5 align-middle"
            >
              {word}
            </span>
          );
        }

        // #hashtag
        if (word.startsWith('#') && word.length > 1) {
          return (
            <span
              key={idx}
              className="font-bold text-accent dark:text-accent hover:underline cursor-pointer inline-block mx-0.5"
            >
              <HighlightText text={word} query={searchQuery} />
            </span>
          );
        }

        return <HighlightText key={idx} text={word} query={searchQuery} />;
      })}
    </>
  );
};

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
  onOpenReelFeed?: (adId?: number) => void;
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
  onOpenReelFeed,
  replyToCommentId,
  setReplyToCommentId
}) => {
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

    fetch(`/api/bulletin/ads/${ad.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_id: user?.id,
        sharer_name: user?.name || user?.email || (isRtl ? 'أحد المستخدمين' : 'A user'),
      }),
    }).catch(() => {});
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

  const handleWhatsAppShare = (ad: BulletinAd) => {
    const shareUrl = `${window.location.origin}/bulletin?ad=${ad.id}`;
    const text = encodeURIComponent(
      isRtl
        ? `شاهِد هذا الإعلان المميز على المنصة: "${ad.title}"\n${shareUrl}`
        : `Check out this promotion: "${ad.title}"\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
    fetch(`/api/bulletin/ads/${ad.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_id: user?.id,
        sharer_name: user?.name || user?.email || (isRtl ? 'أحد المستخدمين' : 'A user'),
      }),
    }).catch(() => {});
  };

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
            key={`post-skel-${n}`}
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
        <div className="w-16 h-16 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
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
          className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent text-white font-bold text-xs shadow-md transition-theme"
        >
          {isRtl ? 'أنشئ إعلانك الآن' : 'Create Ad Now'}
        </button>
      </div>
    );
  }

  const visibleAds = ads.filter(ad => !hiddenAdIds.includes(ad.id));

  return (
    <div className="grid grid-cols-1 gap-5 w-full touch-pan-y">
      {visibleAds.map((ad, index) => {
        const isTextExpanded = !!expandedTextIds[ad.id];
        const isLongText = ad.description && ad.description.length > 140;

        return (
          <motion.article
            key={(ad as any)._virtualId || `bulletin-ad-${ad.id}-${index}`}
            id={`bulletin-ad-${ad.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-theme flex flex-col overflow-hidden touch-pan-y"
          >
            {/* Header: Author / Merchant Page info */}
            <div className="p-3 sm:p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <BulletinAvatar
                  src={ad.author_avatar}
                  alt={ad.author_name}
                  size="md"
                  isPage={Boolean(ad.page_id)}
                  onClick={() =>
                    ad.page_id && onOpenPageDetail && onOpenPageDetail(ad.page_id)
                  }
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4
                      onClick={() =>
                        ad.page_id && onOpenPageDetail && onOpenPageDetail(ad.page_id)
                      }
                      className={`text-xs font-extrabold truncate text-gray-900 dark:text-gray-100 ${
                        ad.page_id ? 'cursor-pointer hover:text-accent transition-colors' : ''
                      }`}
                    >
                      {ad.author_name}
                    </h4>
                    <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 pt-0.5">
                    <span className="flex items-center gap-0.5 font-medium">
                      <MapPin size={10} className="text-accent shrink-0" />
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
                  <button
                    type="button"
                    onClick={() => {
                      if (ad.ad_format === 'reel' && onOpenReelFeed) {
                        onOpenReelFeed(ad.id);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-black flex items-center gap-1 shadow-sm transition-transform active:scale-95 ${
                      ad.ad_format === 'reel' 
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 cursor-pointer' 
                        : 'bg-accent/10 border-accent/30 text-accent dark:text-accent'
                    }`}
                  >
                    {ad.ad_format === 'reel' ? <Clapperboard size={11} className="text-purple-500" /> : <Camera size={11} className="text-accent" />}
                    <span>{ad.ad_format === 'reel' ? (isRtl ? 'ريلز' : 'Reel') : (isRtl ? 'قصة' : 'Story')}</span>
                  </button>
                )}
                {ad.is_boosted && (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-gray-500/10 to-amber-500/20 border border-amber-500/40 text-amber-500 dark:text-amber-400 text-[10px] font-black flex items-center gap-1 shadow-sm">
                    <Rocket size={11} className="text-amber-500 animate-bounce" />
                    <span className="hidden sm:inline">{isRtl ? 'مُموَّل VIP' : 'Boosted'}</span>
                  </span>
                )}

                {/* Edit & Delete Actions for Owners */}
                {user && (user.id === ad.user_id || user.is_admin) && (
                  <div className="flex items-center gap-1">
                    {onEditAd && (
                      <button
                        onClick={() => onEditAd(ad)}
                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center text-gray-500 hover:text-accent hover:bg-accent dark:hover:bg-accent/10 transition-theme border border-transparent hover:border-accent/20"
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
            <div className="p-4 space-y-3 flex-1">
              {(() => {
                const cleanTitle = (ad.title || '').trim();
                const cleanDesc = (ad.description || '').trim();

                // Determine if title is truly distinct from description
                const isTitleSameAsDesc = !cleanTitle || !cleanDesc ||
                  cleanTitle.toLowerCase() === cleanDesc.toLowerCase() ||
                  cleanDesc.toLowerCase().startsWith(cleanTitle.toLowerCase()) ||
                  cleanTitle.toLowerCase().startsWith(cleanDesc.toLowerCase());

                const showTitleHeader = !isTitleSameAsDesc;
                const postBodyText = cleanDesc || cleanTitle;

                return (
                  <>
                    {showTitleHeader && (
                      <h3 className="text-xs font-black text-gray-900 dark:text-gray-100 leading-snug">
                        {renderRichPostText(cleanTitle, searchQuery)}
                      </h3>
                    )}

                    <div className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed space-y-1">
                      <div className={isLongText && !isTextExpanded ? 'line-clamp-3' : ''}>
                        {renderRichPostText(postBodyText, searchQuery)}
                      </div>

                      {isLongText && (
                        <button
                          onClick={() => toggleTextExpand(ad.id)}
                          className="text-accent font-bold hover:underline inline-flex items-center gap-1 text-[10px]"
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

                    {/* Hashtags separated list */}
                    {ad.hashtags && ad.hashtags.length > 0 && (() => {
                      const combinedText = `${cleanTitle} ${cleanDesc}`.toLowerCase();
                      const uniqueTags = ad.hashtags.filter(tag => {
                        const clean = tag.replace(/^#/, '').trim().toLowerCase();
                        return clean && !combinedText.includes(`#${clean}`);
                      });

                      if (uniqueTags.length === 0) return null;

                      return (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {uniqueTags.map((tag, idx) => (
                            <span
                              key={`tag-${ad.id}-${tag}-${idx}`}
                              className="text-[10px] font-extrabold text-accent dark:text-accent hover:underline cursor-pointer bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20"
                            >
                              <HighlightText text={tag.startsWith('#') ? tag : `#${tag}`} query={searchQuery} />
                            </span>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Tagged users and broadcast mentions separated list */}
                    {ad.tagged_users && Array.isArray(ad.tagged_users) && ad.tagged_users.length > 0 && (() => {
                      return (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {ad.tagged_users.map((tag: any, idx: number) => {
                            const tagStr = typeof tag === 'object' && tag !== null ? (tag.name || tag.username || tag.id) : String(tag);
                            if (!tagStr) return null;
                            const isEveryone = tagStr === '@الجميع' || tagStr === '@everyone' || tagStr === 'الجميع' || tagStr === 'everyone';
                            const isFollowers = tagStr === '@اشارة للمتابعين' || tagStr === '@followers' || tagStr === 'متابعين' || tagStr === 'followers' || tagStr.includes('متابعين');
                            return (
                              <span
                                key={`tagged-${ad.id}-${idx}`}
                                className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                                  isEveryone
                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                    : isFollowers
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                    : 'bg-accent/10 text-accent dark:text-accent border-accent/25'
                                }`}
                              >
                                {isEveryone ? '📢 @الجميع' : isFollowers ? '👥 @المتابعين' : `@${tagStr.replace(/^@/, '')}`}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                );
              })()}
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
                  referrerPolicy="no-referrer"
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
                    <Sparkles size={13} className="text-accent" />
                    <span>{isRtl ? 'عرض بصورة مكبرة' : 'Expand Image'}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Promotional Video / Reels Media Section with Multi-Format Player */}
            {ad.video_url && (
              <div className="w-full bg-black border-y border-gray-100 dark:border-gray-800/60 overflow-hidden">
                <MediaFormatPlayer
                  url={getMediaUrl(ad.video_url)}
                  adFormat={ad.ad_format || 'feed'}
                  posterUrl={getMediaUrl(ad.image_url)}
                  title={ad.title}
                  isRtl={isRtl}
                  onOpenReels={() => {
                    try {
                      document.querySelectorAll('video').forEach(v => {
                        try {
                          v.pause();
                          v.muted = true;
                        } catch (_) {}
                      });
                    } catch (_) {}
                    if (onOpenReelFeed) {
                      onOpenReelFeed(ad.id);
                    }
                  }}
                  className={ad.ad_format === 'reel' || ad.ad_format === 'story' ? 'max-h-[520px] mx-auto rounded-none' : 'rounded-none'}
                />
              </div>
            )}

            {/* ========================================================== */}
            {/* ROW 1: PAGE / AUTHOR NAME + DYNAMIC CONTACT ACTION BUTTON */}
            {/* ========================================================== */}
            <div className="p-3 sm:px-4 bg-gray-50/90 dark:bg-[#18181b]/90 flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800/60">
              <div 
                onClick={() => ad.page_id && onOpenPageDetail && onOpenPageDetail(ad.page_id)}
                className={`flex items-center gap-2.5 min-w-0 ${ad.page_id ? 'cursor-pointer group' : ''}`}
              >
                <BulletinAvatar
                  src={ad.author_avatar}
                  alt={ad.page_id ? (ad.page_name || ad.author_name) : ad.author_name}
                  size="sm"
                  isPage={Boolean(ad.page_id)}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-gray-900 dark:text-gray-100 truncate group-hover:text-accent transition-colors">
                      {ad.page_id ? (ad.page_name || ad.author_name) : ad.author_name}
                    </span>
                    <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 block truncate">
                    {ad.page_id 
                      ? (isRtl ? 'صفحة تجارية موثقة' : 'Verified Business Page')
                      : (ad.location_city || (isRtl ? 'معلن معتمد' : 'Verified Poster'))}
                  </span>
                </div>
              </div>

              {/* Dynamic Contact Action Button (Based on Post Settings) */}
              <div className="shrink-0">
                {(ad.whatsapp_number || ad.has_whatsapp_button) ? (
                  <button
                    onClick={(e) => onWhatsApp(ad, e)}
                    className="px-2.5 py-1 sm:px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-[#25D366] dark:text-[#25D366] border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95"
                    title={isRtl ? 'واتساب' : 'WhatsApp'}
                  >
                    <Phone size={13} className="text-[#25D366] shrink-0" />
                    <span className="text-[11px] sm:text-xs font-bold">{isRtl ? 'واتساب' : 'WhatsApp'}</span>
                  </button>
                ) : ad.phone_number ? (
                  <a
                    href={`tel:${ad.phone_number}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 py-1 sm:px-3 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-600/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95"
                    title={isRtl ? `اتصال: ${ad.phone_number}` : `Call: ${ad.phone_number}`}
                  >
                    <PhoneCall size={13} className="shrink-0" />
                    <span className="text-[11px] sm:text-xs font-bold">{isRtl ? 'اتصال' : 'Call'}</span>
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      setActiveChatAdId(activeChatAdId === ad.id ? null : ad.id);
                      if (onMessageAdvertiser) onMessageAdvertiser(ad);
                    }}
                    disabled={messagingAdId === ad.id}
                    className={`px-2.5 py-1 sm:px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                      activeChatAdId === ad.id
                        ? 'bg-accent text-white ring-2 ring-accent-400/50'
                        : 'bg-accent text-white hover:bg-accent/90'
                    }`}
                    title={isRtl ? 'مراسلة' : 'Message'}
                  >
                    {messagingAdId === ad.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <MessageCircle size={13} className="shrink-0" />
                    )}
                    <span className="text-[11px] sm:text-xs font-bold">{isRtl ? 'مراسلة' : 'Message'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* ========================================================== */}
            {/* ROW 2: BOOST (PROMOTION) BUTTON + INSIGHTS (STATS) BUTTON */}
            {/* ========================================================== */}
            <div className="py-1 px-3 sm:px-4 bg-transparent flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800/60">
              {/* Boost / Promote Button */}
              {onBoostAd ? (
                <button
                  onClick={() => onBoostAd(ad)}
                  className="flex-1 py-1 px-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-amber-500 hover:text-amber-400 active:scale-95 cursor-pointer"
                  title={isRtl ? 'ترويج' : 'Boost'}
                >
                  <Rocket size={13} className="shrink-0 text-amber-500 animate-pulse" />
                  <span className="truncate text-[11px] sm:text-xs">
                    {ad.is_boosted ? (isRtl ? 'تمديد 🚀' : 'Extend 🚀') : (isRtl ? 'ترويج' : 'Boost')}
                  </span>
                </button>
              ) : null}

              {/* Vertical divider */}
              <div className="w-px h-3.5 bg-gray-200 dark:bg-gray-800 shrink-0" />

              {/* Insights / Stats Button (الرؤى) */}
              <button
                onClick={() => setActiveInsightsAdId(activeInsightsAdId === ad.id ? null : ad.id)}
                className={`flex-1 py-1 px-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                  activeInsightsAdId === ad.id
                    ? 'text-accent font-black'
                    : 'text-gray-500 dark:text-gray-400 hover:text-accent'
                }`}
                title={isRtl ? 'الرؤى' : 'Insights'}
              >
                <BarChart2 size={13} className={`shrink-0 ${activeInsightsAdId === ad.id ? 'text-accent' : 'text-gray-500 dark:text-gray-400'}`} />
                <span className="truncate text-[11px] sm:text-xs">{isRtl ? 'الرؤى' : 'Insights'}</span>
              </button>
            </div>

            {/* Insights Drawer (Opens right under Row 2) */}
            <AnimatePresence>
              {activeInsightsAdId === ad.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-accent/30 bg-gray-950 p-2 overflow-hidden"
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

            {/* ========================================================== */}
            {/* ROW 3: SOCIAL ENGAGEMENT BUTTONS (LIKE, COMMENT, SHARE, SAVE) */}
            {/* ========================================================== */}
            <div className="p-2.5 sm:px-4 bg-gray-50/70 dark:bg-[#151518]/70 flex items-center justify-between gap-1 sm:gap-2 text-xs text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800/60">
              {/* Like Button */}
              <button
                onClick={() => onToggleLike(ad.id)}
                className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 font-bold transition-all active:scale-95 ${
                  ad.user_has_liked
                    ? 'text-red-500 bg-red-500/10 font-black'
                    : 'hover:bg-gray-200/70 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-red-500'
                }`}
                title={isRtl ? 'إعجاب' : 'Like'}
              >
                <Heart size={16} className={ad.user_has_liked ? 'fill-red-500 text-red-500' : ''} />
                <span className="text-xs font-bold">{ad.likes_count > 0 ? ad.likes_count : (isRtl ? 'إعجاب' : 'Like')}</span>
              </button>

              {/* Comments Toggle Button */}
              <button
                onClick={() => onToggleComments(ad.id)}
                className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 font-bold transition-all active:scale-95 ${
                  expandedAdId === ad.id
                    ? 'bg-accent/10 text-accent font-black'
                    : 'hover:bg-gray-200/70 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-accent'
                }`}
                title={isRtl ? 'التعليقات' : 'Comments'}
              >
                <MessageSquare size={16} />
                <span className="text-xs font-bold">{ad.comments_count > 0 ? ad.comments_count : (isRtl ? 'تعليق' : 'Comment')}</span>
              </button>

              {/* Share & Copy Menu Dropdown */}
              <div className="relative flex-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveShareMenuId(activeShareMenuId === ad.id ? null : ad.id);
                  }}
                  className={`w-full py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold active:scale-95 ${
                    activeShareMenuId === ad.id
                      ? 'bg-accent text-white font-black'
                      : 'hover:bg-gray-200/70 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-accent'
                  }`}
                  title={isRtl ? 'مشاركة ورابط الإعلان' : 'Share & Copy Link'}
                >
                  <Share2 size={16} />
                  <span className="text-xs font-bold">{isRtl ? 'مشاركة' : 'Share'}</span>
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
                          <span className="text-accent font-bold">#{ad.id}</span>
                        </div>

                        {/* Copy Link Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(ad);
                          }}
                          className={`w-full px-3 py-2.5 rounded-xl text-start font-bold flex items-center justify-between transition-colors ${
                            copiedAdId === ad.id
                              ? 'bg-accent/15 text-accent'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800/80 text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {copiedAdId === ad.id ? (
                              <Check size={15} className="text-accent shrink-0" />
                            ) : (
                              <Copy size={15} className="text-accent shrink-0" />
                            )}
                            <span className="text-xs">
                              {copiedAdId === ad.id
                                ? (isRtl ? 'تم نسخ الرابط!' : 'Link Copied!')
                                : (isRtl ? 'نسخ رابط الإعلان' : 'Copy Link')}
                            </span>
                          </div>
                          {copiedAdId === ad.id ? (
                            <span className="text-[10px] font-extrabold bg-accent text-white px-2 py-0.5 rounded-full">
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
                          className="w-full px-3 py-2.5 rounded-xl text-start font-bold flex items-center justify-between hover:bg-accent/10 hover:text-accent transition-colors text-gray-700 dark:text-gray-200"
                        >
                          <div className="flex items-center gap-2.5">
                            <Phone size={15} className="shrink-0" style={{ color: SOCIAL_COLORS.whatsapp.base }} />
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
                          className="w-full px-3 py-2.5 rounded-xl text-start font-bold flex items-center justify-between hover:bg-accent/10 hover:text-accent transition-colors text-gray-700 dark:text-gray-200"
                        >
                          <div className="flex items-center gap-2.5">
                            <Share2 size={15} className="text-accent shrink-0" />
                            <span className="text-xs">{isRtl ? 'تطبيقات أخرى' : 'Other Applications'}</span>
                          </div>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Save / Bookmark Button */}
              {user && onToggleSave && (
                <button
                  onClick={() => onToggleSave(ad)}
                  className={`py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all border shrink-0 active:scale-95 ${
                    ad.user_has_saved
                      ? 'bg-accent text-white border-accent font-bold'
                      : 'bg-white dark:bg-[#1a1a1c] text-gray-500 hover:text-accent hover:bg-accent/10 dark:hover:bg-accent/10 border-gray-200 dark:border-gray-800 hover:border-accent/30'
                  }`}
                  title={ad.user_has_saved ? (isRtl ? 'إزالة من المحفوظات' : 'Remove from Saved') : (isRtl ? 'حفظ في المحفوظات' : 'Save to Board')}
                >
                  <Bookmark size={15} className={ad.user_has_saved ? "fill-current" : ""} />
                  <span className="text-xs font-bold hidden sm:inline">
                    {ad.user_has_saved ? (isRtl ? 'محفوظ' : 'Saved') : (isRtl ? 'حفظ' : 'Save')}
                  </span>
                </button>
              )}
            </div>

            {/* Interactive Comments Drawer */}
            <AnimatePresence>
              {expandedAdId === ad.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50/90 dark:bg-gray-900/50 space-y-3"
                >
                  <h5 className="text-[11px] font-extrabold text-gray-500 flex items-center gap-1">
                    <MessageSquare size={13} className="text-accent" />
                    <span>{isRtl ? 'التعليقات والتفاعلات:' : 'Comments & Discussion:'}</span>
                  </h5>

                  {loadingCommentsAdId === ad.id ? (
                    <div className="text-center py-2 text-xs text-gray-400 flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin text-accent" />
                      <span>{isRtl ? 'جاري تحميل التعليقات...' : 'Loading comments...'}</span>
                    </div>
                  ) : (commentsMap[ad.id] || []).length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic text-center py-1">
                      {isRtl ? 'لا توجد تعليقات بعد، كن أول من يعلق!' : 'No comments yet. Be the first!'}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pe-1 scrollbar-thin">
                      {(commentsMap[ad.id] || []).map((comment, cIdx) => (
                        <div
                          key={`comment-${ad.id}-${comment.id || cIdx}-${cIdx}`}
                          className="p-2.5 rounded-xl bg-white dark:bg-[#1a1a1c] border border-gray-100 dark:border-gray-800 text-[11px] space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between font-bold text-accent">
                            <div className="flex items-center gap-2 min-w-0">
                              <BulletinAvatar
                                src={comment.author_avatar}
                                alt={comment.author_name}
                                size="sm"
                              />
                              <span className="truncate">{comment.author_name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => setReplyToCommentId(comment.id)}
                                className="text-[9px] text-gray-500 hover:text-accent font-bold"
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
                          <p className={`text-gray-700 dark:text-gray-300 leading-normal ${comment.parent_id ? 'pl-4 border-l-2 border-accent/20' : ''}`}>
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
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 focus:outline-none focus:border-accent transition-colors"
                    />
                    <button
                      onClick={() => onAddComment(ad.id, replyToCommentId || undefined)}
                      disabled={!newCommentText.trim()}
                      className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent disabled:opacity-40 text-white font-bold text-xs transition-theme shadow-sm"
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
                  className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-100/80 dark:bg-gray-900/90"
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
            <div className="flex items-center gap-2 text-xs font-bold text-accent bg-accent/10 px-5 py-2.5 rounded-full border border-accent/20 shadow-sm animate-pulse">
              <Loader2 size={16} className="animate-spin text-accent" />
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
