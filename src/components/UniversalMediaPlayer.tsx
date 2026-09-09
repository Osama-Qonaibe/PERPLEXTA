import React, { useState, useRef, useEffect, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Film,
  RotateCcw,
  Loader2,
  AlertCircle,
  Activity
} from 'lucide-react';
import { parseVideoUrl, getMediaUrl } from '../utils/mediaUtils';
import {
  notifyMediaPlaying,
  stopAllMedia
} from '../utils/mediaCoordinator';
import { useVideoResource, MediaAspectRatio, MediaFitMode, MediaFormatType } from '../context/VideoResourceContext';
import { UniversalMediaContainer } from './UniversalMediaContainer';
import { useVideoPlayerSession } from '../hooks/useVideoPlayerSession';
import { videoPlayerStateService } from '../services/videoPlayerStateService';
import { OnScreenDiagnostics } from './OnScreenDiagnostics';
import { trackMediaEvent } from '../utils/analytics';

export interface UniversalMediaPlayerProps {
  url: string;
  resourceId?: string | number;
  format?: MediaFormatType;
  aspectRatio?: MediaAspectRatio;
  fitMode?: MediaFitMode;
  posterUrl?: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
  isRtl?: boolean;
  showControls?: boolean;
  maxHeight?: string;
  onOpenReels?: () => void;
  onEnded?: () => void;
}

/**
 * UniversalMediaPlayer
 * A layout-agnostic, responsive media player supporting dynamic video aspect ratios
 * (1:1 square, 16:9 widescreen, 9:16 portrait/reels, 4:5 vertical, 21:9 banner).
 * Features:
 * - Protocols to prevent simultaneous and background playback
 * - Smooth, professional pausing during scrolling (IntersectionObserver)
 * - Persistent volume settings and playback state continuity when toggling fullscreen
 * - Cohesive instant Reels expand without audio overlap
 * - Optimized 'preload=metadata' resource management
 * - Self-healing error recovery handler with exponential backoff for intermittent connections
 */
