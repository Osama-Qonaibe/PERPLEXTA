import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  Play,
  Clock,
  Sparkles,
  Loader2,
  Send,
  User
} from 'lucide-react';
import { toast } from '../context/NotificationContext';

export interface StoryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRtl?: boolean;
  token?: string | null;
  user?: any;
  userPages?: any[];
  onStoryCreated?: (newStory: any) => void;
  preselectedFile?: File | null;
}

export const StoryUploadModal: React.FC<StoryUploadModalProps> = ({
  isOpen,
  onClose,
  isRtl = true,
  token,
  user,
  userPages = [],
  onStoryCreated,
  preselectedFile = null
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>('');
  const [isVideo, setIsVideo] = useState<boolean>(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (preselectedFile) {
      handleFileSelected(preselectedFile);
    }
  }, [preselectedFile]);

  useEffect(() => {
    if (!isOpen) {
      if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
      setSelectedFile(null);
      setMediaPreviewUrl('');
      setIsVideo(false);
      setVideoDuration(0);
      setIsUploading(false);
    }
  }, [isOpen]);

  const handleFileSelected = (file: File) => {
    if (!file) return;

    const isVid = file.type.startsWith('video/') || 
                  ['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv', 'flv', '3gp'].some(ext => file.name.toLowerCase().endsWith('.' + ext));
    const isImg = file.type.startsWith('image/');

    if (!isVid && !isImg) {
      toast.error(isRtl ? 'يرجى اختيار صورة أو فيديو فقط' : 'Please select an image or video file only');
      return;
    }

    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(isRtl ? 'حجم الملف كبير جداً (الأقصى 50 ميجابايت)' : 'File size too large (Max 50MB)');
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    if (isVid) {
      const tempVid = document.createElement('video');
      tempVid.preload = 'metadata';
      tempVid.muted = true;
      tempVid.playsInline = true;
      tempVid.src = objectUrl;

      const timeout = setTimeout(() => {
        tempVid.onloadedmetadata = null;
        tempVid.onerror = null;
        URL.revokeObjectURL(objectUrl);
        toast.error(isRtl ? 'استغرق تحميل الفيديو وقتاً طويلاً' : 'Video took too long to load');
      }, 10000);

      tempVid.onloadedmetadata = () => {
        clearTimeout(timeout);
        const duration = tempVid.duration;
        if (duration > 15.5) {
          toast.info(isRtl 
            ? 'سيتم قص الفيديو تلقائياً لأول 15 ثانية لملاءمة نظام القصص' 
            : 'Video will be automatically trimmed to the first 15 seconds for Stories');
        }

        setIsVideo(true);
        setVideoDuration(duration);
        setSelectedFile(file);
        setMediaPreviewUrl(objectUrl);
      };

      tempVid.onerror = (e) => {
        clearTimeout(timeout);
        console.warn('Browser video preview failed, but allowing upload for server processing:', e);
        
        setIsVideo(true);
        setVideoDuration(0); // Unknown duration
        setSelectedFile(file);
        setMediaPreviewUrl(objectUrl);
        
        toast.info(isRtl 
          ? 'تنبيه: لا يمكن عرض معاينة لهذا النوع من الفيديو، ولكن سيتم معالجته وتحويله تلقائياً عند النشر.' 
          : 'Note: This video format cannot be previewed here, but it will be processed and converted automatically after publishing.');
      };
    } else {
      setIsVideo(false);
      setVideoDuration(0);
      setSelectedFile(file);
      setMediaPreviewUrl(objectUrl);
    }
  };

  const handlePublish = async () => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
      return;
    }

    if (!selectedFile && !mediaPreviewUrl) {
      toast.error(isRtl ? 'يرجى اختيار صورة أو مقطع فيديو للقصة' : 'Please select an image or video for your story');
      return;
    }

    setIsUploading(true);

    try {
      let uploadedUrl = '';
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadUrl = isVideo ? '/api/files/upload?maxDuration=15' : '/api/files/upload';
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        const uploadData = await uploadRes.json();
        console.log('[StoryUpload] Upload response:', uploadData);

        if (!uploadRes.ok || (!uploadData.url && !uploadData.file_url && !uploadData.file?.url)) {
          throw new Error(uploadData.error || uploadData.message_ar || (isRtl ? 'فشل رفع الوسائط' : 'Media upload failed'));
        }

        uploadedUrl = uploadData.url || uploadData.file_url || uploadData.file?.url;
      }

      const postBody: any = {
        title: '',
        description: '',
        page_id: null
      };

      if (isVideo) {
        postBody.video_url = uploadedUrl;
      } else {
        postBody.image_url = uploadedUrl;
      }

      const res = await fetch('/api/bulletin/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(postBody)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل نشر القصة');
      }

      if (isVideo && videoDuration > 15.5) {
        setTimeout(() => {
          toast.info(
            isRtl 
              ? '💡 نصيحة: يمكنك إنشاء "ريلز" (Reels) من المقطع الكامل للحصول على تفاعلات ومشاهدات أكثر!' 
              : '💡 Tip: You can create a "Reel" from the full clip to get more engagement and views!',
            { duration: 6000 }
          );
        }, 1500);
      }

      if (onStoryCreated) {
        onStoryCreated(data.story);
      }

      onClose();
    } catch (err: any) {
      console.error('Error publishing story:', err);
      toast.error(err.message || (isRtl ? 'حدث خطأ أثناء نشر القصة' : 'Error publishing story'));
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center font-bold">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">
                  {isRtl ? 'إنشاء قصة جديدة' : 'Create New Story'}
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {isRtl 
                    ? 'تختفي تلقائياً بعد 24 ساعة (يتم قص الفيديو الطويل تلقائياً)' 
                    : 'Expires in 24 hours (Long videos are auto-trimmed)'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isUploading}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {!selectedFile ? (
              /* Drag & Drop Selection Area */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-accent dark:hover:border-accent rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all bg-gray-50/50 dark:bg-zinc-900/30 group text-center"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f);
                  }}
                />

                <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload size={32} />
                </div>

                <div>
                  <p className="text-xs font-extrabold text-gray-900 dark:text-white">
                    {isRtl ? 'اضغط لاختيار صورة أو فيديو' : 'Click to select photo or video'}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    {isRtl ? 'مقاطع الفيديو بحد أقصى 15 ثانية' : 'Videos up to 15 seconds max'}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-[11px] font-bold">
                    <ImageIcon size={14} />
                    {isRtl ? 'صورة' : 'Photo'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-500 text-[11px] font-bold">
                    <VideoIcon size={14} />
                    {isRtl ? 'فيديو (15ث)' : 'Video (15s)'}
                  </span>
                </div>
              </div>
            ) : (
              /* Live 9:16 Vertical Preview Container */
              <div className="space-y-4">
                <div className="relative w-full aspect-[9/16] max-h-[360px] mx-auto rounded-3xl overflow-hidden bg-black shadow-lg border border-gray-800 flex items-center justify-center group">
                  {isVideo ? (
                    videoDuration > 0 ? (
                      <video
                        ref={videoRef}
                        src={mediaPreviewUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      /* Fallback for videos that can't be previewed in browser */
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-accent/20 text-accent flex items-center justify-center mb-4">
                          <VideoIcon size={32} />
                        </div>
                        <p className="text-sm font-bold text-white mb-2">
                          {isRtl ? 'تم اختيار الفيديو بنجاح' : 'Video Selected Successfully'}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {isRtl 
                            ? 'هذا التنسيق يحتاج إلى معالجة برمجية. ستتمكن من رؤيته بعد النشر.' 
                            : 'This format requires processing. You will be able to see it after publishing.'}
                        </p>
                      </div>
                    )
                  ) : (
                    <img
                      src={mediaPreviewUrl}
                      alt="Story Preview"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Gradient Overlays */}
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

                  {/* Top Story Header (User Info + Expiration Tag) */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between text-white z-10">
                    <div className="flex items-center gap-2">
                      <img
                        src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full border-2 border-accent object-cover"
                      />
                      <div>
                        <p className="text-[11px] font-extrabold leading-tight">
                          {user?.name || (isRtl ? 'مستخدم المنصة' : 'User')}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[9px] text-gray-300">
                          <Clock size={10} />
                          {isRtl ? 'قصة لمدة 24 ساعة' : '24h Story'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setMediaPreviewUrl('');
                      }}
                      className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold border border-white/20 backdrop-blur-sm"
                    >
                      {isRtl ? 'تغيير' : 'Change'}
                    </button>
                  </div>

                  {/* Video Duration Badge if Video */}
                  {isVideo && videoDuration > 0 && (
                    <div className="absolute bottom-3 end-3 px-2.5 py-1 rounded-full bg-black/70 text-white text-[10px] font-extrabold flex items-center gap-1 backdrop-blur-sm border border-white/10">
                      <VideoIcon size={12} className="text-purple-400" />
                      <span>{Math.round(videoDuration)}s / 15s</span>
                    </div>
                  )}
                  
                  {isVideo && videoDuration === 0 && (
                    <div className="absolute bottom-3 end-3 px-2.5 py-1 rounded-full bg-black/70 text-white text-[10px] font-extrabold flex items-center gap-1 backdrop-blur-sm border border-white/10">
                      <Clock size={12} className="text-blue-400" />
                      <span>{isRtl ? 'جاري المعالجة' : 'To be processed'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              onClick={handlePublish}
              disabled={!selectedFile || isUploading}
              className="flex-1 max-w-[240px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:opacity-90 disabled:opacity-50 text-white text-xs font-extrabold shadow-md transition-all"
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isRtl ? 'جاري نشر القصة...' : 'Publishing...'}</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>{isRtl ? 'مشاركة القصة الآن' : 'Share Story Now'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default StoryUploadModal;
