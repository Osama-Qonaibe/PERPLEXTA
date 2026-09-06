import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Volume2, VolumeX, Trash2, AlertTriangle, Loader2, ZoomIn, ZoomOut, Pause } from 'lucide-react';
import { getMediaUrl } from '../utils/mediaUtils';
import { BulletinAvatar } from './BulletinAvatar';
import { toast } from '../context/NotificationContext';
import { useAppContext } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';

interface Story {
  id: number;
  user_id: number;
  author_id?: number;
  author_name: string;
  author_avatar: string;
  title: string;
  description: string;
  image_url: string;
  video_url?: string;
  page_id?: number;
  page_name?: string;
  page_avatar?: string;
  impressions_count?: number;
  created_at: string;
}

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
  initialStoryIndex: number;
  currentUser: any;
  isRtl: boolean;
  onStoryViewed?: (storyId: number) => void;
  onStoryDeleted?: (storyId: number) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  isOpen,
  onClose,
  stories,
  initialStoryIndex,
  currentUser,
  isRtl,
  onStoryViewed,
  onStoryDeleted
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { theme, token } = useAppContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<any>(null);

  // Zoom / Pinch gesture states with automatic pause
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomTranslate, setZoomTranslate] = useState({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);
  const touchCenterRef = useRef<{ x: number; y: number } | null>(null);
  
  const currentStory = stories[currentIndex];
  const isZoomed = zoomScale > 1.05;
  
  const STORY_DURATION_MS = 5000;

  const resetZoom = () => {
    setZoomScale(1);
    setZoomTranslate({ x: 0, y: 0 });
    touchDistanceRef.current = null;
    touchCenterRef.current = null;
  };

  useEffect(() => {
    if (isOpen && currentStory) {
      setCurrentIndex(initialStoryIndex);
      setProgress(0);
      setIsPaused(false);
      resetZoom();
    }
  }, [isOpen, initialStoryIndex]);

  useEffect(() => {
    if (isOpen && currentStory?.id && onStoryViewed) {
      onStoryViewed(currentStory.id);
    }
  }, [isOpen, currentStory?.id]);

  useEffect(() => {
    if (!isOpen || !currentStory) return;

    const shouldPause = isPaused || isZoomed;

    if (shouldPause) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (videoRef.current) videoRef.current.pause();
      return;
    }

    if (videoRef.current && currentStory.video_url) {
      videoRef.current.play().catch(console.error);
    }

    const intervalTime = 20; // 20ms for ultra-smoothness
    
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        let newProgress = prev;
        if (currentStory.video_url && videoRef.current && videoRef.current.duration) {
          const duration = videoRef.current.duration * 1000;
          newProgress = prev + (intervalTime / duration) * 100;
        } else {
          newProgress = prev + (intervalTime / STORY_DURATION_MS) * 100;
        }
        
        if (newProgress >= 100) {
          clearInterval(progressIntervalRef.current);
          handleNext();
          return 100;
        }
        return newProgress;
      });
    }, intervalTime);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentIndex, isPaused, isZoomed, isOpen, currentStory]);

  useEffect(() => {
    if (!isOpen || stories.length === 0) return;

    const preloadedUsers = new Set();
    const preloadLimit = 3;
    let foundUsers = 0;

    for (let i = currentIndex + 1; i < stories.length; i++) {
      const story = stories[i];
      if (!story) continue;

      const userKey = story.page_id ? `page-${story.page_id}` : `user-${story.user_id}`;
      
      if (!preloadedUsers.has(userKey)) {
        preloadedUsers.add(userKey);
        foundUsers++;

        if (story.image_url) {
          const img = new Image();
          img.src = getMediaUrl(story.image_url);
        }

        if (story.video_url) {
          const video = document.createElement('video');
          video.src = getMediaUrl(story.video_url);
          video.preload = 'auto';
        }

        if (foundUsers >= preloadLimit) break;
      }
    }
  }, [currentIndex, stories, isOpen]);

  const handleNext = () => {
    resetZoom();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    resetZoom();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  // Pinch touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchDistanceRef.current = distance;
      touchCenterRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      setIsPaused(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const scaleFactor = distance / touchDistanceRef.current;
      const newScale = Math.min(Math.max(zoomScale * scaleFactor, 1), 3.5);
      
      setZoomScale(newScale);
      touchDistanceRef.current = distance;
      setIsPaused(true);
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
    touchCenterRef.current = null;
    if (zoomScale < 1.1) {
      resetZoom();
      setIsPaused(false);
    }
  };

  // Wheel zoom handler for desktop
  const handleWheelZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaY) > 20) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      setZoomScale((prev) => {
        const next = Math.min(Math.max(prev + delta, 1), 3.5);
        if (next <= 1.05) {
          setZoomTranslate({ x: 0, y: 0 });
          return 1;
        }
        return next;
      });
    }
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isZoomed) {
      resetZoom();
      return;
    }
    triggerHaptic('light');
    const { clientX } = e;
    const { innerWidth } = window;
    if (clientX < innerWidth / 3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handlePointerDown = () => {
    if (!isZoomed) {
      setIsPaused(true);
    }
  };

  const handlePointerUp = () => {
    if (!isZoomed) {
      setIsPaused(false);
    }
  };

  const handleDragEnd = (e: any, info: any) => {
    if (isZoomed) return;
    const threshold = 50;
    if (info.offset.x < -threshold) {
      handleNext();
    } else if (info.offset.x > threshold) {
      handlePrev();
    }
  };

  if (!isOpen || !currentStory) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/bulletin/ads/${currentStory.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        toast.success(isRtl ? 'تم حذف القصة بنجاح' : 'Story deleted successfully');
        
        if (stories.length <= 1) {
          onClose();
        } else {
          if (currentIndex === stories.length - 1) {
            setCurrentIndex(prev => prev - 1);
          }
          setProgress(0);
        }
        
        if (onStoryDeleted) onStoryDeleted(currentStory.id);
      } else {
        const data = await res.json();
        toast.error(data.error || (isRtl ? 'فشل حذف القصة' : 'Failed to delete story'));
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      toast.error(isRtl ? 'حدث خطأ أثناء حذف القصة' : 'Error deleting story');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setIsPaused(false);
    }
  };

  const isOwnStory = currentUser && ((currentStory.user_id === currentUser.id) || (currentStory.author_id === currentUser.id) || currentUser.role === 'admin');
  const authorName = currentStory.page_id ? currentStory.page_name : currentStory.author_name;
  const authorAvatar = currentStory.page_id ? currentStory.page_avatar : currentStory.author_avatar;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] bg-zinc-950 flex items-center justify-center overflow-hidden"
      >
        {/* Ambient Blurred Backdrop for Desktop */}
        <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
          {getMediaUrl(currentStory.video_url) ? (
            <video
              key={`ambient-vid-${currentStory.id}`}
              src={getMediaUrl(currentStory.video_url)}
              poster={getMediaUrl(currentStory.image_url)}
              muted
              autoPlay
              loop
              playsInline
              className="ambient-video w-full h-full object-cover scale-125 blur-3xl opacity-30 filter saturate-150 brightness-75"
            />
          ) : currentStory.image_url ? (
            <img
              key={`ambient-img-${currentStory.id}`}
              src={getMediaUrl(currentStory.image_url)}
              alt="Ambient"
              className="ambient-video w-full h-full object-cover scale-125 blur-3xl opacity-30 filter saturate-150 brightness-75"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-zinc-950/85 to-black/95 backdrop-blur-2xl" />
        </div>

        <div className="relative w-full h-full md:w-auto md:aspect-[9/16] md:max-w-none md:h-[95vh] md:rounded-[2rem] bg-black shadow-2xl overflow-hidden z-10 border-0 md:border md:border-white/10 flex items-center justify-center">
          {/* Progress Bars (Persistent) */}
          <div className="absolute top-4 inset-x-0 z-50 flex items-center gap-1.5 px-4 pointer-events-none">
            {stories.map((story, idx) => (
              <div key={`story-progress-${story.id || 'story'}-${idx}`} className="h-1 bg-white/20 rounded-[4px] overflow-hidden flex-1 backdrop-blur-sm">
                <div 
                  className="h-full bg-white transition-all duration-[20ms] ease-linear"
                  style={{ 
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                  }}
                />
              </div>
            ))}
          </div>

          <AnimatePresence mode="popLayout" custom={currentIndex}>
            <motion.div
              key={`active-story-${currentStory.id || 'current'}-${currentIndex}`}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 w-full h-full touch-none overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheelZoom}
            >
              <motion.div 
                drag={isZoomed ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                className="relative w-full h-full flex items-center justify-center select-none cursor-grab active:cursor-grabbing overflow-hidden"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onClick={(e) => {
                  if (Math.abs(e.movementX) < 5 && Math.abs(e.movementY) < 5) {
                    handleTap(e);
                  }
                }}
              >
                {/* Media Container with Zoom Scale & Transform */}
                <div
                  className="relative w-full h-full will-change-transform origin-center transition-transform duration-100 ease-out bg-black flex items-center justify-center overflow-hidden"
                  style={{
                    transform: `scale(${zoomScale}) translate(${zoomTranslate.x}px, ${zoomTranslate.y}px)`,
                  }}
                >
                  {/* Blurred Background */}
                  <div 
                    className="absolute inset-0 z-0 opacity-40 blur-2xl scale-110 pointer-events-none"
                    style={{
                      backgroundImage: `url(${getMediaUrl(currentStory.video_url ? currentStory.image_url || '' : currentStory.image_url)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />

                  {getMediaUrl(currentStory.video_url) ? (
                    <video
                      ref={videoRef}
                      src={getMediaUrl(currentStory.video_url)}
                      className="relative z-10 w-full h-full object-contain max-h-[100dvh]"
                      playsInline
                      autoPlay
                      muted={isMuted}
                      onEnded={handleNext}
                      onLoadedMetadata={() => setProgress(0)}
                      onError={(e) => {
                        console.warn('[StoryViewer] Video load error, falling back to image');
                      }}
                    />
                  ) : (
                    <img
                      src={getMediaUrl(currentStory.image_url)}
                      alt="Story"
                      className="relative z-10 w-full h-full object-contain max-h-[100dvh]"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('unsplash')) {
                          target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80';
                        }
                      }}
                    />
                  )}
                </div>

                {/* Zoom Active Floating Overlay Indicator */}
                <AnimatePresence>
                  {isZoomed && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute top-20 z-40 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-[8px] border border-purple-500/40 text-white flex items-center gap-2 shadow-2xl pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetZoom();
                      }}
                    >
                      <Pause size={13} className="text-purple-400 fill-purple-400" />
                      <span className="text-[11px] font-black text-purple-200">
                        {isRtl ? `موقوف مؤقتاً للتكبير (${zoomScale.toFixed(1)}x)` : `Paused (Zoomed ${zoomScale.toFixed(1)}x)`}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resetZoom();
                        }}
                        className="p-1 hover:bg-white/20 rounded-[8px] transition-colors"
                        title={isRtl ? 'إعادة ضبط' : 'Reset'}
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Top Overlays - Header info */}
          <div className="absolute top-10 inset-x-0 z-50 px-4 pointer-events-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BulletinAvatar
                  src={authorAvatar}
                  alt={authorName}
                  size="sm"
                />
                <div className="flex flex-col">
                  <span className="text-white text-sm font-bold drop-shadow-md leading-tight">
                    {authorName}
                  </span>
                  <span className="text-white/60 text-[10px] font-medium uppercase tracking-wider">
                    {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {currentStory.video_url && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    className="w-9 h-9 flex items-center justify-center rounded-[8px] bg-black/20 backdrop-blur-md text-white border border-white/10 hover:bg-black/40 transition-theme"
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="w-9 h-9 flex items-center justify-center rounded-[8px] bg-black/20 backdrop-blur-md text-white border border-white/10 hover:bg-black/40 transition-theme"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Delete Button for Own Story / Admin */}
            {isOwnStory && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPaused(true);
                    setShowDeleteConfirm(true);
                  }}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-500 hover:bg-red-500/40 transition-theme flex items-center gap-1.5 text-xs font-bold"
                >
                  <Trash2 size={14} />
                  <span>{isRtl ? 'حذف القصة' : 'Delete Story'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal Overlay */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                    setIsPaused(false);
                  }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className={`relative w-full max-w-sm overflow-hidden rounded-2xl border shadow-2xl transition-theme ${
                    theme === 'dark' 
                      ? 'bg-[#1a1a1c] border-gray-800 text-gray-100' 
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-[8px] bg-red-500/10 flex items-center justify-center text-red-500">
                        <AlertTriangle size={20} />
                      </div>
                      <h3 className="text-base font-black tracking-tight">
                        {isRtl ? 'حذف القصة نهائياً؟' : 'Delete story permanently?'}
                      </h3>
                    </div>
                    
                    <p className={`text-sm font-bold leading-relaxed mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {isRtl 
                        ? 'سيؤدي هذا الإجراء إلى حذف القصة من لوحة النشرات ولا يمكن التراجع عنه.' 
                        : 'This action will remove the story from the bulletin board and cannot be undone.'}
                    </p>
                    
                    <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setIsPaused(false);
                        }}
                        className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-xl transition-theme border ${
                          theme === 'dark'
                            ? 'border-gray-800 text-gray-400 hover:bg-gray-800'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {isRtl ? 'تراجع' : 'Cancel'}
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-theme shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                      >
                        {isDeleting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <Trash2 size={16} />
                            {isRtl ? 'حذف الآن' : 'Delete Now'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Bottom Overlay for Own Story View Count */}
          {isOwnStory && (
            <div className="absolute bottom-8 right-4 z-50 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2.5 border border-white/10 shadow-2xl pointer-events-auto">
              <Eye size={18} className="text-white/90" />
              <div className="flex flex-col">
                <span className="text-white text-xs font-bold leading-none">
                  {currentStory.impressions_count || 0}
                </span>
                <span className="text-white/50 text-[8px] uppercase tracking-tighter">Views</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
