import React, { useState, useEffect, useRef } from 'react';
import { Film, X, Scissors, Sliders, CheckCircle2, HardDrive, Clock, Maximize2, Image as ImageIcon, Loader2, UploadCloud, Cpu, FileSearch } from 'lucide-react';

export interface VideoPreviewerProps {
  videoUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  resolution?: string;
  thumbnailUrl?: string;
  isRtl?: boolean;
  uploadProgress?: number;
  processingStage?: 'idle' | 'uploading' | 'transcoding' | 'extracting' | 'done';
  onRemove: () => void;
  onTrim?: () => void;
  onEditFilters?: () => void;
  onSelectThumbnail?: (thumbUrl: string) => void;
}

export const VideoPreviewer: React.FC<VideoPreviewerProps> = ({
  videoUrl,
  fileName,
  fileSize,
  duration = 10,
  resolution,
  thumbnailUrl,
  isRtl = true,
  uploadProgress = 0,
  processingStage = 'done',
  onRemove,
  onTrim,
  onEditFilters,
  onSelectThumbnail,
}) => {
  const [generatedThumbnails, setGeneratedThumbnails] = useState<string[]>([]);
  const [selectedThumb, setSelectedThumb] = useState<string>(thumbnailUrl || '');
  const [isGeneratingThumbs, setIsGeneratingThumbs] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (secs?: number) => {
    if (!secs) return '';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  useEffect(() => {
    if (!videoUrl || processingStage !== 'done') return;
    let isMounted = true;
    setIsGeneratingThumbs(true);

    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'auto';

    const thumbs: string[] = [];
    const totalDuration = duration || 5;
    const timestamps = [
      totalDuration * 0.1,
      totalDuration * 0.4,
      totalDuration * 0.7,
      totalDuration * 0.9,
    ];

    let currentIndex = 0;

    const captureNext = () => {
      if (!isMounted) return;
      if (currentIndex >= timestamps.length) {
        setIsGeneratingThumbs(false);
        if (thumbs.length > 0 && !selectedThumb) {
          setSelectedThumb(thumbs[0]);
          if (onSelectThumbnail) onSelectThumbnail(thumbs[0]);
        }
        if (isMounted) setGeneratedThumbnails(thumbs);
        return;
      }

      video.currentTime = Math.max(0.1, timestamps[currentIndex]);
    };

    video.onseeked = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          thumbs.push(dataUrl);
        }
      } catch (e) {
        console.error('Thumbnail generation error:', e);
      }
      currentIndex++;
      captureNext();
    };

    video.onloadedmetadata = () => {
      captureNext();
    };

    video.onerror = () => {
      setIsGeneratingThumbs(false);
    };

    return () => {
      isMounted = false;
      video.remove();
    };
  }, [videoUrl, duration, processingStage]);

  const isProcessing = processingStage !== 'done' && processingStage !== 'idle';

  return (
    <div className="relative group bg-gradient-to-br from-[#141416]/90 to-[#1e1e24]/90 border border-emerald-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col gap-4 transition-theme hover:border-emerald-500/60">
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
        {/* Main Thumbnail or Video Preview */}
        <div className="relative w-full sm:w-36 h-24 bg-black rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center shrink-0 shadow-inner">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center text-emerald-500/70 gap-2">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-[10px] font-mono">{Math.round(uploadProgress)}%</span>
            </div>
          ) : selectedThumb || thumbnailUrl || videoUrl ? (
            selectedThumb || thumbnailUrl ? (
              <img
                src={selectedThumb || thumbnailUrl}
                alt="Video Thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={videoUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center text-emerald-400 gap-1">
              <Film size={24} />
              <span className="text-[10px] font-mono">VIDEO</span>
            </div>
          )}

          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors pointer-events-none" />

          {duration && !isProcessing && (
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white flex items-center gap-1 backdrop-blur-sm">
              <Clock size={10} className="text-emerald-400" />
              <span>{formatDuration(duration)}</span>
            </div>
          )}
        </div>

        {/* Metadata Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 text-right sm:text-start w-full">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-white text-xs font-bold truncate flex items-center gap-1.5">
              {isProcessing ? (
                <Loader2 size={14} className="text-emerald-400 shrink-0 animate-spin" />
              ) : (
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              )}
              <span className="truncate">{fileName || (isRtl ? 'مقطع الفيديو' : 'Video Asset')}</span>
            </h4>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border shrink-0 ${isProcessing ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
              {isProcessing 
                ? (isRtl ? 'جاري المعالجة...' : 'Processing...') 
                : (isRtl ? 'جاهز للمعالجة' : 'Ready')}
            </span>
          </div>

          {isProcessing ? (
            <div className="w-full flex flex-col gap-2 mt-1">
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-theme ${processingStage === 'uploading' ? 'bg-blue-500' : processingStage === 'transcoding' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                <div className="flex items-center gap-1.5">
                  {processingStage === 'uploading' && <UploadCloud size={12} className="text-blue-400" />}
                  {processingStage === 'transcoding' && <Cpu size={12} className="text-amber-400 animate-pulse" />}
                  {processingStage === 'extracting' && <FileSearch size={12} className="text-emerald-400 animate-pulse" />}
                  <span>
                    {processingStage === 'uploading' && (isRtl ? 'جاري الرفع للشبكة...' : 'Uploading to network...')}
                    {processingStage === 'transcoding' && (isRtl ? 'جاري معالجة الفيديو (FFmpeg)...' : 'Transcoding video (FFmpeg)...')}
                    {processingStage === 'extracting' && (isRtl ? 'استخراج البيانات الوصفية...' : 'Extracting metadata...')}
                  </span>
                </div>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 font-mono">
                {fileSize && (
                  <span className="flex items-center gap-1">
                    <HardDrive size={12} className="text-gray-500" />
                    {formatBytes(fileSize)}
                  </span>
                )}
                {resolution && (
                  <span className="flex items-center gap-1">
                    <Maximize2 size={12} className="text-gray-500" />
                    {resolution}
                  </span>
                )}
                {duration && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-gray-500" />
                    {formatDuration(duration)}
                  </span>
                )}
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 pt-1">
                {onTrim && (
                  <button
                    type="button"
                    onClick={onTrim}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors border border-emerald-500/30 cursor-pointer"
                  >
                    <Scissors size={12} />
                    <span>{isRtl ? 'قص المقطع' : 'Trim'}</span>
                  </button>
                )}
                {onEditFilters && (
                  <button
                    type="button"
                    onClick={onEditFilters}
                    className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors border border-gray-700 cursor-pointer"
                  >
                    <Sliders size={12} />
                    <span>{isRtl ? 'الفلاتر' : 'Filters'}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Remove / Cancel Button */}
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-3 left-3 sm:relative sm:top-auto sm:left-auto w-7 h-7 rounded-full bg-black/60 hover:bg-red-500 text-gray-300 hover:text-white flex items-center justify-center transition-colors shadow-md cursor-pointer shrink-0"
          title={isRtl ? 'إزالة الملف' : 'Remove file'}
        >
          <X size={14} />
        </button>
      </div>

      {/* Generated Thumbnails Grid */}
      {!isProcessing && (
        <div className="border-t border-gray-800/80 pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1.5 font-medium">
              <ImageIcon size={13} className="text-emerald-400" />
              {isRtl ? 'اختر صورة مصغرة (Thumbnail Keyframes):' : 'Select Keyframe Thumbnail:'}
            </span>
            {isGeneratingThumbs && (
              <span className="text-[10px] text-emerald-400 animate-pulse">
                {isRtl ? 'جاري توليد الإطارات...' : 'Generating frames...'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {generatedThumbnails.length > 0 ? (
              generatedThumbnails.map((thumb, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedThumb(thumb);
                    if (onSelectThumbnail) onSelectThumbnail(thumb);
                  }}
                  className={`relative rounded-xl overflow-hidden border transition-theme aspect-video group/thumb cursor-pointer ${
                    selectedThumb === thumb
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/20'
                      : 'border-gray-800 hover:border-gray-600 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={thumb} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-transparent transition-colors" />
                  {selectedThumb === thumb && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </div>
                  )}
                </button>
              ))
            ) : (
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-gray-900 border border-gray-800 aspect-video animate-pulse flex items-center justify-center text-gray-600 text-[10px]"
                >
                  ...
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
