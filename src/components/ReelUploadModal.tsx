import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Clapperboard,
  CheckCircle2,
  Sparkles,
  Music,
  MapPin,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Lock,
  Tag,
  AlignLeft,
  Eye,
  Zap,
  Sliders
} from 'lucide-react';
import { toast } from 'sonner';
import { getMediaUrl, extractVideoThumbnail } from '../utils/mediaUtils';

export interface ReelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRtl?: boolean;
  token?: string | null;
  onUploadSuccess?: (newReel: any) => void;
  preselectedFile?: File | null;
}

export const ReelUploadModal: React.FC<ReelUploadModalProps> = ({
  isOpen,
  onClose,
  isRtl = true,
  token,
  onUploadSuccess,
  preselectedFile = null,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(preselectedFile);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 1080, height: 1920 });
  const [is9to16Compliant, setIs9to16Compliant] = useState<boolean>(true);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [musicTitle, setMusicTitle] = useState(isRtl ? 'الصوت الأصلي - Perplexta Audio' : 'Original Sound - Perplexta');
  const [hashtags, setHashtags] = useState('#فلسطين,#ريلز,#فيديو,#تنمية');
  const [locationCity, setLocationCity] = useState(isRtl ? 'القدس الشريف' : 'Jerusalem');

  // Cropping and Frame fit controls
  const [fitMode, setFitMode] = useState<'cover' | 'contain_blur'>('cover');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [verticalAlign, setVerticalAlign] = useState<'center' | 'top' | 'bottom'>('center');
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(true);

  // Player controls in modal
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle initial file or prop changes
  useEffect(() => {
    if (preselectedFile) {
      handleFileSelected(preselectedFile);
    }
  }, [preselectedFile]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      setSelectedFile(null);
      setVideoPreviewUrl('');
      setTitle('');
      setDescription('');
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [isOpen]);

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error(isRtl ? 'يرجى اختيار ملف فيديو فقط للريلز' : 'Please select a valid video file');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error(isRtl ? 'حجم الفيديو كبير جداً (الحد الأقصى 100MB)' : 'Video file too large (max 100MB)');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objectUrl);

    // Measure dimensions and ratio
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = objectUrl;
    tempVideo.onloadedmetadata = () => {
      const w = tempVideo.videoWidth || 1080;
      const h = tempVideo.videoHeight || 1920;
      const d = tempVideo.duration || 0;

      setVideoDimensions({ width: w, height: h });
      setVideoDuration(d);

      // Check ratio (approx 9:16, i.e., height > width with aspect ratio near 0.56)
      const ratio = w / h;
      const is916 = ratio >= 0.50 && ratio <= 0.65;
      setIs9to16Compliant(is916);

      if (d > 90) {
        toast.warning(
          isRtl
            ? 'تنبيه: مدة المقطع تتجاوز 90 ثانية. يُفضل تقصيره لضمان أعلى نسبة مشاهدة على الريلز!'
            : 'Warning: Reel duration exceeds 90s. Shorter reels receive higher engagement!'
        );
      }
    };
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error(isRtl ? 'يرجى اختيار مقطع فيديو أولاً' : 'Please select a video file first');
      return;
    }

    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول لنشر الريلز' : 'Please log in to publish reels');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    try {
      // Step 1: Extract thumbnail automatically
      let thumbnailUrl = '';
      try {
        const thumbDataUrl = await extractVideoThumbnail(selectedFile);
        if (thumbDataUrl) {
          thumbnailUrl = thumbDataUrl;
        }
      } catch (e) {
        console.warn('Thumbnail generation skipped');
      }

      // Step 2: Upload file to server
      const formData = new FormData();
      formData.append('file', selectedFile);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/files/upload', true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 85);
          setUploadProgress(percent);
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const uploadRes = JSON.parse(xhr.responseText);
            const rawUrl = uploadRes.fileUrl || uploadRes.file?.file_url || uploadRes.file?.url || uploadRes.url;
            const finalVideoUrl = getMediaUrl(rawUrl) || videoPreviewUrl;

            setUploadProgress(90);

            // Step 3: Create Reel Ad in Database
            const createRes = await fetch('/api/bulletin/ads', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                title: title.trim() || (isRtl ? 'ريلز جديد' : 'New Reel'),
                description: description.trim() || (isRtl ? 'مقطع ريلز حصري عبر منصة Perplexta' : 'Exclusive Reel on Perplexta'),
                video_url: finalVideoUrl,
                image_url: thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
                ad_format: 'reel',
                aspect_ratio: '9:16',
                hashtags: hashtags,
                location_city: locationCity,
                music_title: musicTitle,
                is_vertical_916: true
              })
            });

            const createData = await createRes.json();
            if (createData.success) {
              setUploadProgress(100);
              toast.success(
                isRtl
                  ? '🎉 تم نشر مقطع الريلز القياسي (9:16) بنجاح على المنصة!'
                  : '🎉 Vertical Reel (9:16) published successfully!'
              );
              if (onUploadSuccess) {
                onUploadSuccess(createData.ad);
              }
              onClose();
            } else {
              throw new Error(createData.error || 'Failed to create reel');
            }
          } catch (err: any) {
            toast.error(err.message || (isRtl ? 'حدث خطأ أثناء معالجة بيانات الريلز' : 'Error publishing reel'));
          } finally {
            setIsUploading(false);
          }
        } else {
          toast.error(isRtl ? 'فشل رفع فيديو الريلز إلى الخادم' : 'Failed to upload video');
          setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        toast.error(isRtl ? 'خطأ في الشبكة أثناء رفع الفيديو' : 'Network error during video upload');
        setIsUploading(false);
      };

      xhr.send(formData);

    } catch (err) {
      toast.error(isRtl ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white font-sans"
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 p-[2px] flex items-center justify-center shadow-lg">
                <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                  <Clapperboard size={20} className="text-pink-400 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-white tracking-wide">
                    {isRtl ? 'استوديو رفع مقاطع الريلز العمودية (9:16)' : '9:16 Vertical Reel Upload Studio'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center gap-1">
                    <Lock size={10} /> 9:16 Ratio Locked
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  {isRtl
                    ? 'عاين، واضبط الأبعاد والمعالم بدقة قياسية عالمية قبل النشر النهائي'
                    : 'Preview, crop, and configure vertical 9:16 Reels for max reach'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-theme"
              title={isRtl ? 'إغلاق' : 'Close'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Main Body Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: 9:16 Phone Cropping Preview Screen */}
            <div className="md:col-span-5 flex flex-col items-center justify-center space-y-4">
              <div className="relative w-full max-w-[280px] aspect-[9/16] bg-black rounded-[32px] border-4 border-zinc-800 shadow-2xl overflow-hidden group flex items-center justify-center">
                
                {selectedFile && videoPreviewUrl ? (
                  <>
                    {/* Ambient Blurred Background (Contain Mode) */}
                    {fitMode === 'contain_blur' && (
                      <video
                        src={videoPreviewUrl}
                        className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50 scale-125"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    )}

                    {/* Main Video Stream */}
                    <video
                      ref={videoRef}
                      src={videoPreviewUrl}
                      loop
                      muted={isMuted}
                      autoPlay
                      playsInline
                      style={{
                        transform: `scale(${zoomLevel / 100})`,
                        objectPosition: verticalAlign === 'top' ? 'center top' : verticalAlign === 'bottom' ? 'center bottom' : 'center center'
                      }}
                      className={`w-full h-full relative z-10 transition-transform duration-200 ${
                        fitMode === 'cover' ? 'object-cover' : 'object-contain'
                      }`}
                      onClick={togglePlayPause}
                    />

                    {/* Rule of Thirds Grid Overlay for Cropping Alignment */}
                    {showGridOverlay && (
                      <div className="absolute inset-0 z-20 pointer-events-none border border-white/10 grid grid-cols-3 grid-rows-3">
                        <div className="border-r border-b border-white/15" />
                        <div className="border-r border-b border-white/15" />
                        <div className="border-b border-white/15" />
                        <div className="border-r border-b border-white/15" />
                        <div className="border-r border-b border-white/15" />
                        <div className="border-b border-white/15" />
                        <div className="border-r border-white/15" />
                        <div className="border-r border-white/15" />
                        <div />
                      </div>
                    )}

                    <div className="absolute top-2 inset-x-0 z-30 flex justify-center pointer-events-none">
                      <div className="w-20 h-3 bg-zinc-900 rounded-full" />
                    </div>

                    {/* Floating Controls Overlay */}
                    <div className="absolute bottom-3 inset-x-3 z-30 flex items-center justify-between p-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10">
                      <button
                        type="button"
                        onClick={togglePlayPause}
                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
                      >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} className="fill-white ms-0.5" />}
                      </button>

                      <span className="text-[10px] font-mono text-zinc-300">
                        {Math.floor(videoDuration)}s • 9:16
                      </span>

                      <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
                      >
                        {isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} />}
                      </button>
                    </div>

                    {/* Badge Indicator */}
                    <div className="absolute top-3 start-3 z-30 px-2 py-1 rounded-full bg-emerald-500/80 text-white text-[10px] font-black backdrop-blur-md flex items-center gap-1 shadow-lg">
                      <CheckCircle2 size={12} />
                      <span>{isRtl ? 'معاينة 9:16' : '9:16 Active'}</span>
                    </div>
                  </>
                ) : (
                  /* Dropzone Placeholder */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-zinc-800/50 transition-theme border-2 border-dashed border-zinc-700 hover:border-pink-500 rounded-[28px] group"
                  >
                    <div className="w-16 h-16 rounded-full bg-pink-500/10 text-pink-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload size={28} />
                    </div>
                    <p className="text-xs font-black text-white mb-1">
                      {isRtl ? 'انقر لرفع مقطع الريلز' : 'Click to select Reel video'}
                    </p>
                    <p className="text-[10px] text-zinc-400 mb-3">
                      MP4, MOV (Max 100MB)
                    </p>
                    <span className="px-3 py-1 rounded-full bg-zinc-800 text-[10px] text-zinc-300 font-bold border border-zinc-700">
                      {isRtl ? 'يدعم قياس 9:16 تلقائياً' : 'Supports 9:16 Vertical'}
                    </span>
                  </div>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Re-select or Change Video File */}
              {selectedFile && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition-theme"
                  >
                    <RotateCcw size={13} />
                    <span>{isRtl ? 'تغيير المقطع' : 'Change Video'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGridOverlay(!showGridOverlay)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-theme flex items-center gap-1.5 ${
                      showGridOverlay
                        ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    <Eye size={13} />
                    <span>{isRtl ? 'شبكة الأبعاد' : 'Grid Overlay'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Editing Controls & Reel Metadata Details */}
            <div className="md:col-span-7 space-y-5">
              
              {/* Aspect Ratio & Framing Controls Box */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-pink-400" />
                    <span className="text-xs font-black text-white">
                      {isRtl ? 'خيارات القطب والقص القياسي (9:16)' : '9:16 Framing & Crop Settings'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {is9to16Compliant ? (isRtl ? 'أبعاد رأسية ممتازة' : 'Native 9:16') : (isRtl ? 'سيتم تحسين القصاصة' : 'Auto Crop Applied')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFitMode('cover')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-theme ${
                      fitMode === 'cover'
                        ? 'bg-pink-600/20 text-pink-300 border-pink-500/50 shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    <Maximize2 size={14} />
                    <span>{isRtl ? 'تعبئة رأسية كاملة (Cover)' : 'Full 9:16 Crop Fill'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFitMode('contain_blur')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-theme ${
                      fitMode === 'contain_blur'
                        ? 'bg-pink-600/20 text-pink-300 border-pink-500/50 shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    <Minimize2 size={14} />
                    <span>{isRtl ? 'احتواء مع خلفية ضبابية' : 'Contain + Blur Bg'}</span>
                  </button>
                </div>

                {/* Zoom Level Slider */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>{isRtl ? 'نسبة التقريب / التكبير' : 'Zoom Level'}</span>
                    <span className="font-mono text-pink-400 font-bold">{zoomLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="200"
                    step="5"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(Number(e.target.value))}
                    className="w-full accent-pink-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Alignment Switcher */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-400">{isRtl ? 'محاذاة المركز الرأسي' : 'Vertical Focus Alignment'}</span>
                  <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                    {(['top', 'center', 'bottom'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setVerticalAlign(pos)}
                        className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-theme capitalize ${
                          verticalAlign === pos
                            ? 'bg-pink-600 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {pos === 'top' ? (isRtl ? 'أعلى' : 'Top') : pos === 'bottom' ? (isRtl ? 'أسفل' : 'Bottom') : (isRtl ? 'وسط' : 'Center')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Metadata Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-300 flex items-center gap-1.5">
                    <AlignLeft size={14} className="text-pink-400" />
                    <span>{isRtl ? 'عنوان الريلز' : 'Reel Title'}</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isRtl ? 'أدخل عنواناً ملهماً وجذاباً للمقطع...' : 'Enter an engaging title...'}
                    className="w-full bg-zinc-950 text-xs text-white placeholder-zinc-500 rounded-xl px-3.5 py-2.5 border border-zinc-800 focus:outline-none focus:border-pink-500 transition-theme"
                  />
                </div>

                {/* Description & Caption */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-300 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-400" />
                    <span>{isRtl ? 'الوصف والنص المرفق (Caption)' : 'Caption & Description'}</span>
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isRtl ? 'اكتب تفاصيل المقطع أو الفكرة التي ترغب بمشاركتها مع الجمهور...' : 'Write a caption describing this reel...'}
                    className="w-full bg-zinc-950 text-xs text-white placeholder-zinc-500 rounded-xl px-3.5 py-2.5 border border-zinc-800 focus:outline-none focus:border-pink-500 transition-theme resize-none"
                  />
                </div>

                {/* Music Track Title & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-300 flex items-center gap-1.5">
                      <Music size={14} className="text-amber-400" />
                      <span>{isRtl ? 'اسم الصوت / الموسيقى' : 'Audio Track Name'}</span>
                    </label>
                    <input
                      type="text"
                      value={musicTitle}
                      onChange={(e) => setMusicTitle(e.target.value)}
                      className="w-full bg-zinc-950 text-xs text-white placeholder-zinc-500 rounded-xl px-3.5 py-2.5 border border-zinc-800 focus:outline-none focus:border-pink-500 transition-theme"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-300 flex items-center gap-1.5">
                      <MapPin size={14} className="text-teal-400" />
                      <span>{isRtl ? 'الموقع الجغرافي' : 'Location Tag'}</span>
                    </label>
                    <input
                      type="text"
                      value={locationCity}
                      onChange={(e) => setLocationCity(e.target.value)}
                      className="w-full bg-zinc-950 text-xs text-white placeholder-zinc-500 rounded-xl px-3.5 py-2.5 border border-zinc-800 focus:outline-none focus:border-pink-500 transition-theme"
                    />
                  </div>
                </div>

                {/* Hashtags */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-300 flex items-center gap-1.5">
                    <Tag size={14} className="text-indigo-400" />
                    <span>{isRtl ? 'الوسوم والهاشتاجات (مفصولة بفواصل)' : 'Hashtags (comma separated)'}</span>
                  </label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    className="w-full bg-zinc-950 text-xs text-white placeholder-zinc-500 rounded-xl px-3.5 py-2.5 border border-zinc-800 focus:outline-none focus:border-pink-500 transition-theme"
                  />
                </div>

                {/* Uploading Progress Bar */}
                {isUploading && (
                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-pink-500/30 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-pink-400 flex items-center gap-2">
                        <Zap size={14} className="animate-bounce" />
                        {isRtl ? 'جاري الرفع والنشر المباشر...' : 'Uploading Reel...'}
                      </span>
                      <span className="font-mono text-white font-black">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Submit Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isUploading}
                    className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-extrabold text-zinc-300 transition-theme disabled:opacity-50"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={!selectedFile || isUploading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-black text-white shadow-lg shadow-pink-600/25 transition-theme disabled:opacity-40 flex items-center gap-2"
                  >
                    <Clapperboard size={16} />
                    <span>{isRtl ? 'اعتماد ونشر الريلز (9:16)' : 'Publish 9:16 Reel'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
