import React, { useState, useRef, useEffect, useId } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Crop,
  Sparkles,
  Film,
  RotateCcw
} from 'lucide-react';
import { parseVideoUrl, getAspectRatioClass, getMediaUrl } from '../utils/mediaUtils';
import { notifyMediaPlaying, stopAllMedia } from '../utils/mediaCoordinator';

export interface MediaFormatPlayerProps {
  url: string;
  adFormat?: 'feed' | 'story' | 'reel' | 'video' | 'sidebar' | 'banner' | 'instream' | string;
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5' | '21:9' | 'auto' | string;
  defaultFitMode?: 'cover' | 'contain' | 'fill';
  posterUrl?: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  isRtl?: boolean;
  showControls?: boolean;
  allowFitToggle?: boolean;
  onOpenReels?: () => void;
  onEnded?: () => void;
}

export const MediaFormatPlayer: React.FC<MediaFormatPlayerProps> = ({
  url,
  adFormat = 'feed',
  aspectRatio = 'auto',
  defaultFitMode = 'cover',
  posterUrl,
  title,
  autoPlay = false,
  muted = true,
  className = '',
  isRtl = true,
  showControls = true,
  allowFitToggle = true,
  onOpenReels,
  onEnded,
}) => {
  const reactId = useId();
  const playerId = useRef(`media_player_${reactId.replace(/:/g, '_')}`).current;
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [fitMode, setFitMode] = useState<'cover' | 'contain' | 'fill'>(defaultFitMode);
  const [activeRatio, setActiveRatio] = useState<string>(aspectRatio);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlayControls, setShowOverlayControls] = useState(false);

  const videoInfo = parseVideoUrl(url);

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

  useEffect(() => {
    if (aspectRatio !== 'auto') {
      setActiveRatio(aspectRatio);
    }
  }, [aspectRatio]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onEnded]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = videoRef.current;
          if (!video) return;
          if (!entry.isIntersecting || entry.intersectionRatio < 0.25) {
            if (!video.paused) {
              video.pause();
            }
            setIsPlaying(false);
          }
        });
      },
      { threshold: [0, 0.25, 0.5] }
    );

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      notifyMediaPlaying(playerId);
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const toggleFitMode = () => {
    setFitMode(prev => (prev === 'cover' ? 'contain' : prev === 'contain' ? 'fill' : 'cover'));
  };

  const cycleAspectRatio = () => {
    const ratios = ['9:16', '16:9', '1:1', '4:5', '21:9'];
    const currentIndex = ratios.indexOf(activeRatio);
    const nextRatio = ratios[(currentIndex + 1) % ratios.length];
    setActiveRatio(nextRatio);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const ratioClass = activeRatio !== 'auto'
    ? getAspectRatioClass(activeRatio, adFormat)
    : getAspectRatioClass(undefined, adFormat);

  if (videoInfo.type === 'youtube' || videoInfo.type === 'vimeo' || videoInfo.type === 'tiktok') {
    return (
      <div
        ref={containerRef}
        className={`relative w-full rounded-xl overflow-hidden bg-black shadow-lg border border-gray-800 transition-theme ${ratioClass} ${className}`}
      >
        <iframe
          src={videoInfo.embedUrl}
          title={title || 'Embedded Video Player'}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        {/* Floating Format Badge */}
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-accent text-[10px] font-black border border-accent/30 flex items-center gap-1 pointer-events-none">
          <Film size={11} />
          <span>{videoInfo.type.toUpperCase()} Embed</span>
        </div>
      </div>
    );
  }

  const resolvedVideoSrc = getMediaUrl(url);
  const resolvedPosterSrc = posterUrl ? getMediaUrl(posterUrl) : undefined;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setShowOverlayControls(true)}
      onMouseLeave={() => setShowOverlayControls(false)}
      className={`relative w-full rounded-xl overflow-hidden bg-black shadow-2xl group transition-theme ${ratioClass} ${className}`}
    >
      {/* Backdrop blur effect when fitMode === 'contain' */}
      {fitMode === 'contain' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 blur-xl scale-110">
          <video
            src={resolvedVideoSrc}
            muted
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Main HTML5 Video Element */}
      <video
        ref={videoRef}
        data-media-id={playerId}
        src={resolvedVideoSrc}
        poster={resolvedPosterSrc}
        playsInline
        muted={isMuted}
        autoPlay={autoPlay}
        className={`w-full h-full relative z-10 transition-theme ${
          fitMode === 'cover'
            ? 'object-cover'
            : fitMode === 'contain'
            ? 'object-contain'
            : 'object-fill'
        }`}
        onClick={togglePlay}
      />

      {/* Center Play/Pause Big Button Overlay */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 z-20 m-auto w-14 h-14 rounded-full bg-accent/90 hover:bg-accent text-white flex items-center justify-center shadow-xl shadow-none transition-transform duration-200 hover:scale-110 cursor-pointer"
          title={isRtl ? 'تشغيل' : 'Play'}
        >
          <Play size={28} className="translate-x-0.5 fill-white" />
        </button>
      )}

      {/* Top Bar: Format Badge & Aspect Ratio Selector */}
      <div className={`absolute top-2 left-2 right-2 z-20 flex items-center justify-between transition-opacity duration-300 ${showOverlayControls || !isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-accent text-[10px] font-black border border-accent/30 flex items-center gap-1">
            <Sparkles size={11} className="text-accent" />
            <span className="uppercase">{adFormat || 'VIDEO'}</span>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-gray-300 text-[10px] font-mono border border-gray-700">
            {activeRatio}
          </span>
        </div>

        {allowFitToggle && (
          <div className="flex items-center gap-1">
            {/* Toggle Aspect Ratio Button */}
            <button
              onClick={cycleAspectRatio}
              className="p-1.5 rounded-md bg-black/80 hover:bg-accent text-white text-[10px] font-bold border border-gray-700 flex items-center gap-1 backdrop-blur-md transition-colors"
              title={isRtl ? 'تبديل أبعاد العرض' : 'Cycle Aspect Ratio'}
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline font-mono">{activeRatio}</span>
            </button>

            {/* Toggle Fit/Crop Mode */}
            <button
              onClick={toggleFitMode}
              className="p-1.5 rounded-md bg-black/80 hover:bg-accent text-white text-[10px] font-bold border border-gray-700 flex items-center gap-1 backdrop-blur-md transition-colors"
              title={isRtl ? `نمط التكيف: ${fitMode === 'cover' ? 'تغطية وقص' : fitMode === 'contain' ? 'احتواء كامل' : 'تمدد'}` : `Fit mode: ${fitMode}`}
            >
              <Crop size={12} />
              <span className="hidden sm:inline capitalize">{fitMode}</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Sleek Video Control Bar */}
      {showControls && (
        <div className={`absolute bottom-0 inset-x-0 z-20 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-1.5 transition-opacity duration-300 ${showOverlayControls || !isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {/* Seek Progress Bar */}
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
            className="w-full h-1 bg-white/20 hover:h-1.5 rounded-lg appearance-none cursor-pointer accent-accent transition-theme"
          />

          <div className="flex items-center justify-between text-white text-xs font-mono">
            {/* Play/Pause & Mute */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1 rounded hover:bg-white/20 text-white transition-colors"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>

              <button
                onClick={toggleMute}
                className="p-1 rounded hover:bg-white/20 text-white transition-colors"
              >
                {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} />}
              </button>

              <span className="text-[10px] text-gray-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Side: Fullscreen & Mode Indicator */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-accent font-sans font-bold hidden sm:inline">
                {fitMode === 'cover' ? (isRtl ? 'قص ملائم' : 'Fill & Crop') : (isRtl ? 'عرض كامل' : 'Fit Container')}
              </span>
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.muted = true;
                  }
                  if (onOpenReels) {
                    onOpenReels();
                  } else {
                    toggleFullscreen();
                  }
                }}
                className="p-1 rounded hover:bg-white/20 text-white transition-colors"
                title={isRtl ? 'عرض ريلز بملء الشاشة' : 'Open Reels Fullscreen'}
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
