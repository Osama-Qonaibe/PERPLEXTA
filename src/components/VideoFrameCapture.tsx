import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, Check, RefreshCw, X } from 'lucide-react';
import { toast } from '../context/NotificationContext';

interface VideoFrameCaptureProps {
  videoUrl: string;
  currentCoverUrl?: string;
  onSelectCover: (coverUrl: string, blob?: Blob) => void;
  onRemoveCover?: () => void;
  isRtl?: boolean;
}

export const VideoFrameCapture: React.FC<VideoFrameCaptureProps> = ({
  videoUrl,
  currentCoverUrl,
  onSelectCover,
  onRemoveCover,
  isRtl = true,
}) => {
  const [keyframes, setKeyframes] = useState<{ time: number; dataUrl: string }[]>([]);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [selectedFrameUrl, setSelectedFrameUrl] = useState<string>(currentCoverUrl || '');

  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external currentCoverUrl
  useEffect(() => {
    if (currentCoverUrl) {
      setSelectedFrameUrl(currentCoverUrl);
    }
  }, [currentCoverUrl]);

  // Extract keyframes when videoUrl changes
  useEffect(() => {
    if (!videoUrl) return;

    let isCancelled = false;
    setIsExtracting(true);
    setKeyframes([]);

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      if (isCancelled) return;
      const dur = video.duration || 1;

      const targetCount = 5;
      const step = dur / (targetCount + 1);
      const times = Array.from({ length: targetCount }, (_, i) => (i + 1) * step);
      const extracted: { time: number; dataUrl: string }[] = [];

      for (const time of times) {
        if (isCancelled) break;
        try {
          const frame = await captureVideoFrameAtTime(video, time);
          if (frame) {
            extracted.push({ time, dataUrl: frame });
            if (!isCancelled) {
              setKeyframes([...extracted]);
            }
          }
        } catch (e) {
          console.error('Frame capture error:', e);
        }
      }

      if (!isCancelled) {
        setIsExtracting(false);
        // If no cover selected yet, auto-select the first frame
        if (!selectedFrameUrl && extracted.length > 0) {
          setSelectedFrameUrl(extracted[0].dataUrl);
          onSelectCover(extracted[0].dataUrl);
        }
      }
    };

    video.onerror = () => {
      if (!isCancelled) setIsExtracting(false);
    };

    return () => {
      isCancelled = true;
    };
  }, [videoUrl]);

  // Helper to seek and capture a single frame
  const captureVideoFrameAtTime = (video: HTMLVideoElement, time: number): Promise<string> => {
    return new Promise((resolve) => {
      const handleSeeked = () => {
        video.removeEventListener('seeked', handleSeeked);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            resolve(dataUrl);
            return;
          }
        } catch (err) {
          console.error('Canvas capture failed:', err);
        }
        resolve('');
      };

      video.addEventListener('seeked', handleSeeked, { once: true });
      video.currentTime = Math.min(Math.max(0, time), video.duration || 1);
    });
  };

  // Handle Custom Cover Upload
  const handleCustomCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSelectedFrameUrl(url);
    onSelectCover(url, file);
    toast.success(isRtl ? 'تم تعيين صورة الغلاف' : 'Cover image selected');
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-gray-50/90 dark:bg-zinc-800/60 rounded-xl p-2 sm:p-2.5 border border-gray-200/80 dark:border-zinc-700/70 space-y-1.5 sm:space-y-2">
      {/* Hidden elements for processing */}
      <video
        ref={hiddenVideoRef}
        src={videoUrl}
        className="hidden"
        preload="metadata"
        muted
        crossOrigin="anonymous"
      />
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCustomCoverFile}
      />

      {/* Clean Compact Header */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <Camera size={13} className="text-accent shrink-0 sm:size-[14px]" />
          <span className="text-[11px] sm:text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
            {isRtl ? 'صورة غلاف المقطع' : 'Video Cover'}
          </span>
          {isExtracting && (
            <span className="text-[9px] sm:text-[10px] text-accent flex items-center gap-1 animate-pulse">
              <RefreshCw size={8} className="animate-spin sm:size-[9px]" />
            </span>
          )}
        </div>

        {/* Compact Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold rounded-lg bg-white dark:bg-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-zinc-600 flex items-center gap-1 sm:gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
        >
          <ImageIcon size={11} className="text-accent sm:size-[12px]" />
          <span>{isRtl ? 'رفع صورة غلاف' : 'Upload Cover'}</span>
        </button>
      </div>

      {/* Suggested Keyframes Thumbnails Row */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5 scrollbar-thin">
        {keyframes.map((kf, idx) => {
          const isSelected = selectedFrameUrl === kf.dataUrl;
          return (
            <button
              key={`kf-${idx}-${kf.time}`}
              type="button"
              onClick={() => {
                setSelectedFrameUrl(kf.dataUrl);
                onSelectCover(kf.dataUrl);
                toast.success(isRtl ? `تم اختيار الغلاف (${formatTime(kf.time)})` : `Selected cover (${formatTime(kf.time)})`);
              }}
              className={`relative group shrink-0 w-14 sm:w-20 h-9 sm:h-13 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-accent ring-2 ring-accent/30 scale-105 shadow-sm'
                  : 'border-gray-200 dark:border-zinc-700 hover:border-accent/60 opacity-80 hover:opacity-100'
              }`}
            >
              <img
                src={kf.dataUrl}
                alt={`Frame ${idx}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[7px] sm:text-[8px] font-mono text-center py-0.2">
                {formatTime(kf.time)}
              </div>

              {isSelected && (
                <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-accent text-white flex items-center justify-center shadow-xs">
                  <Check size={8} strokeWidth={3} className="sm:size-[9px]" />
                </div>
              )}
            </button>
          );
        })}

        {!isExtracting && keyframes.length === 0 && (
          <div className="text-[10px] text-gray-400 py-1 w-full text-center">
            {isRtl ? 'جاري تجهيز الإطارات...' : 'Preparing frames...'}
          </div>
        )}
      </div>
    </div>
  );
};
