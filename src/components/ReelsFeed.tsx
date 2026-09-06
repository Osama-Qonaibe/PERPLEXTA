import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Plus,
  Check,
  Volume1,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Music,
  MoreVertical,
  X,
  Send,
  Upload,
  Clapperboard,
  CheckCircle2,
  MapPin,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Eye,
  Flag,
  EyeOff,
  User,
  Copy,
  ExternalLink,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  PauseCircle,
  Film,
  Trash2,
  Edit2,
  MoreHorizontal,
  Globe,
  Megaphone,
  ThumbsUp,
  Smile,
  Camera,
  Image as ImageIcon,
  Users,
  Search,
  BarChart2,
  UserPlus,
  UserCheck,
  TrendingUp,
  Sliders,
  HelpCircle,
  Edit3,
  Rocket,
  Lock,
  Handshake,
  FileText,
  Loader2
} from 'lucide-react';
import { toast } from '../context/NotificationContext';
import { BulletinAd, BulletinAdComment } from '../../server/db/types';
import { getMediaUrl } from '../utils/mediaUtils';
import { triggerHaptic as utilsTriggerHaptic } from '../utils/haptics';
import { BulletinAvatar } from './BulletinAvatar';
import { SkeletonLoader } from './SkeletonLoader';
import { useAppContext } from '../context/AppContext';
import { PostOptionsMenu } from './PostOptionsMenu';
import { useReelPolling } from '../hooks/useReelPolling';
import {
  notifyMediaPlaying,
  stopAllMedia,
  getGlobalMuteState,
  setGlobalMuteState
} from '../utils/mediaCoordinator';

const FB_REACTIONS = [
  { id: 'like', labelAr: 'أعجبني', labelEn: 'Like', emoji: '👍', color: 'text-blue-500' },
  { id: 'love', labelAr: 'أحببته', labelEn: 'Love', emoji: '❤️', color: 'text-red-500' },
  { id: 'care', labelAr: 'أدعمه', labelEn: 'Care', emoji: '🥰', color: 'text-amber-500' },
  { id: 'haha', labelAr: 'هاهاها', labelEn: 'Haha', emoji: '😂', color: 'text-amber-500' },
  { id: 'wow', labelAr: 'واو', labelEn: 'Wow', emoji: '😮', color: 'text-amber-500' },
  { id: 'sad', labelAr: 'أحزنني', labelEn: 'Sad', emoji: '😢', color: 'text-amber-500' },
  { id: 'angry', labelAr: 'أغضبني', labelEn: 'Angry', emoji: '😡', color: 'text-orange-600' }
];

const formatRelativeTime = (dateInput: Date | string | undefined, isRtl: boolean): string => {
  if (!dateInput) return isRtl ? 'الآن' : 'Just now';
  const now = new Date();
  const date = new Date(dateInput);
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSec < 60) return isRtl ? 'الآن' : 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return isRtl ? 'دقيقة واحدة' : '1 min';
  if (diffMin < 60) return isRtl ? `${diffMin} دقيقة` : `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return isRtl ? 'ساعة واحدة' : '1h';
  if (diffHours < 24) return isRtl ? `${diffHours} ساعة` : `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return isRtl ? 'أمس' : 'Yesterday';
  if (diffDays < 7) return isRtl ? `${diffDays} أيام` : `${diffDays}d`;
  return date.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
};

