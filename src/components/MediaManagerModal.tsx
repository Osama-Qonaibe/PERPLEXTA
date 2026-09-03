import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Edit3, Play, Film, Image as ImageIcon, Check } from 'lucide-react';
import { MediaGalleryItem } from '../../server/db/types';
import { getMediaUrl } from '../utils/mediaUtils';

interface MediaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: MediaGalleryItem[];
  onChangeMediaItems: (items: MediaGalleryItem[]) => void;
  onAddMoreFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isRtl: boolean;
}

export const MediaManagerModal: React.FC<MediaManagerModalProps> = ({
  isOpen,
  onClose,
  mediaItems,
  onChangeMediaItems,
  onAddMoreFiles,
  isRtl
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);

  if (!isOpen) return null;

  const handleUpdateCaption = (index: number, caption: string) => {
    const updated = [...mediaItems];
    updated[index] = { ...updated[index], caption };
    onChangeMediaItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = mediaItems.filter((_, i) => i !== index);
    onChangeMediaItems(updated);
  };

  const handleTriggerReplace = (index: number) => {
    replaceIndexRef.current = index;
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
      replaceInputRef.current.click();
    }
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const index = replaceIndexRef.current;
    if (!file || index === null || index === undefined || !mediaItems[index]) return;

    // We can call onAddMoreFiles or upload directly, but here we can pass to parent
    // or simulate replacement. Let's trigger onAddMoreFiles with an attribute or handle it.
    onAddMoreFiles(e);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-[#1c1c1f] rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-zinc-800/80 bg-gray-50/70 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Film size={18} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                  {isRtl ? 'الصور/مقاطع الفيديو' : 'Photos/videos'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isRtl
                    ? `إدارة العناصر المرفوعة (${mediaItems.length}) وإضافة شرح توضيحي لكل عنصر`
                    : `Manage uploaded media (${mediaItems.length}) & add captions`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={isRtl ? 'إغلاق' : 'Close'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Media Items Grid Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 max-h-[calc(88vh-130px)]">
            {mediaItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400 mb-3">
                  <ImageIcon size={28} />
                </div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {isRtl ? 'لا توجد وسائط مرفوعة بعد' : 'No media items uploaded yet'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {isRtl ? 'انقر على الزر بالأسفل لإضافة صور أو فيديوهات' : 'Click the button below to add photos or videos'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {mediaItems.map((item, idx) => {
                  const isVideo = item.type === 'video';
                  const displayUrl = getMediaUrl(item.thumbnailUrl || item.url);

                  return (
                    <div
                      key={item.id || `media-${idx}`}
                      className="group relative flex flex-col rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/60 shadow-xs hover:shadow-md transition-shadow"
                    >
                      {/* Media Preview Box */}
                      <div className="relative w-full aspect-video sm:aspect-square bg-black overflow-hidden flex items-center justify-center">
                        {isVideo ? (
                          <>
                            <video
                              src={getMediaUrl(item.url)}
                              poster={displayUrl}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                            {/* Centered Play Indicator */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                              <div className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs border border-white/20 shadow-lg">
                                <Play size={18} className="fill-white translate-x-0.5" />
                              </div>
                            </div>
                            <span className="absolute bottom-2 start-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono flex items-center gap-1">
                              <Film size={10} />
                              <span>{isRtl ? 'فيديو' : 'Video'}</span>
                            </span>
                          </>
                        ) : (
                          <img
                            src={displayUrl}
                            alt={`Media item ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}

                        {/* Card Top Action Overlay */}
                        <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-auto">
                          {/* Item Number Badge */}
                          <span className="px-2 py-0.5 rounded-md bg-black/65 text-white text-[11px] font-bold font-mono backdrop-blur-xs">
                            #{idx + 1}
                          </span>

                          {/* Delete Item Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="w-7 h-7 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-md cursor-pointer"
                            title={isRtl ? 'حذف هذه الوسيطة' : 'Remove this media'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Caption Input Section */}
                      <div className="p-3 flex-1 flex flex-col justify-between bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                            {isRtl ? 'شرح توضيحي' : 'Caption'}
                          </label>
                          <textarea
                            value={item.caption || ''}
                            onChange={(e) => handleUpdateCaption(idx, e.target.value)}
                            placeholder={isRtl ? 'شرح توضيحي...' : 'Caption...'}
                            rows={2}
                            className="w-full text-xs sm:text-sm p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hidden inputs for replacement & addition */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={onAddMoreFiles}
          />
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleReplaceFile}
          />

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50/90 dark:bg-zinc-900/90">
            {/* Add More Media Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-300 dark:border-zinc-700 shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={16} className="text-indigo-500" />
              <span>{isRtl ? 'إضافة صور/مقاطع فيديو' : 'Add photos/videos'}</span>
            </button>

            {/* Done / Save Button */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer"
            >
              <Check size={16} />
              <span>{isRtl ? 'تم' : 'Done'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
