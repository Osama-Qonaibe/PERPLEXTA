import React from 'react';
import { Edit3, X, Play, Film, Image as ImageIcon, Plus } from 'lucide-react';
import { MediaGalleryItem } from '../../server/db/types';
import { getMediaUrl } from '../utils/mediaUtils';

interface ComposerMediaPreviewProps {
  mediaItems: MediaGalleryItem[];
  onOpenMediaManager: () => void;
  onClearAll: () => void;
  onAddMoreClick: () => void;
  isRtl: boolean;
}

export const ComposerMediaPreview: React.FC<ComposerMediaPreviewProps> = ({
  mediaItems,
  onOpenMediaManager,
  onClearAll,
  onAddMoreClick,
  isRtl
}) => {
  if (!mediaItems || mediaItems.length === 0) return null;

  const totalCount = mediaItems.length;

  const renderMediaThumbnail = (item: MediaGalleryItem, index: number, isLastWithMore = false, remainingCount = 0) => {
    const isVideo = item.type === 'video';
    const mediaSrc = getMediaUrl(item.url);
    const hasCustomThumbnail = Boolean(item.thumbnailUrl && item.thumbnailUrl !== item.url);
    const posterUrl = hasCustomThumbnail ? getMediaUrl(item.thumbnailUrl!) : undefined;
    const videoSrcWithTime = mediaSrc.includes('#') ? mediaSrc : `${mediaSrc}#t=0.5`;
    const displayUrl = hasCustomThumbnail ? getMediaUrl(item.thumbnailUrl!) : mediaSrc;

    return (
      <div
        key={item.id || index}
        onClick={onOpenMediaManager}
        className="relative w-full h-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-pointer group select-none"
      >
        {isVideo ? (
          <>
            <video
              src={videoSrcWithTime}
              poster={posterUrl}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
              muted
              playsInline
              preload="metadata"
            />
            {/* Play Badge Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
              <div className="w-10 h-10 rounded-[4px] bg-black/60 text-white flex items-center justify-center backdrop-blur-xs border border-white/20 shadow-md">
                <Play size={18} className="fill-white translate-x-0.5" />
              </div>
            </div>
            <span className="absolute bottom-2 start-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium flex items-center gap-1">
              <Film size={10} />
              <span>{isRtl ? 'فيديو' : 'Video'}</span>
            </span>
          </>
        ) : (
          <img
            src={displayUrl}
            alt="Media preview"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        )}

        {/* Hover highlight */}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Overflow +N Overlay (Facebook Style) */}
        {isLastWithMore && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-10">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-wide font-mono">+{remainingCount}</span>
            <span className="text-[11px] font-semibold text-white/90 mt-0.5">
              {isRtl ? 'عناصر أخرى' : 'more'}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderCollageLayout = () => {
    // 1 Item
    if (totalCount === 1) {
      return (
        <div className="w-full h-[280px] sm:h-[340px]">
          {renderMediaThumbnail(mediaItems[0], 0)}
        </div>
      );
    }

    // 2 Items: 2 equal columns
    if (totalCount === 2) {
      return (
        <div className="grid grid-cols-2 gap-1 w-full h-[260px] sm:h-[320px]">
          {renderMediaThumbnail(mediaItems[0], 0)}
          {renderMediaThumbnail(mediaItems[1], 1)}
        </div>
      );
    }

    // 3 Items: 1 large on top/side, 2 smaller
    if (totalCount === 3) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-[280px] sm:h-[340px]">
          <div className="row-span-2 col-span-1">
            {renderMediaThumbnail(mediaItems[0], 0)}
          </div>
          <div className="col-span-1 row-span-1">
            {renderMediaThumbnail(mediaItems[1], 1)}
          </div>
          <div className="col-span-1 row-span-1">
            {renderMediaThumbnail(mediaItems[2], 2)}
          </div>
        </div>
      );
    }

    // 4 Items: 2x2 grid
    if (totalCount === 4) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-[280px] sm:h-[340px]">
          {renderMediaThumbnail(mediaItems[0], 0)}
          {renderMediaThumbnail(mediaItems[1], 1)}
          {renderMediaThumbnail(mediaItems[2], 2)}
          {renderMediaThumbnail(mediaItems[3], 3)}
        </div>
      );
    }

    // 5 or more Items: Facebook 4-quadrant layout with +N on the 4th item
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-[280px] sm:h-[340px]">
        {renderMediaThumbnail(mediaItems[0], 0)}
        {renderMediaThumbnail(mediaItems[1], 1)}
        {renderMediaThumbnail(mediaItems[2], 2)}
        {renderMediaThumbnail(mediaItems[3], 3, true, totalCount - 4)}
      </div>
    );
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-gray-100 dark:bg-zinc-900/90 shadow-sm mt-3 group/box">
      {/* Top Floating Action Bar */}
      <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-auto">
        {/* Left Side: "تعديل الكل" (Edit All) Button + Count */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenMediaManager}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-white/95 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-gray-800 dark:text-gray-100 text-xs font-bold shadow-md backdrop-blur-md border border-gray-200/60 dark:border-zinc-700/60 transition-all cursor-pointer hover:scale-[1.02]"
            title={isRtl ? 'تعديل الصور والفيديوهات وإضافة شرح توضيحي' : 'Edit photos & videos'}
          >
            <Edit3 size={13} className="text-indigo-600 dark:text-indigo-400" />
            <span>{isRtl ? 'تعديل الكل' : 'Edit All'}</span>
          </button>

          <span className="px-2.5 py-1 rounded-[4px] bg-black/60 text-white text-[11px] font-bold backdrop-blur-md shadow-xs">
            {totalCount} {isRtl ? (totalCount === 1 ? 'عنصر' : 'عناصر') : (totalCount === 1 ? 'item' : 'items')}
          </span>
        </div>

        {/* Right Side: Add more & Remove all */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAddMoreClick}
            className="p-1.5 rounded-[4px] bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 text-xs shadow-md backdrop-blur-md border border-gray-200/60 dark:border-zinc-700/60 transition-all cursor-pointer"
            title={isRtl ? 'إضافة المزيد من الوسائط' : 'Add more media'}
          >
            <Plus size={15} />
          </button>

          <button
            type="button"
            onClick={onClearAll}
            className="p-1.5 rounded-[4px] bg-black/60 hover:bg-red-600 text-white shadow-md backdrop-blur-md transition-all cursor-pointer"
            title={isRtl ? 'حذف جميع الوسائط المرفوعة' : 'Clear all media'}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Collage Display */}
      {renderCollageLayout()}
    </div>
  );
};
