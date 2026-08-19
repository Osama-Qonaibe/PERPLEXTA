import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Plus,
  Check,
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
  Eye,
  Flag,
  EyeOff,
  User,
  Copy,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { BulletinAd, BulletinAdComment } from '../../server/db/types';
import { getMediaUrl } from '../utils/mediaUtils';
import { useAppContext } from '../context/AppContext';

export interface ReelItemData {
  id: number;
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
  user_has_liked?: boolean;
  user_has_saved?: boolean;
  user_has_followed?: boolean;
  created_at?: string | Date;
  music_title?: string;
}

// Default high-definition vertical 9:16 sample reels if database feed is sparse
const DEFAULT_SAMPLE_REELS: ReelItemData[] = [
  {
    id: -101,
    author_name: 'Perplexta Media',
    author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    title: 'استعراض المنصة الذكية',
    description: 'مرحباً بكم في تجربة ريلز الجديدة على منصة Perplexta! الميزات الذكية وإبداع المحتوى بين يديك 🚀✨ #Perplexta #Reels #AI',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-running-on-the-beach-at-sunset-40008-large.mp4',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    location_city: 'القدس',
    hashtags: ['Perplexta', 'Reels', 'تكنولوجيا', 'إبداع'],
    likes_count: 1240,
    comments_count: 89,
    shares_count: 310,
    user_has_liked: false,
    user_has_saved: false,
    user_has_followed: false,
    created_at: new Date().toISOString(),
    music_title: 'الصوت الأصلي - Perplexta Official Sound'
  },
  {
    id: -102,
    author_name: 'عالم التكنولوجيا والإبداع',
    author_avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    title: 'مستقبل الذكاء الاصطناعي',
    description: 'شاهد كيف نغير مفاهيم التحليل المالي والتقني في الشرق الأوسط! 🔥💡 #ذكاء_اصطناعي #تكنولوجيا #ريلز',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-leaves-in-a-sunny-day-11756-large.mp4',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    location_city: 'دبي',
    hashtags: ['ذكاء_اصطناعي', 'تطوير', 'رياديات'],
    likes_count: 3410,
    comments_count: 245,
    shares_count: 890,
    user_has_liked: true,
    user_has_saved: true,
    user_has_followed: true,
    created_at: new Date().toISOString(),
    music_title: 'النغمة المميزة - Tech Vibe Chill'
  },
  {
    id: -103,
    author_name: 'استوديو التصميم',
    author_avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    title: 'إلهام وتصميم مدروس',
    description: 'التصميم ليس مجرد شكل، بل تجربة مستخدم فريدة وسريعة الاستجابة 🎨📐 #Design #UIUX #ModernWeb',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-with-a-green-screen-41528-large.mp4',
    image_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
    location_city: 'عمان',
    hashtags: ['تصميم', 'واجهات', 'إلهام'],
    likes_count: 892,
    comments_count: 42,
    shares_count: 115,
    user_has_liked: false,
    user_has_saved: false,
    user_has_followed: false,
    created_at: new Date().toISOString(),
    music_title: 'صوت هادئ - Ambient Chillout 2026'
  }
];

export interface ReelsFeedProps {
  ads?: BulletinAd[];
  isRtl?: boolean;
  token?: string | null;
  user?: any;
  onToggleLike?: (adId: number) => void;
  onToggleSave?: (adId: number) => void;
  onAddComment?: (adId: number, text: string) => Promise<void>;
  commentsMap?: Record<number, BulletinAdComment[]>;
  onClose?: () => void;
  onOpenUploadReels?: () => void;
  onUploadReelClick?: () => void;
  onOpenPageDetail?: (pageId: number) => void;
  onMessageAdvertiser?: (ad: BulletinAd) => void;
  onShare?: (ad: BulletinAd) => void;
  initialReelId?: number;
  initialAdId?: number;
}

