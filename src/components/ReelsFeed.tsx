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
  Edit2
} from 'lucide-react';
import { toast } from '../context/NotificationContext';
import { BulletinAd, BulletinAdComment } from '../../server/db/types';
import { getMediaUrl } from '../utils/mediaUtils';
import { BulletinAvatar } from './BulletinAvatar';
import { useAppContext } from '../context/AppContext';
import { notifyMediaPlaying, stopAllMedia } from '../utils/mediaCoordinator';

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
  onDeleteReel?: (adId: number) => void;
  onEditReel?: (ad: BulletinAd) => void;
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
  onDeleteReel,
  onEditReel,
  initialReelId,
  initialAdId
}) => {
  const { socket } = useAppContext();
  const startId = initialAdId || initialReelId;
  const reelsList: ReelItemData[] = React.useMemo(() => {
    return ads
      .filter((ad) => ad.video_url) // MUST have a video_url to be a reel
      .map((ad) => ({
        id: ad.id,
        user_id: ad.user_id,
        author_id: (ad as any).author_id,
        author_name: ad.author_name || ad.page_name || (isRtl ? 'مستخدم' : 'User'),
        author_avatar: ad.author_avatar || ad.page_avatar,
        page_id: ad.page_id,
        page_name: ad.page_name,
        page_avatar: ad.page_avatar,
        page_is_verified: ad.page_is_verified,
        title: ad.title || '',
        description: ad.description || '',
        video_url: getMediaUrl(ad.video_url),
        image_url: getMediaUrl(ad.image_url),
        location_city: ad.location_city,
        hashtags: ad.hashtags || [],
        likes_count: ad.likes_count || 0,
        comments_count: ad.comments_count || 0,
        shares_count: ad.shares_count || 0,
        impressions_count: ad.impressions_count || 0,
        user_has_liked: ad.user_has_liked || false,
        user_has_saved: ad.user_has_saved || false,
        created_at: ad.created_at,
        music_title: isRtl ? 'الصوت الأصلي - Perplexta Sound' : 'Original Audio - Perplexta'
      }))
      .filter((reel) => reel.video_url); // Ensure valid resolved URL
  }, [ads, isRtl]);

  // Session Persistence & Active Reel Index Initialization
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    if (startId) {
      const idx = reelsList.findIndex((r) => r.id === startId);
      if (idx >= 0) return idx;
    }
    try {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const urlReelId = searchParams.get('reel');
        if (urlReelId) {
          const idx = reelsList.findIndex((r) => String(r.id) === urlReelId);
          if (idx >= 0) return idx;
        }
        const savedReelId = sessionStorage.getItem('perplexta_active_reel_id');
        if (savedReelId) {
          const idx = reelsList.findIndex((r) => String(r.id) === savedReelId);
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
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reels_muted');
      return saved === 'true';
    }
    return false;
  });
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
  
  const [videoProgress, setVideoProgress] = useState<Record<number, number>>({});
  const [hasSwiped, setHasSwiped] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeCommentReelId, setActiveCommentReelId] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [moreMenuReel, setMoreMenuReel] = useState<ReelItemData | null>(null);
  const [shareSheetReel, setShareSheetReel] = useState<ReelItemData | null>(null);
  const [hiddenReelIds, setHiddenReelIds] = useState<Record<number, boolean>>({});

  const [expandedCaptions, setExpandedCaptions] = useState<Record<number, boolean>>({});

  const [heartAnim, setHeartAnim] = useState<{ id: number; x: number; y: number } | null>(null);

  // Smart Auto-Pause on Scroll state
  const [autoPauseEnabled, setAutoPauseEnabled] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const isScrollingRef = useRef(false);
  const scrollDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPlayingBeforeScrollRef = useRef<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (startId) {
      const idx = reelsList.findIndex((r) => r.id === startId);
      if (idx >= 0 && idx !== activeIndex) {
        setActiveIndex(idx);
        setTimeout(() => { const container = containerRef.current; if (container) { const targetItem = container.querySelector(`[data-reel-index="${idx}"]`); if (targetItem) { targetItem.scrollIntoView({ behavior: "auto" }); } } }, 100);
      }
    }
  }, [startId, reelsList]);

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

  // Real-time socket listeners for authentic database synchronization
  useEffect(() => {
    if (!socket) return;

    const handleShareUpdate = (data: { reelId: number; count: number }) => {
      setSharesState(prev => ({
        ...prev,
        [data.reelId]: data.count
      }));
    };

    const handleLikeUpdate = (data: { reelId: number; likesCount: number; userId?: number; isLiked?: boolean }) => {
      setLikesState(prev => ({
        ...prev,
        [data.reelId]: {
          count: data.likesCount,
          liked: user && data.userId === user.id ? !!data.isLiked : (prev[data.reelId]?.liked ?? false)
        }
      }));
    };

    const handleImpressionUpdate = (data: { reelId: number; count: number }) => {
      setImpressionsState(prev => ({
        ...prev,
        [data.reelId]: data.count
      }));
    };

    socket.on('reel_share_update', handleShareUpdate);
    socket.on('reel_like_update', handleLikeUpdate);
    socket.on('reel_impression_update', handleImpressionUpdate);

    return () => {
      socket.off('reel_share_update', handleShareUpdate);
      socket.off('reel_like_update', handleLikeUpdate);
      socket.off('reel_impression_update', handleImpressionUpdate);
    };
  }, [socket, user]);

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
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
      }
    }
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

  // Cleanup and stop all media when unmounting or external media events occur
  useEffect(() => {
    // Force stop any background feed/page media immediately upon opening Reels
    stopAllMedia('reels_feed_' + (reelsList[activeIndex]?.id || ''));

    const handleStopMedia = (e: Event) => {
      const customEvent = e as CustomEvent<{ exceptMediaId?: string }>;
      const activeId = reelsList[activeIndex]?.id;
      if (customEvent.detail?.exceptMediaId !== `reels_feed_${activeId}`) {
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
      const activeId = reelsList[activeIndex]?.id;
      if (customEvent.detail?.mediaId !== `reels_feed_${activeId}`) {
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
      Object.values(videoRefs.current).forEach((v) => {
        if (v) {
          try {
            v.pause();
          } catch (_) {}
        }
      });
      stopAllMedia();
    };
  }, [activeIndex, reelsList]);

  useEffect(() => {
    reelsList.forEach((reel, index) => {
      const videoEl = videoRefs.current[reel.id];
      if (!videoEl) return;

      if (index === activeIndex) {
        videoEl.muted = isMuted;
        if (prevActiveIndexRef.current !== activeIndex) {
          videoEl.currentTime = 0;
        }
        if (!isScrollingRef.current) {
          notifyMediaPlaying(`reels_feed_${reel.id}`);
          videoEl.play().then(() => {
            setPlayingState((prev) => ({ ...prev, [reel.id]: true }));
          }).catch(() => {
            setPlayingState((prev) => ({ ...prev, [reel.id]: false }));
          });
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
  }, [activeIndex, isMuted, reelsList, hasSwiped]);

  // Pause on Scroll Handler: Pauses video immediately during feed scrolling/swiping
  const handleContainerScroll = useCallback(() => {
    if (!autoPauseEnabled) return;

    if (!isScrollingRef.current) {
      isScrollingRef.current = true;
      setIsScrolling(true);

      const activeReel = reelsList[activeIndex];
      if (activeReel) {
        const videoEl = videoRefs.current[activeReel.id];
        if (videoEl && !videoEl.paused) {
          wasPlayingBeforeScrollRef.current = true;
          videoEl.pause();
          setPlayingState((prev) => ({ ...prev, [activeReel.id]: false }));
        } else {
          wasPlayingBeforeScrollRef.current = false;
        }
      }
    }

    if (scrollDebounceTimerRef.current) {
      clearTimeout(scrollDebounceTimerRef.current);
    }

    // When scrolling finishes and snaps, resume playing the active reel
    scrollDebounceTimerRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      setIsScrolling(false);

      const currentActiveReel = reelsList[activeIndex];
      if (currentActiveReel) {
        const currentVideo = videoRefs.current[currentActiveReel.id];
        if (currentVideo) {
          currentVideo.muted = isMuted;
          currentVideo.play().then(() => {
            setPlayingState((prev) => ({ ...prev, [currentActiveReel.id]: true }));
          }).catch(() => {});
        }
      }
    }, 180);
  }, [activeIndex, autoPauseEnabled, isMuted, reelsList]);

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
      }
    } else {
      handleCopyReelLink(reel.id);
    }
  };

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

      if (reelId > 0 && onToggleLike) {
        try {
          onToggleLike(reelId);
        } catch (err) {
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
      setCommentsOpen(false);
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
    <div className="fixed inset-0 z-[99999] w-screen h-[100dvh] bg-zinc-950 text-white overflow-hidden select-none font-sans m-0 p-0 rounded-none shadow-none border-0">
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-zinc-950/85 to-black/95 backdrop-blur-2xl" />
      </div>

      {/* Top Floating Navigation Header Overlay - Clean, Spacious & Centered on Desktop */}
      <header className="absolute top-0 inset-x-0 z-40 px-3 sm:px-8 py-3 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-auto">
        {/* Top Left: Back Button & Reels Badge */}
        <div className="flex items-center gap-2.5">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 text-white backdrop-blur-md transition-all flex items-center justify-center active:scale-95 group cursor-pointer"
              title={isRtl ? 'رجوع إلى لوحة الإعلانات' : 'Back to Ads'}
            >
              {isRtl ? <ArrowRight size={16} className="text-purple-400 group-hover:-translate-x-0.5 transition-transform" /> : <ArrowLeft size={16} className="text-purple-400 group-hover:-translate-x-0.5 transition-transform" />}
              
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/70 backdrop-blur-xl border border-white/10 shadow-md">
            <Clapperboard size={15} className="text-purple-400 animate-pulse" />
            <span className="text-xs font-black tracking-wide text-white">
              {isRtl ? 'ريلز بيربلكستا' : 'Perplexta Reels'}
            </span>
          </div>
        </div>

        {/* Top Center: Tabs Switcher ("لك" | "المتابَعون") */}
        <div className="flex items-center gap-4 drop-shadow-md">
          <button
            onClick={() => setActiveTab('for_you')}
            className={`px-3.5 py-1 text-xs font-extrabold rounded-full transition-all cursor-pointer ${
              activeTab === 'for_you'
                ? 'text-white drop-shadow-lg after:content-[" "] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-4 after:h-1 after:bg-white after:rounded-full'
                : 'text-white/60 hover:text-white drop-shadow-md'
            }`}
          >
            {isRtl ? 'لك' : 'For You'}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-3.5 py-1 text-xs font-extrabold rounded-full transition-all cursor-pointer ${
              activeTab === 'following'
                ? 'text-white drop-shadow-lg after:content-[" "] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-4 after:h-1 after:bg-white after:rounded-full'
                : 'text-white/60 hover:text-white drop-shadow-md'
            }`}
          >
            {isRtl ? 'المتابَعون' : 'Following'}
          </button>
        </div>

        {/* Top Right: Upload Reel Button + Mute Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUploadReelClick}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title={isRtl ? 'رفع مقطع ريلز جديد' : 'Upload New Reel'}
          >
            <Plus size={24} className="drop-shadow-lg" />
            
          </button>

          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title={isMuted ? (isRtl ? 'تشغيل الصوت (M)' : 'Unmute (M)') : (isRtl ? 'كتم الصوت (M)' : 'Mute (M)')}
          >
            {isMuted ? <VolumeX size={17} className="text-red-400" /> : <Volume2 size={17} />}
          </button>
        </div>
      </header>

      {/* Desktop Floating Navigation Chevrons */}
      <div className="hidden md:flex fixed end-4 lg:end-8 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-2.5 select-none pointer-events-auto">
        <button
          onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          className="w-11 h-11 rounded-full bg-zinc-900/85 hover:bg-zinc-800 disabled:opacity-25 text-white backdrop-blur-xl border border-white/15 shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
          title={isRtl ? 'المقطع السابق (↑)' : 'Previous Reel (↑)'}
        >
          <ChevronUp size={22} />
        </button>
        <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono font-black text-gray-300 shadow">
          {activeIndex + 1} / {reelsList.length || 1}
        </div>
        <button
          onClick={() => scrollToIndex(Math.min(reelsList.length - 1, activeIndex + 1))}
          disabled={activeIndex >= reelsList.length - 1}
          className="w-11 h-11 rounded-full bg-zinc-900/85 hover:bg-zinc-800 disabled:opacity-25 text-white backdrop-blur-xl border border-white/15 shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
          title={isRtl ? 'المقطع التالي (↓)' : 'Next Reel (↓)'}
        >
          <ChevronDown size={22} />
        </button>
      </div>

      {/* Desktop Keyboard Shortcuts Help Pill */}
      <div className="hidden xl:flex fixed start-6 bottom-4 z-40 items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/70 backdrop-blur-md border border-white/10 text-[10px] font-bold text-gray-400 select-none pointer-events-none">
        <span>{isRtl ? 'التنقل:' : 'Navigate:'}</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[9px] font-mono">↑</kbd>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[9px] font-mono">↓</kbd>
        <span className="ms-1">{isRtl ? 'تشغيل:' : 'Play:'}</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[9px] font-mono">Space</kbd>
        <span className="ms-1">{isRtl ? 'الصوت:' : 'Mute:'}</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[9px] font-mono">M</kbd>
      </div>

      {/* Main Snap Scrollable Container */}
      <div
        ref={containerRef}
        onScroll={handleContainerScroll}
        className="w-full h-full pt-14 md:pt-16 pb-2 md:pb-6 overflow-y-scroll overflow-x-hidden snap-y snap-mandatory scrollbar-none relative z-10"
      >
        {reelsList.length === 0 ? (
          <div className="w-full h-[calc(100dvh-80px)] flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600/20 to-indigo-600/20 border border-purple-500/30 flex items-center justify-center mb-6 shadow-2xl backdrop-blur-xl animate-pulse">
              <Film size={38} className="text-purple-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
              {isRtl ? 'لا توجد مقاطع ريلز منشورة حالياً' : 'No Published Reels Available'}
            </h3>
            <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
              {isRtl
                ? 'كن أول من ينشر مقطع ريلز تفاعلي عالي الجودة أو شارك فيديو إبداعي لمشروعك ومحتواك مع الجمهور مباشرة.'
                : 'Be the first to publish high quality reels or share creative video content directly with the audience.'}
            </p>
            <button
              onClick={handleUploadReelClick}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm flex items-center gap-2 shadow-xl shadow-purple-600/30 border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus size={18} className="stroke-[3]" />
              <span>{isRtl ? 'إنشاء ونشر أول ريلز' : 'Create & Publish First Reel'}</span>
            </button>
          </div>
        ) : (
          reelsList.filter((reel) => !hiddenReelIds[reel.id]).map((reel, index) => {
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
                      preload={Math.abs(index - activeIndex) <= 1 ? 'auto' : 'metadata'}
                      onTimeUpdate={() => handleTimeUpdate(reel.id)}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />
                  </div>

                  {/* TIKTOK-STYLE TOP VIEWS & ENGAGEMENT PILL */}
                  <div className={`absolute top-14 sm:top-16 md:top-4 z-30 flex items-center gap-2 pointer-events-none select-none ${isRtl ? 'start-3 sm:start-4' : 'start-3 sm:start-4'}`}>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-xl border border-white/20 text-white shadow-xl">
                      <Eye size={13} className="text-cyan-400 stroke-[2.5]" />
                      <span className="text-xs font-black tracking-wide tabular-nums text-white">
                        {formatCompactCount(impressionsState[reel.id] ?? (reel as any).impressions_count ?? 0)}
                      </span>
                      <span className="text-[10px] font-bold text-gray-300">
                        {isRtl ? 'مشاهدة' : 'views'}
                      </span>
                    </div>
                  </div>

                  {/* Scrolling Pause Feedback Indicator */}
                  {isScrolling && isCurrentActive && (
                    <div className="absolute top-4 inset-x-0 z-30 flex justify-center pointer-events-none">
                      <div className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-black text-amber-300 flex items-center gap-1.5 shadow-xl animate-pulse">
                        <PauseCircle size={13} className="text-amber-400" />
                        <span>{isRtl ? 'إيقاف مؤقت أثناء التمرير' : 'Paused on Scroll'}</span>
                      </div>
                    </div>
                  )}

                  {/* Gradient Overlays for Enhanced Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/40 pointer-events-none" />

                  {/* Real-Time Interactive Video Progress Bar at Bottom of Card */}
                  <div
                    className="absolute bottom-0 inset-x-0 z-30 h-1.5 hover:h-2.5 bg-white/20 backdrop-blur-sm cursor-pointer transition-all duration-150 pointer-events-auto"
                    onClick={(e) => handleSeek(e, reel.id)}
                    title={isRtl ? 'انقر للتقديم أو التأخير' : 'Click to seek'}
                  >
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
                        className={`absolute -bottom-1.5 start-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md border border-black transition-all ${
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
                        {formatCompactCount(reel.comments_count || (commentsMap[reel.id]?.length || 0))}
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
                    <div className="mt-1 relative w-9 h-9 rounded-full bg-black/80 border-2 border-white/30 flex items-center justify-center p-1 shadow-2xl overflow-hidden animate-spin-slow">
                      <Music size={14} className="text-purple-400" />
                    </div>
                  </div>

                  {/* Captions Overlay at Bottom of Card */}
                  <div
                    className={`absolute bottom-3 md:bottom-4 z-20 max-w-[76%] md:max-w-[85%] space-y-2 pointer-events-auto ${
                      isRtl ? 'start-3 md:start-4 text-right' : 'start-3 md:start-4 text-left'
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
                          <span key={`reel-tag-${reel.id}-${tag}-${i}`} className="text-[11px] font-bold text-accent drop-shadow">
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

                {/* DESKTOP ONLY: Side Floating Action Column */}
                <div
                  className="hidden md:flex flex-col items-center gap-3.5 self-end pb-4 z-20 select-none shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Creator Avatar with follow badge */}
                  <div className="relative group mb-1">
                    <div
                      onClick={() => reel.page_id && onOpenPageDetail && onOpenPageDetail(reel.page_id)}
                      className="cursor-pointer hover:scale-105 transition-transform"
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
                      className={`absolute -bottom-1.5 start-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md border-2 border-zinc-950 transition-all ${
                        isFollowing ? 'bg-emerald-500' : 'bg-purple-600 hover:bg-purple-700 hover:scale-110'
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
                      className={`w-12 h-12 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer ${
                        likeData.liked
                          ? 'text-red-500 drop-shadow-md'
                          : 'text-white drop-shadow-md hover:scale-110'
                      }`}
                      title={likeData.liked ? (isRtl ? 'إلغاء الإعجاب' : 'Unlike') : (isRtl ? 'إعجاب' : 'Like')}
                    >
                      <Heart
                        size={22}
                        className={likeData.liked ? 'fill-red-500 text-red-500 animate-bounce' : ''}
                      />
                    </button>
                    <span className="text-xs font-black text-white/90 drop-shadow tabular-nums">
                      {formatCompactCount(likeData.count)}
                    </span>
                  </div>

                  {/* Comments Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (commentsOpen && activeCommentReelId === reel.id) {
                          setCommentsOpen(false);
                        } else {
                          openCommentsDrawer(e, reel.id);
                        }
                      }}
                      className={`w-12 h-12 rounded-full backdrop-blur-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 border shadow-xl cursor-pointer ${
                        commentsOpen && activeCommentReelId === reel.id
                          ? 'bg-purple-600 text-white border-purple-400 shadow-purple-500/30'
                          : 'text-white drop-shadow-md'
                      }`}
                      title={isRtl ? 'التعليقات' : 'Comments'}
                    >
                      <MessageCircle size={22} />
                    </button>
                    <span className="text-xs font-black text-white/90 drop-shadow tabular-nums">
                      {formatCompactCount(reel.comments_count || (commentsMap[reel.id]?.length || 0))}
                    </span>
                  </div>

                  {/* Save / Bookmark Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={(e) => handleSaveClick(e, reel.id)}
                      className={`w-12 h-12 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer ${
                        isSaved
                          ? 'text-amber-400 drop-shadow-md'
                          : 'text-white drop-shadow-md hover:scale-110'
                      }`}
                      title={isSaved ? (isRtl ? 'إزالة من المحفوظات' : 'Saved') : (isRtl ? 'حفظ' : 'Save')}
                    >
                      <Bookmark size={22} className={isSaved ? 'fill-amber-400 text-amber-400' : ''} />
                    </button>
                    <span className="text-[11px] font-bold text-white/80 drop-shadow">
                      {isSaved ? (isRtl ? 'محفوظ' : 'Saved') : (isRtl ? 'حفظ' : 'Save')}
                    </span>
                  </div>

                  {/* Share Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={(e) => openShareSheet(e, reel)}
                      className="w-12 h-12 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer text-white drop-shadow-md"
                      title={isRtl ? 'مشاركة' : 'Share'}
                    >
                      <Share2 size={22} />
                    </button>
                    <span className="text-xs font-black text-white/90 drop-shadow tabular-nums">
                      {formatCompactCount(sharesState[reel.id] ?? reel.shares_count ?? 0)}
                    </span>
                  </div>

                  {/* More Options Button (Three Dots Menu) */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoreMenuReel(reel);
                      }}
                      className="w-12 h-12 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer text-white drop-shadow-md"
                      title={isRtl ? 'المزيد من الخيارات' : 'More options'}
                    >
                      <MoreVertical size={22} />
                    </button>
                    <span className="text-[11px] font-bold text-white/80 drop-shadow">
                      {isRtl ? 'المزيد' : 'More'}
                    </span>
                  </div>

                  {/* Animated Rotating Music Disc */}
                  <div className="mt-1 relative w-10 h-10 rounded-full bg-zinc-900 border-2 border-white/30 flex items-center justify-center p-1 shadow-2xl overflow-hidden animate-spin-slow">
                    <Music size={16} className="text-purple-400" />
                  </div>
                </div>

                {/* DESKTOP ONLY: Side Panel for Comments (Side-by-side split view!) */}
                <AnimatePresence>
                  {commentsOpen && activeCommentReelId === reel.id && (
                    <motion.div
                      initial={{ opacity: 0, x: isRtl ? -30 : 30, width: 0 }}
                      animate={{ opacity: 1, x: 0, width: 360 }}
                      exit={{ opacity: 0, x: isRtl ? -30 : 30, width: 0 }}
                      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                      className="hidden md:flex flex-col h-[calc(100dvh-92px)] max-h-[820px] bg-zinc-900/95 backdrop-blur-2xl rounded-3xl border border-white/15 shadow-2xl overflow-hidden z-20 self-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Side Panel Header */}
                      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircle size={18} className="text-purple-400" />
                          <h3 className="text-xs font-black text-white">
                            {isRtl ? 'التعليقات' : 'Comments'} ({activeReelComments.length})
                          </h3>
                        </div>
                        <button
                          onClick={() => setCommentsOpen(false)}
                          className="p-1.5 rounded-full hover:bg-zinc-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Comments Scrollable Stream */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                        {activeReelComments.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2">
                            <Sparkles size={28} className="text-purple-400/60" />
                            <p className="text-xs font-bold">
                              {isRtl ? 'لا توجد تعليقات بعد، كن أول من يعلق!' : 'No comments yet. Be the first to comment!'}
                            </p>
                          </div>
                        ) : (
                          activeReelComments.map((comment, cIdx) => (
                            <div key={`reel-comment-${comment.id || cIdx}-${cIdx}`} className="flex gap-2.5 items-start">
                              <BulletinAvatar
                                src={comment.author_avatar}
                                alt={comment.author_name}
                                size="sm"
                              />
                              <div className="flex-1 bg-zinc-800/80 rounded-2xl p-2.5 border border-zinc-700/60">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] font-black text-gray-200">
                                    {comment.author_name}
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-mono">
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

                      {/* Side Panel Add Comment Form */}
                      <form onSubmit={handleSendCommentSubmit} className="p-3 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center gap-2">
                        <BulletinAvatar
                          src={user?.avatar}
                          alt={user?.name || 'User'}
                          size="sm"
                        />
                        <input
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder={isRtl ? 'اكتب تعليقاً...' : 'Add a comment...'}
                          className="flex-1 bg-zinc-800/90 text-xs text-white placeholder-gray-400 rounded-full px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 border border-zinc-700"
                        />
                        <button
                          type="submit"
                          disabled={!commentInput.trim() || isSubmittingComment}
                          className="p-2 rounded-full bg-accent hover:bg-accent/80 text-white disabled:opacity-40 transition-theme shrink-0 cursor-pointer"
                        >
                          <Send size={15} className={isRtl ? 'rotate-180' : ''} />
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
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

      {/* MOBILE ONLY: Bottom Sheet Comments Drawer */}
      <AnimatePresence>
        {commentsOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="md:hidden absolute inset-x-0 bottom-0 z-50 h-[65%] bg-zinc-900/95 backdrop-blur-xl rounded-t-3xl border-t border-gray-800 flex flex-col shadow-2xl"
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
                activeReelComments.map((comment, cIdx) => (
                  <div key={`reel-sheet-comment-${comment.id || cIdx}-${cIdx}`} className="flex gap-2.5 items-start">
                    <BulletinAvatar
                      src={comment.author_avatar}
                      alt={comment.author_name}
                      size="sm"
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
              <BulletinAvatar
                src={user?.avatar}
                alt={user?.name || 'User'}
                size="sm"
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
                {/* Smart Auto-Pause Toggle */}
                <button
                  onClick={() => {
                    setAutoPauseEnabled((prev) => {
                      const next = !prev;
                      toast.success(
                        isRtl
                          ? next
                            ? 'تم تفعيل نمط الإيقاف التلقائي أثناء التمرير ⏸️'
                            : 'تم تعطيل نمط الإيقاف التلقائي'
                          : next
                            ? 'Auto-pause on scroll enabled ⏸️'
                            : 'Auto-pause disabled'
                      );
                      return next;
                    });
                    setMoreMenuReel(null);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-800 text-right transition-colors text-xs font-extrabold text-purple-300 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <PauseCircle size={18} className="text-purple-400 shrink-0" />
                    <span>{isRtl ? 'نمط الإيقاف التلقائي (أثناء التمرير)' : 'Smart Auto-Pause (on Scroll)'}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${autoPauseEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800 text-gray-400'}`}>
                    {autoPauseEnabled ? (isRtl ? 'مُفعّل' : 'ON') : (isRtl ? 'معطل' : 'OFF')}
                  </span>
                </button>

                {/* Copy Reel Direct Link */}
                <button
                  onClick={() => {
                    handleCopyReelLink(moreMenuReel.id);
                    setMoreMenuReel(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-800 text-right transition-colors text-xs font-extrabold text-gray-200 cursor-pointer"
                >
                  <Copy size={18} className="text-indigo-400 shrink-0" />
                  <span>{isRtl ? 'نسخ رابط المقطع المباشر' : 'Copy Direct Link'}</span>
                </button>

                {moreMenuReel.page_id && onOpenPageDetail && (
                  <button
                    onClick={() => {
                      const pId = moreMenuReel.page_id!;
                      setMoreMenuReel(null);
                      onOpenPageDetail(pId);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-800 text-right transition-colors text-xs font-extrabold text-gray-200 cursor-pointer"
                  >
                    <User size={18} className="text-purple-400 shrink-0" />
                    <span>{isRtl ? 'عرض حساب الناشر وتفاصيل البيج' : 'View Creator Profile & Page Details'}</span>
                  </button>
                )}

                {/* Edit & Delete for Owner */}
                {user && (moreMenuReel.user_id === user.id || moreMenuReel.author_id === user.id || user.role === 'admin') && (
                  <>
                    <button
                      onClick={() => {
                        if (onEditReel) onEditReel(moreMenuReel as any);
                        setMoreMenuReel(null);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-800 text-right transition-colors text-xs font-extrabold text-blue-400 cursor-pointer"
                    >
                      <Edit2 size={18} className="shrink-0" />
                      <span>{isRtl ? 'تعديل المقطع' : 'Edit Reel'}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onDeleteReel) onDeleteReel(moreMenuReel.id);
                        setMoreMenuReel(null);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-800 text-right transition-colors text-xs font-extrabold text-red-500 cursor-pointer"
                    >
                      <Trash2 size={18} className="shrink-0" />
                      <span>{isRtl ? 'حذف المقطع' : 'Delete Reel'}</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleNotInterested(moreMenuReel.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-800 text-right transition-colors text-xs font-extrabold text-amber-400 cursor-pointer"
                >
                  <EyeOff size={18} className="shrink-0" />
                  <span>{isRtl ? 'غير مهتم (إخفاء المقطع وتكييف التوصيات)' : 'Not Interested (Hide content)'}</span>
                </button>

                <div className="h-px bg-zinc-800 my-1" />

                {/* Report Reel (The only official Report action) */}
                <button
                  onClick={() => handleReportReel(moreMenuReel)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-500/10 hover:text-red-400 text-right transition-colors text-xs font-extrabold text-red-500 cursor-pointer"
                >
                  <Flag size={18} className="shrink-0 text-red-500" />
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
