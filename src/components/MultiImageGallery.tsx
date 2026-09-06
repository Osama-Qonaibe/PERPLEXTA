import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Play, Film } from 'lucide-react';
import { MediaGalleryItem } from '../../server/db/types';
import { getMediaUrl } from '../utils/mediaUtils';

export interface MultiImageGalleryProps {
  images?: string[];
  mediaGallery?: MediaGalleryItem[];
  layout?: 'grid' | 'album' | string;
  onOpenLightbox: (url: string, items?: MediaGalleryItem[], index?: number) => void;
  isRtl: boolean;
  adTitle?: string;
  adFormat?: string;
}

export const MultiImageGallery: React.FC<MultiImageGalleryProps> = ({
  images,
  mediaGallery,
  layout = 'grid',
  onOpenLightbox,
  isRtl,
  adTitle = '',
  adFormat = 'post'
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Normalize media items
  const items: MediaGalleryItem[] = useMemo(() => {
    if (mediaGallery && Array.isArray(mediaGallery) && mediaGallery.length > 0) {
      return mediaGallery;
    }
    if (images && Array.isArray(images) && images.length > 0) {
      return images.map((url, idx) => ({
        id: `img-${idx}`,
        url,
        type: 'image',
        caption: ''
      }));
    }
    return [];
  }, [mediaGallery, images]);

  if (!items || items.length === 0) return null;

  const totalCount = items.length;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? totalCount - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === totalCount - 1 ? 0 : prev + 1));
  };

  const isAlbum = layout === 'album';

  const renderSingleMediaItem = (
    item: MediaGalleryItem,
    idx: number,
    isLast = false,
    hasMore = false,
    remaining = 0
  ) => {
    const isVideo = item.type === 'video';
    const mediaSrc = getMediaUrl(item.url);
    const hasCustomThumbnail = Boolean(item.thumbnailUrl && item.thumbnailUrl !== item.url);
    const posterUrl = hasCustomThumbnail ? getMediaUrl(item.thumbnailUrl!) : undefined;
    const videoSrcWithTime = mediaSrc.includes('#') ? mediaSrc : `${mediaSrc}#t=0.5`;
    const displayUrl = hasCustomThumbnail ? getMediaUrl(item.thumbnailUrl!) : mediaSrc;

    return (
      <div
        key={item.id || idx}
        onClick={() => onOpenLightbox(item.url, items, idx)}
        className="relative w-full h-full overflow-hidden cursor-pointer group bg-transparent select-none"
      >
        {isVideo ? (
          <div className="relative w-full h-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center overflow-hidden">
            <video
              src={videoSrcWithTime}
              poster={posterUrl}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
              muted
              playsInline
              preload="metadata"
            />
            {/* Play Badge Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/15 group-hover:bg-black/25 transition-colors">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-[4px] bg-black/60 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <Play size={22} className="fill-white translate-x-0.5" />
              </div>
            </div>
            <span className="absolute bottom-2 start-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-md shadow-sm z-10">
              <Film size={11} className="text-accent" />
              <span>{isRtl ? 'فيديو' : 'Video'}</span>
            </span>
          </div>
        ) : (
          <img
            src={displayUrl}
            alt={item.caption || adTitle || 'Post item'}
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallback) {
                target.dataset.fallback = 'true';
                target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80';
              }
            }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Subtle hover overlay */}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Caption badge if item has caption */}
        {item.caption && (
          <div className="absolute top-2 start-2 px-2 py-0.5 rounded-[4px] bg-black/65 text-white text-[10px] font-medium backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity max-w-[85%] truncate pointer-events-none">
            {item.caption}
          </div>
        )}

        {/* Overflow +N Badge */}
        {isLast && hasMore && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] flex flex-col items-center justify-center z-10 pointer-events-none transition-colors group-hover:bg-black/70">
            <span className="text-white text-3xl sm:text-4xl font-extrabold font-mono tracking-tight drop-shadow-md">
              +{remaining}
            </span>
            <span className="text-white/95 text-xs font-bold mt-1 drop-shadow-sm">
              {isRtl ? 'عناصر أخرى' : 'more items'}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Single Item Layout (1 item)
  if (totalCount === 1) {
    const item = items[0];
    const isVideo = item.type === 'video';
    const mediaSrc = getMediaUrl(item.url);
    const hasCustomThumbnail = Boolean(item.thumbnailUrl && item.thumbnailUrl !== item.url);
    const posterUrl = hasCustomThumbnail ? getMediaUrl(item.thumbnailUrl!) : undefined;
    const videoSrcWithTime = mediaSrc.includes('#') ? mediaSrc : `${mediaSrc}#t=0.5`;
    const displayUrl = hasCustomThumbnail ? getMediaUrl(item.thumbnailUrl!) : mediaSrc;

    return (
      <div
        onClick={() => onOpenLightbox(item.url, items, 0)}
        className={`relative w-full bg-transparent cursor-pointer overflow-hidden group transition-theme touch-pan-y ${
          adFormat === 'reel' || adFormat === 'story'
            ? 'aspect-[9/16] max-h-[550px] mx-auto'
            : adFormat === 'video' || adFormat === 'instream'
            ? 'aspect-video'
            : adFormat === 'banner'
            ? 'aspect-[21/9]'
            : 'max-h-[600px] flex items-center justify-center'
        }`}
      >
        {isVideo ? (
          <div className="relative w-full h-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center overflow-hidden">
            <video
              src={videoSrcWithTime}
              poster={posterUrl}
              className="w-full h-full object-cover pointer-events-none"
              muted
              playsInline
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/15 group-hover:bg-black/25 transition-colors">
              <div className="w-14 h-14 rounded-[4px] bg-black/60 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-md border border-white/30 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                <Play size={26} className="fill-white translate-x-0.5" />
              </div>
            </div>
            <span className="absolute bottom-2.5 start-2.5 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-md shadow-sm z-10">
              <Film size={11} className="text-accent" />
              <span>{isRtl ? 'فيديو' : 'Video'}</span>
            </span>
          </div>
        ) : (
          <img
            src={displayUrl}
            alt={item.caption || adTitle || 'Post image'}
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallback) {
                target.dataset.fallback = 'true';
                target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80';
              }
            }}
            className="w-full h-auto max-h-[600px] object-cover transition-transform duration-500 group-hover:scale-[1.01] pointer-events-none"
            loading="lazy"
          />
        )}

        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="px-3.5 py-1.5 rounded-[4px] bg-white/95 dark:bg-black/85 text-xs font-extrabold shadow-xl text-gray-900 dark:text-white flex items-center gap-1.5 backdrop-blur-md">
            <Sparkles size={14} className="text-accent" />
            <span>{isRtl ? 'عرض بصورة مكبرة' : 'Expand Media'}</span>
          </span>
        </div>
      </div>
    );
  }

  // Album Carousel Layout
  if (isAlbum) {
    const currentItem = items[activeIndex];
    return (
      <div className="relative w-full aspect-square bg-transparent overflow-hidden group select-none">
        <button
          type="button"
          onClick={isRtl ? handleNext : handlePrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-[4px] bg-black/60 hover:bg-black/80 text-white flex items-center justify-center z-10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 backdrop-blur-xs"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          type="button"
          onClick={isRtl ? handlePrev : handleNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-[4px] bg-black/60 hover:bg-black/80 text-white flex items-center justify-center z-10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 backdrop-blur-xs"
        >
          <ChevronRight size={20} />
        </button>

        <div
          onClick={() => onOpenLightbox(currentItem.url, items, activeIndex)}
          className="w-full h-full cursor-pointer relative"
        >
          {renderSingleMediaItem(currentItem, activeIndex)}
        </div>

        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold font-mono px-2.5 py-1 rounded-[4px] shadow z-10">
          {activeIndex + 1} / {totalCount}
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(idx);
              }}
              className={`h-1.5 rounded-[4px] transition-all cursor-pointer ${
                idx === activeIndex ? 'bg-accent w-4' : 'bg-white/60 hover:bg-white/90 w-1.5'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // 2 Items: 2 equal side-by-side columns
  if (totalCount === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 sm:gap-1 w-full aspect-[4/3] sm:aspect-[16/10] bg-transparent overflow-hidden select-none">
        <div className="w-full h-full overflow-hidden">
          {renderSingleMediaItem(items[0], 0)}
        </div>
        <div className="w-full h-full overflow-hidden">
          {renderSingleMediaItem(items[1], 1)}
        </div>
      </div>
    );
  }

  // 3 Items: 1 large leading photo + 2 stacked photos
  if (totalCount === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5 sm:gap-1 w-full aspect-[4/3] sm:aspect-[16/10] bg-transparent overflow-hidden select-none">
        <div className="row-span-2 col-span-1 w-full h-full overflow-hidden">
          {renderSingleMediaItem(items[0], 0)}
        </div>
        <div className="col-span-1 row-span-1 w-full h-full overflow-hidden">
          {renderSingleMediaItem(items[1], 1)}
        </div>
        <div className="col-span-1 row-span-1 w-full h-full overflow-hidden">
          {renderSingleMediaItem(items[2], 2)}
        </div>
      </div>
    );
  }

  // 4 Items: Facebook-style clean dynamic collage without restrictive square borders or box background
  if (totalCount === 4) {
    return (
      <div className="grid grid-cols-2 gap-0.5 sm:gap-1 w-full aspect-[4/3] sm:aspect-[16/10] bg-transparent overflow-hidden select-none">
        <div className="w-full h-full overflow-hidden">
          {renderSingleMediaItem(items[0], 0)}
        </div>
        <div className="w-full h-full overflow-hidden">
          {renderSingleMediaItem(items[1], 1)}
        </div>
        <div className="w-full h-full overflow-hidden">
          {renderSingleMediaItem(items[2], 2)}
        </div>
        <div className="w-full h-full overflow-hidden">
          {renderSingleMediaItem(items[3], 3)}
        </div>
      </div>
    );
  }

  // 5 or more Items: Facebook dynamic collage with +N overlay on the 4th quadrant
  return (
    <div className="grid grid-cols-2 gap-0.5 sm:gap-1 w-full aspect-[4/3] sm:aspect-[16/10] bg-transparent overflow-hidden select-none">
      <div className="w-full h-full overflow-hidden">
        {renderSingleMediaItem(items[0], 0)}
      </div>
      <div className="w-full h-full overflow-hidden">
        {renderSingleMediaItem(items[1], 1)}
      </div>
      <div className="w-full h-full overflow-hidden">
        {renderSingleMediaItem(items[2], 2)}
      </div>
      <div className="w-full h-full overflow-hidden">
        {renderSingleMediaItem(items[3], 3, true, true, totalCount - 4)}
      </div>
    </div>
  );
};
