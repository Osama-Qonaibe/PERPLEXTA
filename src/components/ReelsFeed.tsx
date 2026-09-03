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
  Edit2,
  MoreHorizontal,
  Globe,
  Megaphone,
  ThumbsUp,
  Smile,
  Camera,
  Image as ImageIcon,
  Users
} from 'lucide-react';
import { toast } from '../context/NotificationContext';
import { BulletinAd, BulletinAdComment } from '../../server/db/types';
import { getMediaUrl } from '../utils/mediaUtils';
import { triggerHaptic as utilsTriggerHaptic } from '../utils/haptics';
import { BulletinAvatar } from './BulletinAvatar';
import { useAppContext } from '../context/AppContext';
import {
  notifyMediaPlaying,
  stopAllMedia,
  getGlobalMuteState,
  setGlobalMuteState
} from '../utils/mediaCoordinator';

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
  onToggleLike?: (adId: number) => void;
  onToggleSave?: (adId: number) => void;
  onAddComment?: (adId: number, text: string) => Promise<void>;
  onToggleCommentLike?: (adId: number, commentId: number, reaction?: string) => void;
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
  isLoading?: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '😮', '🎉', '💯', '🚀', '😍', '✨', '🙏'];

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
  onDeleteReel,
  onEditReel,
  initialReelId,
  initialAdId,
  isLoading = false
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
  const isTogglingMuteRef = useRef<boolean>(false);
  const isAutoplayFallbackRef = useRef<boolean>(false);
  const wasAutoplayMutedFallbackRef = useRef<boolean>(false);
  // Mute / Unmute Visual Feedback Overlay
  const [muteFeedback, setMuteFeedback] = useState<{ show: boolean; isMuted: boolean } | null>(null);
  const muteTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (startId !== undefined && startId !== null) {
      const targetId = Number(startId);
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
    } else {
      isInitialScrollSettledRef.current = true;
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

          if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
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
        threshold: [0.4, 0.75, 0.95]
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
    <div className="fixed inset-0 z-[99999] w-screen h-[100dvh] bg-zinc-950 text-white overflow-hidden select-none font-sans m-0 p-0 rounded-none shadow-none border-0 flex flex-row">
      {/* Main Video Feed Area (Right in RTL, Left in LTR) */}
      <div className="flex-1 relative h-full flex flex-col min-w-0 bg-black">
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
            onClick={toggleMute}
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
        {isLoading ? (
          <div className="w-full h-[calc(100dvh-80px)] flex items-center justify-center bg-black" />
        ) : reelsList.length === 0 ? (
          <div className="w-full h-[calc(100dvh-80px)] flex items-center justify-center p-4 text-center select-none bg-black/40">
            <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-2.5 rounded-full bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-md max-w-sm shadow-lg">
              <span className="text-[11px] font-bold text-zinc-300">
                {isRtl ? 'لا توجد مقاطع ريلز منشورة حالياً' : 'No published reels available.'}
              </span>
              <button
                onClick={handleUploadReelClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
              >
                <Plus size={12} className="stroke-[3]" />
                <span>{isRtl ? 'إضافة مقطع' : 'Add Reel'}</span>
              </button>
            </div>
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
                        className="absolute z-20 w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-2xl pointer-events-auto cursor-pointer hover:scale-110 active:scale-95 transition-transform"
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
                          <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                            <VolumeX size={18} />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
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

      </div>
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
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
              <h3 className="font-extrabold text-white text-sm">
                {isRtl ? 'التعليقات' : 'Comments'} 
                <span className="ms-1.5 text-gray-400 font-medium">
                  ({reelsList[activeIndex]?.comments_count || (commentsMap[reelsList[activeIndex]?.id]?.length || 0)})
                </span>
              </h3>
              <button 
                onClick={() => setCommentsOpen(false)}
                className="p-1.5 bg-zinc-800 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Mobile Comments List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
              {(!commentsMap[reelsList[activeIndex]?.id] || commentsMap[reelsList[activeIndex]?.id].length === 0) ? (
                 <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-3">
                   <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center">
                     <MessageSquare size={20} className="opacity-50" />
                   </div>
                   <p className="text-xs font-bold">{isRtl ? 'لا توجد تعليقات حتى الآن.' : 'No comments yet.'}</p>
                 </div>
              ) : (
                commentsMap[reelsList[activeIndex]?.id].map((comment, cIdx) => (
                  <div key={`mob-comment-${comment.id || cIdx}`} className="flex gap-2 items-start text-[13px] group">
                    <div className="shrink-0 pt-1">
                      <BulletinAvatar src={comment.author_avatar} alt={comment.author_name} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col text-white">
                        <span className="font-extrabold text-[13px]">{comment.author_name}</span>
                        <p className="text-[13px] leading-relaxed break-words text-gray-200">{comment.content || (comment as any).comment_text || ''}</p>
                      </div>
                      <div className="flex items-center gap-2.5 mt-1 text-[11px] text-gray-500 font-bold">
                        <span>{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <button type="button" onClick={() => onToggleCommentLike && onToggleCommentLike(reelsList[activeIndex]?.id, comment.id, 'like')} className={`hover:underline transition-colors ${comment.user_reaction ? 'text-accent font-extrabold' : 'hover:text-white'}`}>
                          {isRtl ? 'إعجاب' : 'Like'}
                        </button>
                        <button type="button" onClick={() => { setActiveCommentReelId(reelsList[activeIndex]?.id); setCommentInput(`@${comment.author_name} `); }} className="hover:underline hover:text-white">
                          {isRtl ? 'رد' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mobile Comment Input */}
            <div className="bg-zinc-950 border-t border-gray-800 pt-2 pb-3 px-3 shrink-0">
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
              <form onSubmit={handleSendCommentSubmit} className="flex items-center gap-2">
                <BulletinAvatar
                  src={user?.avatar}
                  alt={user?.name || 'User'}
                  size="sm"
                />
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => {
                     if (activeCommentReelId !== reelsList[activeIndex]?.id) setActiveCommentReelId(reelsList[activeIndex]?.id);
                     setCommentInput(e.target.value);
                  }}
                  placeholder={isRtl ? 'تعليق باسم ' + (user?.name || 'مستخدم') + '...' : 'Comment as ' + (user?.name || 'user') + '...'}
                  className="flex-1 bg-zinc-800 text-xs text-white placeholder-gray-400 rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 border border-gray-700"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim() || isSubmittingComment}
                  className="p-2 rounded-full bg-accent hover:opacity-90 text-white disabled:opacity-40 transition-theme shrink-0 cursor-pointer"
                >
                  <Send size={15} className={isRtl ? 'rotate-180 -ms-0.5' : 'ms-0.5'} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DESKTOP ONLY: Static Interactive Sidebar (Left in RTL, Right in LTR) */}
      <div className="hidden md:flex flex-col w-[360px] xl:w-[400px] h-full bg-[var(--surface-card)] border-s border-[var(--border-main)] z-50 shrink-0 shadow-2xl">
        {reelsList[activeIndex] && (() => {
          const activeReel = reelsList[activeIndex];
          const likeData = likesState[activeReel.id] || { count: activeReel.likes_count, liked: !!activeReel.user_has_liked };
          
          const getTimeAgo = (dateString?: string | Date) => {
            if (!dateString) return '';
            const diff = Date.now() - new Date(dateString).getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours < 1) return isRtl ? 'الآن' : 'Just now';
            if (hours < 24) return isRtl ? `${hours} ساعة` : `${hours}h`;
            const days = Math.floor(hours / 24);
            return isRtl ? `${days} يوم` : `${days}d`;
          };

          return (
          <>
            {/* Header (Top: More Menu, Bottom: Author Info) */}
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-main)]">
              <button 
                onClick={() => activeReel.page_id && onOpenPageDetail && onOpenPageDetail(activeReel.page_id)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-main)] hover:bg-[var(--surface-subtle)] px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                <ExternalLink size={12} />
                {isRtl ? 'عرض المنشور' : 'View Post'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setMoreMenuReel(activeReel); }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 transition-colors rounded-full hover:bg-[var(--surface-subtle)] cursor-pointer"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>

            <div className="p-4 border-b border-[var(--border-main)] relative">
              <div className="flex items-center gap-3">
                <div className="cursor-pointer" onClick={() => activeReel.page_id && onOpenPageDetail && onOpenPageDetail(activeReel.page_id)}>
                  <BulletinAvatar src={activeReel.author_avatar} alt={activeReel.author_name} size="md" isPage={Boolean(activeReel.page_id)} />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-[var(--text-primary)] text-[14px] cursor-pointer hover:underline" onClick={() => activeReel.page_id && onOpenPageDetail && onOpenPageDetail(activeReel.page_id)}>
                    {activeReel.author_name}
                    {activeReel.page_is_verified && <CheckCircle2 size={12} className="text-blue-500 fill-blue-500 inline-block ms-1" />}
                  </span>
                  <div className="flex items-center text-[11px] text-[var(--text-muted)] font-medium gap-1 mt-0.5">
                    <span>{getTimeAgo(activeReel.created_at)}</span>
                    <span>•</span>
                    <Globe size={10} className="opacity-70" />
                  </div>
                </div>
              </div>

              {/* Admin/Author Action Buttons (Promote / Edit) */}
              {(user?.role === 'admin' || user?.id === activeReel.author_id) && (
                <div className="flex gap-2 mt-4 flex-row-reverse">
                  <button className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-md text-[13px] font-bold transition-colors cursor-pointer">
                    <Megaphone size={14} /> {isRtl ? 'ترويج المنشور' : 'Promote Post'}
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--surface-subtle)] hover:bg-[var(--border-main)] border border-[var(--border-main)] text-[var(--text-primary)] py-1.5 rounded-md text-[13px] font-bold transition-colors cursor-pointer">
                    <Edit2 size={14} /> {isRtl ? 'تعديل' : 'Edit'}
                  </button>
                </div>
              )}
            </div>

            {/* Description & Tags */}
            <div className="p-4 border-b border-[var(--border-main)] flex flex-col gap-2">
              {activeReel.description && (
                <p className="text-[14px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-medium">
                  {activeReel.description}
                </p>
              )}
              {activeReel.hashtags && activeReel.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {activeReel.hashtags.map((tag, i) => (
                    <span key={`side-tag-${i}`} className="text-[13px] font-bold text-blue-500 cursor-pointer hover:underline">
                      #{tag.replace('#', '')}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Stats Row (Likes, Comments, Shares) */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-main)] text-[13px] text-[var(--text-secondary)]">
              <div className="flex items-center gap-3 font-semibold">
                 <span>{formatCompactCount(activeReel.comments_count || (commentsMap[activeReel.id]?.length || 0))} {isRtl ? 'تعليق' : 'Comments'}</span>
                 <span>{formatCompactCount(sharesState[activeReel.id] ?? activeReel.shares_count ?? 0)} {isRtl ? 'مشاركة' : 'Shares'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                 <div className="flex -space-x-1 rtl:space-x-reverse">
                   <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white ring-2 ring-[var(--surface-card)] z-10"><ThumbsUp size={10} className="fill-current" /></div>
                   <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white ring-2 ring-[var(--surface-card)]"><Heart size={10} className="fill-current" /></div>
                 </div>
                 <span className="font-semibold ms-1 text-[var(--text-primary)]">{formatCompactCount(likeData.count)}</span>
              </div>
            </div>

            {/* Action Bar (Like, Comment, Share) */}
            <div className="flex items-center px-2 py-1 border-b border-[var(--border-main)] relative z-20">
               {/* Like Button with Hover Emoji Bar */}
               <div className="flex-1 group relative">
                 {/* Emoji Hover Popover */}
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex items-center gap-1 bg-[var(--surface-page)] border border-[var(--border-main)] shadow-xl p-1 rounded-full scale-0 group-hover:scale-100 origin-bottom transition-transform duration-200 ease-out">
                    {['👍','❤️','😂','😮','😢','😡'].map(emoji => (
                       <button 
                         key={emoji} 
                         onClick={(e) => { e.stopPropagation(); handleLikeClick(e, activeReel.id); }} 
                         className="w-8 h-8 flex items-center justify-center text-xl hover:scale-125 transition-transform hover:bg-[var(--surface-subtle)] rounded-full cursor-pointer"
                       >
                         {emoji}
                       </button>
                    ))}
                 </div>
                 <button 
                   onClick={(e) => handleLikeClick(e, activeReel.id)} 
                   className={`w-full flex items-center justify-center gap-2 py-2 rounded-md hover:bg-[var(--surface-subtle)] font-bold text-[14px] cursor-pointer transition-colors ${likeData.liked ? 'text-blue-500' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                 >
                   <ThumbsUp size={18} className={likeData.liked ? 'fill-current' : ''} /> {isRtl ? 'أعجبني' : 'Like'}
                 </button>
               </div>
               
               <button 
                 onClick={() => { setActiveCommentReelId(activeReel.id); setCommentInput(''); }}
                 className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md hover:bg-[var(--surface-subtle)] font-bold text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
               >
                 <MessageSquare size={18} /> {isRtl ? 'تعليق' : 'Comment'}
               </button>

               <button 
                 onClick={(e) => openShareSheet(e, activeReel)}
                 className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md hover:bg-[var(--surface-subtle)] font-bold text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
               >
                 <Share2 size={18} /> {isRtl ? 'مشاركة' : 'Share'}
               </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
              {(!commentsMap[activeReel.id] || commentsMap[activeReel.id].length === 0) ? (
                 <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)] space-y-3">
                   <div className="w-12 h-12 rounded-full border-2 border-dashed border-[var(--border-main)] flex items-center justify-center">
                     <MessageSquare size={20} className="opacity-50" />
                   </div>
                   <p className="text-xs font-bold">{isRtl ? 'لا توجد تعليقات حتى الآن.' : 'No comments yet.'}</p>
                 </div>
              ) : (
                commentsMap[activeReel.id].map((comment, cIdx) => (
                  <div key={`ds-comment-${comment.id || cIdx}`} className="flex gap-2 items-start text-[13px] group">
                    <div className="shrink-0 pt-1">
                      <BulletinAvatar src={comment.author_avatar} alt={comment.author_name} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col text-[var(--text-primary)]">
                        <span className="font-extrabold text-[13px]">{comment.author_name}</span>
                        <p className="text-[13px] leading-relaxed break-words">{comment.content || (comment as any).comment_text || ''}</p>
                      </div>
                      <div className="flex items-center gap-2.5 mt-1 text-[11px] text-[var(--text-muted)] font-bold">
                        <span>{getTimeAgo(comment.created_at)}</span>
                        <button type="button" onClick={() => onToggleCommentLike && onToggleCommentLike(activeReel.id, comment.id, 'like')} className={`hover:underline transition-colors cursor-pointer ${comment.user_reaction ? 'text-blue-500 font-extrabold' : 'hover:text-[var(--text-primary)]'}`}>
                          {isRtl ? 'إعجاب' : 'Like'}
                        </button>
                        <button type="button" onClick={() => { setActiveCommentReelId(activeReel.id); setCommentInput(`@${comment.author_name} `); }} className="hover:underline hover:text-[var(--text-primary)] cursor-pointer">
                          {isRtl ? 'رد' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input (Sticky Bottom) */}
            <div className="p-3 border-t border-[var(--border-main)] bg-[var(--surface-page)] z-10 flex items-center gap-2">
              <BulletinAvatar src={user?.avatar} alt={user?.name || 'User'} size="sm" className="shrink-0" />
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!commentInput.trim() || !activeReel.id) return;
                if (!token) {
                  toast.error(isRtl ? 'يرجى تسجيل الدخول لإضافة تعليق' : 'Please log in to comment');
                  return;
                }
                setIsSubmittingComment(true);
                try {
                  if (onAddComment) await onAddComment(activeReel.id, commentInput.trim());
                  setCommentInput('');
                } catch (err) {
                  toast.error(isRtl ? 'تعذر الإرسال' : 'Failed to send');
                } finally { setIsSubmittingComment(false); }
              }} className="flex-1 bg-[var(--surface-subtle)] rounded-full flex items-center px-3 py-1 border border-[var(--border-main)] focus-within:border-blue-500 transition-colors">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => {
                     if (activeCommentReelId !== activeReel.id) setActiveCommentReelId(activeReel.id);
                     setCommentInput(e.target.value);
                  }}
                  placeholder={isRtl ? 'تعليق باسم ' + (user?.name || 'مستخدم') + '...' : 'Comment as ' + (user?.name || 'user') + '...'}
                  className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] text-[13px] focus:outline-none py-1.5"
                />
                <div className="flex items-center gap-0.5 text-[var(--text-muted)] shrink-0">
                  <button type="button" className="p-1 hover:bg-[var(--surface-card)] rounded-full transition-colors cursor-pointer"><Smile size={16} /></button>
                  <button type="button" className="p-1 hover:bg-[var(--surface-card)] rounded-full transition-colors cursor-pointer"><Camera size={16} /></button>
                  <button type="button" className="p-1 hover:bg-[var(--surface-card)] rounded-full transition-colors cursor-pointer"><ImageIcon size={16} /></button>
                </div>
              </form>
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
                  className="p-1.5 rounded-full hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col py-2">
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
                <div className="h-px bg-[var(--border-main)] my-1 w-full" />
                <button className="flex items-center gap-3 px-5 py-3 hover:bg-red-500/10 transition-colors text-red-500 cursor-pointer">
                  <Flag size={20} />
                  <span className="font-semibold text-sm">{isRtl ? 'الإبلاغ عن المنشور' : 'Report Post'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReelsFeed;