export const UniversalMediaPlayer: React.FC<UniversalMediaPlayerProps> = ({
  url,
  resourceId,
  format = 'auto',
  aspectRatio = 'auto',
  fitMode = 'cover',
  posterUrl,
  title,
  autoPlay = false,
  muted = false,
  loop = false,
  className = '',
  isRtl = true,
  showControls = true,
  maxHeight,
  onOpenReels,
  onEnded
}) => {
  const reactId = useId();
  const playerId = useRef(resourceId ? `universal_media_${resourceId}` : `universal_media_${reactId.replace(/:/g, '_')}`).current;
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { updateMediaMetadata } = useVideoResource();

  const {
    session,
    update: updateSession,
    attachVideoElement,
    detachVideoElement,
    play: playSession,
    pause: pauseSession,
    togglePlay: togglePlaySession,
    setVolume: setSessionVolume,
    setMuted: setSessionMuted,
    seek: seekSession,
    setFullscreenTransition
  } = useVideoPlayerSession(playerId, { url, autoPlay, muted });

  const { isPlaying, volume, isMuted, currentTime, duration, isFullscreen, isTransitioningFullscreen } = session;

  const [detectedRatio, setDetectedRatio] = useState<MediaAspectRatio>(aspectRatio);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number; qualityLabel: string } | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ percent: number; time: number; clientX: number } | null>(null);
  const [showOverlayControls, setShowOverlayControls] = useState(false);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mute / Unmute Visual Feedback Overlay State
  const [muteFeedback, setMuteFeedback] = useState<{ show: boolean; isMuted: boolean } | null>(null);
  const muteFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTogglingMuteRef = useRef(false);

  // Network & Buffering States
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasFatalError, setHasFatalError] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const lastPlaybackTimeRef = useRef(0);

  // Advanced TikTok-Grade Feature States & References
  const [autoPosterUrl, setAutoPosterUrl] = useState<string | null>(null);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastClickRef = useRef<number>(0);
  const clickTimeoutRef = useRef<number | null>(null);
  const loopCountRef = useRef<number>(0);

  // Track media drop-off when player component is unmounted
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video && !video.paused) {
        trackMediaEvent('drop_off', playerId, video.currentTime, video.duration, {
          reason: 'unmount'
        });
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, [playerId]);

  // Handle double-tap to heart (like) and single-tap to toggle play/pause
  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const currentTimeClick = Date.now();
    const delay = 260; // time window for detecting double tap
    
    if (currentTimeClick - lastClickRef.current < delay) {
      // Clear scheduled single-tap toggle
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      
      // Compute click coordinates relative to the video component
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newHeart = {
        id: Date.now() + Math.random(),
        x,
        y,
      };
      
      setHearts((prev) => [...prev, newHeart]);
      
      // Track like event to GTM
      const video = videoRef.current;
      trackMediaEvent('like', playerId, video ? video.currentTime : 0, video ? video.duration : 0);
      
      // Clean up heart element after animation completes
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
      }, 800);
    } else {
      // Schedule single click play/pause toggle
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      clickTimeoutRef.current = window.setTimeout(() => {
        togglePlay();
        clickTimeoutRef.current = null;
      }, delay);
    }
    
    lastClickRef.current = currentTimeClick;
  };

  // Extract first frame automatically as video poster if none provided
  const handleLoadedData = () => {
    if (!posterUrl && !autoPosterUrl && videoRef.current) {
      const video = videoRef.current;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAutoPosterUrl(dataUrl);
        }
      } catch (err) {
        console.warn('Auto-poster extraction bypassed (CORS restriction):', err);
      }
    }
  };

  // Loop & End-of-Stream Analytics Tracker
  const handleEnded = () => {
    updateSession({ isPlaying: false });
    setIsBuffering(false);
    
    const video = videoRef.current;
    if (video && video.loop) {
      loopCountRef.current += 1;
      trackMediaEvent('loop', playerId, video.currentTime, video.duration, {
        loopCount: loopCountRef.current,
      });
    } else {
      trackMediaEvent('drop_off', playerId, video ? video.currentTime : 0, video ? video.duration : 0, {
        reason: 'ended'
      });
    }
    
    if (onEnded) onEnded();
  };

  const videoInfo = parseVideoUrl(url);

  // Callback ref for HTMLVideoElement attachment
  const setVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (videoRef.current && videoRef.current !== node) {
        detachVideoElement(videoRef.current);
      }
      videoRef.current = node;
      if (node) {
        attachVideoElement(node);
      }
    },
    [attachVideoElement, detachVideoElement]
  );

  // Sync aspect ratio when prop changes
  useEffect(() => {
    if (aspectRatio !== 'auto') {
      setDetectedRatio(aspectRatio);
    }
  }, [aspectRatio]);

  // Synchronize mute state when prop changes
  useEffect(() => {
    if (muted !== undefined) {
      setSessionMuted(muted);
    }
  }, [muted, setSessionMuted]);

  // Reset player states when the URL changes
  useEffect(() => {
    updateSession({ currentTime: 0, duration: 0, isPlaying: autoPlay });
    setVideoResolution(null);
    setHoverPosition(null);
    lastPlaybackTimeRef.current = 0;
    setIsBuffering(false);
    setHasFatalError(false);
  }, [url, autoPlay, updateSession]);

  // Synchronize with global media coordinator to prevent double-audio clashing
  useEffect(() => {
    const handleStopMedia = (e: Event) => {
      const customEvent = e as CustomEvent<{ exceptMediaId?: string }>;
      if (customEvent.detail?.exceptMediaId !== playerId) {
        pauseSession(videoRef.current);
      }
    };

    const handleMediaPlaying = (e: Event) => {
      const customEvent = e as CustomEvent<{ mediaId: string }>;
      if (customEvent.detail?.mediaId !== playerId) {
        pauseSession(videoRef.current);
      }
    };

    window.addEventListener('perplexta:stop_all_media', handleStopMedia);
    window.addEventListener('perplexta:media_playing', handleMediaPlaying);

    return () => {
      window.removeEventListener('perplexta:stop_all_media', handleStopMedia);
      window.removeEventListener('perplexta:media_playing', handleMediaPlaying);
    };
  }, [playerId, pauseSession]);

  // Background playback prevention: Pause when tab becomes hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseSession(videoRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pauseSession]);

  // Smooth pausing during scrolling (IntersectionObserver) - bypassed during Fullscreen mode
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.15) {
            const isFsActive = !!(
              document.fullscreenElement ||
              (document as any).webkitFullscreenElement ||
              isFullscreen ||
              isTransitioningFullscreen
            );
            if (!isFsActive && videoRef.current && !videoRef.current.paused) {
              pauseSession(videoRef.current);
            }
          }
        });
      },
      { threshold: [0, 0.15, 0.5, 1.0] }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [isFullscreen, isTransitioningFullscreen, pauseSession]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    const dur = video.duration || 0;
    updateSession({ duration: dur });

    const naturalWidth = video.videoWidth || 0;
    const naturalHeight = video.videoHeight || 0;

    if (naturalWidth > 0 && naturalHeight > 0) {
      let qualityLabel = `${naturalHeight}p`;
      if (naturalHeight >= 2160 || naturalWidth >= 3840) {
        qualityLabel = '4K';
      } else if (naturalHeight >= 1440 || naturalWidth >= 2560) {
        qualityLabel = '2K QHD';
      } else if (naturalHeight >= 1080 || naturalWidth >= 1920) {
        qualityLabel = '1080p FHD';
      } else if (naturalHeight >= 720 || naturalWidth >= 1280) {
        qualityLabel = '720p HD';
      } else if (naturalHeight >= 480) {
        qualityLabel = '480p SD';
      } else {
        qualityLabel = `${naturalWidth}×${naturalHeight}`;
      }

      setVideoResolution({
        width: naturalWidth,
        height: naturalHeight,
        qualityLabel
      });

      const ratioNum = naturalWidth / naturalHeight;
      let calculatedRatio: MediaAspectRatio = '16:9';

      if (ratioNum >= 2.0) {
        calculatedRatio = '21:9';
      } else if (ratioNum >= 1.5) {
        calculatedRatio = '16:9';
      } else if (ratioNum >= 0.95 && ratioNum <= 1.05) {
        calculatedRatio = '1:1';
      } else if (ratioNum >= 0.75 && ratioNum <= 0.85) {
        calculatedRatio = '4:5';
      } else if (ratioNum <= 0.65) {
        calculatedRatio = '9:16';
      }

      if (aspectRatio === 'auto') {
        setDetectedRatio(calculatedRatio);
      }

      if (resourceId) {
        updateMediaMetadata(resourceId, {
          naturalWidth,
          naturalHeight,
          calculatedRatio: ratioNum,
          aspectRatio: calculatedRatio,
          format
        });
      }
    }
  };

  const resetHideTimer = useCallback(() => {
    setShowOverlayControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowOverlayControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (hasFatalError) {
      setHasFatalError(false);
      setIsBuffering(true);
      const resumeTime = lastPlaybackTimeRef.current || currentTime || 0;
      try {
        video.load();
        video.currentTime = resumeTime;
        playSession(video);
      } catch (_) {}
      return;
    }

    if (isPlaying) {
      pauseSession(video);
      setShowOverlayControls(true);
    } else {
      playSession(video);
      resetHideTimer();
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setSessionVolume(newVol);
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const newMuted = !isMuted;
    isTogglingMuteRef.current = true;
    setTimeout(() => {
      isTogglingMuteRef.current = false;
    }, 400);

    setSessionMuted(newMuted);

    const video = videoRef.current;
    if (video) {
      try {
        video.muted = newMuted;
        if (isPlaying || !video.paused) {
          // If the video is playing, unmuting might trigger a browser pause.
          // Calling play() synchronously inside this user gesture event handler
          // guarantees browser authorization for unmuted playback.
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                updateSession({ isPlaying: true });
              })
              .catch((err) => {
                console.warn('[UniversalMediaPlayer] Play failed on unmute, trying muted fallback:', err);
                if (!newMuted) {
                  video.muted = true;
                  video.play()
                    .then(() => updateSession({ isPlaying: true }))
                    .catch(() => updateSession({ isPlaying: false }));
                } else {
                  updateSession({ isPlaying: false });
                }
              });
          } else {
            updateSession({ isPlaying: true });
          }
        }
      } catch (_) {}
    }

    if (muteFeedbackTimerRef.current) {
      clearTimeout(muteFeedbackTimerRef.current);
    }
    setMuteFeedback({ show: true, isMuted: newMuted });
    muteFeedbackTimerRef.current = setTimeout(() => {
      setMuteFeedback(null);
    }, 1100);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    setFullscreenTransition(true, 1000);

    if (video) {
      updateSession({
        currentTime: video.currentTime,
        duration: !isNaN(video.duration) ? video.duration : duration,
        isPlaying: !video.paused && !video.ended,
        volume: video.volume,
        isMuted: video.muted
      });
    }

    const restoreAndResume = () => {
      const isFsActive = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      updateSession({ isFullscreen: isFsActive });
      if (video) {
        attachVideoElement(video);
      }
    };

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
          .then(restoreAndResume)
          .catch(() => {
            if ((video as any)?.webkitEnterFullscreen) {
              try {
                (video as any).webkitEnterFullscreen();
              } catch (_) {}
            }
            restoreAndResume();
          });
      } else if ((container as any).webkitRequestFullscreen) {
        try {
          (container as any).webkitRequestFullscreen();
        } catch (_) {}
        restoreAndResume();
      } else if ((video as any)?.webkitEnterFullscreen) {
        try {
          (video as any).webkitEnterFullscreen();
        } catch (_) {}
        restoreAndResume();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(restoreAndResume)
          .catch(restoreAndResume);
      } else if ((document as any).webkitExitFullscreen) {
        try {
          (document as any).webkitExitFullscreen();
        } catch (_) {}
        restoreAndResume();
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const isFsActive = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      updateSession({ isFullscreen: isFsActive });

      const video = videoRef.current;
      if (video) {
        attachVideoElement(video);
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);

    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.addEventListener('webkitbeginfullscreen', handleFsChange);
      videoEl.addEventListener('webkitendfullscreen', handleFsChange);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      if (videoEl) {
        videoEl.removeEventListener('webkitbeginfullscreen', handleFsChange);
        videoEl.removeEventListener('webkitendfullscreen', handleFsChange);
      }
    };
  }, [updateSession, attachVideoElement]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Embed Renderer for external video providers
  if (videoInfo.type !== 'direct' && videoInfo.embedUrl) {
    return (
      <UniversalMediaContainer
        aspectRatio={detectedRatio}
        fitMode={fitMode}
        maxHeight={maxHeight}
        className={`rounded-2xl border border-gray-200/40 dark:border-gray-800 ${className}`}
      >
        <iframe
          src={videoInfo.embedUrl}
          className="w-full h-full border-0 absolute inset-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-accent text-[11px] font-bold border border-accent/20 flex items-center gap-1.5 pointer-events-none">
          <Film size={12} />
          <span>{videoInfo.type.toUpperCase()}</span>
        </div>
      </UniversalMediaContainer>
    );
  }

  const directVideoUrl = getMediaUrl(videoInfo.directUrl || url);
  const isVertical = detectedRatio === '9:16' || format === 'reel' || format === 'story' || aspectRatio === '9:16';

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onMouseEnter={() => setShowOverlayControls(true)}
      onMouseLeave={() => isPlaying && setShowOverlayControls(false)}
      className={`w-full ${isVertical ? 'max-w-[340px] mx-auto my-4 shadow-xl' : ''}`}
    >
      <UniversalMediaContainer
        aspectRatio={detectedRatio}
        fitMode={fitMode}
        maxHeight={maxHeight}
        backdropUrl={posterUrl}
        className={`rounded-2xl shadow-lg group select-none ${className}`}
        overlaySlot={
          showControls ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute bottom-0 inset-x-0 z-20 px-3 py-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-300 pointer-events-auto ${
                showOverlayControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Seek Progress Bar with Hover Metadata Preview */}
              <div
                className="relative flex items-center w-full group/slider py-1"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (rect.width > 0 && duration > 0) {
                    const relativeX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                    const percent = (relativeX / rect.width) * 100;
                    const hoverTime = (relativeX / rect.width) * duration;
                    setHoverPosition({ percent, time: hoverTime, clientX: relativeX });
                  }
                }}
                onMouseLeave={() => {
                  setHoverPosition(null);
                }}
              >
                {/* Floating Metadata Tooltip on Hover */}
                {hoverPosition && duration > 0 && (
                  <div
                    style={{
                      left: `${Math.max(8, Math.min(92, hoverPosition.percent))}%`,
                      transform: 'translateX(-50%)'
                    }}
                    className="absolute bottom-full mb-2.5 z-30 pointer-events-none flex flex-col items-center animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="px-2.5 py-1.5 rounded-xl bg-zinc-900/95 backdrop-blur-md border border-white/20 shadow-2xl text-white text-[11px] font-mono flex items-center gap-2 whitespace-nowrap">
                      <span className="font-bold text-accent">
                        {formatTime(hoverPosition.time)}
                      </span>
                      <span className="text-gray-400 text-[10px]">
                        / {formatTime(duration)}
                      </span>
                      {videoResolution && (
                        <div className="flex items-center gap-1.5 ps-1.5 border-s border-white/20">
                          <span className="px-1.5 py-0.5 rounded-md bg-accent/20 text-accent font-bold text-[9px] uppercase tracking-wider">
                            {videoResolution.qualityLabel}
                          </span>
                          <span className="text-gray-400 text-[9px]">
                            {videoResolution.width}×{videoResolution.height}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Tiny triangle caret */}
                    <div className="w-2 h-2 rotate-45 bg-zinc-900 border-r border-b border-white/20 -mt-1" />
                  </div>
                )}

                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    seekSession(val, videoRef.current);
                    lastPlaybackTimeRef.current = val;
                  }}
                  className="w-full h-1 bg-white/30 hover:h-1.5 rounded-lg appearance-none cursor-pointer accent-accent transition-all duration-150"
                />
              </div>

              <div className="flex items-center justify-between text-white text-xs font-mono">
                {/* Play/Pause & Mute & Time */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-2 sm:p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
                    title={isPlaying ? (isRtl ? 'إيقاف مؤقت' : 'Pause') : (isRtl ? 'تشغيل' : 'Play')}
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>

                  {/* Volume Button with Expandable Interactive Slider */}
                  <div className="relative flex items-center group/volume">
                    <button
                      onClick={toggleMute}
                      className="p-2 sm:p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
                      title={isMuted ? (isRtl ? 'تشغيل الصوت' : 'Unmute') : (isRtl ? 'كتم الصوت' : 'Mute')}
                    >
                      {isMuted || volume === 0 ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} />}
                    </button>
                    <div className="overflow-hidden transition-all duration-200 ease-out flex items-center max-w-0 group-hover/volume:max-w-[70px] focus-within/volume:max-w-[70px] opacity-0 group-hover/volume:opacity-100 focus-within/volume:opacity-100 ps-1">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-14 h-1 bg-white/30 hover:h-1.5 rounded-lg appearance-none cursor-pointer accent-accent"
                        title={isRtl ? `مستوى الصوت: ${Math.round(volume * 100)}%` : `Volume: ${Math.round(volume * 100)}%`}
                      />
                    </div>
                  </div>

                  <span className="text-[11px] text-gray-300 font-mono select-none">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right Side: Fullscreen / Reels Expand / Diagnostics HUD */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDiagnostics(prev => !prev);
                    }}
                    className={`p-2 sm:p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center ${showDiagnostics ? 'text-[var(--fg-success)] bg-white/10' : 'text-white'}`}
                    title={isRtl ? 'لوحة الفحص والتشخيص' : 'Diagnostics HUD'}
                  >
                    <Activity size={18} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenReels) {
                        // Immediately pause original clip in the background to prevent audio overlap
                        if (videoRef.current) {
                          pauseSession(videoRef.current);
                        }
                        stopAllMedia();
                        onOpenReels();
                      } else {
                        toggleFullscreen(e);
                      }
                    }}
                    className="p-2 sm:p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
                    title={isRtl ? (onOpenReels ? 'عرض ريلز بملء الشاشة' : 'ملء الشاشة') : (onOpenReels ? 'Open Reels' : 'Fullscreen')}
                  >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                </div>
              </div>
            </div>
          ) : null
        }
      >
        {directVideoUrl ? (
          <>
            <video
              ref={setVideoRef}
              src={directVideoUrl}
              poster={posterUrl || autoPosterUrl || undefined}
              preload="metadata"
              playsInline
              loop={loop}
              data-media-id={playerId}
              muted={isMuted}
              autoPlay={autoPlay}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  const cur = videoRef.current.currentTime;
                  updateSession({ currentTime: cur });
                  lastPlaybackTimeRef.current = cur;
                  if (isBuffering) setIsBuffering(false);
                }
              }}
              onLoadedMetadata={handleLoadedMetadata}
              onLoadedData={handleLoadedData}
              onCanPlay={() => {
                setIsBuffering(false);
                setHasFatalError(false);
              }}
              onPlaying={() => {
                updateSession({ isPlaying: true });
                setIsBuffering(false);
                setHasFatalError(false);
                const video = videoRef.current;
                trackMediaEvent('play', playerId, video ? video.currentTime : 0, video ? video.duration : 0);
              }}
              onWaiting={() => {
                if (isPlaying) {
                  setIsBuffering(true);
                }
              }}
              onError={() => {
                setIsBuffering(false);
                const video = videoRef.current;
                // Only consider fatal if initial resource load genuinely fails before any playback or duration
                if (
                  video &&
                  video.error &&
                  video.error.code === 4 &&
                  (!video.duration || isNaN(video.duration)) &&
                  video.readyState === 0 &&
                  !isPlaying &&
                  lastPlaybackTimeRef.current === 0
                ) {
                  setHasFatalError(true);
                }
              }}
              onPause={() => {
                if (isTransitioningFullscreen && isPlaying) {
                  // Ignore transient pause triggered by browser DOM reparenting during fullscreen transitions
                  if (videoRef.current && videoRef.current.paused) {
                    videoRef.current.play().then(() => updateSession({ isPlaying: true })).catch(() => {});
                  }
                  return;
                }
                if (isTogglingMuteRef.current && videoRef.current) {
                  videoRef.current
                    .play()
                    .then(() => updateSession({ isPlaying: true }))
                    .catch(() => {
                      if (videoRef.current) {
                        videoRef.current.muted = true;
                        videoRef.current
                          .play()
                          .then(() => updateSession({ isPlaying: true }))
                          .catch(() => {
                            updateSession({ isPlaying: false });
                          });
                      }
                    });
                  return;
                }
                updateSession({ isPlaying: false });
                setIsBuffering(false);
                const video = videoRef.current;
                trackMediaEvent('pause', playerId, video ? video.currentTime : 0, video ? video.duration : 0);
              }}
              onEnded={handleEnded}
              className={`w-full h-full relative z-10 cursor-pointer ${
                fitMode === 'cover'
                  ? 'object-cover'
                  : fitMode === 'contain'
                  ? 'object-contain'
                  : 'object-fill'
              }`}
              onClick={handleVideoClick}
            />

            {/* Floating Heart Elements for TikTok-grade double-tap interactions */}
            <AnimatePresence>
              {hearts.map((h) => (
                <motion.div
                  key={h.id}
                  initial={{ scale: 0, opacity: 0, x: h.x - 24, y: h.y - 24 }}
                  animate={{
                    scale: [0, 1.4, 1.2, 0.8],
                    opacity: [0, 1, 1, 0],
                    y: h.y - 140,
                    rotate: [-15, 15, -10, 0]
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.75, ease: 'easeOut' }}
                  className="absolute z-25 pointer-events-none select-none text-red-500 text-5xl flex items-center justify-center filter drop-shadow-lg"
                >
                  ❤️
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        ) : posterUrl || autoPosterUrl ? (
          <img
            src={posterUrl || autoPosterUrl || undefined}
            alt="Media Poster"
            className={`w-full h-full relative z-10 ${
              fitMode === 'cover'
                ? 'object-cover'
                : fitMode === 'contain'
                ? 'object-contain'
                : 'object-fill'
            }`}
          />
        ) : null}

        {/* Soft Buffering Spinner Overlay (No flash / No stream abort) */}
        {isBuffering && isPlaying && !hasFatalError && (
          <div className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center shadow-xl">
              <Loader2 size={24} className="animate-spin text-accent" />
            </div>
          </div>
        )}

        {/* Fatal Error Fallback with Clean Manual Retry */}
        {hasFatalError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-center">
            <AlertCircle size={28} className="text-amber-400 mb-2" />
            <p className="text-white text-xs font-bold mb-3">
              {isRtl ? 'تعذر تشغيل الفيديو' : 'Video playback error'}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setHasFatalError(false);
                setIsBuffering(true);
                const v = videoRef.current;
                if (v) {
                  const resumeTime = lastPlaybackTimeRef.current || 0;
                  try {
                    v.load();
                    v.currentTime = resumeTime;
                    v.play().catch(() => {});
                  } catch (_) {}
                }
              }}
              className="px-3.5 py-1.5 rounded-lg bg-accent text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 shadow-lg cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>{isRtl ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>
          </div>
        )}

        {/* Center Play/Pause Floating Glass Button */}
        {!isPlaying && !isBuffering && !hasFatalError && directVideoUrl && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 z-20 m-auto w-16 h-16 rounded-full bg-accent/90 hover:bg-accent text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 cursor-pointer"
            title={isRtl ? 'تشغيل الفيديو' : 'Play Video'}
          >
            <Play size={28} className="translate-x-0.5 fill-white text-white" />
          </button>
        )}

        {/* Visual Mute / Unmute Indicator Overlay */}
        <AnimatePresence>
          {muteFeedback?.show && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="absolute inset-0 m-auto w-fit h-fit z-35 pointer-events-none flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 text-white shadow-2xl"
            >
              {muteFeedback.isMuted ? (
                <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                  <VolumeX size={16} />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-[var(--fg-success)]/20 text-[var(--fg-success)] flex items-center justify-center">
                  <Volume2 size={16} />
                </div>
              )}
              <span className="text-xs font-bold font-sans select-none tracking-wide">
                {muteFeedback.isMuted
                  ? (isRtl ? 'تم كتم الصوت' : 'Muted')
                  : (isRtl ? 'تم تشغيل الصوت' : 'Sound Unmuted')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {showDiagnostics && (
          <OnScreenDiagnostics
            isPlaying={isPlaying}
            isMuted={isMuted}
            volume={volume}
            currentTime={currentTime}
            duration={duration}
            isBuffering={isBuffering}
            hasFatalError={hasFatalError}
            videoResolution={videoResolution}
            videoElement={videoRef.current}
            playerId={playerId}
            onClose={() => setShowDiagnostics(false)}
            isRtl={isRtl}
          />
        )}
      </UniversalMediaContainer>
    </div>
  );
};