function formatCompactCount(count: number): string {
  if (!count || isNaN(count)) return '0';
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return String(count);
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export interface ReelItemData {
  id: number;
  user_id?: number;
  author_id?: number;
  author_name: string;
  author_avatar?: string | null;
  page_id?: number | null;
  page_name?: string | null;
  page_avatar?: string | null;
  page_is_verified?: boolean;
  title: string;
  description: string;
  video_url: string;
  image_url?: string;
  location_city?: string | null;
  hashtags?: string[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  impressions_count?: number;
  user_has_liked?: boolean;
  user_has_saved?: boolean;
  user_has_followed?: boolean;
  created_at?: string | Date;
  music_title?: string;
}

export interface ReelsFeedProps {
  ads?: BulletinAd[];
  isRtl?: boolean;
  token?: string | null;
  user?: any;
  onToggleLike?: (adId: number, reaction?: string) => void;
  onToggleSave?: (adOrId: any) => void;
  onAddComment?: (adId: number, text: string, parentId?: number) => Promise<void>;
  onToggleCommentLike?: (adId: number, commentId: number, reaction?: string) => void;
  commentsMap?: Record<number, BulletinAdComment[]>;
  onClose?: () => void;
  onOpenUploadReels?: () => void;
  onUploadReelClick?: () => void;
  onOpenPageDetail?: (pageId: number) => void;
  onMessageAdvertiser?: (ad: BulletinAd) => void;
  onShare?: (ad: BulletinAd) => void;
  onBoostAd?: (ad: any) => void;
  onDeleteReel?: (adId: number) => void;
  onEditReel?: (ad: BulletinAd) => void;
  onViewPost?: (adId: number) => void;
  onArchiveAd?: (ad: BulletinAd) => void;
  onTrashAd?: (ad: BulletinAd) => void;
  onUpdateAd?: (updatedAd: Partial<BulletinAd> & { id: number }) => void;
  onReportAd?: (ad: BulletinAd) => void;
  initialReelId?: number;
  initialAdId?: number;
  isLoading?: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '😮', '🎉', '💯', '🚀', '😍', '✨', '🙏'];

// Safe Hashtag Normalizer Helper
const normalizeHashtags = (tags: any): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map((t) => (typeof t === 'string' ? t.replace(/^#/, '').trim() : String(t))).filter(Boolean);
  }
  if (typeof tags === 'string') {
    const trimmed = tags.trim();
    if (!trimmed) return [];
    try {
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((t) => (typeof t === 'string' ? t.replace(/^#/, '').trim() : String(t))).filter(Boolean);
        }
      }
    } catch {}
    return trimmed.split(/[,\s]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean);
  }
  return [];
};

export const ReelsFeed: React.FC<ReelsFeedProps> = ({
  ads = [],
  isRtl = true,
  token,
  user,
  onToggleLike,
  onToggleSave,
  onAddComment,
  onToggleCommentLike,
  commentsMap = {},
  onClose,
  onOpenUploadReels,
  onUploadReelClick,
  onOpenPageDetail,
  onMessageAdvertiser,
  onShare,
  onBoostAd,
  onDeleteReel,
  onEditReel,
  onViewPost,
  onArchiveAd,
  onTrashAd,
  onUpdateAd,
  onReportAd,
  initialReelId,
  initialAdId,
  isLoading = false
}) => {
  const { socket } = useAppContext();
  const startId = initialAdId || initialReelId;
  const reelsList: ReelItemData[] = React.useMemo(() => {
    return ads
      .filter((ad) => ad.video_url && ad.ad_format !== 'story' && !(ad as any).is_story) // MUST have a video_url to be a reel and NOT be a story
      .map((ad) => {
        const isPagePost = Boolean(ad.page_id);
        const displayName = isPagePost ? (ad.page_name || ad.author_name || (isRtl ? 'صفحة' : 'Page')) : (ad.author_name || (isRtl ? 'مستخدم' : 'User'));
        const displayAvatar = isPagePost ? (ad.page_avatar || ad.author_avatar) : (ad.author_avatar || ad.page_avatar);

        return {
          id: ad.id,
          user_id: ad.user_id,
          author_id: (ad as any).author_id,
          author_name: displayName,
          author_avatar: displayAvatar,
          page_id: ad.page_id,
          page_name: ad.page_name,
          page_avatar: ad.page_avatar,
          page_is_verified: ad.page_is_verified,
          title: ad.title || '',
          description: ad.description || '',
          video_url: getMediaUrl(ad.video_url),
          image_url: getMediaUrl(ad.image_url),
          location_city: ad.location_city,
          hashtags: normalizeHashtags(ad.hashtags),
          likes_count: ad.likes_count || 0,
          comments_count: ad.comments_count || 0,
          shares_count: ad.shares_count || 0,
          impressions_count: ad.impressions_count || 0,
          user_has_liked: ad.user_has_liked || false,
          user_has_saved: ad.user_has_saved || false,
          created_at: ad.created_at,
          music_title: isRtl ? 'الصوت الأصلي - Perplexta Sound' : 'Original Audio - Perplexta'
        };
      })
      .filter((reel) => reel.video_url); // Ensure valid resolved URL
  }, [ads, isRtl]);

  // Session Persistence & Active Reel Index Initialization
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    if (startId !== undefined && startId !== null) {
      const targetId = Number(startId);
      const idx = reelsList.findIndex((r) => Number(r.id) === targetId);
      if (idx >= 0) return idx;
    }
    try {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const urlReelId = searchParams.get('reel');
        if (urlReelId) {
          const idx = reelsList.findIndex((r) => Number(r.id) === Number(urlReelId));
          if (idx >= 0) return idx;
        }
        const savedReelId = sessionStorage.getItem('perplexta_active_reel_id');
        if (savedReelId) {
          const idx = reelsList.findIndex((r) => Number(r.id) === Number(savedReelId));
          if (idx >= 0) return idx;
        }
        const savedIndex = sessionStorage.getItem('perplexta_active_reel_index');
        if (savedIndex !== null) {
          const parsed = parseInt(savedIndex, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < reelsList.length) {
            return parsed;
          }
        }
      }
    } catch (e) {
      // Ignore sessionStorage errors
    }
    return 0;
  });

  const [activeTab, setActiveTab] = useState<'for_you' | 'following'>('for_you');
  const [isMuted, setIsMuted] = useState<boolean>(() => getGlobalMuteState());
  const [volume, setVolume] = useState<number>(1.0);
  const [isVolumeHovered, setIsVolumeHovered] = useState<boolean>(false);
  const isTogglingMuteRef = useRef<boolean>(false);
  const isAutoplayFallbackRef = useRef<boolean>(false);
  const wasAutoplayMutedFallbackRef = useRef<boolean>(false);
  // Mute / Unmute Visual Feedback Overlay
  const [muteFeedback, setMuteFeedback] = useState<{ show: boolean; isMuted: boolean } | null>(null);
  const muteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Search & Insights Modal States
  const [insightsReel, setInsightsReel] = useState<ReelItemData | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  const [playingState, setPlayingState] = useState<Record<number, boolean>>({});
  const [likesState, setLikesState] = useState<Record<number, { count: number; liked: boolean }>>(() => {
    const initial: Record<number, { count: number; liked: boolean }> = {};
    reelsList.forEach((reel) => {
      initial[reel.id] = { count: reel.likes_count, liked: !!reel.user_has_liked };
    });
    return initial;
  });
  const [savesState, setSavesState] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    reelsList.forEach((reel) => {
      initial[reel.id] = !!reel.user_has_saved;
    });
    return initial;
  });
  const [sharesState, setSharesState] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    reelsList.forEach((reel) => {
      initial[reel.id] = reel.shares_count;
    });
    return initial;
  });
  const [impressionsState, setImpressionsState] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    reelsList.forEach((reel) => {
      initial[reel.id] = reel.impressions_count || 0;
    });
    return initial;
  });
  const [followingState, setFollowingState] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    reelsList.forEach((reel) => {
      initial[reel.id] = !!reel.user_has_followed;
    });
    return initial;
  });

  const activeReelsList = React.useMemo(() => {
    if (activeTab === 'following') {
      return reelsList.filter((reel) => followingState[reel.id] ?? reel.user_has_followed ?? false);
    }
    return reelsList;
  }, [reelsList, activeTab, followingState]);
  
  const [videoProgress, setVideoProgress] = useState<Record<number, number>>({});
  const [hasSwiped, setHasSwiped] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeCommentReelId, setActiveCommentReelId] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [moreMenuReel, setMoreMenuReel] = useState<ReelItemData | null>(null);
  const [hiddenReelIds, setHiddenReelIds] = useState<Record<number, boolean>>({});

  const [expandedCaptions, setExpandedCaptions] = useState<Record<number, boolean>>({});

  const [heartAnim, setHeartAnim] = useState<{ id: number; x: number; y: number } | null>(null);

  // Desktop Sidebar States
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [replyToComment, setReplyToComment] = useState<{ id: number; author_name: string } | null>(null);
  const [internalCommentsMap, setInternalCommentsMap] = useState<Record<number, BulletinAdComment[]>>({});
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsCountState, setCommentsCountState] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    reelsList.forEach((reel) => {
      initial[reel.id] = reel.comments_count || 0;
    });
    return initial;
  });

  const commentsMapRef = useRef(commentsMap);
  commentsMapRef.current = commentsMap;

  const [userReactions, setUserReactions] = useState<Record<number, string | null>>(() => {
    const initial: Record<number, string | null> = {};
    reelsList.forEach((r) => {
      const originalAd = ads.find(a => a.id === r.id);
      initial[r.id] = originalAd?.user_reaction || (r.user_has_liked ? 'like' : null);
    });
    return initial;
  });

  useEffect(() => {
    setUserReactions((prev) => {
      const updated = { ...prev };
      ads.forEach((a) => {
        if (a.id) {
          updated[a.id] = a.user_reaction || (a.user_has_liked ? (prev[a.id] || 'like') : null);
        }
      });
      return updated;
    });
  }, [ads]);

  // Reset comment reply and description expansion when active reel changes
  useEffect(() => {
    setReplyToComment(null);
    setIsDescriptionExpanded(false);
  }, [activeIndex]);

  // Unified Real-Time Socket Listeners for Reels (reactions, likes, comments, comment likes, shares, impressions)
  useEffect(() => {
    if (!socket) return;

    const handleReelLike = (data: { reelId: number; likesCount: number; userId: number; isLiked: boolean; reaction?: string }) => {
      if (data && data.reelId) {
        setLikesState((prev) => ({
          ...prev,
          [data.reelId]: {
            count: data.likesCount,
            liked: user?.id === data.userId ? data.isLiked : (prev[data.reelId]?.liked || false)
          }
        }));
        if (user?.id === data.userId) {
          setUserReactions((prev) => ({
            ...prev,
            [data.reelId]: data.isLiked ? (data.reaction || 'like') : null
          }));
        }
      }
    };

    const handleReelComment = (data: { reelId: number; comment: BulletinAdComment }) => {
      if (data && data.reelId && data.comment) {
        setInternalCommentsMap((prev) => {
          const list = prev[data.reelId] || commentsMapRef.current[data.reelId] || [];
          if (list.some((c) => c.id === data.comment.id)) return prev;
          // Filter out matching temporary optimistic comment if present
          const filtered = list.filter((c) => !(c.id > 1000000000000 && c.content === data.comment.content && c.user_id === data.comment.user_id));
          return {
            ...prev,
            [data.reelId]: [...filtered, data.comment]
          };
        });
        setCommentsCountState((prev) => ({
          ...prev,
          [data.reelId]: (prev[data.reelId] || 0) + 1
        }));
      }
    };

    const handleCommentLike = (data: { commentId: number; reelId: number; likeCount: number; userReaction: string | null; userId?: number }) => {
      if (data && data.reelId && data.commentId) {
        setInternalCommentsMap((prev) => {
          const list = prev[data.reelId] || commentsMapRef.current[data.reelId] || [];
          return {
            ...prev,
            [data.reelId]: list.map((c) => {
              if (c.id === data.commentId) {
                return {
                  ...c,
                  like_count: data.likeCount,
                  user_reaction: user?.id === data.userId ? data.userReaction : c.user_reaction
                };
              }
              return c;
            })
          };
        });
      }
    };

    const handleShareUpdate = (data: { reelId: number; count: number }) => {
      if (data && data.reelId) {
        setSharesState((prev) => ({
          ...prev,
          [data.reelId]: data.count
        }));
      }
    };

    const handleImpressionUpdate = (data: { reelId: number; count: number }) => {
      if (data && data.reelId) {
        setImpressionsState((prev) => ({
          ...prev,
          [data.reelId]: data.count
        }));
      }
    };

    socket.on('reel_like_update', handleReelLike);
    socket.on('reel_comment_update', handleReelComment);
    socket.on('reel_comment_like_update', handleCommentLike);
    socket.on('reel_share_update', handleShareUpdate);
    socket.on('reel_impression_update', handleImpressionUpdate);

    return () => {
      socket.off('reel_like_update', handleReelLike);
      socket.off('reel_comment_update', handleReelComment);
      socket.off('reel_comment_like_update', handleCommentLike);
      socket.off('reel_share_update', handleShareUpdate);
      socket.off('reel_impression_update', handleImpressionUpdate);
    };
  }, [socket, user?.id]);

  const activeReel = reelsList[activeIndex];
  const activeReelId = activeReel?.id;

  // Resilient 30-Second Periodic Polling & Background Synchronization (Single AbortController per reel ID)
  useReelPolling({
    reelId: activeReelId,
    token,
    intervalMs: 30000,
    enabled: typeof activeReelId === 'number' && activeReelId > 0,
    onLoadingChange: setIsLoadingComments,
    onCountsUpdate: (data) => {
      if (!activeReelId) return;
      setLikesState((prev) => ({
        ...prev,
        [activeReelId]: {
          count: Number(data.likes_count || 0),
          liked: data.user_has_liked ?? prev[activeReelId]?.liked ?? false
        }
      }));
      if (data.comments_count !== undefined) {
        setCommentsCountState((prev) => ({
          ...prev,
          [activeReelId]: Number(data.comments_count || 0)
        }));
      }
      if (data.user_reaction !== undefined) {
        setUserReactions((prev) => ({
          ...prev,
          [activeReelId]: data.user_reaction ?? null
        }));
      }
      if (data.shares_count !== undefined) {
        setSharesState((prev) => ({
          ...prev,
          [activeReelId]: Number(data.shares_count || 0)
        }));
      }
      if (data.impressions_count !== undefined) {
        setImpressionsState((prev) => ({
          ...prev,
          [activeReelId]: Number(data.impressions_count || 0)
        }));
      }
      if (data.user_has_saved !== undefined) {
        setSavesState((prev) => ({
          ...prev,
          [activeReelId]: !!data.user_has_saved
        }));
      }
    },
    onCommentsUpdate: (comments) => {
      if (!activeReelId) return;
      setInternalCommentsMap((prev) => ({
        ...prev,
        [activeReelId]: comments
      }));
      setCommentsCountState((prev) => ({
        ...prev,
        [activeReelId]: comments.length
      }));
    }
  });

  const handleCommentLikeToggle = async (reelId: number, commentId: number, reaction: string = 'like') => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول للتفاعل مع التعليق' : 'Please log in to react');
      return;
    }

    // Optimistic update
    setInternalCommentsMap((prev) => {
      const list = prev[reelId] || commentsMap[reelId] || [];
      return {
        ...prev,
        [reelId]: list.map((c) => {
          if (c.id === commentId) {
            const isRemoving = c.user_reaction === reaction;
            return {
              ...c,
              user_reaction: isRemoving ? null : reaction,
              like_count: Math.max(0, (c.like_count || 0) + (isRemoving ? -1 : (c.user_reaction ? 0 : 1)))
            };
          }
          return c;
        })
      };
    });

    if (onToggleCommentLike) {
      onToggleCommentLike(reelId, commentId, reaction);
    } else {
      try {
        const res = await fetch(`/api/bulletin/comments/${commentId}/like`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reaction })
        });
        const data = await res.json();
        if (data.success) {
          setInternalCommentsMap((prev) => {
            const list = prev[reelId] || commentsMap[reelId] || [];
            return {
              ...prev,
              [reelId]: list.map((c) => (c.id === commentId ? { ...c, like_count: data.like_count, user_reaction: data.user_reaction } : c))
            };
          });
        }
      } catch (err) {
        // Error handling
      }
    }
  };

  const [isHoveringReactions, setIsHoveringReactions] = useState(false);
  const [hoveredReactionId, setHoveredReactionId] = useState<string | null>(null);
  const hoverReactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commentsScrollRef = useRef<HTMLDivElement | null>(null);

  const handleLikeMouseEnter = () => {
    if (hoverReactionTimerRef.current) clearTimeout(hoverReactionTimerRef.current);
    setIsHoveringReactions(true);
  };

  const handleLikeMouseLeave = () => {
    hoverReactionTimerRef.current = setTimeout(() => {
      setIsHoveringReactions(false);
      setHoveredReactionId(null);
    }, 350);
  };

  const handleSelectReaction = (reelId: number, reactionId: string) => {
    if (hoverReactionTimerRef.current) clearTimeout(hoverReactionTimerRef.current);
    setIsHoveringReactions(false);
    setHoveredReactionId(null);

    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول للتفاعل مع المنشور' : 'Please log in to react');
      return;
    }

    const prevReaction = userReactions[reelId];
    const isRemoving = prevReaction === reactionId;
    const nextReaction = isRemoving ? null : reactionId;

    setUserReactions((prev) => ({ ...prev, [reelId]: nextReaction }));

    setLikesState((prev) => {
      const current = prev[reelId] || { count: 0, liked: false };
      let delta = 0;
      if (!prevReaction && nextReaction) delta = 1;
      else if (prevReaction && !nextReaction) delta = -1;

      return {
        ...prev,
        [reelId]: {
          count: Math.max(0, current.count + delta),
          liked: Boolean(nextReaction)
        }
      };
    });

    if (onToggleLike) {
      onToggleLike(reelId, reactionId);
    }
  };

  const handleLikeClick = (e: React.MouseEvent, reelId: number) => {
    e.stopPropagation();
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول للتفاعل مع المنشور' : 'Please log in to react');
      return;
    }
    const currentReaction = userReactions[reelId];
    if (currentReaction) {
      handleSelectReaction(reelId, currentReaction);
    } else {
      handleSelectReaction(reelId, 'like');
    }
  };

  // Smart Auto-Pause on Scroll state
  const [autoPauseEnabled, setAutoPauseEnabled] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const [reelsHoverMeta, setReelsHoverMeta] = useState<{
    reelId: number;
    percent: number;
    time: number;
    duration: number;
    width?: number;
    height?: number;
    qualityLabel?: string;
  } | null>(null);
  const isScrollingRef = useRef(false);
  const scrollDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPlayingBeforeScrollRef = useRef<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialScrollSettledRef = useRef(false);
  const lastScrolledStartIdRef = useRef<number | null>(null);
  const currentActiveReelIdRef = useRef<number | null>(null);

  // Maintain reference to current active reel ID
  useEffect(() => {
    if (reelsList[activeIndex]) {
      currentActiveReelIdRef.current = reelsList[activeIndex].id;
    }
  }, [activeIndex, reelsList]);

  // Initial scroll for startId: ONLY run once per genuine startId prop change, never on reelsList updates
  useEffect(() => {
    if (startId !== undefined && startId !== null) {
      const targetId = Number(startId);
      if (lastScrolledStartIdRef.current !== targetId) {
        lastScrolledStartIdRef.current = targetId;
        const idx = reelsList.findIndex((r) => Number(r.id) === targetId);
        if (idx >= 0) {
          if (idx !== activeIndex) {
            setActiveIndex(idx);
          }
          const scrollTarget = () => {
            const container = containerRef.current;
            if (container) {
              const targetItem = container.querySelector<HTMLElement>(`[data-reel-index="${idx}"]`);
              if (targetItem) {
                container.scrollTop = targetItem.offsetTop;
              }
            }
          };
          scrollTarget();
          const t1 = setTimeout(scrollTarget, 40);
          const t2 = setTimeout(scrollTarget, 120);
          const t3 = setTimeout(() => {
            isInitialScrollSettledRef.current = true;
          }, 350);
          return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
          };
        } else {
          isInitialScrollSettledRef.current = true;
        }
      }
    } else {
      isInitialScrollSettledRef.current = true;
    }
  }, [startId]);

  // When reelsList updates with new likes/comments counts, ensure activeIndex stays on the exact same active reel
  useEffect(() => {
    if (currentActiveReelIdRef.current !== null && reelsList.length > 0) {
      const foundIdx = reelsList.findIndex((r) => r.id === currentActiveReelIdRef.current);
      if (foundIdx >= 0 && foundIdx !== activeIndex) {
        setActiveIndex(foundIdx);
      }
    }
  }, [reelsList]);

  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const prevActiveIndexRef = useRef<number>(activeIndex);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaCacheRef = useRef<Set<string>>(new Set());
  const trackedImpressionsRef = useRef<Set<number>>(new Set());

  // Record live impression when a real reel is actively watched
  useEffect(() => {
    const currentReel = reelsList[activeIndex];
    if (!currentReel || currentReel.id < 0) return;

    if (!trackedImpressionsRef.current.has(currentReel.id)) {
      trackedImpressionsRef.current.add(currentReel.id);
      
      const timer = setTimeout(() => {
        fetch(`/api/bulletin/ads/${currentReel.id}/impression`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && typeof data.count === 'number') {
              setImpressionsState((prev) => ({
                ...prev,
                [currentReel.id]: data.count
              }));
            }
          })
          .catch(() => {});
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [activeIndex, reelsList]);

  // Debounced safe upload trigger to prevent duplicate calls
  const isUploadOpeningRef = useRef(false);
  const handleUploadReelClick = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isUploadOpeningRef.current) return;
    isUploadOpeningRef.current = true;
    setTimeout(() => {
      isUploadOpeningRef.current = false;
    }, 600);

    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول لرفع مقطع ريلز' : 'Please log in to upload reels');
      return;
    }

    if (onOpenUploadReels) {
      onOpenUploadReels();
    } else if (onUploadReelClick) {
      onUploadReelClick();
    }
  }, [token, isRtl, onOpenUploadReels, onUploadReelClick]);

  useEffect(() => {
    localStorage.setItem('reels_muted', String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const triggerHaptic = (pattern: number | number[] = 30) => {
    utilsTriggerHaptic(pattern);
  };

  const preloadVideoChunk = useCallback((videoUrl: string) => {
    if (!videoUrl || mediaCacheRef.current.has(videoUrl)) return;
    mediaCacheRef.current.add(videoUrl);

    fetch(videoUrl, {
      headers: { Range: 'bytes=0-1048576' },
      mode: 'cors'
    })
      .then((res) => res.blob())
      .catch(() => {
      });
  }, []);



  useEffect(() => {
    const prefetchIndices = [activeIndex - 1, activeIndex + 1, activeIndex + 2, activeIndex + 3];
    prefetchIndices.forEach((idx) => {
      if (idx >= 0 && idx < reelsList.length) {
        const targetReel = reelsList[idx];
        if (targetReel && targetReel.video_url && !hiddenReelIds[targetReel.id]) {
          preloadVideoChunk(targetReel.video_url);
          const vidEl = videoRefs.current[targetReel.id];
          if (vidEl) {
            vidEl.preload = 'auto';
            if (vidEl.readyState === 0) {
              vidEl.load();
            }
          }
          // Also append a dynamic link prefetch if not present
          const videoUrlFull = getMediaUrl(targetReel.video_url);
          if (videoUrlFull && !document.querySelector(`link[href="${videoUrlFull}"]`)) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = videoUrlFull;
            link.as = 'video';
            document.head.appendChild(link);
          }
        }
      }
    });
  }, [activeIndex, reelsList, hiddenReelIds, preloadVideoChunk]);

  // Synchronize Active Reel ID & Index to SessionStorage and URL for Session Persistence
  useEffect(() => {
    try {
      const currentReel = reelsList[activeIndex];
      if (currentReel) {
        sessionStorage.setItem('perplexta_active_reel_id', String(currentReel.id));
        sessionStorage.setItem('perplexta_active_reel_index', String(activeIndex));

        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          if (url.searchParams.get('tab') === 'reels') {
            url.searchParams.set('reel', String(currentReel.id));
            window.history.replaceState(null, '', url.toString());
          }
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, [activeIndex, reelsList]);

  // Restore initial scroll position on mount
  useEffect(() => {
    if (activeIndex > 0) {
      const timer = setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;
        const targetItem = container.querySelector(`[data-reel-index="${activeIndex}"]`);
        if (targetItem) {
          targetItem.scrollIntoView({ behavior: 'auto' });
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, []);

  // Centralized playback trigger with browser autoplay policy fallback
  const playActiveVideo = useCallback((videoEl: HTMLVideoElement, reelId: number, targetMuted: boolean) => {
    videoEl.muted = targetMuted;

    notifyMediaPlaying(`reels_feed_${reelId}`);
    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setPlayingState((prev) => ({ ...prev, [reelId]: true }));
          wasAutoplayMutedFallbackRef.current = false; // Successfully played with target muted setting
        })
        .catch((err) => {
          console.warn('[ReelsFeed] Autoplay restricted by browser policy:', err);
          if (!targetMuted) {
            wasAutoplayMutedFallbackRef.current = true; // Flag that we had to fallback to muted play due to policy
            isAutoplayFallbackRef.current = true;
            videoEl.muted = true;
            videoEl
              .play()
              .then(() => {
                setPlayingState((prev) => ({ ...prev, [reelId]: true }));
              })
              .catch(() => {
                setPlayingState((prev) => ({ ...prev, [reelId]: false }));
              })
              .finally(() => {
                setTimeout(() => {
                  isAutoplayFallbackRef.current = false;
                }, 400);
              });
          } else {
            setPlayingState((prev) => ({ ...prev, [reelId]: false }));
          }
        });
    }
  }, []);

  // Auto-unmute on first user interaction if the browser forced a muted autoplay fallback
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (wasAutoplayMutedFallbackRef.current) {
        wasAutoplayMutedFallbackRef.current = false;
        
        const currentReel = reelsList[activeIndex];
        if (currentReel) {
          const activeVideo = videoRefs.current[currentReel.id];
          if (activeVideo) {
            try {
              // Gracefully transition to unmuted since user interacted with the document
              activeVideo.muted = false;
              setIsMuted(false);
              setGlobalMuteState(false);
            } catch (err) {
              console.warn('[ReelsFeed] Failed to auto-unmute on interaction:', err);
            }
          }
        }
      }
    };

    window.addEventListener('click', handleFirstInteraction, { once: true, capture: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true, capture: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction, { capture: true });
      window.removeEventListener('touchstart', handleFirstInteraction, { capture: true });
    };
  }, [activeIndex, reelsList]);

  // Sync media coordinator events while active in Reels view
  useEffect(() => {
    const activeId = reelsList[activeIndex]?.id;
    if (activeId !== undefined) {
      stopAllMedia('reels_feed_' + activeId);
    }

    const handleStopMedia = (e: Event) => {
      const customEvent = e as CustomEvent<{ exceptMediaId?: string }>;
      const currentId = reelsList[activeIndex]?.id;
      if (customEvent.detail?.exceptMediaId !== `reels_feed_${currentId}`) {
        Object.values(videoRefs.current).forEach((v) => {
          if (v && !v.paused) {
            try {
              v.pause();
            } catch (_) {}
          }
        });
        setPlayingState({});
      }
    };

    const handleMediaPlaying = (e: Event) => {
      const customEvent = e as CustomEvent<{ mediaId: string }>;
      const currentId = reelsList[activeIndex]?.id;
      if (customEvent.detail?.mediaId !== `reels_feed_${currentId}`) {
        Object.values(videoRefs.current).forEach((v) => {
          if (v && !v.paused) {
            try {
              v.pause();
            } catch (_) {}
          }
        });
        setPlayingState({});
      }
    };

    window.addEventListener('perplexta:stop_all_media', handleStopMedia);
    window.addEventListener('perplexta:media_playing', handleMediaPlaying);

    return () => {
      window.removeEventListener('perplexta:stop_all_media', handleStopMedia);
      window.removeEventListener('perplexta:media_playing', handleMediaPlaying);
    };
  }, [activeIndex, reelsList]);

  // Pause all videos when ReelsFeed completely unmounts
  useEffect(() => {
    return () => {
      Object.values(videoRefs.current).forEach((v) => {
        if (v) {
          try {
            v.pause();
          } catch (_) {}
        }
      });
      stopAllMedia();
    };
  }, []);

  // Prevent background playback when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const activeReel = reelsList[activeIndex];
        if (activeReel) {
          const videoEl = videoRefs.current[activeReel.id];
          if (videoEl && !videoEl.paused) {
            videoEl.pause();
            setPlayingState((prev) => ({ ...prev, [activeReel.id]: false }));
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeIndex, reelsList]);

  // Synchronize mute state across context switching, feeds, and global media changes
  useEffect(() => {
    const handleMuteChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ muted: boolean }>;
      if (typeof customEvent.detail?.muted === 'boolean') {
        const newMuted = customEvent.detail.muted;
        setIsMuted(newMuted);
        
        const currentReel = reelsList[activeIndex];
        Object.values(videoRefs.current).forEach((v) => {
          if (v) {
            try {
              const isThisActive = currentReel && v.dataset.mediaId === `reels_feed_${currentReel.id}`;
              if (isThisActive) {
                v.muted = newMuted;
              } else {
                v.muted = true; // Non-active videos must always remain muted to comply with browser policy
              }
            } catch (_) {}
          }
        });
      }
    };

    window.addEventListener('perplexta:mute_change', handleMuteChange);
    return () => {
      window.removeEventListener('perplexta:mute_change', handleMuteChange);
    };
  }, [activeIndex, reelsList]);

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const nextMuted = !isMuted;
    isTogglingMuteRef.current = true;
    setTimeout(() => {
      isTogglingMuteRef.current = false;
    }, 400);

    setIsMuted(nextMuted);
    setGlobalMuteState(nextMuted);

    if (muteTimerRef.current) {
      clearTimeout(muteTimerRef.current);
    }
    setMuteFeedback({ show: true, isMuted: nextMuted });
    muteTimerRef.current = setTimeout(() => {
      setMuteFeedback(null);
    }, 1100);

    const currentReel = reelsList[activeIndex];
    Object.values(videoRefs.current).forEach((videoEl) => {
      if (videoEl) {
        try {
          // Only unmute the active video element to prevent browser media conflict and automatic pauses
          const isThisActive = currentReel && videoEl.dataset.mediaId === `reels_feed_${currentReel.id}`;
          if (isThisActive) {
            videoEl.muted = nextMuted;
          } else {
            videoEl.muted = true;
          }
        } catch (_) {}
      }
    });

    if (currentReel) {
      const activeVideo = videoRefs.current[currentReel.id];
      if (activeVideo) {
        try {
          activeVideo.muted = nextMuted;
          
          const isReelPlaying = playingState[currentReel.id];
          if (isReelPlaying || !activeVideo.paused) {
            // Synchronously trigger play inside the click user gesture. This guarantees
            // unmuted playback permission from the browser and prevents automatic pauses.
            const playPromise = activeVideo.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setPlayingState((prev) => ({ ...prev, [currentReel.id]: true }));
                })
                .catch((err) => {
                  console.warn("[ReelsFeed] Unmuted play failed in user gesture, trying muted fallback:", err);
                  if (!nextMuted) {
                    activeVideo.muted = true;
                    activeVideo.play()
                      .then(() => {
                        setPlayingState((prev) => ({ ...prev, [currentReel.id]: true }));
                      })
                      .catch(() => {
                        setPlayingState((prev) => ({ ...prev, [currentReel.id]: false }));
                      });
                  } else {
                    setPlayingState((prev) => ({ ...prev, [currentReel.id]: false }));
                  }
                });
            } else {
              setPlayingState((prev) => ({ ...prev, [currentReel.id]: true }));
            }
          }
        } catch (err) {
          console.error("[ReelsFeed] Error in toggleMute active video handler:", err);
        }
      }
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    const muted = newVol <= 0.01;
    setIsMuted(muted);
    setGlobalMuteState(muted);
    const currentReel = reelsList[activeIndex];
    if (currentReel) {
      const activeVideo = videoRefs.current[currentReel.id];
      if (activeVideo) {
        activeVideo.volume = newVol;
        activeVideo.muted = muted;
      }
    }
  };

  useEffect(() => {
    reelsList.forEach((reel, index) => {
      const videoEl = videoRefs.current[reel.id];
      if (!videoEl) return;

      if (index === activeIndex) {
        if (prevActiveIndexRef.current !== activeIndex) {
          videoEl.currentTime = 0;
          playActiveVideo(videoEl, reel.id, isMuted);
        } else if (videoEl.paused) {
          playActiveVideo(videoEl, reel.id, isMuted);
        }
      } else {
        videoEl.muted = true;
        videoEl.pause();
        setPlayingState((prev) => ({ ...prev, [reel.id]: false }));
      }
    });

    if (activeIndex > 0 && !hasSwiped) {
      setHasSwiped(true);
    }

    prevActiveIndexRef.current = activeIndex;
  }, [activeIndex, reelsList, playActiveVideo]);

  // Smooth scroll sync: maintains active item in focus without interrupting ongoing playback
  const handleContainerScroll = useCallback(() => {
    if (scrollDebounceTimerRef.current) {
      clearTimeout(scrollDebounceTimerRef.current);
    }
  }, []);

  const handleTimeUpdate = (reelId: number) => {
    const video = videoRefs.current[reelId];
    if (video && video.duration > 0) {
      const progressPercent = (video.currentTime / video.duration) * 100;
      setVideoProgress((prev) => {
        const current = prev[reelId] || 0;
        if (Math.abs(current - progressPercent) < 0.2) return prev;
        return { ...prev, [reelId]: progressPercent };
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>, reelId: number) => {
    e.stopPropagation();
    const video = videoRefs.current[reelId];
    if (!video || !video.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const targetRatio = Math.max(0, Math.min(1, clickX / width));
    const seekTime = targetRatio * video.duration;

    video.currentTime = seekTime;
    setVideoProgress((prev) => ({ ...prev, [reelId]: targetRatio * 100 }));
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const indexAttr = entry.target.getAttribute('data-reel-index');
          if (indexAttr === null) return;
          const idx = parseInt(indexAttr, 10);
          if (isNaN(idx)) return;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.4 && idx > activeIndex) {
            const nextReel = reelsList[idx];
            if (nextReel) {
              const videoEl = videoRefs.current[nextReel.id];
              if (videoEl && videoEl.preload !== 'auto') {
                videoEl.preload = 'auto';
                videoEl.load();
              }
            }
          }

          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            // Guard: during initial mounting and scroll to targetId, do not let index 0 overwrite targetIndex
            if (!isInitialScrollSettledRef.current && startId !== undefined && startId !== null) {
              const targetId = Number(startId);
              const targetIdx = reelsList.findIndex((r) => Number(r.id) === targetId);
              if (targetIdx >= 0 && idx !== targetIdx) {
                return;
              }
            }
            setActiveIndex(idx);
          }
        });
      },
      {
        root: container,
        threshold: [0.35, 0.55, 0.85]
      }
    );

    const items = container.querySelectorAll('.reel-snap-item');
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [reelsList, activeIndex, startId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (commentsOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToIndex(Math.min(activeIndex + 1, reelsList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToIndex(Math.max(activeIndex - 1, 0));
      } else if (e.key === ' ') {
        e.preventDefault();
        const currentReel = reelsList[activeIndex];
        if (currentReel) togglePlayPause(currentReel.id);
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, reelsList, commentsOpen]);

  const scrollToIndex = (idx: number) => {
    const container = containerRef.current;
    if (!container) return;
    const targetItem = container.querySelector(`[data-reel-index="${idx}"]`);
    if (targetItem) {
      targetItem.scrollIntoView({ behavior: 'smooth' });
      setActiveIndex(idx);
    }
  };

  const togglePlayPause = (reelId: number) => {
    const video = videoRefs.current[reelId];
    if (!video) return;

    if (video.paused) {
      playActiveVideo(video, reelId, isMuted);
    } else {
      video.pause();
      setPlayingState((prev) => ({ ...prev, [reelId]: false }));
    }
  };

  const lastCardTapRef = useRef<number>(0);

  const handleDoubleTap = (e: React.MouseEvent, reelId: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    triggerHaptic([40, 30, 60]);

    setHeartAnim({ id: reelId, x, y });
    setTimeout(() => setHeartAnim(null), 900);

    setLikesState((prev) => {
      const current = prev[reelId] || { count: 0, liked: false };
      if (!current.liked) {
        if (reelId > 0 && onToggleLike) {
          try {
            onToggleLike(reelId);
          } catch (err) {
          }
        }
        return {
          ...prev,
          [reelId]: { count: current.count + 1, liked: true }
        };
      }
      return prev;
    });
  };

  const handleVideoCardClick = (e: React.MouseEvent, reelId: number) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastCardTapRef.current < 280) {
      lastCardTapRef.current = 0;
      handleDoubleTap(e, reelId);
    } else {
      lastCardTapRef.current = now;
      togglePlayPause(reelId);
    }
  };

  const handleNotInterested = (reelId: number) => {
    triggerHaptic(20);
    setHiddenReelIds((prev) => ({ ...prev, [reelId]: true }));
    setMoreMenuReel(null);
    toast.info(isRtl ? 'تم إخفاء هذا المقطع ولن نقوم باقتراحه مجدداً' : 'Reel hidden. We will show fewer videos like this');
    if (activeIndex < reelsList.length - 1) {
      scrollToIndex(activeIndex + 1);
    }
  };

  const handleReportReel = async (reel: ReelItemData) => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول للإبلاغ عن المحتوى' : 'Please log in to report content');
      return;
    }

    triggerHaptic(20);
    setMoreMenuReel(null);
    
    try {
      const res = await fetch(`/api/bulletin/ads/${reel.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: 'inappropriate',
          details: 'Reported from Reels Feed'
        })
      });

      if (res.ok) {
        toast.success(isRtl ? 'تم استلام بلاغك بنجاح وسيقوم فريق المراجعة بالتحقق من المحتوى' : 'Report received. Moderation team will review this content');
      } else {
        toast.error(isRtl ? 'فشل إرسال البلاغ' : 'Failed to send report');
      }
    } catch (error) {
      console.error('Error reporting reel:', error);
      toast.error(isRtl ? 'حدث خطأ أثناء إرسال البلاغ' : 'Error sending report');
    }
  };

  const handleCopyReelLink = (reelId: number) => {
    triggerHaptic(25);
    const shareUrl = `${window.location.origin}${window.location.pathname}?reel=${reelId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success(isRtl ? 'تم نسخ رابط الريلز المباشر للحافظة 📋' : 'Direct Reel link copied to clipboard 📋');
  };

  const handleNativeSystemShare = async (reel: ReelItemData) => {
    triggerHaptic(25);
    const shareUrl = `${window.location.origin}${window.location.pathname}?reel=${reel.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: reel.title || 'Perplexta Reel',
          text: reel.description,
          url: shareUrl
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    handleCopyReelLink(reel.id);
  };

  const handleSaveClick = (e: React.MouseEvent, reelId: number) => {
    e.stopPropagation();
    if (!token && reelId > 0) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول للحفظ' : 'Please log in to save');
      return;
    }

    triggerHaptic(25);

    setSavesState((prev) => {
      const nextSave = !prev[reelId];
      if (nextSave) {
        toast.success(isRtl ? 'تم حفظ الريلز في قائمتك المحفوظة' : 'Reel saved to bookmarks');
      } else {
        toast.info(isRtl ? 'تم إزالة الريلز من المحفوظات' : 'Reel removed from saved');
      }

      if (reelId > 0 && onToggleSave) {
        try {
          onToggleSave(reelId);
        } catch (err) {
          setSavesState((st) => ({ ...st, [reelId]: !nextSave }));
          toast.error(isRtl ? 'فشل تحديث الحفظ' : 'Failed to update save state');
        }
      }

      return { ...prev, [reelId]: nextSave };
    });
  };

  const handleFollowToggle = async (e: React.MouseEvent, reelId: number, authorName: string) => {
    e.stopPropagation();
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول لمتابعة الناشر' : 'Please log in to follow');
      return;
    }

    const currentReel = reelsList.find((r) => r.id === reelId);
    const pageId = currentReel?.page_id;

    // Optimistic state toggle
    const nextFollow = !(followingState[reelId] ?? currentReel?.user_has_followed ?? false);
    setFollowingState((prev) => ({ ...prev, [reelId]: nextFollow }));

    if (pageId) {
      try {
        const res = await fetch(`/api/bulletin/pages/${pageId}/follow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setFollowingState((prev) => ({ ...prev, [reelId]: data.is_following }));
          if (data.is_following) {
            toast.success(isRtl ? `أصبحت تتابع ${authorName}` : `You are now following ${authorName}`);
          } else {
            toast.info(isRtl ? `إلغاء متابعة ${authorName}` : `Unfollowed ${authorName}`);
          }
        } else {
          // Revert optimistic update
          setFollowingState((prev) => ({ ...prev, [reelId]: !nextFollow }));
          toast.error(data.error || (isRtl ? 'فشل تعديل حالة المتابعة' : 'Failed to update follow state'));
        }
      } catch (err) {
        setFollowingState((prev) => ({ ...prev, [reelId]: !nextFollow }));
        toast.error(isRtl ? 'فشل الاتصال بالخادم' : 'Server connection error');
      }
    } else {
      if (nextFollow) {
        toast.success(isRtl ? `أصبحت تتابع ${authorName}` : `You are now following ${authorName}`);
      } else {
        toast.info(isRtl ? `إلغاء متابعة ${authorName}` : `Unfollowed ${authorName}`);
      }
    }
  };

  const handleShareReelTrack = async (reelId: number) => {
    try {
      fetch(`/api/bulletin/ads/${reelId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sender_id: user?.id,
          sharer_name: user?.name
        })
      }).catch(() => {});
      setSharesState((prev) => ({ ...prev, [reelId]: (prev[reelId] || 0) + 1 }));
    } catch (e) {
      // Non-blocking telemetry
    }
  };

  const openShareSheet = async (e: React.MouseEvent, reel: ReelItemData) => {
    e.stopPropagation();
    const activeAd = ads.find((a) => a.id === reel.id) || ({
      ...reel,
      id: reel.id,
      title: reel.title || reel.author_name,
      description: reel.description,
      media_type: 'video',
      is_reel: true
    } as any as BulletinAd);

    if (onShare) {
      onShare(activeAd);
      return;
    }

    // Direct standalone native share flow
    const shareUrl = `${window.location.origin}/reels/${reel.id}`;
    handleShareReelTrack(reel.id);

    if (navigator.share) {
      try {
        await navigator.share({
          title: reel.title || reel.author_name || (isRtl ? 'مقطع على ببربليكستا' : 'Reel on Perplexta'),
          text: reel.description || (isRtl ? 'شاهد هذا المقطع على ببربليكستا' : 'Watch this reel on Perplexta'),
          url: shareUrl
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback: Copy direct link to clipboard
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast.success(isRtl ? 'تم نسخ رابط المقطع بنجاح' : 'Reel link copied to clipboard');
    } catch (err) {}
  };

  const openCommentsDrawer = (e: React.MouseEvent, reelId: number) => {
    e.stopPropagation();
    setActiveCommentReelId(reelId);
    setCommentsOpen(true);
  };

  const handleSendCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !activeCommentReelId) return;

    if (!token && activeCommentReelId > 0) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول لإضافة تعليق' : 'Please log in to comment');
      return;
    }

    const textToSend = commentInput.trim();
    const reelId = activeCommentReelId;
    setCommentInput('');
    setIsSubmittingComment(true);

    // Optimistic insert
    const tempComment: BulletinAdComment = {
      id: Date.now(),
      ad_id: reelId,
      user_id: user?.id || 0,
      author_name: user?.name || (isRtl ? 'أنا' : 'Me'),
      author_avatar: user?.avatar || null,
      content: textToSend,
      created_at: new Date().toISOString(),
      like_count: 0
    };

    setInternalCommentsMap((prev) => ({
      ...prev,
      [reelId]: [...(prev[reelId] || commentsMapRef.current[reelId] || []), tempComment]
    }));
    setCommentsCountState((prev) => ({
      ...prev,
      [reelId]: (prev[reelId] || 0) + 1
    }));

    try {
      if (reelId > 0 && onAddComment) {
        await onAddComment(reelId, textToSend);
      }
      setCommentsOpen(false);
    } catch (err) {
      toast.error(isRtl ? 'تعذر إرسال التعليق' : 'Failed to send comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const activeReelComments = activeCommentReelId
    ? (internalCommentsMap[activeCommentReelId] || commentsMap[activeCommentReelId] || [])
    : [];

  return (
    <div className="fixed inset-0 z-[99999] w-screen h-[100dvh] bg-[var(--surface-page)] text-[var(--text-primary)] overflow-hidden select-none font-sans m-0 p-0 rounded-none shadow-none border-0 flex flex-row">
      {/* Main Video Feed Area (Right in RTL, Left in LTR) */}
      <div className="flex-1 relative h-full flex flex-col min-w-0 bg-[var(--surface-page)]">
      {/* Ambient Blurred Backdrop for Desktop */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
        {reelsList[activeIndex]?.video_url ? (
          <video
            key={`ambient-vid-${reelsList[activeIndex]?.id}`}
            src={getMediaUrl(reelsList[activeIndex]?.video_url)}
            poster={getMediaUrl(reelsList[activeIndex]?.image_url)}
            muted
            autoPlay
            loop
            playsInline
            className="ambient-video w-full h-full object-cover scale-125 blur-3xl opacity-20 filter saturate-150 brightness-75"
          />
        ) : reelsList[activeIndex]?.image_url ? (
          <img
            key={`ambient-img-${reelsList[activeIndex]?.id}`}
            src={getMediaUrl(reelsList[activeIndex]?.image_url)}
            alt="Ambient"
            className="ambient-video w-full h-full object-cover scale-125 blur-3xl opacity-20 filter saturate-150 brightness-75"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-100/90 via-gray-200/85 to-gray-100/95 dark:from-black/80 dark:via-zinc-950/85 dark:to-black/95 backdrop-blur-2xl" />
      </div>

      {/* Floating Glassmorphism Tabs Switcher ("لك" | "المتابَعون") - Separated & Professional */}
      <div className="absolute top-3 inset-x-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-white/90 dark:bg-zinc-900/80 backdrop-blur-xl border border-gray-200 dark:border-white/15 shadow-2xl">
          <button
            onClick={() => {
              setActiveTab('for_you');
              setActiveIndex(0);
            }}
            className={`px-4 py-1.5 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
              activeTab === 'for_you'
                ? 'bg-gray-900 text-white dark:bg-accent dark:text-white shadow-md scale-105'
                : 'text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            {isRtl ? 'لك' : 'For You'}
          </button>
          <button
            onClick={() => {
              setActiveTab('following');
              setActiveIndex(0);
            }}
            className={`px-4 py-1.5 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
              activeTab === 'following'
                ? 'bg-gray-900 text-white dark:bg-accent dark:text-white shadow-md scale-105'
                : 'text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            {isRtl ? 'المتابَعون' : 'Following'}
          </button>
        </div>
      </div>

      {/* Top Floating Navigation Header Overlay - Clean, Spacious & Centered on Desktop */}
      <header className="absolute top-0 inset-x-0 z-40 px-3 sm:px-8 py-3 flex items-center justify-between bg-gradient-to-b from-white/90 via-white/50 dark:from-black/90 dark:via-black/50 to-transparent pointer-events-auto">
        {/* Top Left: Spacer */}
        <div className="flex items-center gap-2.5">
        </div>

        {/* Top Right: Search + Upload + Volume Slider + Close */}
        <div className="flex items-center gap-2">
          {/* Search Button (Desktop) */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-[4px] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-gray-200/50 dark:border-transparent shadow-sm"
            title={isRtl ? 'بحث في مقاطع ريلز' : 'Search Reels'}
          >
            <Search size={18} className="drop-shadow-sm" />
          </button>

          <button
            onClick={handleUploadReelClick}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-[4px] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-gray-200/50 dark:border-transparent shadow-sm"
            title={isRtl ? 'رفع مقطع ريلز جديد' : 'Upload New Reel'}
          >
            <Plus size={22} className="drop-shadow-sm" />
          </button>

          {/* Volume Control with Hover Expandable Slider on Desktop */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setIsVolumeHovered(true)}
            onMouseLeave={() => setIsVolumeHovered(false)}
          >
            <button
              onClick={toggleMute}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-[4px] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-gray-200/50 dark:border-transparent shadow-sm"
              title={isMuted ? (isRtl ? 'تشغيل الصوت (M)' : 'Unmute (M)') : (isRtl ? 'كتم الصوت (M)' : 'Mute (M)')}
            >
              {isMuted ? (
                <VolumeX size={17} className="text-red-500 dark:text-red-400" />
              ) : volume < 0.5 ? (
                <Volume1 size={17} />
              ) : (
                <Volume2 size={17} />
              )}
            </button>

            {/* Desktop Horizontal Volume Slider on Hover */}
            <AnimatePresence>
              {isVolumeHovered && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="hidden md:flex items-center px-2 py-1.5 bg-white/90 dark:bg-black/80 backdrop-blur-xl rounded-[4px] border border-gray-200 dark:border-white/15 shadow-xl ms-1"
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-20 h-1.5 bg-gray-200 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    title={isRtl ? 'مستوى الصوت' : 'Volume'}
                  />
                  <span className="text-[10px] font-mono text-gray-700 dark:text-gray-300 ms-1.5 select-none">
                    {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Close Modal Button on Desktop */}
          {onClose && (
            <button
              onClick={onClose}
              className="hidden md:flex w-9 h-9 sm:w-10 sm:h-10 items-center justify-center rounded-[4px] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-gray-200/50 dark:border-transparent shadow-sm"
              title={isRtl ? 'إغلاق (Esc)' : 'Close (Esc)'}
            >
              <X size={19} />
            </button>
          )}
        </div>
      </header>

      {/* Desktop Floating Navigation Chevrons */}
      <div className="hidden md:flex fixed end-4 lg:end-8 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-2.5 select-none pointer-events-auto">
        <button
          onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          className="w-11 h-11 rounded-[4px] bg-white/90 dark:bg-zinc-900/85 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-25 text-gray-900 dark:text-white backdrop-blur-xl border border-gray-200 dark:border-white/15 shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
          title={isRtl ? 'المقطع السابق (↑)' : 'Previous Reel (↑)'}
        >
          <ChevronUp size={22} />
        </button>
        <div className="px-2.5 py-1 rounded-[4px] bg-white/90 dark:bg-black/60 backdrop-blur-md border border-gray-200 dark:border-white/10 text-[10px] font-mono font-black text-gray-800 dark:text-gray-300 shadow">
          {activeIndex + 1} / {activeReelsList.length || 1}
        </div>
        <button
          onClick={() => scrollToIndex(Math.min(activeReelsList.length - 1, activeIndex + 1))}
          disabled={activeIndex >= activeReelsList.length - 1}
          className="w-11 h-11 rounded-[4px] bg-white/90 dark:bg-zinc-900/85 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-25 text-gray-900 dark:text-white backdrop-blur-xl border border-gray-200 dark:border-white/15 shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
          title={isRtl ? 'المقطع التالي (↓)' : 'Next Reel (↓)'}
        >
          <ChevronDown size={22} />
        </button>
      </div>

      {/* Desktop Keyboard Shortcuts Help Pill */}
      <div className="hidden xl:flex fixed start-6 bottom-4 z-40 items-center gap-2 px-3.5 py-1.5 rounded-[4px] bg-white/90 dark:bg-zinc-900/70 backdrop-blur-md border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-700 dark:text-gray-400 select-none pointer-events-none shadow-sm">
        <span>{isRtl ? 'التنقل:' : 'Navigate:'}</span>
        <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white text-[9px] font-mono">↑</kbd>
        <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white text-[9px] font-mono">↓</kbd>
        <span className="ms-1">{isRtl ? 'تشغيل:' : 'Play:'}</span>
        <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white text-[9px] font-mono">Space</kbd>
        <span className="ms-1">{isRtl ? 'الصوت:' : 'Mute:'}</span>
        <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white text-[9px] font-mono">M</kbd>
      </div>

      {/* Main Snap Scrollable Container */}
      <div
        ref={containerRef}
        onScroll={handleContainerScroll}
        className="w-full h-full pt-14 md:pt-16 pb-2 md:pb-6 overflow-y-scroll overflow-x-hidden snap-y snap-mandatory scrollbar-none relative z-10"
      >
        {isLoading ? (
          <div className="w-full h-[calc(100dvh-80px)] flex items-center justify-center bg-black" />
        ) : activeReelsList.length === 0 ? (
          <div className="w-full h-[calc(100dvh-80px)] flex items-center justify-center p-4 text-center select-none bg-black/40">
            <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-3xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl max-w-sm shadow-2xl text-center">
              <span className="text-xs font-bold text-zinc-300">
                {activeTab === 'following'
                  ? (isRtl ? 'لا توجد مقاطع ريلز من الأشخاص الذين تتابعهم حالياً.' : 'No reels from creators you follow yet.')
                  : (isRtl ? 'لا توجد مقاطع ريلز منشورة حالياً' : 'No published reels available.')}
              </span>
              {activeTab === 'following' ? (
                <button
                  onClick={() => setActiveTab('for_you')}
                  className="px-4 py-2 rounded-[4px] bg-accent text-white font-bold text-xs shadow-lg hover:opacity-90 transition-all cursor-pointer"
                >
                  {isRtl ? 'تصفح قسم لك' : 'Explore For You'}
                </button>
              ) : (
                <button
                  onClick={handleUploadReelClick}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                >
                  <Plus size={14} className="stroke-[3]" />
                  <span>{isRtl ? 'إضافة مقطع ريلز' : 'Add Reel'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          activeReelsList.filter((reel) => !hiddenReelIds[reel.id]).map((reel, index) => {
          const isCurrentActive = index === activeIndex;
          const isPlaying = playingState[reel.id] ?? false;
          const likeData = likesState[reel.id] || { count: reel.likes_count, liked: !!reel.user_has_liked };
          const isSaved = savesState[reel.id] ?? !!reel.user_has_saved;
          const isFollowing = followingState[reel.id] ?? !!reel.user_has_followed;
          const isCaptionExpanded = expandedCaptions[reel.id] ?? false;

          return (
            <div
              key={`reel-item-${reel.id}-${index}`}
              data-reel-index={index}
              className="reel-snap-item relative w-full h-[100dvh] md:h-[calc(100dvh-64px)] snap-start shrink-0 flex items-center justify-center p-0 md:py-2 md:px-4 overflow-hidden"
            >
              {/* Centered Desktop Frame with Adjacent Rail and Split-View Drawer */}
              <div className="relative flex items-center justify-center gap-4 sm:gap-5 w-full h-full max-w-full">
                
                {/* 9:16 Video Phone Card Frame */}
                <div
                  className="relative w-full h-full md:w-[380px] lg:w-[410px] xl:w-[430px] md:h-[calc(100dvh-92px)] md:max-h-[820px] md:aspect-[9/16] bg-black md:rounded-[2rem] overflow-hidden md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] md:border md:border-white/15 md:ring-1 md:ring-white/10 flex items-center justify-center group select-none cursor-pointer"
                  onClick={(e) => {
                    handleVideoCardClick(e, reel.id);
                  }}
                >
                  {/* Video Player Element Container */}
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <video
                      ref={(el) => {
                        videoRefs.current[reel.id] = el;
                      }}
                      data-media-id={`reels_feed_${reel.id}`}
                      src={reel.video_url}
                      poster={reel.image_url}
                      loop
                      muted={isMuted}
                      playsInline
                      autoPlay={index === activeIndex}
                      preload={Math.abs(index - activeIndex) <= 1 ? 'auto' : 'metadata'}
                      onLoadedMetadata={(e) => {
                        if (index === activeIndex) {
                          playActiveVideo(e.currentTarget, reel.id, isMuted);
                        }
                      }}
                      onCanPlay={(e) => {
                        if (index === activeIndex && e.currentTarget.paused) {
                          playActiveVideo(e.currentTarget, reel.id, isMuted);
                        }
                      }}
                      onTimeUpdate={() => handleTimeUpdate(reel.id)}
                      onPlaying={() => {
                        setPlayingState((prev) => ({ ...prev, [reel.id]: true }));
                      }}
                      onPause={(e) => {
                        const reelId = reel.id;
                        const v = e.currentTarget;

                        // If it's autoplay fallback, we want to handle the retry
                        if (isAutoplayFallbackRef.current && index === activeIndex) {
                          v.play().then(() => {
                            setPlayingState((prev) => ({ ...prev, [reelId]: true }));
                          }).catch(() => {
                            v.muted = true;
                            v.play().then(() => {
                              setPlayingState((prev) => ({ ...prev, [reelId]: true }));
                            }).catch(() => {
                              setPlayingState((prev) => ({ ...prev, [reelId]: false }));
                            });
                          });
                          return;
                        }

                        // If we are actively toggling mute, let toggleMute handle playback synchronously inside user gesture.
                        // Do not trigger pause state immediately to prevent flicker or premature pause states.
                        if (isTogglingMuteRef.current && index === activeIndex) {
                          return;
                        }

                        if (!v.paused) {
                          return;
                        }
                        setPlayingState((prev) => ({ ...prev, [reelId]: false }));
                      }}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />
                  </div>

                  {/* TIKTOK-STYLE TOP VIEWS & ENGAGEMENT PILL */}
                  <div className={`absolute top-14 sm:top-16 md:top-4 z-30 flex items-center gap-2 pointer-events-none select-none ${isRtl ? 'start-3 sm:start-4' : 'start-3 sm:start-4'}`}>
                    <div className="flex items-center gap-1.5 text-white drop-shadow-md">
                      <Eye size={14} className="text-cyan-400 stroke-[2.5]" />
                      <span className="text-xs font-black tracking-wide tabular-nums text-white">
                        {formatCompactCount(impressionsState[reel.id] ?? (reel as any).impressions_count ?? 0)}
                      </span>
                    </div>
                  </div>

                  {/* Gradient Overlays for Enhanced Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/40 pointer-events-none" />

                  {/* Real-Time Interactive Video Progress Bar at Bottom of Card with Hover Metadata */}
                  <div
                    className="absolute bottom-0 inset-x-0 z-30 h-2 hover:h-3 bg-white/20 backdrop-blur-sm cursor-pointer transition-all duration-150 pointer-events-auto group/timeline flex items-end"
                    onClick={(e) => handleSeek(e, reel.id)}
                    onMouseMove={(e) => {
                      const video = videoRefs.current[reel.id];
                      const dur = video?.duration || 0;
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (rect.width > 0 && dur > 0) {
                        const relativeX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                        const percent = (relativeX / rect.width) * 100;
                        const hoverTime = (relativeX / rect.width) * dur;
                        const naturalWidth = video?.videoWidth || 0;
                        const naturalHeight = video?.videoHeight || 0;
                        let qualityLabel = naturalHeight > 0 ? `${naturalHeight}p` : undefined;
                        if (naturalHeight >= 2160 || naturalWidth >= 3840) qualityLabel = '4K';
                        else if (naturalHeight >= 1440 || naturalWidth >= 2560) qualityLabel = '2K QHD';
                        else if (naturalHeight >= 1080 || naturalWidth >= 1920) qualityLabel = '1080p FHD';
                        else if (naturalHeight >= 720 || naturalWidth >= 1280) qualityLabel = '720p HD';
                        else if (naturalHeight >= 480) qualityLabel = '480p SD';

                        setReelsHoverMeta({
                          reelId: reel.id,
                          percent,
                          time: hoverTime,
                          duration: dur,
                          width: naturalWidth || undefined,
                          height: naturalHeight || undefined,
                          qualityLabel
                        });
                      }
                    }}
                    onMouseLeave={() => {
                      setReelsHoverMeta(null);
                    }}
                    title={isRtl ? 'انقر للتقديم أو التأخير' : 'Click to seek'}
                  >
                    {/* Floating Metadata Tooltip on Hover */}
                    {reelsHoverMeta && reelsHoverMeta.reelId === reel.id && reelsHoverMeta.duration > 0 && (
                      <div
                        style={{
                          left: `${Math.max(10, Math.min(90, reelsHoverMeta.percent))}%`,
                          transform: 'translateX(-50%)'
                        }}
                        className="absolute bottom-full mb-2 z-40 pointer-events-none flex flex-col items-center animate-in fade-in zoom-in-95 duration-150"
                      >
                        <div className="px-2.5 py-1.5 rounded-xl bg-zinc-900/95 backdrop-blur-md border border-white/20 shadow-2xl text-white text-[11px] font-mono flex items-center gap-2 whitespace-nowrap">
                          <span className="font-bold text-accent">
                            {formatTime(reelsHoverMeta.time)}
                          </span>
                          <span className="text-gray-400 text-[10px]">
                            / {formatTime(reelsHoverMeta.duration)}
                          </span>
                          {reelsHoverMeta.qualityLabel && (
                            <div className="flex items-center gap-1.5 ps-1.5 border-s border-white/20">
                              <span className="px-1.5 py-0.5 rounded-md bg-accent/20 text-accent font-bold text-[9px] uppercase tracking-wider">
                                {reelsHoverMeta.qualityLabel}
                              </span>
                              {reelsHoverMeta.width && reelsHoverMeta.height && (
                                <span className="text-gray-400 text-[9px]">
                                  {reelsHoverMeta.width}×{reelsHoverMeta.height}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="w-2 h-2 rotate-45 bg-zinc-900 border-r border-b border-white/20 -mt-1" />
                      </div>
                    )}

                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-teal-400 transition-all duration-75 shadow-[0_0_10px_rgba(236,72,153,0.8)]"
                      style={{ width: `${videoProgress[reel.id] || 0}%` }}
                    />
                  </div>

                  {/* Center Play / Pause Feedback */}
                  <AnimatePresence>
                    {!isPlaying && isCurrentActive && (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className="absolute z-20 w-16 h-16 rounded-[12px] bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-2xl pointer-events-auto cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlayPause(reel.id);
                        }}
                      >
                        <Play size={32} className="ms-1 fill-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Visual Mute / Unmute Indicator Overlay */}
                  <AnimatePresence>
                    {muteFeedback?.show && isCurrentActive && (
                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="absolute z-30 pointer-events-none flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 text-white shadow-2xl"
                      >
                        {muteFeedback.isMuted ? (
                          <div className="w-8 h-8 rounded-[8px] bg-red-500/20 text-red-400 flex items-center justify-center">
                            <VolumeX size={18} />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-[8px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <Volume2 size={18} />
                          </div>
                        )}
                        <div className="flex flex-col text-start">
                          <span className="text-xs font-bold font-sans select-none tracking-wide">
                            {muteFeedback.isMuted
                              ? (isRtl ? 'تم كتم الصوت' : 'Sound Muted')
                              : (isRtl ? 'تم تشغيل الصوت' : 'Sound Unmuted')}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Double Tap Heart Burst Animation */}
                  <AnimatePresence>
                    {heartAnim && heartAnim.id === reel.id && (
                      <motion.div
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2.2, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ left: heartAnim.x - 30, top: heartAnim.y - 30 }}
                        className="absolute z-30 pointer-events-none text-red-500"
                      >
                        <Heart size={60} className="fill-red-500 drop-shadow-xl" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* MOBILE ONLY: In-card Action Column */}
                  <div
                    className={`md:hidden absolute bottom-14 z-20 flex flex-col items-center gap-3.5 ${
                      isRtl ? 'end-3' : 'start-3'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Author Avatar + Follow Button */}
                    <div className="relative group mb-1">
                      <div
                        onClick={() => reel.page_id && onOpenPageDetail && onOpenPageDetail(reel.page_id)}
                        className="cursor-pointer active:scale-95 transition-transform"
                      >
                        <BulletinAvatar
                          src={reel.author_avatar}
                          alt={reel.author_name}
                          size="md"
                          isPage={Boolean(reel.page_id)}
                        />
                      </div>
                      <button
                        onClick={(e) => handleFollowToggle(e, reel.id, reel.author_name)}
                        className={`absolute -bottom-1.5 start-1/2 -translate-x-1/2 w-5 h-5 rounded-[6px] flex items-center justify-center text-white shadow-md border border-black transition-all ${
                          isFollowing ? 'bg-emerald-500' : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                        title={isFollowing ? (isRtl ? 'تتابع بالفعل' : 'Following') : (isRtl ? 'متابعة' : 'Follow')}
                      >
                        {isFollowing ? <Check size={11} className="stroke-[3]" /> : <Plus size={12} className="stroke-[3]" />}
                      </button>
                    </div>

                    {/* Like Button */}
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        onClick={(e) => handleLikeClick(e, reel.id)}
                        className={`w-11 h-11 flex items-center justify-center transition-all active:scale-75 cursor-pointer ${
                          likeData.liked
                            ? 'text-red-500 drop-shadow-md'
                            : 'text-white drop-shadow-md'
                        }`}
                      >
                        <Heart
                          size={22}
                          className={likeData.liked ? 'fill-red-500 text-red-500 animate-bounce' : ''}
                        />
                      </button>
                      <span className="text-[11px] font-black text-white drop-shadow tabular-nums">
                        {formatCompactCount(likeData.count)}
                      </span>
                    </div>

                    {/* Comments Button */}
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        onClick={(e) => openCommentsDrawer(e, reel.id)}
                        className="w-11 h-11 flex items-center justify-center transition-all active:scale-75 cursor-pointer text-white drop-shadow-md"
                      >
                        <MessageCircle size={22} />
                      </button>
                      <span className="text-[11px] font-black text-white drop-shadow tabular-nums">
                        {formatCompactCount(commentsCountState[reel.id] ?? (internalCommentsMap[reel.id]?.length || commentsMap[reel.id]?.length || reel.comments_count || 0))}
                      </span>
                    </div>

                    {/* Bookmark / Save Button */}
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        onClick={(e) => handleSaveClick(e, reel.id)}
                        className={`w-11 h-11 flex items-center justify-center transition-all active:scale-75 cursor-pointer ${
                          isSaved
                            ? 'text-amber-400 drop-shadow-md'
                            : 'text-white drop-shadow-md'
                        }`}
                      >
                        <Bookmark size={22} className={isSaved ? 'fill-amber-400 text-amber-400' : ''} />
                      </button>
                      <span className="text-[10px] font-black text-white/90 drop-shadow">
                        {isSaved ? (isRtl ? 'محفوظ' : 'Saved') : (isRtl ? 'حفظ' : 'Save')}
                      </span>
                    </div>

                    {/* Share Button */}
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        onClick={(e) => openShareSheet(e, reel)}
                        className="w-11 h-11 flex items-center justify-center transition-all active:scale-75 cursor-pointer text-white drop-shadow-md"
                      >
                        <Share2 size={22} />
                      </button>
                      <span className="text-[11px] font-black text-white drop-shadow tabular-nums">
                        {formatCompactCount(sharesState[reel.id] ?? reel.shares_count ?? 0)}
                      </span>
                    </div>

                    {/* More Options (Three Dots Menu) */}
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoreMenuReel(reel);
                        }}
                        className="w-11 h-11 flex items-center justify-center transition-all active:scale-75 cursor-pointer text-white drop-shadow-md"
                        title={isRtl ? 'خيارات إضافية' : 'More options'}
                      >
                        <MoreVertical size={20} />
                      </button>
                    </div>

                    {/* Mobile Rotating Music Disc */}
                    <div className="mt-1 relative w-9 h-9 rounded-[8px] bg-black/80 border-2 border-white/30 flex items-center justify-center p-1 shadow-2xl overflow-hidden animate-spin-slow">
                      <Music size={14} className="text-purple-400" />
                    </div>
                  </div>

                  {/* Captions Overlay at Bottom of Card */}
                  <div
                    className={`absolute bottom-3 md:hidden z-20 max-w-[76%] space-y-2 pointer-events-auto ${
                      isRtl ? 'start-3 text-right' : 'start-3 text-left'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* User Handle & Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        onClick={() => reel.page_id && onOpenPageDetail && onOpenPageDetail(reel.page_id)}
                        className="text-sm font-black text-white drop-shadow flex items-center gap-1 cursor-pointer hover:underline"
                      >
                        @{reel.author_name}
                        {reel.page_is_verified && <CheckCircle2 size={14} className="text-blue-400 fill-blue-400 shrink-0" />}
                      </span>

                      {reel.location_city && (
                        <span className="px-2 py-0.5 rounded-[8px] bg-black/40 text-[10px] font-bold text-gray-300 backdrop-blur-sm border border-white/10 flex items-center gap-1">
                          <MapPin size={10} className="text-accent" />
                          {reel.location_city}
                        </span>
                      )}
                    </div>

                    {/* Title & Caption Description */}
                    <div className="space-y-1">
                      {reel.title && (
                        <h4 className="text-xs font-black text-purple-200 drop-shadow">
                          {reel.title}
                        </h4>
                      )}
                      <p
                        className={`text-xs text-gray-200 leading-relaxed drop-shadow transition-all ${
                          isCaptionExpanded ? 'line-clamp-none' : 'line-clamp-2'
                        }`}
                      >
                        {reel.description}
                      </p>
                      {reel.description && reel.description.length > 70 && (
                        <button
                          onClick={() =>
                            setExpandedCaptions((prev) => ({
                              ...prev,
                              [reel.id]: !isCaptionExpanded
                            }))
                          }
                          className="text-[11px] font-extrabold text-purple-300 hover:text-purple-200 hover:underline inline-block mt-0.5"
                        >
                          {isCaptionExpanded ? (isRtl ? 'إخفاء التفاصيل ▲' : 'Show less ▲') : (isRtl ? 'اقرأ المزيد ▼' : 'Read more ▼')}
                        </button>
                      )}
                    </div>

                    {/* Hashtags */}
                    {Array.isArray(reel.hashtags) && reel.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {reel.hashtags.map((tag, i) => (
                          <span key={`reel-tag-${reel.id}-${tag}-${i}`} className="text-[11px] font-bold text-accent drop-shadow">
                            #{String(tag).replace(/^#/, '')}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Music Marquee Title */}
                    <div className="flex items-center gap-2 text-[11px] font-medium text-gray-300/90 pt-0.5">
                      <Music size={12} className="text-purple-400 shrink-0 animate-pulse" />
                      <span className="truncate max-w-[200px] sm:max-w-[240px]">
                        {reel.music_title || (isRtl ? 'الصوت الأصلي - Perplexta Audio' : 'Original Sound')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DESKTOP ONLY: Adjacent Floating Action Rail */}
                <div
                  className={`hidden md:flex flex-col items-center gap-3.5 self-end pb-8 z-20 select-none ${
                    isRtl ? 'order-first' : 'order-last'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Author Avatar + Follow Button */}
                  <div className="relative group mb-1">
                    <div
                      onClick={() => reel.page_id && onOpenPageDetail && onOpenPageDetail(reel.page_id)}
                      className="cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    >
                      <BulletinAvatar
                        src={reel.author_avatar}
                        alt={reel.author_name}
                        size="md"
                        isPage={Boolean(reel.page_id)}
                      />
                    </div>
                    <button
                      onClick={(e) => handleFollowToggle(e, reel.id, reel.author_name)}
                      className={`absolute -bottom-1 start-1/2 -translate-x-1/2 w-5 h-5 rounded-[6px] flex items-center justify-center text-white shadow-lg border-2 border-zinc-950 transition-all cursor-pointer ${
                        isFollowing ? 'bg-emerald-500' : 'bg-purple-600 hover:bg-purple-700 hover:scale-110'
                      }`}
                      title={isFollowing ? (isRtl ? 'تتابع بالفعل' : 'Following') : (isRtl ? 'متابعة' : 'Follow')}
                    >
                      {isFollowing ? <Check size={11} className="stroke-[3]" /> : <Plus size={12} className="stroke-[3]" />}
                    </button>
                  </div>

                  {/* Like Button with Hover Reactions */}
                  <div className="flex flex-col items-center gap-1 group/like relative">
                    <div className="absolute bottom-full mb-2 hidden group-hover/like:flex items-center gap-1 bg-zinc-900/95 backdrop-blur-xl border border-white/20 shadow-2xl p-1.5 rounded-xl scale-0 group-hover/like:scale-100 origin-bottom transition-all duration-200 z-50">
                      {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji) => (
                        <button
                          key={`rail-emoji-${emoji}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeClick(e, reel.id);
                          }}
                          className="w-8 h-8 flex items-center justify-center text-xl hover:scale-125 transition-transform rounded-[8px] cursor-pointer hover:bg-white/10"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={(e) => handleLikeClick(e, reel.id)}
                      className={`w-12 h-12 rounded-[8px] bg-zinc-900/80 hover:bg-zinc-800 text-white backdrop-blur-xl border border-white/15 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                        likeData.liked ? 'text-red-500 border-red-500/40 bg-red-500/10' : ''
                      }`}
                      title={isRtl ? 'أعجبني' : 'Like'}
                    >
                      <Heart
                        size={22}
                        className={likeData.liked ? 'fill-red-500 text-red-500 animate-bounce' : ''}
                      />
                    </button>
                    <span className="text-[11px] font-black text-gray-200 tabular-nums">
                      {formatCompactCount(likeData.count)}
                    </span>
                  </div>

                  {/* Comments Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCommentReelId(reel.id);
                        setCommentsOpen(true);
                        setTimeout(() => {
                          commentInputRef.current?.focus();
                        }, 100);
                      }}
                      className="w-12 h-12 rounded-[8px] bg-zinc-900/80 hover:bg-zinc-800 text-white backdrop-blur-xl border border-white/15 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      title={isRtl ? 'التعليقات' : 'Comments'}
                    >
                      <MessageCircle size={22} />
                    </button>
                    <span className="text-[11px] font-black text-gray-200 tabular-nums">
                      {formatCompactCount(commentsCountState[reel.id] ?? (internalCommentsMap[reel.id]?.length || commentsMap[reel.id]?.length || reel.comments_count || 0))}
                    </span>
                  </div>

                  {/* Bookmark / Save Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={(e) => handleSaveClick(e, reel.id)}
                      className={`w-12 h-12 rounded-[8px] bg-zinc-900/80 hover:bg-zinc-800 text-white backdrop-blur-xl border border-white/15 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                        isSaved ? 'text-amber-400 border-amber-400/40 bg-amber-400/10' : ''
                      }`}
                      title={isSaved ? (isRtl ? 'إزالة من المحفوظات' : 'Saved') : (isRtl ? 'حفظ' : 'Save')}
                    >
                      <Bookmark size={22} className={isSaved ? 'fill-amber-400 text-amber-400' : ''} />
                    </button>
                    <span className="text-[10px] font-bold text-gray-300">
                      {isSaved ? (isRtl ? 'محفوظ' : 'Saved') : (isRtl ? 'حفظ' : 'Save')}
                    </span>
                  </div>

                  {/* Share Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={(e) => openShareSheet(e, reel)}
                      className="w-12 h-12 rounded-[8px] bg-zinc-900/80 hover:bg-zinc-800 text-white backdrop-blur-xl border border-white/15 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      title={isRtl ? 'مشاركة' : 'Share'}
                    >
                      <Share2 size={22} />
                    </button>
                    <span className="text-[11px] font-black text-gray-200 tabular-nums">
                      {formatCompactCount(sharesState[reel.id] ?? reel.shares_count ?? 0)}
                    </span>
                  </div>

                  {/* More Options Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoreMenuReel(reel);
                      }}
                      className="w-12 h-12 rounded-[8px] bg-zinc-900/80 hover:bg-zinc-800 text-white backdrop-blur-xl border border-white/15 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      title={isRtl ? 'خيارات إضافية' : 'More options'}
                    >
                      <MoreHorizontal size={22} />
                    </button>
                  </div>

                  {/* Rotating Music Disc */}
                  <div className="mt-1 relative w-10 h-10 rounded-[8px] bg-black/90 border-2 border-white/30 flex items-center justify-center p-1 shadow-2xl overflow-hidden animate-spin-slow cursor-pointer">
                    <Music size={15} className="text-purple-400" />
                  </div>
                </div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Subtle Floating Swipe Up Guidance Indicator on First Reel */}
      <AnimatePresence>
        {!hasSwiped && activeIndex === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="md:hidden absolute bottom-20 inset-x-0 z-30 flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-[8px] border border-white/20 text-white shadow-2xl"
            >
              <ChevronUp size={18} className="text-pink-400 animate-bounce" />
              <span className="text-[11px] font-extrabold tracking-wide text-gray-200">
                {isRtl ? 'اسحب للأعلى لمشاهدة المزيد' : 'Swipe up for next Reel'}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>
      {/* MOBILE ONLY: Bottom Sheet Comments Drawer */}
      <AnimatePresence>
        {commentsOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="md:hidden absolute inset-x-0 bottom-0 z-50 h-[65%] bg-[var(--surface-card)] backdrop-blur-xl rounded-t-3xl border-t border-[var(--border-main)] flex flex-col shadow-2xl text-[var(--text-primary)]"
          >
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)] shrink-0">
              <h3 className="font-extrabold text-[var(--text-primary)] text-sm flex items-center gap-2">
                <span>{isRtl ? 'التعليقات' : 'Comments'}</span>
                <span className="text-[var(--text-muted)] font-medium text-xs font-mono">
                  ({commentsCountState[reelsList[activeIndex]?.id] ?? (internalCommentsMap[reelsList[activeIndex]?.id] || commentsMap[reelsList[activeIndex]?.id] || []).length ?? reelsList[activeIndex]?.comments_count ?? 0})
                </span>
              </h3>
              <button 
                onClick={() => {
                  setCommentsOpen(false);
                  setReplyToComment(null);
                }}
                className="p-1.5 bg-[var(--surface-subtle)] rounded-[8px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Mobile Comments List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
              {isLoadingComments ? (
                <div className="py-2">
                  <SkeletonLoader type="reel-comments" count={3} isRtl={isRtl} />
                </div>
              ) : (() => {
                const activeReel = reelsList[activeIndex];
                const list = (activeReel ? (internalCommentsMap[activeReel.id] || commentsMap[activeReel.id]) : []) || [];
                if (list.length === 0) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-3">
                      <div className="w-12 h-12 rounded-[4px] border-2 border-dashed border-gray-700 flex items-center justify-center">
                        <MessageSquare size={20} className="opacity-50" />
                      </div>
                      <p className="text-xs font-bold">{isRtl ? 'لا توجد تعليقات حتى الآن.' : 'No comments yet.'}</p>
                    </div>
                  );
                }
                return list.map((comment, cIdx) => (
                  <div key={`mob-comment-${comment.id || cIdx}`} className="flex gap-2.5 items-start text-[13px] group">
                    <div className="shrink-0 pt-1">
                      <BulletinAvatar src={comment.author_avatar} alt={comment.author_name} size="sm" fallbackText={comment.author_name} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-zinc-800/90 rounded-2xl p-3 border border-zinc-700/50">
                        <span className="font-extrabold text-[13px] text-white block truncate">{comment.author_name}</span>
                        <p className="text-[13px] leading-relaxed break-words text-gray-200 mt-0.5">{comment.content || (comment as any).comment_text || ''}</p>
                      </div>
                      <div className="flex items-center gap-3.5 mt-1.5 px-2 text-[11px] text-gray-400 font-bold">
                        <span>{formatRelativeTime(comment.created_at, isRtl)}</span>
                        <button
                          type="button"
                          onClick={() => activeReel && handleCommentLikeToggle(activeReel.id, comment.id, 'like')}
                          className={`hover:underline cursor-pointer transition-colors ${comment.user_reaction ? 'text-accent font-extrabold' : 'hover:text-white'}`}
                        >
                          {comment.user_reaction ? (isRtl ? 'أعجبني' : 'Liked') : (isRtl ? 'إعجاب' : 'Like')}
                          {comment.like_count ? ` (${comment.like_count})` : ''}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeReel) {
                              setActiveCommentReelId(activeReel.id);
                              setReplyToComment({ id: comment.id, author_name: comment.author_name });
                              setCommentInput(`@${comment.author_name} `);
                            }
                          }}
                          className="hover:underline hover:text-white cursor-pointer"
                        >
                          {isRtl ? 'رد' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Mobile Comment Input */}
            <div className="bg-zinc-950 border-t border-gray-800 pt-2 pb-3 px-3 shrink-0">
              {/* Active Reply Banner */}
              {replyToComment && (
                <div className="flex items-center justify-between bg-zinc-800/90 px-3 py-1.5 rounded-lg mb-2 text-xs text-gray-300 border border-zinc-700">
                  <span className="truncate">
                    {isRtl ? `الرد على @${replyToComment.author_name}` : `Replying to @${replyToComment.author_name}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyToComment(null);
                      setCommentInput(prev => prev.replace(`@${replyToComment.author_name} `, ''));
                    }}
                    className="p-1 hover:text-white text-gray-400 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Quick Emojis Bar */}
              <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 scrollbar-none fade-edges">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={`mob-emoji-${emoji}`}
                    type="button"
                    onClick={() => setCommentInput(prev => prev + emoji)}
                    className="shrink-0 text-lg hover:scale-110 transition-transform active:scale-95 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const activeReel = reelsList[activeIndex];
                  if (!commentInput.trim() || !activeReel) return;
                  if (!token) {
                    toast.error(isRtl ? 'يرجى تسجيل الدخول للتعليق' : 'Please log in to comment');
                    return;
                  }
                  setIsSubmittingComment(true);
                  try {
                    if (onAddComment) {
                      await onAddComment(activeReel.id, commentInput.trim(), replyToComment?.id);
                    }
                    setCommentInput('');
                    setReplyToComment(null);
                  } catch (err) {
                    toast.error(isRtl ? 'تعذر الإرسال' : 'Failed to send');
                  } finally {
                    setIsSubmittingComment(false);
                  }
                }}
                className="flex items-center gap-2"
              >
                <BulletinAvatar
                  src={user?.avatar}
                  alt={user?.name || 'User'}
                  size="sm"
                  fallbackText={user?.name || user?.email}
                />
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => {
                     if (activeCommentReelId !== reelsList[activeIndex]?.id) setActiveCommentReelId(reelsList[activeIndex]?.id);
                     setCommentInput(e.target.value);
                  }}
                  placeholder={isRtl ? 'تعليق باسم ' + (user?.name || 'مستخدم') + '...' : 'Comment as ' + (user?.name || 'user') + '...'}
                  className="flex-1 bg-zinc-800 text-xs text-white placeholder-gray-400 rounded-[8px] px-4 py-2 focus:outline-none focus:ring-1 focus:ring-accent border border-gray-700"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim() || isSubmittingComment}
                  className="p-2 rounded-[8px] bg-accent hover:opacity-90 text-white disabled:opacity-40 transition-theme shrink-0 cursor-pointer"
                >
                  {isSubmittingComment ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} className={isRtl ? 'rotate-180 -ms-0.5' : 'ms-0.5'} />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DESKTOP ONLY: Static Interactive Sidebar (Left in RTL, Right in LTR) */}
      <div className="hidden md:flex flex-col w-[360px] xl:w-[400px] h-full bg-white dark:bg-[#18191a] border-s border-gray-200 dark:border-zinc-800 z-50 shrink-0 shadow-2xl overflow-hidden">
        {reelsList[activeIndex] && (() => {
          const activeReel = reelsList[activeIndex];
          const activeAd = ads.find((a) => a.id === activeReel.id) || ({ ...activeReel, id: activeReel.id } as any as BulletinAd);
          const likeData = likesState[activeReel.id] || { count: activeReel.likes_count, liked: !!activeReel.user_has_liked };
          const userReaction = userReactions[activeReel.id];
          const activeReactionObj = FB_REACTIONS.find((r) => r.id === userReaction);
          const currentComments = internalCommentsMap[activeReel.id] || commentsMap[activeReel.id] || [];
          const isOwnerOrAdmin = user?.role === 'admin' || (user && activeAd && (user.id === (activeAd as any).author_id || user.id === activeAd.user_id));
          const commentsCount = formatCompactCount(commentsCountState[activeReel.id] ?? currentComments.length ?? activeReel.comments_count ?? 0);
          const sharesCount = formatCompactCount(sharesState[activeReel.id] ?? activeReel.shares_count ?? 0);
          const likesCount = formatCompactCount(likeData.count);

          const handleSendDesktopComment = async (reelId: number) => {
            if (!commentInput.trim() || !reelId) return;
            if (!token) {
              toast.error(isRtl ? 'يرجى تسجيل الدخول لإضافة تعليق' : 'Please log in to comment');
              return;
            }
            const textToSend = commentInput.trim();
            const parentIdToSend = replyToComment?.id;
            setCommentInput('');
            setReplyToComment(null);
            setShowEmojiPicker(false);
            setIsSubmittingComment(true);

            // Optimistic comment insert
            const tempComment: BulletinAdComment = {
              id: Date.now(),
              ad_id: reelId,
              user_id: user?.id || 0,
              author_name: user?.name || (isRtl ? 'أنا' : 'Me'),
              author_avatar: user?.avatar || null,
              content: textToSend,
              parent_id: parentIdToSend || null,
              created_at: new Date().toISOString(),
              like_count: 0
            };

            setInternalCommentsMap((prev) => ({
              ...prev,
              [reelId]: [...(prev[reelId] || commentsMapRef.current[reelId] || []), tempComment]
            }));
            setCommentsCountState((prev) => ({
              ...prev,
              [reelId]: (prev[reelId] || 0) + 1
            }));

            try {
              if (onAddComment) {
                await onAddComment(reelId, textToSend, parentIdToSend);
              }
            } catch (err) {
              toast.error(isRtl ? 'تعذر الإرسال' : 'Failed to send');
            } finally {
              setIsSubmittingComment(false);
            }
          };

          return (
            <>
              {/* 1. Top Bar: View Post & More Menu */}
              <div className="p-3.5 sm:p-4 flex items-center justify-between shrink-0 bg-gray-50/80 dark:bg-zinc-900/80 border-b border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    const targetId = activeReel?.id || activeAd?.id;
                    if (targetId) {
                      if (onViewPost) {
                        onViewPost(targetId);
                      } else {
                        onClose?.();
                        const el = document.getElementById(`bulletin-ad-${targetId}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-accent text-white hover:bg-accent/90 font-bold text-xs shadow-sm transition-all cursor-pointer"
                  title={isRtl ? 'عرض المنشور الأصلي في لوحة الإعلانات' : 'View original post in feed'}
                >
                  <ExternalLink size={14} />
                  <span>{isRtl ? 'عرض المنشور' : 'View Post'}</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOptionsMenu((prev) => !prev);
                    }}
                    className="w-8 h-8 rounded-[8px] hover:bg-gray-200 dark:hover:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                    title={isRtl ? 'المزيد من الخيارات' : 'More options'}
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {activeAd && (
                    <PostOptionsMenu
                      ad={activeAd}
                      user={user}
                      token={token}
                      isRtl={isRtl}
                      isOpen={showOptionsMenu}
                      onClose={() => setShowOptionsMenu(false)}
                      onSaveAd={onToggleSave ? () => onToggleSave(activeAd) : undefined}
                      onEditAd={onEditReel ? () => {
                        onEditReel(activeAd);
                      } : undefined}
                      onBoostAd={onBoostAd ? () => {
                        onBoostAd(activeAd);
                      } : undefined}
                      onArchiveAd={onArchiveAd ? () => {
                        onArchiveAd(activeAd);
                      } : undefined}
                      onTrashAd={onTrashAd ? () => {
                        onTrashAd(activeAd);
                      } : undefined}
                      onUpdateAd={onUpdateAd}
                      onHideAd={() => {
                        setHiddenReelIds((prev) => ({ ...prev, [activeReel.id]: true }));
                        toast.info(isRtl ? 'تم إخفاء هذا المنشور' : 'Post hidden');
                      }}
                      dropdownAlign={isRtl ? 'left' : 'right'}
                    />
                  )}
                </div>
              </div>

              {/* 2. Paid Partnership Banner */}
              {activeAd && (activeAd.partnership_label_enabled || activeAd.is_partnership) && (
                <div className="px-3.5 sm:px-4 py-2 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
                  <Handshake size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    {isRtl ? 'شراكة مدفوعة' : 'Paid Partnership'}
                    {(activeAd.partnership_sponsor_name || activeAd.partnership_brand) && (
                      <span className="font-extrabold mx-1 text-gray-900 dark:text-gray-100">
                        • {activeAd.partnership_sponsor_name || activeAd.partnership_brand}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* 3. Author Profile Row */}
              <div className="p-3.5 sm:p-4 flex items-center gap-3 shrink-0">
                <div
                  className={activeReel.page_id ? 'cursor-pointer group' : ''}
                  onClick={() => activeReel.page_id && onOpenPageDetail && onOpenPageDetail(activeReel.page_id)}
                >
                  <BulletinAvatar
                    src={activeReel.author_avatar}
                    alt={activeReel.author_name}
                    size="md"
                    isPage={Boolean(activeReel.page_id)}
                    verified={Boolean(activeReel.page_is_verified)}
                    fallbackText={activeReel.author_name}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3
                      className={`font-extrabold text-sm truncate text-gray-900 dark:text-white ${activeReel.page_id ? 'cursor-pointer hover:underline hover:text-accent transition-colors' : ''}`}
                      onClick={() => activeReel.page_id && onOpenPageDetail && onOpenPageDetail(activeReel.page_id)}
                    >
                      {activeReel.author_name || (isRtl ? 'مستخدم المنصة' : 'Platform User')}
                    </h3>
                    {activeReel.page_id && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold shrink-0 border border-blue-200/50 dark:border-blue-800/40">
                        {isRtl ? 'صفحة' : 'Page'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    <span>{formatRelativeTime(activeReel.created_at, isRtl)}</span>
                    <span>•</span>
                    <span
                      className="flex items-center gap-1 cursor-help"
                      title={
                        activeAd?.audience === 'friends'
                          ? isRtl ? 'الجمهور: الأصدقاء' : 'Audience: Friends'
                          : activeAd?.audience === 'only_me'
                          ? isRtl ? 'الجمهور: أنا فقط' : 'Audience: Only me'
                          : isRtl ? 'الجمهور: عام' : 'Audience: Public'
                      }
                    >
                      {activeAd?.audience === 'friends' ? (
                        <Users size={11} className="text-blue-500" />
                      ) : activeAd?.audience === 'only_me' ? (
                        <Lock size={11} className="text-amber-500" />
                      ) : (
                        <Globe size={11} />
                      )}
                      <span>
                        {activeAd?.audience === 'friends'
                          ? isRtl ? 'الأصدقاء' : 'Friends'
                          : activeAd?.audience === 'only_me'
                          ? isRtl ? 'أنا فقط' : 'Only me'
                          : isRtl ? 'عام' : 'Public'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. AI Generated Label */}
              {activeAd?.is_ai_generated && (
                <div className="mx-3.5 sm:mx-4 mb-2 px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold flex items-center gap-1.5 shrink-0">
                  <Sparkles size={13} className="text-indigo-500 shrink-0" />
                  <span>{isRtl ? 'مُنشأ بمساعدة الذكاء الاصطناعي' : 'Created with AI assistance'}</span>
                </div>
              )}

              {/* 5. Fixed Pinned Description (Concise with Details Toggle) & Pinned Action Buttons */}
              <div className="px-3.5 sm:px-4 py-3 space-y-2 shrink-0 border-b border-gray-100 dark:border-zinc-800 text-xs leading-relaxed bg-gray-50/40 dark:bg-zinc-900/30">
                {activeReel.title && (
                  <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {activeReel.title}
                  </h4>
                )}
                {activeReel.description && (
                  <div>
                    <p className={`text-gray-700 dark:text-gray-300 whitespace-pre-line break-words ${isDescriptionExpanded ? '' : 'line-clamp-2'}`}>
                      {activeReel.description}
                    </p>
                    {activeReel.description.length > 70 && (
                      <button
                        type="button"
                        onClick={() => setIsDescriptionExpanded(prev => !prev)}
                        className="text-[11px] font-bold text-accent hover:underline mt-1 cursor-pointer"
                      >
                        {isDescriptionExpanded ? (isRtl ? 'عرض أقل' : 'Show less') : (isRtl ? 'عرض التفاصيل / المزيد...' : 'View details / more...')}
                      </button>
                    )}
                  </div>
                )}
                {Array.isArray(activeReel.hashtags) && activeReel.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {activeReel.hashtags.map((tag, i) => (
                      <span key={`side-tag-${i}`} className="text-xs font-bold text-blue-500 cursor-pointer hover:underline">
                        #{String(tag).replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons: Pinned Edit (owner/admin) & Boost Post */}
                <div className="flex items-center gap-2 pt-1.5">
                  {isOwnerOrAdmin && onEditReel && activeAd && (
                    <button
                      type="button"
                      onClick={() => {
                        onEditReel(activeAd);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-gray-200 dark:border-zinc-700"
                    >
                      <Edit3 size={13} />
                      <span>{isRtl ? 'تعديل' : 'Edit'}</span>
                    </button>
                  )}

                  {onBoostAd && activeAd && (
                    <button
                      type="button"
                      onClick={() => {
                        onBoostAd(activeAd);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Rocket size={13} />
                      <span>{isRtl ? 'ترويج المنشور' : 'Boost Post'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 6. Counters Row */}
              <div className="px-4 py-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 shrink-0 bg-white dark:bg-[#18191a]">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1 rtl:space-x-reverse items-center">
                    <span className="w-4 h-4 rounded-[4px] bg-blue-500 text-white text-[9px] flex items-center justify-center">👍</span>
                    <span className="w-4 h-4 rounded-[4px] bg-red-500 text-white text-[9px] flex items-center justify-center">❤️</span>
                    <span className="w-4 h-4 rounded-[4px] bg-amber-500 text-white text-[9px] flex items-center justify-center">🥰</span>
                  </div>
                  <span className="font-bold text-gray-700 dark:text-gray-300 font-mono">{likesCount}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span>
                    <strong className="font-bold text-gray-700 dark:text-gray-300 font-mono">{commentsCount}</strong>{' '}
                    {isRtl ? 'تعليق' : 'comments'}
                  </span>
                  <span>
                    <strong className="font-bold text-gray-700 dark:text-gray-300 font-mono">{sharesCount}</strong>{' '}
                    {isRtl ? 'مشاركة' : 'shares'}
                  </span>
                </div>
              </div>

              {/* 7. Action Bar (Like with FB Reactions / Comment / Share) */}
              <div className="px-2 py-1.5 flex items-center justify-between border-y border-gray-100 dark:border-zinc-800 shrink-0 relative bg-white dark:bg-[#18191a]">
                {/* Like Button with Hover Reaction Bar */}
                <div
                  className="relative flex-1"
                  onMouseEnter={handleLikeMouseEnter}
                  onMouseLeave={handleLikeMouseLeave}
                >
                  <AnimatePresence>
                    {isHoveringReactions && (
                      <div
                        className={`absolute ${isRtl ? 'right-0' : 'left-0'} bottom-full pb-2.5 z-50 pointer-events-auto`}
                        onMouseEnter={handleLikeMouseEnter}
                        onMouseLeave={handleLikeMouseLeave}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.88 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.88 }}
                          transition={{ duration: 0.16, ease: 'easeOut' }}
                          className="flex items-center gap-1 sm:gap-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-2 sm:px-2.5 py-1.5 rounded-[12px] border border-gray-200/90 dark:border-zinc-700/90 shadow-2xl ring-1 ring-black/5 select-none"
                        >
                          {FB_REACTIONS.map((reac) => (
                            <button
                              key={reac.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleSelectReaction(activeReel.id, reac.id);
                              }}
                              onMouseEnter={() => {
                                handleLikeMouseEnter();
                                setHoveredReactionId(reac.id);
                              }}
                              onMouseLeave={() => setHoveredReactionId(null)}
                              className="relative group/reac text-xl sm:text-2xl hover:scale-130 active:scale-95 transition-transform duration-150 p-1 sm:p-1.5 cursor-pointer focus:outline-none select-none rounded-[8px] hover:bg-gray-100 dark:hover:bg-zinc-800"
                              title={isRtl ? reac.labelAr : reac.labelEn}
                            >
                              <span className="block transform-gpu">{reac.emoji}</span>
                              {hoveredReactionId === reac.id && (
                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900/95 dark:bg-black/95 text-white text-[10px] font-bold py-0.5 px-2 rounded-[6px] whitespace-nowrap pointer-events-none shadow-md z-50">
                                  {isRtl ? reac.labelAr : reac.labelEn}
                                </span>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={(e) => handleLikeClick(e, activeReel.id)}
                    className={`w-full py-2 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-colors cursor-pointer select-none ${
                      userReaction
                        ? activeReactionObj?.color || 'text-blue-500'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {activeReactionObj ? (
                      <span className="text-sm">{activeReactionObj.emoji}</span>
                    ) : (
                      <ThumbsUp size={15} />
                    )}
                    <span>
                      {activeReactionObj
                        ? isRtl ? activeReactionObj.labelAr : activeReactionObj.labelEn
                        : isRtl ? 'أعجبني' : 'Like'}
                    </span>
                  </button>
                </div>

                {/* Comment Button */}
                <button
                  type="button"
                  onClick={() => commentInputRef.current?.focus()}
                  className="flex-1 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-1.5 font-bold text-xs transition-colors cursor-pointer"
                >
                  <MessageSquare size={15} />
                  <span>{isRtl ? 'تعليق' : 'Comment'}</span>
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={(e) => openShareSheet(e, activeReel)}
                  className="flex-1 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-1.5 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Share2 size={15} />
                  <span>{isRtl ? 'مشاركة' : 'Share'}</span>
                </button>
              </div>

              {/* 8. Comments List Area */}
              <div
                ref={commentsScrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px] scrollbar-thin"
              >
                {isLoadingComments ? (
                  <div className="py-2">
                    <SkeletonLoader type="reel-comments" count={4} isRtl={isRtl} />
                  </div>
                ) : currentComments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center select-none">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 flex items-center justify-center mb-3 shadow-inner">
                      <FileText size={28} className="stroke-[1.5]" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {isRtl ? 'لا توجد تعليقات حتى الآن' : 'No comments yet'}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {isRtl ? 'كن أول من يعلق.' : 'Be the first to comment.'}
                    </p>
                  </div>
                ) : (
                  currentComments.map((comm) => (
                    <div key={comm.id} className="flex gap-2 items-start text-[11px] group">
                      <div className="shrink-0 pt-0.5">
                        <BulletinAvatar
                          src={comm.author_avatar}
                          alt={comm.author_name}
                          size="sm"
                          fallbackText={comm.author_name}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-100 dark:bg-zinc-800/80 p-2.5 rounded-2xl text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-zinc-800 shadow-2xs">
                          <span className="font-extrabold text-xs block truncate text-gray-900 dark:text-white">
                            {comm.author_name}
                          </span>
                          <p className="mt-0.5 whitespace-pre-wrap break-words leading-relaxed text-gray-700 dark:text-gray-200">
                            {comm.content || (comm as any).comment_text || ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 px-2 mt-1 text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                          <span className="font-medium text-gray-400">{formatRelativeTime(comm.created_at, isRtl)}</span>
                          <button
                            type="button"
                            onClick={() => activeReel && handleCommentLikeToggle(activeReel.id, comm.id, 'like')}
                            className={`hover:underline cursor-pointer ${comm.user_reaction ? 'text-accent font-bold' : 'hover:text-gray-700 dark:hover:text-gray-200'}`}
                          >
                            {comm.user_reaction ? (isRtl ? 'أعجبني' : 'Liked') : (isRtl ? 'إعجاب' : 'Like')}
                            {comm.like_count ? ` (${comm.like_count})` : ''}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyToComment({ id: comm.id, author_name: comm.author_name });
                              setCommentInput(`@${comm.author_name} `);
                              commentInputRef.current?.focus();
                            }}
                            className="hover:underline hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                          >
                            {isRtl ? 'رد' : 'Reply'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 9. Sticky Bottom Composer */}
              <div className="p-3 shrink-0 bg-white dark:bg-[#18191a] border-t border-gray-200 dark:border-zinc-800 relative">
                {/* Active Reply Banner */}
                {replyToComment && (
                  <div className="flex items-center justify-between bg-gray-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg mb-2 text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700">
                    <span className="truncate">
                      {isRtl ? `الرد على @${replyToComment.author_name}` : `Replying to @${replyToComment.author_name}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyToComment(null);
                        setCommentInput(prev => prev.replace(`@${replyToComment.author_name} `, ''));
                      }}
                      className="p-1 hover:text-gray-900 dark:hover:text-white text-gray-400 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {showEmojiPicker && (
                  <div
                    className={`absolute bottom-full mb-2 ${isRtl ? 'left-3' : 'right-3'} p-2 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-2xl grid grid-cols-6 gap-1 z-50`}
                  >
                    {QUICK_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          setCommentInput((prev) => prev + em);
                          setShowEmojiPicker(false);
                          commentInputRef.current?.focus();
                        }}
                        className="w-8 h-8 rounded-[8px] hover:bg-gray-100 dark:hover:bg-zinc-800 text-lg flex items-center justify-center transition-colors cursor-pointer"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <BulletinAvatar
                    src={user?.avatar}
                    alt={user?.name || ''}
                    size="sm"
                    fallbackText={user?.name || user?.email}
                  />

                  <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-gray-100 dark:bg-zinc-800 focus-within:ring-2 focus-within:ring-accent border border-transparent dark:border-zinc-700 transition-all">
                    <input
                      ref={commentInputRef}
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendDesktopComment(activeReel.id);
                        }
                      }}
                      placeholder={
                        isRtl
                          ? `تعليق باسم ${user?.name || 'المستخدم'}...`
                          : `Comment as ${user?.name || 'User'}...`
                      }
                      className="flex-1 bg-transparent text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none py-1"
                    />

                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      className="text-gray-400 hover:text-amber-500 p-1 transition-colors cursor-pointer"
                      title={isRtl ? 'إدراج رمز تعبيري' : 'Insert emoji'}
                    >
                      <Smile size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendDesktopComment(activeReel.id)}
                      disabled={!commentInput.trim() || isSubmittingComment}
                      className="w-7 h-7 rounded-[8px] bg-accent hover:bg-accent/90 disabled:opacity-30 text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
                      title={isRtl ? 'إرسال (Enter)' : 'Send (Enter)'}
                    >
                      {isSubmittingComment ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Send size={12} className={isRtl ? 'rotate-180' : ''} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Overflow '...' Options Menu Modal */}
      <AnimatePresence>
        {moreMenuReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setMoreMenuReel(null)}
          >
            <motion.div
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[var(--surface-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border-main)] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--surface-page)]">
                <h3 className="font-extrabold text-[var(--text-primary)]">{isRtl ? 'خيارات المنشور' : 'Post Options'}</h3>
                <button 
                  onClick={() => setMoreMenuReel(null)}
                  className="p-1.5 rounded-[8px] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col py-2">
                <button 
                  onClick={() => {
                    const targetReel = moreMenuReel;
                    setMoreMenuReel(null);
                    if (targetReel) {
                      if (onViewPost) {
                        onViewPost(targetReel.id);
                      } else {
                        onClose?.();
                        const el = document.getElementById(`bulletin-ad-${targetReel.id}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }
                  }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-subtle)] transition-colors text-accent font-bold cursor-pointer border-b border-[var(--border-main)]/60"
                >
                  <ExternalLink size={20} />
                  <span className="text-sm">{isRtl ? 'عرض المنشور في لوحة الإعلانات' : 'View Post in Bulletin Feed'}</span>
                </button>
                <button 
                  onClick={() => {
                    handleSaveClick({ stopPropagation: () => {} } as any, moreMenuReel.id);
                    setMoreMenuReel(null);
                  }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-subtle)] transition-colors text-[var(--text-primary)] cursor-pointer"
                >
                  <Bookmark size={20} className={savesState[moreMenuReel.id] ?? moreMenuReel.user_has_saved ? 'fill-amber-400 text-amber-400' : ''} />
                  <span className="font-semibold text-sm">
                    {savesState[moreMenuReel.id] ?? moreMenuReel.user_has_saved 
                      ? (isRtl ? 'إزالة من المحفوظات' : 'Remove from Saved')
                      : (isRtl ? 'حفظ المنشور' : 'Save Post')}
                  </span>
                </button>
                <button 
                  onClick={() => {
                    handleFollowToggle({ stopPropagation: () => {} } as any, moreMenuReel.id, moreMenuReel.author_name);
                    setMoreMenuReel(null);
                  }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-subtle)] transition-colors text-[var(--text-primary)] cursor-pointer"
                >
                  <Users size={20} />
                  <span className="font-semibold text-sm">
                    {followingState[moreMenuReel.id] ?? moreMenuReel.user_has_followed 
                      ? (isRtl ? `إلغاء متابعة ${moreMenuReel.author_name}` : `Unfollow ${moreMenuReel.author_name}`)
                      : (isRtl ? `متابعة ${moreMenuReel.author_name}` : `Follow ${moreMenuReel.author_name}`)}
                  </span>
                </button>
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}/bulletin?tab=reels&reel=${moreMenuReel.id}`;
                    navigator.clipboard.writeText(url);
                    toast.success(isRtl ? 'تم نسخ رابط المقطع' : 'Link copied to clipboard');
                    setMoreMenuReel(null);
                  }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-subtle)] transition-colors text-[var(--text-primary)] cursor-pointer"
                >
                  <Share2 size={20} />
                  <span className="font-semibold text-sm">{isRtl ? 'نسخ رابط الريلز' : 'Copy Reel Link'}</span>
                </button>
                <button 
                  onClick={() => {
                    setInsightsReel(moreMenuReel);
                    setMoreMenuReel(null);
                  }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-subtle)] transition-colors text-[var(--text-primary)] cursor-pointer"
                >
                  <BarChart2 size={20} />
                  <span className="font-semibold text-sm">{isRtl ? 'عرض الإحصاءات والأداء' : 'View Insights & Analytics'}</span>
                </button>
                {(user?.role === 'admin' || user?.id === moreMenuReel.author_id) && (
                  <button 
                    onClick={() => {
                      if (onBoostAd) onBoostAd(moreMenuReel as any);
                      setMoreMenuReel(null);
                    }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-subtle)] transition-colors text-blue-500 cursor-pointer"
                  >
                    <Megaphone size={20} />
                    <span className="font-semibold text-sm">{isRtl ? 'ترويج المقطع كإعلان' : 'Boost as Sponsored Reel'}</span>
                  </button>
                )}
                <div className="h-px bg-[var(--border-main)] my-1 w-full" />
                <button 
                  onClick={() => {
                    setHiddenReelIds(prev => ({ ...prev, [moreMenuReel.id]: true }));
                    toast.success(isRtl ? 'تم إخفاء هذا المقطع من خلاصتك' : 'Reel hidden from your feed');
                    setMoreMenuReel(null);
                  }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-subtle)] transition-colors text-[var(--text-secondary)] cursor-pointer"
                >
                  <EyeOff size={20} />
                  <span className="font-semibold text-sm">{isRtl ? 'إخفاء هذا المقطع' : 'Hide this reel'}</span>
                </button>
                <button 
                  onClick={() => {
                    handleReportReel(moreMenuReel);
                    setMoreMenuReel(null);
                  }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-red-500/10 transition-colors text-red-500 cursor-pointer"
                >
                  <Flag size={20} />
                  <span className="font-semibold text-sm">{isRtl ? 'الإبلاغ عن المنشور' : 'Report Post'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reel Insights & Analytics Modal */}
      <AnimatePresence>
        {insightsReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setInsightsReel(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[var(--surface-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--surface-page)]">
                <div className="flex items-center gap-2">
                  <BarChart2 className="text-purple-500" size={20} />
                  <h3 className="font-extrabold text-base text-[var(--text-primary)]">
                    {isRtl ? 'إحصاءات وأداء المقطع' : 'Reel Insights & Performance'}
                  </h3>
                </div>
                <button
                  onClick={() => setInsightsReel(null)}
                  className="p-1.5 rounded-[8px] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Insights Body Grid */}
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)]">
                  <img
                    src={insightsReel.image_url || insightsReel.author_avatar || ''}
                    alt={insightsReel.author_name}
                    className="w-14 h-14 object-cover rounded-[8px] shrink-0 border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">
                      {insightsReel.description || (isRtl ? 'مقطع ريلز بدون وصف' : 'Reel without caption')}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {insightsReel.author_name} • {new Date(insightsReel.created_at || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Core Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] flex flex-col items-center text-center">
                    <Eye size={18} className="text-blue-500 mb-1" />
                    <span className="text-lg font-black text-[var(--text-primary)] tabular-nums">
                      {formatCompactCount(impressionsState[insightsReel.id] ?? insightsReel.impressions_count ?? 0)}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                      {isRtl ? 'مرات المشاهدة' : 'Views / Impressions'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] flex flex-col items-center text-center">
                    <Heart size={18} className="text-red-500 mb-1" />
                    <span className="text-lg font-black text-[var(--text-primary)] tabular-nums">
                      {formatCompactCount(likesState[insightsReel.id]?.count ?? insightsReel.likes_count ?? 0)}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                      {isRtl ? 'الإعجابات' : 'Likes'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] flex flex-col items-center text-center">
                    <MessageCircle size={18} className="text-emerald-500 mb-1" />
                    <span className="text-lg font-black text-[var(--text-primary)] tabular-nums">
                      {formatCompactCount(insightsReel.comments_count || (commentsMap[insightsReel.id]?.length || 0))}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                      {isRtl ? 'التعليقات' : 'Comments'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] flex flex-col items-center text-center">
                    <Share2 size={18} className="text-purple-500 mb-1" />
                    <span className="text-lg font-black text-[var(--text-primary)] tabular-nums">
                      {formatCompactCount(sharesState[insightsReel.id] ?? insightsReel.shares_count ?? 0)}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                      {isRtl ? 'المشاركات' : 'Shares'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] flex flex-col items-center text-center">
                    <Bookmark size={18} className="text-amber-500 mb-1" />
                    <span className="text-lg font-black text-[var(--text-primary)] tabular-nums">
                      {formatCompactCount(Number((insightsReel as any).saves_count || (savesState[insightsReel.id] ? 1 : 0)))}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                      {isRtl ? 'الحفظ بالمفضلة' : 'Saves'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] flex flex-col items-center text-center">
                    <TrendingUp size={18} className="text-cyan-500 mb-1" />
                    <span className="text-lg font-black text-[var(--text-primary)] tabular-nums">
                      {(() => {
                        const totalEngage = (likesState[insightsReel.id]?.count ?? insightsReel.likes_count ?? 0) +
                          (insightsReel.comments_count || (commentsMap[insightsReel.id]?.length || 0)) +
                          (sharesState[insightsReel.id] ?? insightsReel.shares_count ?? 0);
                        const totalViews = Math.max(1, impressionsState[insightsReel.id] ?? insightsReel.impressions_count ?? 1);
                        const rate = Math.min(100, Math.max(1, Math.round((totalEngage / totalViews) * 100)));
                        return `${rate}%`;
                      })()}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                      {isRtl ? 'معدل التفاعل' : 'Engagement Rate'}
                    </span>
                  </div>
                </div>

                {/* Promotion Action */}
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => {
                      if (onBoostAd) onBoostAd(insightsReel as any);
                      setInsightsReel(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95"
                  >
                    <Megaphone size={16} />
                    {isRtl ? 'ترويج هذا المقطع وزيادة الوصول' : 'Promote Reel for Higher Reach'}
                  </button>
                  <button
                    onClick={() => setInsightsReel(null)}
                    className="px-4 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] text-[var(--text-primary)] font-bold text-xs hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
                  >
                    {isRtl ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Search Reels Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 pt-16"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-[var(--surface-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Search Header Input */}
              <div className="p-3 border-b border-[var(--border-main)] flex items-center gap-2 bg-[var(--surface-page)]">
                <Search size={18} className="text-gray-400 ms-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRtl ? 'ابحث عن ناشر، هاشتاق، وصف، أو صوت...' : 'Search creator, hashtag, caption, or sound...'}
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none py-1.5"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-[8px] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                  >
                    <X size={15} />
                  </button>
                )}
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="px-3 py-1 text-xs font-bold rounded-[8px] bg-[var(--surface-subtle)] hover:bg-[var(--border-main)] text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
              </div>

              {/* Search Results List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {(() => {
                  const filtered = reelsList.filter((r) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    const matchAuthor = r.author_name?.toLowerCase().includes(q);
                    const matchDesc = r.description?.toLowerCase().includes(q);
                    const matchMusic = r.music_title?.toLowerCase().includes(q);
                    const matchTags = Array.isArray(r.hashtags) && r.hashtags.some((t) => typeof t === 'string' && t.toLowerCase().includes(q));
                    return matchAuthor || matchDesc || matchMusic || matchTags;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-[var(--text-muted)]">
                        <Search size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-bold">{isRtl ? 'لم يتم العثور على مقاطع مطابقة' : 'No matching reels found'}</p>
                      </div>
                    );
                  }

                  return filtered.map((r) => {
                    const originalIdx = reelsList.findIndex((item) => item.id === r.id);
                    return (
                      <div
                        key={`search-result-${r.id}`}
                        onClick={() => {
                          if (originalIdx >= 0) {
                            scrollToIndex(originalIdx);
                          }
                          setIsSearchOpen(false);
                        }}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-subtle)] border border-transparent hover:border-[var(--border-main)] cursor-pointer transition-all"
                      >
                        <img
                          src={r.image_url || r.author_avatar || ''}
                          alt={r.author_name}
                          className="w-12 h-16 object-cover rounded-lg bg-black shrink-0 border border-white/10"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm text-[var(--text-primary)] truncate">
                              {r.author_name}
                            </span>
                            {r.page_is_verified && <CheckCircle2 size={12} className="text-blue-500 fill-blue-500 shrink-0" />}
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                            {r.description || (isRtl ? 'بدون وصف' : 'No caption')}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] font-medium mt-1">
                            <span className="flex items-center gap-1">
                              <Heart size={11} className="text-red-500" />
                              {formatCompactCount(r.likes_count)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle size={11} className="text-blue-500" />
                              {formatCompactCount(r.comments_count || (commentsMap[r.id]?.length || 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReelsFeed;
