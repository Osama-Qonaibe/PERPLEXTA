import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Volume2, VolumeX, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { getMediaUrl } from '../utils/mediaUtils';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';

interface Story {
  id: number;
  user_id: number;
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
  
  const currentStory = stories[currentIndex];
  
  // Default duration for images is 5s
  const STORY_DURATION_MS = 5000;

  useEffect(() => {
    if (isOpen && currentStory) {
      setCurrentIndex(initialStoryIndex);
      setProgress(0);
      setIsPaused(false);
    }
  }, [isOpen, initialStoryIndex]);

  useEffect(() => {
    if (!isOpen || !currentStory) return;
    
    if (currentStory.id && onStoryViewed) {
      onStoryViewed(currentStory.id);
    }

    if (isPaused) {
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
  }, [currentIndex, isPaused, isOpen, currentStory]);

  useEffect(() => {
    if (!isOpen || stories.length === 0) return;

    // Preload the first story of the next 3 unique users
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

        // Preload image
        if (story.image_url) {
          const img = new Image();
          img.src = getMediaUrl(story.image_url);
        }

        // Preload video (if applicable)
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
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if ("vibrate" in navigator) navigator.vibrate(50);
    const { clientX } = e;
    const { innerWidth } = window;
    if (clientX < innerWidth / 3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handlePointerDown = () => {
    setIsPaused(true);
  };

  const handlePointerUp = () => {
    setIsPaused(false);
  };

  const handleDragEnd = (e: any, info: any) => {
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
        if (onStoryDeleted) onStoryDeleted(currentStory.id);
        
        // If there are more stories, go to next, otherwise close
        if (stories.length > 1) {
          handleNext();
        } else {
          onClose();
        }
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

  const isOwnStory = currentUser && (currentStory.user_id === currentUser.id || currentUser.role === 'admin');
  const authorName = currentStory.page_id ? currentStory.page_name : currentStory.author_name;
  const authorAvatar = currentStory.page_id ? currentStory.page_avatar : currentStory.author_avatar;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] bg-black flex items-center justify-center overflow-hidden"
      >
        <div className="relative w-full h-full max-w-[500px] bg-black shadow-2xl overflow-hidden">
          {/* Progress Bars (Persistent) */}
          <div className="absolute top-4 inset-x-0 z-50 flex items-center gap-1.5 px-4 pointer-events-none">
            {stories.map((story, idx) => (
              <div key={`progress-${story.id}`} className="h-1 bg-white/20 rounded-full overflow-hidden flex-1 backdrop-blur-sm">
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
              key={currentStory.id}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 w-full h-full"
            >
              <motion.div 
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                className="relative w-full h-full flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onClick={(e) => {
                  if (Math.abs(e.movementX) < 5 && Math.abs(e.movementY) < 5) {
                    handleTap(e);
                  }
                }}
              >
                {currentStory.video_url ? (
                  <video
                    ref={videoRef}
                    src={getMediaUrl(currentStory.video_url)}
                    className="w-full h-full object-cover"
                    playsInline
                    autoPlay
                    muted={isMuted}
                    onEnded={handleNext}
                    onLoadedMetadata={() => setProgress(0)}
                  />
                ) : (
                  <img
                    src={getMediaUrl(currentStory.image_url)}
                    alt="Story"
                    className="w-full h-full object-cover"
                  />
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Top Overlays - Header info */}
          <div className="absolute top-10 inset-x-0 z-50 px-4 pointer-events-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-accent via-teal-400 to-blue-500 shadow-md">
                  <img 
                    src={getMediaUrl(authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80')} 
                    alt="Avatar" 
                    className="w-9 h-9 rounded-full border-2 border-black object-cover" 
                  />
                </div>
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
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white border border-white/10 hover:bg-black/40 transition-theme"
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white border border-white/10 hover:bg-black/40 transition-theme"
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
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
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
