import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, RotateCw,
  Maximize2, Minimize2, Tag, Download, MessageSquare, Share2,
  Smile, Send, ExternalLink, MoreHorizontal, Rocket, FileText,
  Camera, Film, Sparkles, Copy, Check, ThumbsUp, Globe,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Edit3, ArrowRight, ArrowLeft, Users, Loader2, Play, Pause, Lock, Handshake
} from 'lucide-react';
import { BulletinAd, BulletinAdComment } from '../../server/db/types';
import { getMediaUrl } from '../utils/mediaUtils';
import { BulletinAvatar } from './BulletinAvatar';
import { toast } from '../context/NotificationContext';
import { PostOptionsMenu } from './PostOptionsMenu';

export interface LightboxMediaItem {
  id?: string;
  url: string;
  type?: 'image' | 'video';
  caption?: string;
  thumbnailUrl?: string;
}

export interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LightboxMediaItem[];
  initialIndex?: number;
  isRtl: boolean;
  postTitle?: string;
  authorName?: string;
  ad?: BulletinAd | null;
  comments?: BulletinAdComment[];
  loadingComments?: boolean;
  onToggleLike?: (adId: number) => void;
  onAddComment?: (adId: number, content: string) => Promise<void>;
  onToggleCommentLike?: (adId: number, commentId: number, reaction?: string) => void;
  onShare?: (ad: BulletinAd) => void;
  onBoostAd?: (ad: BulletinAd) => void;
  onEditAd?: (ad: BulletinAd) => void;
  onViewPost?: (adId: number) => void;
  onArchiveAd?: (ad: BulletinAd) => void;
  onTrashAd?: (ad: BulletinAd) => void;
  onToggleSave?: (ad: BulletinAd) => void;
  onUpdateAd?: (updatedAd: Partial<BulletinAd> & { id: number }) => void;
  user?: any;
  token?: string | null;
}

