import React, { useState, useRef, useEffect, useId, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Film
} from 'lucide-react';
import { parseVideoUrl, getMediaUrl } from '../utils/mediaUtils';
import { notifyMediaPlaying } from '../utils/mediaCoordinator';
import { useVideoResource, MediaAspectRatio, MediaFitMode, MediaFormatType } from '../context/VideoResourceContext';
import { UniversalMediaContainer } from './UniversalMediaContainer';

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
 * Integrates directly with VideoResourceProvider for seamless format transitions.
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
  muted = true,
  className = '',
  isRtl = true,
  showControls = true,
  maxHeight,
  onOpenReels,
  onEnded
}) => {
  const reactId = useId();
  const playerId = useRef(`universal_media_${reactId.replace(/:/g, '_')}`).current;
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { updateMediaMetadata } = useVideoResource();

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [detectedRatio, setDetectedRatio] = useState<MediaAspectRatio>(aspectRatio);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlayControls, setShowOverlayControls] = useState(false);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const videoInfo = parseVideoUrl(url);

  // Sync aspect ratio when prop changes
  useEffect(() => {
    if (aspectRatio !== 'auto') {
      setDetectedRatio(aspectRatio);
    }
  }, [aspectRatio]);

  // Synchronize with global media coordinator to prevent double-audio clashing
  useEffect(() => {
    const handleStopMedia = (e: Event) => {
      const customEvent = e as CustomEvent<{ exceptMediaId?: string }>;
      if (customEvent.detail?.exceptMediaId !== playerId) {
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
        setIsPlaying(false);
      }
    };

    const handleMediaPlaying = (e: Event) => {
      const customEvent = e as CustomEvent<{ mediaId: string }>;
      if (customEvent.detail?.mediaId !== playerId) {
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
        setIsPlaying(false);
      }
    };

    window.addEventListener('perplexta:stop_all_media', handleStopMedia);
    window.addEventListener('perplexta:media_playing', handleMediaPlaying);

    return () => {
      window.removeEventListener('perplexta:stop_all_media', handleStopMedia);
      window.removeEventListener('perplexta:media_playing', handleMediaPlaying);
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch (_) {}
      }
    };
  }, [playerId]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    const dur = video.duration || 0;
    setDuration(dur);

    const naturalWidth = video.videoWidth || 0;
    const naturalHeight = video.videoHeight || 0;

    if (naturalWidth > 0 && naturalHeight > 0) {
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

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      setShowOverlayControls(true);
    } else {
      notifyMediaPlaying(playerId);
      video.play().then(() => {
        setIsPlaying(true);
        resetHideTimer();
      }).catch(() => {});
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

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

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onMouseEnter={() => setShowOverlayControls(true)}
      onMouseLeave={() => isPlaying && setShowOverlayControls(false)}
      className="w-full"
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
              {/* Seek Progress Bar */}
              <div className="relative flex items-center w-full group/slider">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (videoRef.current) videoRef.current.currentTime = val;
                    setCurrentTime(val);
                  }}
                  className="w-full h-1 bg-white/30 hover:h-1.5 rounded-lg appearance-none cursor-pointer accent-accent transition-all duration-150"
                />
              </div>

              <div className="flex items-center justify-between text-white text-xs font-mono">
                {/* Play/Pause & Mute & Time */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title={isPlaying ? (isRtl ? 'إيقاف مؤقت' : 'Pause') : (isRtl ? 'تشغيل' : 'Play')}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>

                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title={isMuted ? (isRtl ? 'تشغيل الصوت' : 'Unmute') : (isRtl ? 'كتم الصوت' : 'Mute')}
                  >
                    {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} />}
                  </button>

                  <span className="text-[11px] text-gray-300 font-mono select-none">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right Side: Fullscreen / Reels Expand */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenReels) {
                        if (videoRef.current) {
                          try {
                            videoRef.current.pause();
                            videoRef.current.muted = true;
                          } catch (_) {}
                        }
                        setIsPlaying(false);
                        try {
                          window.dispatchEvent(new CustomEvent('perplexta:stop_all_media'));
                          document.querySelectorAll('video').forEach(v => {
                            try {
                              v.pause();
                              v.muted = true;
                            } catch (_) {}
                          });
                        } catch (_) {}
                        onOpenReels();
                      } else {
                        toggleFullscreen(e);
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title={isRtl ? (onOpenReels ? 'عرض ريلز بملء الشاشة' : 'ملء الشاشة') : (onOpenReels ? 'Open Reels' : 'Fullscreen')}
                  >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
              </div>
            </div>
          ) : null
        }
      >
        {directVideoUrl ? (
          <video
            ref={videoRef}
            src={directVideoUrl}
            poster={posterUrl}
            playsInline
            muted={isMuted}
            autoPlay={autoPlay}
            onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => {
              setIsPlaying(false);
              if (onEnded) onEnded();
            }}
            className={`w-full h-full relative z-10 cursor-pointer ${
              fitMode === 'cover'
                ? 'object-cover'
                : fitMode === 'contain'
                ? 'object-contain'
                : 'object-fill'
            }`}
            onClick={togglePlay}
          />
        ) : posterUrl ? (
          <img
            src={posterUrl}
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

        {/* Center Play/Pause Floating Glass Button */}
        {!isPlaying && directVideoUrl && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 z-20 m-auto w-16 h-16 rounded-full bg-accent/90 hover:bg-accent text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 cursor-pointer"
            title={isRtl ? 'تشغيل الفيديو' : 'Play Video'}
          >
            <Play size={28} className="translate-x-0.5 fill-white text-white" />
          </button>
        )}
      </UniversalMediaContainer>
    </div>
  );
};