export const ReelsFeed: React.FC<ReelsFeedProps> = ({
  ads = [],
  isRtl = true,
  token,
  user,
  onToggleLike,
  onToggleSave,
  onAddComment,
  commentsMap = {},
  onClose,
  onOpenUploadReels,
  onUploadReelClick,
  onOpenPageDetail,
  onMessageAdvertiser,
  onShare,
  initialReelId,
  initialAdId
}) => {
  const { socket } = useAppContext();
  const startId = initialAdId || initialReelId;
  // Combine custom uploaded reels from `ads` with fallback sample reels
  const reelsList: ReelItemData[] = React.useMemo(() => {
    const extractedFromAds: ReelItemData[] = ads
      .filter((ad) => ad.video_url || ad.ad_format === 'reel')
      .map((ad) => ({
        id: ad.id,
        author_name: ad.author_name || ad.page_name || (isRtl ? 'مستخدم' : 'User'),
        author_avatar: ad.author_avatar || ad.page_avatar,
        page_id: ad.page_id,
        page_name: ad.page_name,
        page_avatar: ad.page_avatar,
        page_is_verified: ad.page_is_verified,
        title: ad.title || '',
        description: ad.description || '',
        video_url: getMediaUrl(ad.video_url || ad.image_url),
        image_url: getMediaUrl(ad.image_url),
        location_city: ad.location_city,
        hashtags: ad.hashtags || [],
        likes_count: ad.likes_count || 0,
        comments_count: ad.comments_count || 0,
        shares_count: ad.shares_count || 0,
        user_has_liked: ad.user_has_liked || false,
        user_has_saved: ad.user_has_saved || false,
        created_at: ad.created_at,
        music_title: isRtl ? 'الصوت الأصلي - Perplexta Sound' : 'Original Audio - Perplexta'
      }));

    if (extractedFromAds.length === 0) {
      return DEFAULT_SAMPLE_REELS;
    }
    // Prepend default samples if list is short so scrolling is full
    return [...extractedFromAds, ...DEFAULT_SAMPLE_REELS.filter(s => !extractedFromAds.some(a => a.id === s.id))];
  }, [ads, isRtl]);

  const [activeIndex, setActiveIndex] = useState<number>(() => {
    if (startId) {
      const idx = reelsList.findIndex((r) => r.id === startId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const [activeTab, setActiveTab] = useState<'for_you' | 'following'>('for_you');
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reels_muted');
      return saved === 'true';
    }
    return false;
  });
  const [playingState, setPlayingState] = useState<Record<number, boolean>>({});
  const [likesState, setLikesState] = useState<Record<number, { count: number; liked: boolean }>>({});
  const [savesState, setSavesState] = useState<Record<number, boolean>>({});
  const [sharesState, setSharesState] = useState<Record<number, number>>({});
  const [followingState, setFollowingState] = useState<Record<number, boolean>>({});
  
  // Real-time video playback progress state
  const [videoProgress, setVideoProgress] = useState<Record<number, number>>({});
  const [hasSwiped, setHasSwiped] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  // Interactive comments drawer
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeCommentReelId, setActiveCommentReelId] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Overflow '...' menu & Native Share sheet states
  const [moreMenuReel, setMoreMenuReel] = useState<ReelItemData | null>(null);
  const [shareSheetReel, setShareSheetReel] = useState<ReelItemData | null>(null);
  const [hiddenReelIds, setHiddenReelIds] = useState<Record<number, boolean>>({});

  // Expanded caption view
  const [expandedCaptions, setExpandedCaptions] = useState<Record<number, boolean>>({});

  // Heart animation trigger on double tap
  const [heartAnim, setHeartAnim] = useState<{ id: number; x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const prevActiveIndexRef = useRef<number>(activeIndex);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaCacheRef = useRef<Set<string>>(new Set());

  // Sync with initial data from reelsList
  useEffect(() => {
    const initialLikes: Record<number, { count: number; liked: boolean }> = {};
    const initialSaves: Record<number, boolean> = {};
    const initialShares: Record<number, number> = {};
    const initialFollowing: Record<number, boolean> = {};

    reelsList.forEach((reel) => {
      initialLikes[reel.id] = { count: reel.likes_count, liked: !!reel.user_has_liked };
      initialSaves[reel.id] = !!reel.user_has_saved;
      initialShares[reel.id] = reel.shares_count;
      initialFollowing[reel.id] = !!reel.user_has_followed;
    });

    setLikesState(initialLikes);
    setSavesState(initialSaves);
    setSharesState(initialShares);
    setFollowingState(initialFollowing);
  }, [reelsList]);

  // Socket listener for real-time share updates
  useEffect(() => {
    if (!socket) return;

    const handleShareUpdate = (data: { reelId: number; count: number }) => {
      setSharesState(prev => ({
        ...prev,
        [data.reelId]: data.count
      }));
    };

    socket.on('reel_share_update', handleShareUpdate);
    return () => {
      socket.off('reel_share_update', handleShareUpdate);
    };
  }, [socket]);

  // Persistence for mute preference
  useEffect(() => {
    localStorage.setItem('reels_muted', String(isMuted));
  }, [isMuted]);

  // Detect orientation for landscape support
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Haptic Tactile Vibration Feedback Helper
  const triggerHaptic = (pattern: number | number[] = 30) => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silently catch if device/browser disables vibration
      }
    }
  };

  // Predictive Pre-loader: Pre-caches first 1MB (~5 sec) of next videos using Range headers
  const preloadVideoChunk = useCallback((videoUrl: string) => {
    if (!videoUrl || mediaCacheRef.current.has(videoUrl)) return;
    mediaCacheRef.current.add(videoUrl);

    fetch(videoUrl, {
      headers: { Range: 'bytes=0-1048576' },
      mode: 'cors'
    })
      .then((res) => res.blob())
      .catch(() => {
        // Fallback silently
      });
  }, []);

  // Initialize state maps
  useEffect(() => {
    const initialLikes: Record<number, { count: number; liked: boolean }> = {};
    const initialSaves: Record<number, boolean> = {};
    const initialFollows: Record<number, boolean> = {};

    reelsList.forEach((reel) => {
      initialLikes[reel.id] = {
        count: reel.likes_count,
        liked: !!reel.user_has_liked
      };
      initialSaves[reel.id] = !!reel.user_has_saved;
      initialFollows[reel.id] = !!reel.user_has_followed;
    });

    setLikesState(initialLikes);
    setSavesState(initialSaves);
    setFollowingState(initialFollows);
  }, [reelsList]);

  // Predictive Pre-loader: Eagerly fetch next 2 videos in queue as soon as activeIndex changes
  useEffect(() => {
    const prefetchIndices = [activeIndex + 1, activeIndex + 2];
    prefetchIndices.forEach((idx) => {
      if (idx < reelsList.length) {
        const nextReel = reelsList[idx];
        if (nextReel && !hiddenReelIds[nextReel.id]) {
          preloadVideoChunk(nextReel.video_url);
          const vidEl = videoRefs.current[nextReel.id];
          if (vidEl) {
            vidEl.preload = 'auto';
            vidEl.load();
          }
        }
      }
    });
  }, [activeIndex, reelsList, hiddenReelIds, preloadVideoChunk]);

  // VIEWPORT FOCUS MANAGER: Pauses videos in adjacent slides instantly when they lose center-screen focus
  useEffect(() => {
    reelsList.forEach((reel, index) => {
      const videoEl = videoRefs.current[reel.id];
      if (!videoEl) return;

      if (index === activeIndex) {
        // Unmute incoming active video if global audio is unmuted, and reset position if changed
        videoEl.muted = isMuted;
        if (prevActiveIndexRef.current !== activeIndex) {
          videoEl.currentTime = 0;
        }
        videoEl.play().then(() => {
          setPlayingState((prev) => ({ ...prev, [reel.id]: true }));
        }).catch(() => {
          // Autoplay fallback if blocked by browser policy
          setPlayingState((prev) => ({ ...prev, [reel.id]: false }));
        });
      } else {
        // Viewport Focus Manager: Immediately mute and pause off-screen / adjacent slides
        videoEl.muted = true;
        videoEl.pause();
        setPlayingState((prev) => ({ ...prev, [reel.id]: false }));
      }
    });

    if (activeIndex > 0 && !hasSwiped) {
      setHasSwiped(true);
    }

    prevActiveIndexRef.current = activeIndex;
  }, [activeIndex, isMuted, reelsList, hasSwiped]);

  // Handle real-time video progress updates with micro-delta check to reduce unnecessary re-renders
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

  // Allow clicking on progress bar to scrub/seek video
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

  // IntersectionObserver for vertical scroll snapping & predictive halfway pre-loading
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

          // Halfway threshold (>= 0.4) predictive video preloader
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

          // Full snap focus when 80% occupies viewport
          if (entry.isIntersecting && entry.intersectionRatio >= 0.8) {
            setActiveIndex(idx);
          }
        });
      },
      {
        root: container,
        threshold: [0.4, 0.8, 0.95]
      }
    );

    const items = container.querySelectorAll('.reel-snap-item');
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [reelsList, activeIndex]);

  // Keyboard navigation
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
        setIsMuted((prev) => !prev);
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
      video.play().then(() => {
        setPlayingState((prev) => ({ ...prev, [reelId]: true }));
      }).catch(() => {});
    } else {
      video.pause();
      setPlayingState((prev) => ({ ...prev, [reelId]: false }));
    }
  };

  const handleDoubleTap = (e: React.MouseEvent, reelId: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Trigger haptic vibration feedback for double tap gesture
    triggerHaptic([40, 30, 60]);

    setHeartAnim({ id: reelId, x, y });
    setTimeout(() => setHeartAnim(null), 900);

    // Optimistic UI update: Trigger like immediately if not already liked
    setLikesState((prev) => {
      const current = prev[reelId] || { count: 0, liked: false };
      if (!current.liked) {
        if (reelId > 0 && onToggleLike) {
          try {
            onToggleLike(reelId);
          } catch (err) {
            // Silently handled
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
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      handleDoubleTap(e, reelId);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        togglePlayPause(reelId);
      }, 240);
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
        toast.success(isRtl ? 'تمت المشاركة بنجاح' : 'Shared successfully');
      } catch {
        // Ignored share dismiss
      }
    } else {
      handleCopyReelLink(reel.id);
    }
  };

  // Optimistic UI update for 'Like' button with haptic feedback
  const handleLikeClick = (e: React.MouseEvent, reelId: number) => {
    e.stopPropagation();
    if (!token && reelId > 0) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول للربط والإعجاب' : 'Please log in to like');
      return;
    }

    triggerHaptic(30);

    setLikesState((prev) => {
      const current = prev[reelId] || { count: 0, liked: false };
      const nextLiked = !current.liked;
      const nextCount = nextLiked ? current.count + 1 : Math.max(0, current.count - 1);

      // Async API execution
      if (reelId > 0 && onToggleLike) {
        try {
          onToggleLike(reelId);
        } catch (err) {
          // Revert on error
          setLikesState((st) => ({ ...st, [reelId]: current }));
          toast.error(isRtl ? 'فشل إجراء الإعجاب' : 'Failed to update like state');
        }
      }

      return {
        ...prev,
        [reelId]: { count: nextCount, liked: nextLiked }
      };
    });
  };

  // Optimistic UI update for 'Save' button with haptic feedback
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

  const handleFollowToggle = (e: React.MouseEvent, reelId: number, authorName: string) => {
    e.stopPropagation();
    setFollowingState((prev) => {
      const nextFollow = !prev[reelId];
      if (nextFollow) {
        toast.success(isRtl ? `أصبحت تتابع ${authorName}` : `You are now following ${authorName}`);
      } else {
        toast.info(isRtl ? `إلغاء متابعة ${authorName}` : `Unfollowed ${authorName}`);
      }
      return { ...prev, [reelId]: nextFollow };
    });
  };

  const openShareSheet = (e: React.MouseEvent, reel: ReelItemData) => {
    e.stopPropagation();
    setShareSheetReel(reel);
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

    setIsSubmittingComment(true);
    try {
      if (activeCommentReelId > 0 && onAddComment) {
        await onAddComment(activeCommentReelId, commentInput.trim());
      } else {
        toast.success(isRtl ? 'تم إضافة تعليقك بنجاح' : 'Comment added');
      }
      setCommentInput('');
    } catch (err) {
      toast.error(isRtl ? 'تعذر إرسال التعليق' : 'Failed to send comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const activeReelComments = activeCommentReelId
    ? commentsMap[activeCommentReelId] || []
    : [];

  return (
    <div className="relative w-full h-full bg-black text-white overflow-hidden select-none font-sans rounded-2xl md:rounded-3xl shadow-2xl border border-gray-800">
      {/* Top Floating Navigation Header Overlay */}
      <div className="absolute top-0 inset-x-0 z-30 p-2.5 sm:p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
        {/* Top Left: Logo / Back button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-theme border border-white/10"
              title={isRtl ? 'إغلاق واجهة الريلز' : 'Close Reels'}
            >
              <X size={18} />
            </button>
          )}
          <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <Clapperboard size={15} className="text-purple-400 animate-pulse" />
            <span className="text-[11px] sm:text-xs font-black tracking-wide text-white">
              {isRtl ? 'ريلز' : 'Reels'}
            </span>
          </div>
        </div>

        {/* Top Center: Tabs Switcher ("لك" | "المتابَعون") */}
        <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
          <button
            onClick={() => setActiveTab('for_you')}
            className={`px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-extrabold rounded-full transition-theme ${
              activeTab === 'for_you'
                ? 'bg-accent text-white shadow-sm'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {isRtl ? 'لك' : 'For You'}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-extrabold rounded-full transition-theme ${
              activeTab === 'following'
                ? 'bg-accent text-white shadow-sm'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {isRtl ? 'المتابَعون' : 'Following'}
          </button>
        </div>

        {/* Top Right: Upload Reels Button + Mute Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onOpenUploadReels && (
            <button
              onClick={onOpenUploadReels}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-1 sm:gap-1.5 shadow-md border border-white/20 transition-theme active:scale-95"
              title={isRtl ? 'رفع مقطع ريلز رأسياً 9:16' : 'Upload 9:16 Vertical Reel'}
            >
              <Plus size={14} className="stroke-[3]" />
              <span className="text-[11px] sm:text-xs">{isRtl ? 'ريلز' : 'Reel'}</span>
            </button>
          )}

          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-theme border border-white/10"
            title={isMuted ? (isRtl ? 'تشغيل الصوت' : 'Unmute') : (isRtl ? 'كتم الصوت' : 'Mute')}
          >
            {isMuted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      {/* Main Snap Scrollable Container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll overflow-x-hidden snap-y snap-mandatory scrollbar-none relative"
      >
        {reelsList.filter((reel) => !hiddenReelIds[reel.id]).map((reel, index) => {
          const isCurrentActive = index === activeIndex;
          const isPlaying = playingState[reel.id] ?? false;
          const likeData = likesState[reel.id] || { count: reel.likes_count, liked: !!reel.user_has_liked };
          const isSaved = savesState[reel.id] ?? !!reel.user_has_saved;
          const isFollowing = followingState[reel.id] ?? !!reel.user_has_followed;
          const isCaptionExpanded = expandedCaptions[reel.id] ?? false;

          return (
            <div
              key={reel.id}
              data-reel-index={index}
              className="reel-snap-item relative w-full h-full snap-start shrink-0 flex items-center justify-center bg-zinc-950 overflow-hidden"
              onClick={(e) => handleVideoCardClick(e, reel.id)}
            >
            {/* Background Video Stream Player */}
            <video
              ref={(el) => {
                videoRefs.current[reel.id] = el;
              }}
              src={reel.video_url}
              poster={reel.image_url}
              loop
              muted={isMuted}
              playsInline
              preload={Math.abs(index - activeIndex) <= 1 ? 'auto' : 'metadata'}
              onTimeUpdate={() => handleTimeUpdate(reel.id)}
              className={`w-full h-full pointer-events-none transition-all duration-300 ${
                isLandscape ? 'object-contain bg-black' : 'object-cover'
              }`}
            />

              {/* Gradient Overlays for Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/40 pointer-events-none" />

              {/* Thin Real-Time Interactive Video Progress Bar at Bottom */}
              <div
                className="absolute bottom-0 inset-x-0 z-30 h-1.5 hover:h-2.5 bg-white/20 backdrop-blur-sm cursor-pointer group transition-all duration-150 pointer-events-auto"
                onClick={(e) => handleSeek(e, reel.id)}
                title={isRtl ? 'انقر للتقديم أو التأخير' : 'Click to seek'}
              >
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-teal-400 transition-all duration-75 shadow-[0_0_10px_rgba(236,72,153,0.8)]"
                  style={{ width: `${videoProgress[reel.id] || 0}%` }}
                />
              </div>

              {/* Center Play / Pause Indicator Feedback */}
              <AnimatePresence>
                {!isPlaying && isCurrentActive && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="absolute z-20 w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-2xl pointer-events-none"
                  >
                    <Play size={32} className="ms-1 fill-white" />
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

              {/* Side Action Column (Right Side in RTL, Left in LTR) */}
              <div
                className={`absolute bottom-20 z-20 flex flex-col items-center gap-4 ${
                  isRtl ? 'end-3 sm:end-4' : 'start-3 sm:start-4'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Author Avatar + Follow Button */}
                <div className="relative group mb-1">
                  <div
                    onClick={() => reel.page_id && onOpenPageDetail && onOpenPageDetail(reel.page_id)}
                    className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 cursor-pointer shadow-lg active:scale-95 transition-transform"
                  >
                    <img
                      src={reel.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt={reel.author_name}
                      className="w-full h-full rounded-full object-cover border-2 border-black"
                    />
                  </div>
                  <button
                    onClick={(e) => handleFollowToggle(e, reel.id, reel.author_name)}
                    className={`absolute -bottom-1.5 start-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md border border-black transition-theme ${
                      isFollowing ? 'bg-emerald-500' : 'bg-accent hover:bg-teal-600'
                    }`}
                    title={isFollowing ? (isRtl ? 'تتابع بالفعل' : 'Following') : (isRtl ? 'متابعة' : 'Follow')}
                  >
                    {isFollowing ? <Check size={11} className="stroke-[3]" /> : <Plus size={12} className="stroke-[3]" />}
                  </button>
                </div>

                {/* Like Button */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={(e) => handleLikeClick(e, reel.id)}
                    className={`p-3 rounded-full backdrop-blur-md transition-all active:scale-75 shadow-lg border ${
                      likeData.liked
                        ? 'bg-red-500/20 text-red-500 border-red-500/40'
                        : 'bg-black/40 text-white border-white/10 hover:bg-black/60'
                    }`}
                  >
                    <Heart
                      size={24}
                      className={likeData.liked ? 'fill-red-500 text-red-500 animate-bounce' : ''}
                    />
                  </button>
                  <span className="text-[11px] font-black text-white drop-shadow tabular-nums">
                    {likeData.count}
                  </span>
                </div>

                {/* Comments Button */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={(e) => openCommentsDrawer(e, reel.id)}
                    className="p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all active:scale-75 border border-white/10 shadow-lg"
                  >
                    <MessageCircle size={24} />
                  </button>
                  <span className="text-[11px] font-black text-white drop-shadow tabular-nums">
                    {reel.comments_count || (commentsMap[reel.id]?.length || 0)}
                  </span>
                </div>

                {/* Bookmark / Save Button */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={(e) => handleSaveClick(e, reel.id)}
                    className={`p-3 rounded-full backdrop-blur-md transition-all active:scale-75 shadow-lg border ${
                      isSaved
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-black/40 text-white border-white/10 hover:bg-black/60'
                    }`}
                  >
                    <Bookmark size={24} className={isSaved ? 'fill-amber-400 text-amber-400' : ''} />
                  </button>
                  <span className="text-[10px] font-black text-white/90 drop-shadow">
                    {isSaved ? (isRtl ? 'محفوظ' : 'Saved') : (isRtl ? 'حفظ' : 'Save')}
                  </span>
                </div>

                {/* Share Button */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={(e) => openShareSheet(e, reel)}
                    className="p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all active:scale-75 border border-white/10 shadow-lg"
                  >
                    <Share2 size={24} />
                  </button>
                  <span className="text-[11px] font-black text-white drop-shadow tabular-nums">
                    {sharesState[reel.id] ?? reel.shares_count ?? 0}
                  </span>
                </div>

                {/* Report Button (Direct Access) */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReportReel(reel);
                    }}
                    className="p-3 rounded-full bg-black/40 hover:bg-red-500/40 text-white backdrop-blur-md transition-all active:scale-75 border border-white/10 shadow-lg"
                    title={isRtl ? 'إبلاغ' : 'Report'}
                  >
                    <Flag size={20} />
                  </button>
                  <span className="text-[10px] font-black text-white/90 drop-shadow">
                    {isRtl ? 'إبلاغ' : 'Report'}
                  </span>
                </div>

                {/* Overflow '...' Menu Button */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoreMenuReel(reel);
                    }}
                    className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all active:scale-75 border border-white/10 shadow-lg"
                    title={isRtl ? 'خيارات إضافية' : 'More Options'}
                  >
                    <MoreVertical size={20} />
                  </button>
                </div>

                {/* Rotating Music Disc */}
                <div className="mt-1 relative w-9 h-9 rounded-full bg-black/80 border-2 border-white/30 flex items-center justify-center p-1 shadow-2xl overflow-hidden animate-spin-slow">
                  <Music size={14} className="text-purple-400" />
                </div>
              </div>

              {/* Bottom Caption Overlay Area */}
              <div
                className={`absolute bottom-4 z-20 max-w-[76%] sm:max-w-[80%] space-y-2 pointer-events-auto ${
                  isRtl ? 'start-3 sm:start-4 text-right' : 'start-3 sm:start-4 text-left'
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
                    <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-bold text-gray-300 backdrop-blur-sm border border-white/10 flex items-center gap-1">
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
                {reel.hashtags && reel.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {reel.hashtags.map((tag, i) => (
                      <span key={i} className="text-[11px] font-bold text-accent drop-shadow">
                        #{tag.replace('#', '')}
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
          );
        })}
      </div>

      {/* Subtle Floating Swipe Up Animated Guidance Indicator */}
      <AnimatePresence>
        {!hasSwiped && activeIndex === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="absolute bottom-20 inset-x-0 z-30 flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white shadow-2xl"
            >
              <ChevronUp size={18} className="text-pink-400 animate-bounce" />
              <span className="text-[11px] font-extrabold tracking-wide text-gray-200">
                {isRtl ? 'اسحب للأعلى لمشاهدة المزيد' : 'Swipe up for next Reel'}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Bottom Sheet Comments Drawer */}
      <AnimatePresence>
        {commentsOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="absolute inset-x-0 bottom-0 z-50 h-[65%] bg-zinc-900/95 backdrop-blur-xl rounded-t-3xl border-t border-gray-800 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-purple-400" />
                <h3 className="text-xs font-black text-white">
                  {isRtl ? 'التعليقات' : 'Comments'} ({activeReelComments.length})
                </h3>
              </div>
              <button
                onClick={() => setCommentsOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {activeReelComments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2">
                  <Sparkles size={28} className="text-purple-400/60" />
                  <p className="text-xs font-bold">
                    {isRtl ? 'لا توجد تعليقات بعد، كن أول من يعلق!' : 'No comments yet. Be the first to comment!'}
                  </p>
                </div>
              ) : (
                activeReelComments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5 items-start">
                    <img
                      src={comment.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt={comment.author_name}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-700"
                    />
                    <div className="flex-1 bg-zinc-800/80 rounded-2xl p-2.5 border border-gray-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-black text-gray-200">
                          {comment.author_name}
                        </span>
                        <span className="text-[9px] text-gray-400">
                          {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {comment.content || (comment as any).comment_text || ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Add Comment Bar */}
            <form onSubmit={handleSendCommentSubmit} className="p-3 border-t border-gray-800 bg-zinc-950 flex items-center gap-2">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-700"
              />
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={isRtl ? 'اكتب تعليقاً على هذا الريلز...' : 'Add a comment...'}
                className="flex-1 bg-zinc-800 text-xs text-white placeholder-gray-400 rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 border border-gray-700"
              />
              <button
                type="submit"
                disabled={!commentInput.trim() || isSubmittingComment}
                className="p-2 rounded-full bg-accent hover:bg-teal-600 text-white disabled:opacity-40 transition-theme shrink-0"
              >
                <Send size={15} className={isRtl ? 'rotate-180' : ''} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

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
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="w-full sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-3 text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <MoreVertical size={18} className="text-purple-400" />
                  <h3 className="text-xs font-black">{isRtl ? 'خيارات المقطع' : 'Reel Options'}</h3>
                </div>
                <button
                  onClick={() => setMoreMenuReel(null)}
                  className="p-1.5 rounded-full hover:bg-zinc-800 text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                {moreMenuReel.page_id && onOpenPageDetail && (
                  <button
                    onClick={() => {
                      const pId = moreMenuReel.page_id!;
                      setMoreMenuReel(null);
                      onOpenPageDetail(pId);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-800 text-right transition-colors text-xs font-extrabold text-gray-200"
                  >
                    <User size={18} className="text-purple-400 shrink-0" />
                    <span>{isRtl ? 'عرض حساب الناشر وتفاصيل البيج' : 'View Creator Profile & Page Details'}</span>
                  </button>
                )}

                <button
                  onClick={() => handleNotInterested(moreMenuReel.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-800 text-right transition-colors text-xs font-extrabold text-amber-400"
                >
                  <EyeOff size={18} className="shrink-0" />
                  <span>{isRtl ? 'غير مهتم (إخفاء المقطع وتكييف التوصيات)' : 'Not Interested (Hide content)'}</span>
                </button>

                <button
                  onClick={() => handleReportReel(moreMenuReel)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-500/10 hover:text-red-400 text-right transition-colors text-xs font-extrabold text-red-500"
                >
                  <Flag size={18} className="shrink-0" />
                  <span>{isRtl ? 'الإبلاغ عن محتوى أو انتهاك' : 'Report Reel'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Native-Looking Native Share Bottom Sheet Component */}
      <AnimatePresence>
        {shareSheetReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center"
            onClick={() => setShareSheetReel(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="w-full bg-zinc-900/98 backdrop-blur-2xl border-t border-zinc-800/80 rounded-t-3xl p-5 space-y-4 text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Share2 size={18} className="text-purple-400 animate-pulse" />
                  <h3 className="text-xs font-black">{isRtl ? 'مشاركة مقطع الريلز' : 'Share Reel'}</h3>
                </div>
                <button
                  onClick={() => setShareSheetReel(null)}
                  className="p-1.5 rounded-full hover:bg-zinc-800 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Native System Share Prominent Action Card */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={() => {
                    handleNativeSystemShare(shareSheetReel);
                    setShareSheetReel(null);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-purple-600/30 via-indigo-600/20 to-pink-600/30 border border-purple-500/30 hover:border-purple-400/60 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Share2 size={20} />
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-white">{isRtl ? 'مشاركة عبر تطبيقات الجهاز (Web Share)' : 'Share via Native Apps'}</div>
                      <div className="text-[10px] text-purple-300/80 font-medium">{isRtl ? 'إنستغرام، تيك توك، واتساب وباقي التطبيقات' : 'Instagram, TikTok, WhatsApp & More'}</div>
                    </div>
                  </div>
                  <Sparkles size={18} className="text-purple-400 group-hover:rotate-12 transition-transform" />
                </button>
              )}

              {/* Deep Link Calculation Preview Box */}
              <div className="p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
                <div className="text-[11px] font-mono text-gray-400 truncate dir-ltr px-2">
                  {`${window.location.origin}${window.location.pathname}?reel=${shareSheetReel.id}`}
                </div>
                <button
                  onClick={() => {
                    handleCopyReelLink(shareSheetReel.id);
                    setShareSheetReel(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-extrabold shrink-0 flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
                >
                  <Copy size={13} />
                  <span>{isRtl ? 'نسخ' : 'Copy'}</span>
                </button>
              </div>

              {/* Quick Social Action Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 py-1">
                <button
                  onClick={() => {
                    handleCopyReelLink(shareSheetReel.id);
                    setShareSheetReel(null);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow">
                    <Copy size={20} />
                  </div>
                  <span className="text-[10px] font-extrabold text-gray-300">{isRtl ? 'نسخ الرابط' : 'Copy Link'}</span>
                </button>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareSheetReel.title || 'Perplexta Reel'} - ${window.location.origin}/?reel=${shareSheetReel.id}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShareSheetReel(null)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow">
                    <MessageSquare size={20} />
                  </div>
                  <span className="text-[10px] font-extrabold text-gray-300">واتساب</span>
                </a>

                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/?reel=${shareSheetReel.id}`)}&text=${encodeURIComponent(shareSheetReel.title || '')}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShareSheetReel(null)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow">
                    <Send size={20} />
                  </div>
                  <span className="text-[10px] font-extrabold text-gray-300">تليجرام</span>
                </a>

                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/?reel=${shareSheetReel.id}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShareSheetReel(null)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow">
                    <ExternalLink size={20} />
                  </div>
                  <span className="text-[10px] font-extrabold text-gray-300">فيسبوك</span>
                </a>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareSheetReel.title || 'Perplexta Reel'}`)}&url=${encodeURIComponent(`${window.location.origin}/?reel=${shareSheetReel.id}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShareSheetReel(null)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 transition-all group hidden sm:flex"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow">
                    <Sparkles size={20} />
                  </div>
                  <span className="text-[10px] font-extrabold text-gray-300">X (تويتر)</span>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