const FB_REACTIONS = [
  { id: 'like', labelAr: 'أعجبني', labelEn: 'Like', emoji: '👍', color: 'text-blue-500' },
  { id: 'love', labelAr: 'أحببته', labelEn: 'Love', emoji: '❤️', color: 'text-red-500' },
  { id: 'care', labelAr: 'أدعمه', labelEn: 'Care', emoji: '🥰', color: 'text-amber-500' },
  { id: 'haha', labelAr: 'هاهاها', labelEn: 'Haha', emoji: '😂', color: 'text-amber-500' },
  { id: 'wow', labelAr: 'واو', labelEn: 'Wow', emoji: '😮', color: 'text-amber-500' },
  { id: 'sad', labelAr: 'أحزنني', labelEn: 'Sad', emoji: '😢', color: 'text-amber-500' },
  { id: 'angry', labelAr: 'أغضبني', labelEn: 'Angry', emoji: '😡', color: 'text-orange-600' }
];

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '😮', '🎉', '💯', '🚀', '😍', '✨', '🙏'];

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

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  isOpen,
  onClose,
  items,
  initialIndex = 0,
  isRtl,
  postTitle,
  authorName,
  ad,
  comments,
  loadingComments: propLoadingComments,
  onToggleLike,
  onAddComment,
  onToggleCommentLike,
  onShare,
  onBoostAd,
  onEditAd,
  onViewPost,
  onArchiveAd,
  onTrashAd,
  onToggleSave,
  onUpdateAd,
  user,
  token
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Engagement & Reactions State
  const [userReaction, setUserReaction] = useState<string | null>(ad?.user_has_liked ? 'like' : null);
  const [likesCount, setLikesCount] = useState(ad?.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(ad?.comments_count || 0);
  const [isHoveringReactions, setIsHoveringReactions] = useState(false);
  const [hoveredReactionId, setHoveredReactionId] = useState<string | null>(null);
  const hoverReactionTimerRef = useRef<any>(null);
  const touchTimerRef = useRef<any>(null);

  // Comments State
  const [commentsList, setCommentsList] = useState<BulletinAdComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const commentsScrollRef = useRef<HTMLDivElement>(null);

  // Share Menu State
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const handleDirectShare = async () => {
    if (!ad) return;
    if (onShare) {
      onShare(ad);
      return;
    }
    const shareUrl = `${window.location.origin}/bulletin/${ad.id}`;
    try {
      fetch(`/api/bulletin/ads/${ad.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user?.id,
          sharer_name: user?.name || user?.email,
        })
      }).catch(() => {});
    } catch (e) {}

    if (navigator.share) {
      try {
        await navigator.share({
          title: ad.title || postTitle || (isRtl ? 'منشور ببربليكستا' : 'Perplexta Post'),
          text: ad.description || (isRtl ? 'شاهد هذا المنشور' : 'Check out this post'),
          url: shareUrl
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

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
      toast.success(isRtl ? 'تم نسخ رابط المنشور بنجاح' : 'Post link copied to clipboard');
    } catch (err) {}
  };

  // Workspace Dominance Protocol: Isolate canvas & hide extraneous background sidebars
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('workspace-focus-mode', 'media-viewer-active');
      document.documentElement.classList.add('workspace-focus-mode');
    } else {
      document.body.classList.remove('workspace-focus-mode', 'media-viewer-active');
      document.documentElement.classList.remove('workspace-focus-mode');
    }
    return () => {
      document.body.classList.remove('workspace-focus-mode', 'media-viewer-active');
      document.documentElement.classList.remove('workspace-focus-mode');
    };
  }, [isOpen]);

  // Sync index and ad data when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, items.length - 1)));
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setIsSlideshowPlaying(false);
      setIsFullscreen(!!document.fullscreenElement);
      setUserReaction(ad?.user_has_liked ? 'like' : null);
      setLikesCount(ad?.likes_count || 0);
      setCommentsCount(ad?.comments_count || 0);
    }
  }, [isOpen, initialIndex, items.length, ad]);

  // Fetch comments if ad is provided and comments are not passed
  useEffect(() => {
    if (!isOpen || !ad) return;

    if (comments && comments.length > 0) {
      setCommentsList(comments);
      return;
    }

    let isMounted = true;
    setIsLoadingComments(true);
    fetch(`/api/bulletin/ads/${ad.id}/comments`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success) {
          setCommentsList(data.comments || []);
          if (data.comments?.length) {
            setCommentsCount(data.comments.length);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingComments(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, ad, comments]);

  const totalCount = items.length;
  const currentItem = items[currentIndex];

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? totalCount - 1 : prev - 1));
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  }, [totalCount]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === totalCount - 1 ? 0 : prev + 1));
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  }, [totalCount]);

  const handleZoomIn = () => {
    setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(1, +(z - 0.25).toFixed(2));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const toggleSlideshow = () => {
    setIsSlideshowPlaying((prev) => !prev);
  };

  // Slideshow automatic advancement
  useEffect(() => {
    if (!isSlideshowPlaying || totalCount <= 1) return;
    const interval = setInterval(() => {
      handleNext();
    }, 4000);
    return () => clearInterval(interval);
  }, [isSlideshowPlaying, totalCount, handleNext]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in comment input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (isRtl) handlePrev();
        else handleNext();
      } else if (e.key === 'ArrowLeft') {
        if (isRtl) handleNext();
        else handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRotate();
      } else if (e.key === ' ' && totalCount > 1) {
        e.preventDefault();
        toggleSlideshow();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRtl, handleNext, handlePrev, onClose, totalCount, isSlideshowPlaying]);

  // Mouse pan handlers for zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Double click to toggle zoom (1x <-> 2x)
  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      handleResetZoom();
    }
  };

  // Reaction picker hover & touch handlers (Rock-solid Facebook-grade stability)
  const handleLikeMouseEnter = () => {
    if (hoverReactionTimerRef.current) {
      clearTimeout(hoverReactionTimerRef.current);
      hoverReactionTimerRef.current = null;
    }
    setIsHoveringReactions(true);
  };

  const handleLikeMouseLeave = () => {
    if (hoverReactionTimerRef.current) {
      clearTimeout(hoverReactionTimerRef.current);
    }
    hoverReactionTimerRef.current = setTimeout(() => {
      setIsHoveringReactions(false);
      setHoveredReactionId(null);
      hoverReactionTimerRef.current = null;
    }, 650);
  };

  const handleTouchStartLike = () => {
    touchTimerRef.current = setTimeout(() => {
      setIsHoveringReactions(true);
    }, 350);
  };

  const handleTouchEndLike = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleSelectReaction = (reactionId: string) => {
    if (hoverReactionTimerRef.current) {
      clearTimeout(hoverReactionTimerRef.current);
      hoverReactionTimerRef.current = null;
    }
    setIsHoveringReactions(false);
    setHoveredReactionId(null);
    if (!ad) return;

    if (userReaction === reactionId) {
      // Toggle off
      setUserReaction(null);
      setLikesCount((prev) => Math.max(0, prev - 1));
      if (onToggleLike) onToggleLike(ad.id);
    } else {
      // Set new reaction
      if (!userReaction) {
        setLikesCount((prev) => prev + 1);
      }
      setUserReaction(reactionId);
      if (onToggleLike) onToggleLike(ad.id);
    }
  };

  const handleDirectLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hoverReactionTimerRef.current) {
      clearTimeout(hoverReactionTimerRef.current);
      hoverReactionTimerRef.current = null;
    }
    setIsHoveringReactions(false);
    setHoveredReactionId(null);

    if (!ad) return;
    if (userReaction) {
      setUserReaction(null);
      setLikesCount((prev) => Math.max(0, prev - 1));
    } else {
      setUserReaction('like');
      setLikesCount((prev) => prev + 1);
    }
    if (onToggleLike) onToggleLike(ad.id);
  };

  // Comment submission handler
  const handleSendComment = async () => {
    const text = newCommentText.trim();
    if (!text || isSubmittingComment) return;

    if (!token && !user) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول للتعليق' : 'Please log in to comment');
      return;
    }
    if (!ad) return;

    setIsSubmittingComment(true);
    setNewCommentText('');
    setShowEmojiPicker(false);

    // Optimistic comment
    const tempComment: BulletinAdComment = {
      id: Date.now(),
      ad_id: ad.id,
      user_id: user?.id || 0,
      author_name: user?.name || user?.email || (isRtl ? 'أنا' : 'Me'),
      author_avatar: user?.avatar || null,
      content: text,
      created_at: new Date().toISOString()
    };
    setCommentsList((prev) => [...prev, tempComment]);
    setCommentsCount((c) => c + 1);

    // Scroll to bottom
    setTimeout(() => {
      if (commentsScrollRef.current) {
        commentsScrollRef.current.scrollTop = commentsScrollRef.current.scrollHeight;
      }
    }, 50);

    try {
      if (onAddComment) {
        await onAddComment(ad.id, text);
      } else {
        const res = await fetch(`/api/bulletin/ads/${ad.id}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ content: text })
        });
        const data = await res.json();
        if (!data.success) {
          toast.error(data.error || (isRtl ? 'فشل إرسال التعليق' : 'Failed to send comment'));
        }
      }
      toast.success(isRtl ? 'تمت إضافة تعليقك بنجاح' : 'Comment posted successfully');
    } catch (err) {
      toast.error(isRtl ? 'تعذر إرسال التعليق' : 'Could not post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Copy post link (inline button state provides feedback without redundant toast collision)
  const handleCopyLink = () => {
    if (!ad) return;
    const url = `${window.location.origin}/bulletin?ad=${ad.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setIsCopiedLink(true);
        setTimeout(() => setIsCopiedLink(false), 2000);
      }).catch(() => {
        fallbackCopyModalLink(url);
      });
    } else {
      fallbackCopyModalLink(url);
    }
  };

  const fallbackCopyModalLink = (url: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setIsCopiedLink(true);
      setTimeout(() => setIsCopiedLink(false), 2000);
    } catch {}
    document.body.removeChild(textarea);
  };

  // Download media
  const handleDownload = () => {
    if (!currentItem?.url) return;
    const link = document.createElement('a');
    link.href = getMediaUrl(currentItem.url);
    link.download = `media-${currentIndex + 1}.${currentItem.type === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(isRtl ? 'بدأ تحميل الوسائط' : 'Download started');
  };

  if (!isOpen || !currentItem) return null;

  const isVideo = currentItem.type === 'video' || (currentItem.url && (currentItem.url.endsWith('.mp4') || currentItem.url.endsWith('.webm') || currentItem.url.includes('/video')));
  const mediaSrc = getMediaUrl(currentItem.url);
  const activeReactionObj = FB_REACTIONS.find((r) => r.id === userReaction);
  const isOwnerOrAdmin = Boolean(user && ad && (user.id === ad.user_id || user.role === 'admin' || user.is_admin));
  const isCommentsDisabled = Boolean(ad?.who_can_comment === 'nobody' && !isOwnerOrAdmin);

  // Sidebar content (Shared between desktop side-edge and mobile bottom-sheet)
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-[#18191a] text-gray-900 dark:text-gray-100 divide-y divide-gray-100 dark:divide-zinc-800">
      {/* 1. Header Bar: View Post + More Options */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between shrink-0 bg-gray-50/70 dark:bg-zinc-900/60">
        <button
          type="button"
          onClick={() => {
            if (onViewPost && ad) {
              onViewPost(ad.id);
            } else if (ad) {
              onClose();
              const el = document.getElementById(`bulletin-ad-${ad.id}`);
              el?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent font-bold text-xs transition-colors cursor-pointer"
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

          {ad && (
            <PostOptionsMenu
              ad={ad}
              user={user}
              token={token}
              isRtl={isRtl}
              isOpen={showOptionsMenu}
              onClose={() => setShowOptionsMenu(false)}
              onSaveAd={onToggleSave ? () => onToggleSave(ad) : undefined}
              onEditAd={onEditAd ? () => {
                onClose();
                onEditAd(ad);
              } : undefined}
              onBoostAd={onBoostAd ? () => {
                onClose();
                onBoostAd(ad);
              } : undefined}
              onArchiveAd={onArchiveAd ? () => {
                onClose();
                onArchiveAd(ad);
              } : undefined}
              onTrashAd={onTrashAd ? () => {
                onClose();
                onTrashAd(ad);
              } : undefined}
              onUpdateAd={onUpdateAd}
              onHideAd={() => {
                onClose();
                toast.info(isRtl ? 'تم إخفاء هذا المنشور' : 'Post hidden');
              }}
              dropdownAlign={isRtl ? 'left' : 'right'}
            />
          )}
        </div>
      </div>

      {/* Paid Partnership Banner if enabled */}
      {ad && (ad.partnership_label_enabled || ad.is_partnership) && (
        <div className="px-3.5 sm:px-4 py-2 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
          <Handshake size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            {isRtl ? 'شراكة مدفوعة' : 'Paid Partnership'}
            {(ad.partnership_sponsor_name || ad.partnership_brand) && (
              <span className="font-extrabold mx-1 text-gray-900 dark:text-gray-100">
                • {ad.partnership_sponsor_name || ad.partnership_brand}
              </span>
            )}
          </span>
        </div>
      )}

      {/* 2. Author Profile Section */}
      <div className="p-3.5 sm:p-4 flex items-center gap-3 shrink-0">
        <BulletinAvatar
          src={ad?.author_avatar}
          alt={ad?.author_name || authorName || ''}
          size="md"
          isPage={Boolean(ad?.page_id)}
          verified={Boolean(ad?.page_is_verified)}
          fallbackText={ad?.author_name || authorName}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-sm truncate text-gray-900 dark:text-white">
            {ad?.author_name || authorName || (isRtl ? 'مستخدم المنصة' : 'Platform User')}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            <span>{formatRelativeTime(ad?.created_at, isRtl)}</span>
            <span>•</span>
            <span
              className="flex items-center gap-1 cursor-help"
              title={
                ad?.audience === 'friends'
                  ? isRtl ? 'الجمهور: الأصدقاء' : 'Audience: Friends'
                  : ad?.audience === 'only_me'
                  ? isRtl ? 'الجمهور: أنا فقط' : 'Audience: Only me'
                  : isRtl ? 'الجمهور: عام' : 'Audience: Public'
              }
            >
              {ad?.audience === 'friends' ? (
                <Users size={11} className="text-blue-500" />
              ) : ad?.audience === 'only_me' ? (
                <Lock size={11} className="text-amber-500" />
              ) : (
                <Globe size={11} />
              )}
              <span>
                {ad?.audience === 'friends'
                  ? isRtl ? 'الأصدقاء' : 'Friends'
                  : ad?.audience === 'only_me'
                  ? isRtl ? 'أنا فقط' : 'Only me'
                  : isRtl ? 'عام' : 'Public'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* AI Assistance Label if present */}
      {ad?.is_ai_generated && (
        <div className="mx-3.5 sm:mx-4 mb-2 px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold flex items-center gap-1.5 shrink-0">
          <Sparkles size={13} className="text-indigo-500 shrink-0" />
          <span>{isRtl ? 'مُنشأ بمساعدة الذكاء الاصطناعي' : 'Created with AI assistance'}</span>
        </div>
      )}

      {/* 3. Post Description & Media Caption */}
      <div className="p-3.5 sm:p-4 space-y-2.5 max-h-48 overflow-y-auto shrink-0 border-b border-gray-100 dark:border-zinc-800 text-xs leading-relaxed">
        {ad?.title && (
          <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
            {ad.title}
          </h4>
        )}
        {ad?.description && (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line break-words">
            {ad.description}
          </p>
        )}
        {currentItem.caption && currentItem.caption.trim() !== '' && (
          <div className="p-2.5 rounded-xl bg-accent/5 dark:bg-accent/10 border border-accent/20 text-accent font-medium text-xs">
            <span className="font-bold block mb-0.5 text-[11px]">{isRtl ? '📌 وصف هذه الصورة:' : '📌 Photo caption:'}</span>
            {currentItem.caption}
          </div>
        )}

        {/* Action Buttons: Edit (owner) & Boost Post */}
        <div className="flex items-center gap-2 pt-1">
          {isOwnerOrAdmin && onEditAd && ad && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditAd(ad);
              }}
              className="flex-1 py-1.5 px-3 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 size={13} />
              <span>{isRtl ? 'تعديل' : 'Edit'}</span>
            </button>
          )}

          {onBoostAd && ad && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onBoostAd(ad);
              }}
              className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Rocket size={13} />
              <span>{isRtl ? 'ترويج المنشور' : 'Boost Post'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Engagement Counters Row */}
      <div className="px-4 py-2.5 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
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
            <strong className="font-bold text-gray-700 dark:text-gray-300 font-mono">{ad?.shares_count || 0}</strong>{' '}
            {isRtl ? 'مشاركة' : 'shares'}
          </span>
        </div>
      </div>

      {/* 5. Interactive Engagement Action Bar (أعجبني / تعليق / مشاركة) */}
      <div className="px-2 py-1.5 flex items-center justify-between border-y border-gray-100 dark:border-zinc-800 shrink-0 relative">
        {/* Like Button with Hover Reaction Bar */}
        <div
          className="relative flex-1"
          onMouseEnter={handleLikeMouseEnter}
          onMouseLeave={handleLikeMouseLeave}
        >
          {/* Facebook Emoji Reactions Floating Bar with Rock-Solid Invisible Bridge */}
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
                  className="flex items-center gap-1 sm:gap-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-2 sm:px-2.5 py-1.5 rounded-[8px] border border-gray-200/90 dark:border-zinc-700/90 shadow-2xl ring-1 ring-black/5 select-none"
                  onMouseEnter={handleLikeMouseEnter}
                  onMouseLeave={handleLikeMouseLeave}
                >
                  {FB_REACTIONS.map((reac) => (
                    <button
                      key={reac.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleSelectReaction(reac.id);
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
            onClick={handleDirectLikeClick}
            onTouchStart={handleTouchStartLike}
            onTouchEnd={handleTouchEndLike}
            onContextMenu={(e) => {
              e.preventDefault();
              setIsHoveringReactions((prev) => !prev);
            }}
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
          onClick={handleDirectShare}
          className="flex-1 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-1.5 font-bold text-xs transition-colors cursor-pointer"
        >
          <Share2 size={15} />
          <span>{isRtl ? 'مشاركة' : 'Share'}</span>
        </button>
      </div>

      {/* 6. Comments List Area */}
      <div
        ref={commentsScrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px]"
      >
        {isLoadingComments || propLoadingComments ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400">
            <Loader2 size={24} className="animate-spin text-accent" />
            <span className="text-xs">{isRtl ? 'جاري تحميل التعليقات...' : 'Loading comments...'}</span>
          </div>
        ) : commentsList.length === 0 ? (
          /* Empty Comments State - Exactly as in the user's video clip! */
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
          commentsList.map((comm) => (
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
                    {comm.content}
                  </p>
                </div>
                <div className="flex items-center gap-3 px-2 mt-1 text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                  <span className="font-medium text-gray-400">{formatRelativeTime(comm.created_at, isRtl)}</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (onToggleCommentLike && ad) {
                        onToggleCommentLike(ad.id, comm.id, 'like');
                        // Optimistically update local state for the modal
                        setCommentsList(prev => prev.map(c => {
                          if (c.id === comm.id) {
                            const isRemoving = c.user_reaction === 'like';
                            return {
                              ...c,
                              user_reaction: isRemoving ? null : 'like',
                              like_count: Math.max(0, (c.like_count || 0) + (isRemoving ? -1 : (c.user_reaction ? 0 : 1)))
                            };
                          }
                          return c;
                        }));
                      }
                    }}
                    className={`hover:underline cursor-pointer ${comm.user_reaction ? 'text-accent font-bold' : 'hover:text-gray-700 dark:hover:text-gray-200'}`}
                  >
                    {comm.user_reaction ? (isRtl ? 'أعجبني' : 'Liked') : (isRtl ? 'إعجاب' : 'Like')}
                    {comm.like_count ? ` (${comm.like_count})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCommentText(`@${comm.author_name} `);
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

      {/* 7. Sticky Bottom Comment Composer (Fixed at bottom as shown in video) */}
      <div className="p-3 shrink-0 bg-white dark:bg-[#18191a] border-t border-gray-200 dark:border-zinc-800 relative">
        {/* Quick Emoji Popover */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`absolute bottom-full mb-2 ${isRtl ? 'left-3' : 'right-3'} p-2 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-2xl grid grid-cols-6 gap-1 z-50`}
            >
              {QUICK_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setNewCommentText((prev) => prev + em);
                    setShowEmojiPicker(false);
                    commentInputRef.current?.focus();
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  {em}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {isCommentsDisabled ? (
          <div className="py-2.5 px-3.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 text-xs flex items-center justify-center gap-2 border border-gray-200 dark:border-zinc-700/60 font-medium">
            <Lock size={13} className="text-gray-400 shrink-0" />
            <span>{isRtl ? 'قام الناشر بإيقاف التعليقات على هذا المنشور' : 'Comments are turned off for this post'}</span>
          </div>
        ) : (
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
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                placeholder={
                  isRtl
                    ? `تعليق باسم ${user?.name || 'المستخدم'}...`
                    : `Comment as ${user?.name || 'User'}...`
                }
                className="flex-1 bg-transparent text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none py-1"
              />

              {/* Quick Emoji Tool */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="text-gray-400 hover:text-amber-500 p-1 transition-colors cursor-pointer"
                title={isRtl ? 'إدراج رمز تعبيري' : 'Insert emoji'}
              >
                <Smile size={16} />
              </button>

              {/* Camera / Photo Attachment Hint */}
              <button
                type="button"
                onClick={() => toast.info(isRtl ? 'إرفاق الصور في التعليقات متاح للأعضاء المميزين' : 'Image comments available')}
                className="text-gray-400 hover:text-blue-500 p-1 transition-colors cursor-pointer"
                title={isRtl ? 'إرفاق صورة' : 'Attach photo'}
              >
                <Camera size={16} />
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={handleSendComment}
                disabled={!newCommentText.trim() || isSubmittingComment}
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
        )}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[500] flex bg-white/95 dark:bg-black/95 select-none overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* ========================================================================= */}
        {/* 1. MAIN STAGE: PHOTO / VIDEO DISPLAY AREA                                 */}
        {/* ========================================================================= */}
        <div
          className="flex-1 h-full min-w-0 flex flex-col items-center justify-center relative overflow-hidden bg-white/95 dark:bg-black/95"
          onClick={onClose}
        >
          {/* Floating Top Bar (Controls & Tools) */}
          <div
            className="absolute top-0 inset-x-0 z-40 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-white/90 via-white/50 dark:from-black/80 dark:via-black/40 to-transparent pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Section (Controls) */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-900 dark:text-white">
              {/* Zoom Out (-) */}
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="w-9 h-9 rounded-[8px] bg-white/90 dark:bg-black/50 hover:bg-gray-100 dark:hover:bg-white/20 disabled:opacity-30 text-gray-900 dark:text-white flex items-center justify-center transition-colors cursor-pointer border border-gray-200 dark:border-white/10 shadow-sm"
                title={isRtl ? 'تصغير (-)' : 'Zoom out (-)'}
              >
                <ZoomOut size={17} />
              </button>

              {/* Current Zoom Indicator & Reset */}
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2.5 py-1 rounded-[8px] bg-white/90 dark:bg-black/50 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-900 dark:text-white text-xs font-mono font-bold flex items-center gap-1 border border-gray-200 dark:border-white/10 transition-colors cursor-pointer shadow-sm"
                title={isRtl ? 'إعادة ضبط الحجم (0)' : 'Reset zoom (0)'}
              >
                <RotateCcw size={12} />
                <span>{Math.round(zoom * 100)}%</span>
              </button>

              {/* Zoom In (+) */}
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="w-9 h-9 rounded-[8px] bg-white/90 dark:bg-black/50 hover:bg-gray-100 dark:hover:bg-white/20 disabled:opacity-30 text-gray-900 dark:text-white flex items-center justify-center transition-colors cursor-pointer border border-gray-200 dark:border-white/10 shadow-sm"
                title={isRtl ? 'تكبير (+)' : 'Zoom in (+)'}
              >
                <ZoomIn size={17} />
              </button>

              {/* Rotate Tool */}
              <button
                type="button"
                onClick={handleRotate}
                className="w-9 h-9 rounded-[8px] bg-white/90 dark:bg-black/50 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-900 dark:text-white flex items-center justify-center transition-colors cursor-pointer border border-gray-200 dark:border-white/10 shadow-sm"
                title={isRtl ? 'تدوير الصورة 90° (R)' : 'Rotate 90° (R)'}
              >
                <RotateCw size={16} />
              </button>

              {/* Slideshow Auto-play */}
              {totalCount > 1 && (
                <button
                  type="button"
                  onClick={toggleSlideshow}
                  className={`w-9 h-9 rounded-[8px] flex items-center justify-center transition-colors cursor-pointer border shadow-sm ${
                    isSlideshowPlaying
                      ? 'bg-amber-500/30 text-amber-600 dark:text-amber-300 border-amber-500/50'
                      : 'bg-white/90 dark:bg-black/50 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-900 dark:text-white border-gray-200 dark:border-white/10'
                  }`}
                  title={
                    isSlideshowPlaying
                      ? isRtl ? 'إيقاف العرض التلقائي (Space)' : 'Pause slideshow (Space)'
                      : isRtl ? 'تشغيل العرض التلقائي (Space)' : 'Play slideshow (Space)'
                  }
                >
                  {isSlideshowPlaying ? <Pause size={15} /> : <Play size={15} />}
                </button>
              )}

              {/* Tag Photo Tool */}
              <button
                type="button"
                onClick={() => toast.info(isRtl ? 'أداة الإشارة إلى الصور نشطة 🏷️' : 'Photo tag tool active 🏷️')}
                className="w-9 h-9 rounded-[8px] bg-white/90 dark:bg-black/50 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-900 dark:text-white flex items-center justify-center transition-colors cursor-pointer border border-gray-200 dark:border-white/10 shadow-sm"
                title={isRtl ? 'الإشارة إلى الأشخاص' : 'Tag photo'}
              >
                <Tag size={16} />
              </button>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-9 h-9 rounded-[8px] bg-white/90 dark:bg-black/50 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-900 dark:text-white flex items-center justify-center transition-colors cursor-pointer border border-gray-200 dark:border-white/10 shadow-sm"
                title={isRtl ? 'ملء الشاشة (F)' : 'Fullscreen (F)'}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              {/* Download Media */}
              <button
                type="button"
                onClick={handleDownload}
                className="w-9 h-9 rounded-[8px] bg-white/90 dark:bg-black/50 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-900 dark:text-white flex items-center justify-center transition-colors cursor-pointer border border-gray-200 dark:border-white/10 shadow-sm"
                title={isRtl ? 'تنزيل الوسائط' : 'Download'}
              >
                <Download size={16} />
              </button>
            </div>

            {/* Center Section: Photo Counter Pill */}
            {totalCount > 1 && (
              <div className="hidden sm:flex items-center px-3 py-1 rounded-[8px] bg-white/90 dark:bg-black/60 text-gray-900 dark:text-white text-xs font-mono font-bold backdrop-blur-md border border-gray-200 dark:border-white/15 shadow-md">
                {currentIndex + 1} / {totalCount}
              </div>
            )}

            {/* Right Section: Toggle Edge Sidebar & Close Button */}
            <div className="flex items-center gap-2">
              {/* Toggle Sidebar (Desktop only) */}
              <button
                type="button"
                onClick={() => setShowSidebar((prev) => !prev)}
                className="hidden lg:flex w-9 h-9 rounded-[8px] bg-white/90 dark:bg-black/50 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-900 dark:text-white items-center justify-center transition-colors cursor-pointer border border-gray-200 dark:border-white/10 shadow-sm"
                title={
                  showSidebar
                    ? isRtl ? 'إخفاء الشريط الجانبي' : 'Hide sidebar'
                    : isRtl ? 'إظهار الشريط الجانبي' : 'Show sidebar'
                }
              >
                {showSidebar ? (
                  isRtl ? <PanelRightClose size={17} /> : <PanelLeftClose size={17} />
                ) : (
                  isRtl ? <PanelRightOpen size={17} /> : <PanelLeftOpen size={17} />
                )}
              </button>

              {/* Close Button (X) */}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-[8px] bg-white/90 dark:bg-black/50 hover:bg-rose-600/80 text-gray-900 dark:text-white hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-gray-200 dark:border-white/10 shadow-sm"
                title={isRtl ? 'إغلاق (Esc)' : 'Close (Esc)'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Desktop Floating Edge Dock (Exploiting screen margin for dedicated quick tools) */}
          <div
            className={`hidden lg:flex flex-col items-center gap-1.5 absolute top-1/2 -translate-y-1/2 z-40 p-2 rounded-2xl bg-white/90 dark:bg-black/65 backdrop-blur-xl border border-gray-200 dark:border-white/15 shadow-2xl pointer-events-auto transition-all ${
              isRtl ? 'right-4 xl:right-6' : 'left-4 xl:left-6'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Rotate Button */}
            <button
              type="button"
              onClick={handleRotate}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={isRtl ? 'تدوير الصورة 90 درجة (R)' : 'Rotate 90° (R)'}
            >
              <RotateCw size={17} />
            </button>

            {/* Slideshow Auto-play */}
            {totalCount > 1 && (
              <button
                type="button"
                onClick={toggleSlideshow}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  isSlideshowPlaying
                    ? 'bg-amber-500/30 text-amber-600 dark:text-amber-300 border border-amber-500/50 ring-1 ring-amber-400'
                    : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white'
                }`}
                title={
                  isSlideshowPlaying
                    ? isRtl ? 'إيقاف العرض التلقائي (Space)' : 'Pause slideshow (Space)'
                    : isRtl ? 'تشغيل العرض التلقائي (Space)' : 'Play slideshow (Space)'
                }
              >
                {isSlideshowPlaying ? <Pause size={17} /> : <Play size={17} />}
              </button>
            )}

            <div className="w-6 h-px bg-gray-200 dark:bg-white/15 my-0.5" />

            {/* Zoom In (+) */}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-30 text-gray-900 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={isRtl ? 'تكبير (+)' : 'Zoom in (+)'}
            >
              <ZoomIn size={17} />
            </button>

            {/* Zoom Reset / Value */}
            <button
              type="button"
              onClick={handleResetZoom}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer text-[10px] font-mono font-bold"
              title={isRtl ? 'إعادة ضبط الحجم (0)' : 'Reset zoom (0)'}
            >
              <RotateCcw size={13} className="mb-0.5" />
              <span>{Math.round(zoom * 100)}%</span>
            </button>

            {/* Zoom Out (-) */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-30 text-gray-900 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={isRtl ? 'تصغير (-)' : 'Zoom out (-)'}
            >
              <ZoomOut size={17} />
            </button>

            <div className="w-6 h-px bg-gray-200 dark:bg-white/15 my-0.5" />

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={isRtl ? 'تنزيل الوسائط' : 'Download media'}
            >
              <Download size={17} />
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={handleDirectShare}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={isRtl ? 'مشاركة' : 'Share'}
            >
              <Share2 size={17} />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={isRtl ? 'ملء الشاشة (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>

            {/* Toggle Edge Sidebar on Desktop */}
            <button
              type="button"
              onClick={() => setShowSidebar((prev) => !prev)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                showSidebar ? 'bg-accent text-white shadow-md' : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white'
              }`}
              title={
                showSidebar
                  ? isRtl ? 'إخفاء شريط التفاصيل' : 'Hide details sidebar'
                  : isRtl ? 'إظهار شريط التفاصيل' : 'Show details sidebar'
              }
            >
              {showSidebar ? (
                isRtl ? <PanelRightClose size={17} /> : <PanelLeftClose size={17} />
              ) : (
                isRtl ? <PanelRightOpen size={17} /> : <PanelLeftOpen size={17} />
              )}
            </button>
          </div>

          {/* Previous Media Arrow */}
          {totalCount > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isRtl) handleNext();
                else handlePrev();
              }}
              className={`absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-[8px] bg-white/90 dark:bg-black/60 hover:bg-white dark:hover:bg-black/90 text-gray-900 dark:text-white flex items-center justify-center transition-all cursor-pointer border border-gray-200 dark:border-white/20 shadow-2xl pointer-events-auto hover:scale-110 active:scale-95 ${
                !isRtl ? 'lg:left-22 xl:left-24' : ''
              }`}
              title={isRtl ? 'التالي' : 'Previous'}
            >
              {isRtl ? <ChevronRight size={26} /> : <ChevronLeft size={26} />}
            </button>
          )}

          {/* Next Media Arrow */}
          {totalCount > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isRtl) handlePrev();
                else handleNext();
              }}
              className={`absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-[8px] bg-white/90 dark:bg-black/60 hover:bg-white dark:hover:bg-black/90 text-gray-900 dark:text-white flex items-center justify-center transition-all cursor-pointer border border-gray-200 dark:border-white/20 shadow-2xl pointer-events-auto hover:scale-110 active:scale-95 ${
                isRtl ? 'lg:right-22 xl:right-24' : ''
              }`}
              title={isRtl ? 'السابق' : 'Next'}
            >
              {isRtl ? <ChevronLeft size={26} /> : <ChevronRight size={26} />}
            </button>
          )}

          {/* Media Center Stage */}
          <div
            className="w-full h-full flex items-center justify-center p-2 sm:p-8 select-none"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
          >
            {isVideo ? (
              <video
                key={mediaSrc}
                src={mediaSrc}
                controls
                autoPlay
                playsInline
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: 'transform 0.25s ease'
                }}
                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl bg-black object-contain outline-none"
              />
            ) : (
              <img
                key={mediaSrc}
                src={mediaSrc}
                alt={currentItem.caption || postTitle || 'Media'}
                onDoubleClick={handleDoubleClick}
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px) rotate(${rotation}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)'
                }}
                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain select-none"
                loading="eager"
                draggable={false}
              />
            )}
          </div>

          {/* Desktop Bottom Floating Thumbnail Strip */}
          {totalCount > 1 && (
            <div
              className="hidden lg:flex items-center gap-2 absolute bottom-4 left-1/2 -translate-x-1/2 z-40 px-3 py-2 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 shadow-2xl max-w-[85%] overflow-x-auto no-scrollbar pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((item, idx) => {
                const isSelected = idx === currentIndex;
                const isItemVideo = item.type === 'video' || (item.url && (item.url.endsWith('.mp4') || item.url.endsWith('.webm')));
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                      setRotation(0);
                    }}
                    className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-accent scale-105 ring-2 ring-accent/60 opacity-100 shadow-md'
                        : 'border-white/20 opacity-50 hover:opacity-90 hover:scale-100'
                    }`}
                    title={`${idx + 1} / ${totalCount}`}
                  >
                    {isItemVideo ? (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white">
                        <Film size={16} />
                      </div>
                    ) : (
                      <img
                        src={getMediaUrl(item.thumbnailUrl || item.url)}
                        alt=""
                        className="w-full h-full object-cover select-none"
                        loading="lazy"
                        draggable={false}
                      />
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-accent/20 pointer-events-none" />
                    )}
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-mono font-bold text-white drop-shadow">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Mobile Bottom Bar: Floating Pill to Open Details / Comments Drawer */}
          <div className="lg:hidden absolute bottom-4 inset-x-0 z-40 flex justify-center pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="px-4 py-2 rounded-[8px] bg-black/80 hover:bg-black text-white text-xs font-bold backdrop-blur-md border border-white/20 shadow-2xl flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <MessageSquare size={15} />
              <span>{isRtl ? 'التعليقات والتفاصيل' : 'Comments & Details'}</span>
              <span className="px-1.5 py-0.5 rounded-[6px] bg-white/20 text-[10px] font-mono">
                {commentsCount}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. DESKTOP EDGE SIDEBAR: FACEBOOK-STYLE TOOLS ON SCREEN EDGE              */}
        {/* ========================================================================= */}
        {showSidebar && (
          <div className="hidden lg:flex flex-col w-[380px] xl:w-[420px] 2xl:w-[460px] h-full shrink-0 border-s border-gray-200 dark:border-zinc-800 shadow-2xl z-30 overflow-hidden">
            {renderSidebarContent()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. MOBILE BOTTOM SHEET FOR COMMENTS / DETAILS                             */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isMobileDrawerOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end"
              onClick={() => setIsMobileDrawerOpen(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-full max-h-[85vh] h-[80vh] rounded-t-3xl overflow-hidden bg-white dark:bg-[#18191a] shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Pull handle */}
                <div className="w-12 h-1.5 rounded-[4px] bg-gray-300 dark:bg-zinc-700 mx-auto mt-2.5 mb-1 shrink-0" />
                <div className="flex-1 min-h-0 overflow-hidden">
                  {renderSidebarContent()}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};
