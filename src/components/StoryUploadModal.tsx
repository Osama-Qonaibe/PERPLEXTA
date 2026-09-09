import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  Play,
  Pause,
  Clock,
  Sparkles,
  Loader2,
  Send,
  User,
  Music,
  Scissors,
  Volume2,
  VolumeX,
  Check,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Sliders,
  Sparkle
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

interface SelectedImageSettings {
  file: File;
  previewUrl: string;
  effect: string; // 'none' | 'vintage' | 'grayscale' | 'cyber' | 'cold' | 'glow'
  music: string; // 'none' | 'lofi' | 'acoustic' | 'pop' | 'piano'
  duration: number; // 5 to 15 seconds
}

// Preset Music tracks with preview mp3 urls
const MUSIC_TRACKS = [
  { id: 'none', labelAr: 'بدون موسيقى', labelEn: 'No Music', url: '' },
  { id: 'lofi', labelAr: 'لوفي هادئ', labelEn: 'Lofi Beats', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'acoustic', labelAr: 'جيتار كلاسيكي', labelEn: 'Acoustic Chill', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'pop', labelAr: 'بوب حماسي', labelEn: 'Energetic Pop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'piano', labelAr: 'بيانو سينمائي', labelEn: 'Cinematic Piano', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' }
];

// Preset Effects/Filters with Tailwind classes
const EFFECTS = [
  { id: 'none', labelAr: 'بدون تأثير', labelEn: 'Original', class: '' },
  { id: 'vintage', labelAr: 'كلاسيكي دافئ', labelEn: 'Vintage Warm', class: 'sepia contrast-125 saturate-110 brightness-95' },
  { id: 'grayscale', labelAr: 'أبيض وأسود', labelEn: 'Noir B&W', class: 'grayscale contrast-115' },
  { id: 'cyber', labelAr: 'سايبر ملون', labelEn: 'Cyberpunk', class: 'hue-rotate-90 saturate-150' },
  { id: 'cold', labelAr: 'أزرق سينمائي', labelEn: 'Cold Cinematic', class: 'saturate-120 hue-rotate-15 contrast-105' },
  { id: 'glow', labelAr: 'توهج مشرق', labelEn: 'Dreamy Glow', class: 'brightness-105 saturate-125 contrast-95 sepia-[15%]' }
];

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
  // General State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>('');
  const [isVideo, setIsVideo] = useState<boolean>(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');

  // Multiple Images State
  const [imageStories, setImageStories] = useState<SelectedImageSettings[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Video Specific Playback States
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTimeOffset, setStartTimeOffset] = useState<number>(0);
  const [videoDurationLimit, setVideoDurationLimit] = useState<number>(15);

  // Video Cover / Thumbnails States
  const [recommendedCovers, setRecommendedCovers] = useState<string[]>([]);
  const [selectedCoverIndex, setSelectedCoverIndex] = useState<number>(0);
  const [isGeneratingCovers, setIsGeneratingCovers] = useState<boolean>(false);

  // Background Audio Preview Element for Images
  const [activeMusicTrack, setActiveMusicTrack] = useState<string>('none');
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const customCoverInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const handleCustomCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setRecommendedCovers(prev => [dataUrl, ...prev]);
      setSelectedCoverIndex(0);
    };
    reader.readAsDataURL(file);
  };

  // Auto handle preselected files
  useEffect(() => {
    if (preselectedFile) {
      handleFilesSelected([preselectedFile]);
    }
  }, [preselectedFile]);

  // Clean up Object URLs when closed
  useEffect(() => {
    if (!isOpen) {
      // Revoke general preview URL
      if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
      // Revoke multiple image URLs
      imageStories.forEach(story => {
        if (story.previewUrl && story.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(story.previewUrl);
        }
      });

      setSelectedFile(null);
      setMediaPreviewUrl('');
      setIsVideo(false);
      setVideoDuration(0);
      setImageStories([]);
      setActiveImageIndex(0);
      setIsUploading(false);
      setRecommendedCovers([]);
      setSelectedCoverIndex(0);
      setStartTimeOffset(0);
      stopAudioPreview();
    }
  }, [isOpen]);

  // Sync background music playback with active story settings
  useEffect(() => {
    if (isVideo) {
      stopAudioPreview();
      return;
    }

    if (imageStories.length > 0) {
      const currentStory = imageStories[activeImageIndex];
      const selectedMusic = currentStory?.music || 'none';
      
      if (selectedMusic !== activeMusicTrack) {
        setActiveMusicTrack(selectedMusic);
        if (selectedMusic === 'none') {
          stopAudioPreview();
        } else {
          playAudioTrack(selectedMusic);
        }
      }
    }
  }, [activeImageIndex, imageStories, isVideo]);

  const playAudioTrack = (trackId: string) => {
    const track = MUSIC_TRACKS.find(t => t.id === trackId);
    if (!track || !track.url) {
      stopAudioPreview();
      return;
    }

    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio();
      audioPreviewRef.current.loop = true;
    }

    try {
      audioPreviewRef.current.src = track.url;
      audioPreviewRef.current.volume = isMuted ? 0 : 0.5;
      audioPreviewRef.current.play().then(() => {
        setIsMusicPlaying(true);
      }).catch(err => {
        console.warn('Audio play auto-blocked:', err);
        setIsMusicPlaying(false);
      });
    } catch (e) {
      console.error('Audio setup failed:', e);
    }
  };

  const stopAudioPreview = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.src = '';
    }
    setIsMusicPlaying(false);
    setActiveMusicTrack('none');
  };

  const toggleMusicMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.volume = nextMute ? 0 : 0.5;
    }
    if (videoRef.current) {
      videoRef.current.muted = nextMute;
    }
  };

  // Extract recommended cover thumbnails from video
  const generateVideoCovers = (fileUrl: string, durationSecs: number) => {
    if (!fileUrl || durationSecs <= 0) return;
    setIsGeneratingCovers(true);

    const video = document.createElement('video');
    video.src = fileUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'auto';

    const covers: string[] = [];
    const timestamps = [
      Math.min(1, durationSecs * 0.1),
      Math.min(durationSecs - 0.5, durationSecs * 0.4),
      Math.min(durationSecs - 0.5, durationSecs * 0.7),
      Math.min(durationSecs - 0.5, durationSecs * 0.9)
    ];

    let currentIndex = 0;

    const captureNext = () => {
      if (currentIndex >= timestamps.length) {
        setRecommendedCovers(covers);
        setIsGeneratingCovers(false);
        video.remove();
        return;
      }
      video.currentTime = timestamps[currentIndex];
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 320; // vertical ratio
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          covers.push(dataUrl);
        }
      } catch (e) {
        console.error('[StoryUpload] Video cover grab failed:', e);
      }
      currentIndex++;
      captureNext();
    };

    video.onloadedmetadata = () => {
      captureNext();
    };

    video.onerror = () => {
      setIsGeneratingCovers(false);
      video.remove();
    };
  };

  // Handles multiple files selected via input or drag-and-drop
  const handleFilesSelected = (filesList: File[]) => {
    if (!filesList || filesList.length === 0) return;

    // Check if the first file is a video
    const firstFile = filesList[0];
    const isVid = firstFile.type.startsWith('video/') || 
                  ['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv', 'flv', '3gp'].some(ext => firstFile.name.toLowerCase().endsWith('.' + ext));

    if (isVid) {
      // Videos must be uploaded singly
      if (filesList.length > 1) {
        toast.info(isRtl 
          ? 'تنبيه: لا يمكن اختيار أكثر من فيديو واحد للقصة، سيتم معالجة الفيديو الأول فقط.' 
          : 'Note: You can only upload one video at a time. Processing the first video only.');
      }

      const MAX_SIZE = 100 * 1024 * 1024; // 100MB max limit
      if (firstFile.size > MAX_SIZE) {
        toast.error(isRtl ? 'حجم مقطع الفيديو كبير جداً (الأقصى 100 ميجابايت)' : 'Video file too large (Max 100MB)');
        return;
      }

      const objectUrl = URL.createObjectURL(firstFile);
      setIsVideo(true);
      setSelectedFile(firstFile);
      setMediaPreviewUrl(objectUrl);
      setImageStories([]);

      const tempVid = document.createElement('video');
      tempVid.preload = 'metadata';
      tempVid.muted = true;
      tempVid.src = objectUrl;

      tempVid.onloadedmetadata = () => {
        const duration = tempVid.duration;
        setVideoDuration(duration);
        generateVideoCovers(objectUrl, duration);
        if (duration > 15.5) {
          toast.info(isRtl 
            ? 'سيتم تفعيل محدد القص التلقائي لمقاطع الفيديو الطويلة حتى 15 ثانية.' 
            : 'Long video trimmer enabled automatically to loop up to 15 seconds.');
        }
        tempVid.remove();
      };

      tempVid.onerror = () => {
        setVideoDuration(0);
        tempVid.remove();
      };
    } else {
      // Handle multiple images up to 10 photos max
      setIsVideo(false);
      setVideoDuration(0);
      setRecommendedCovers([]);

      const imgFiles = filesList.filter(f => f.type.startsWith('image/')).slice(0, 10);
      
      if (imgFiles.length === 0) {
        toast.error(isRtl ? 'يرجى اختيار صور صالحة فقط' : 'Please select valid image files only');
        return;
      }

      if (filesList.length > 10) {
        toast.info(isRtl 
          ? 'الحد الأقصى هو 10 صور للقصص المتعددة تلقائياً. تم اختيار أول 10 صور فقط.' 
          : 'Max limit is 10 photos for auto-split stories. Selected the first 10 photos only.');
      }

      const newImageStories: SelectedImageSettings[] = imgFiles.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        effect: 'none',
        music: 'none',
        duration: 15
      }));

      setImageStories(newImageStories);
      setActiveImageIndex(0);
      setSelectedFile(imgFiles[0]);
      setMediaPreviewUrl(newImageStories[0].previewUrl);
    }
  };

  const updateActiveImageSettings = (key: 'effect' | 'music' | 'duration', value: any) => {
    if (imageStories.length === 0) return;
    const updated = [...imageStories];
    updated[activeImageIndex] = {
      ...updated[activeImageIndex],
      [key]: value
    };
    setImageStories(updated);
  };

  const removeImageFromStories = (idx: number) => {
    if (imageStories.length <= 1) {
      // Clear all
      setImageStories([]);
      setSelectedFile(null);
      setMediaPreviewUrl('');
      return;
    }

    const updated = [...imageStories];
    const removedUrl = updated[idx].previewUrl;
    if (removedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(removedUrl);
    }
    updated.splice(idx, 1);
    
    let nextIndex = activeImageIndex;
    if (idx <= activeImageIndex && activeImageIndex > 0) {
      nextIndex = activeImageIndex - 1;
    }

    setImageStories(updated);
    setActiveImageIndex(nextIndex);
    setSelectedFile(updated[nextIndex].file);
    setMediaPreviewUrl(updated[nextIndex].previewUrl);
  };

  const handlePublish = async () => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
      return;
    }

    setIsUploading(true);
    stopAudioPreview();

    try {
      if (isVideo) {
        // Publish Single Video Story
        setUploadProgressText(isRtl ? 'جاري رفع مقطع الفيديو القصير...' : 'Uploading short video clip...');
        
        const formData = new FormData();
        formData.append('file', selectedFile!);

        // Pass startTimeOffset and trim limit query parameters
        const uploadRes = await fetch(`/api/files/upload?maxDuration=15&startOffset=${startTimeOffset}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || (!uploadData.url && !uploadData.file_url && !uploadData.file?.url)) {
          throw new Error(uploadData.error || (isRtl ? 'فشل رفع مقطع الفيديو' : 'Video upload failed'));
        }

        const videoUrl = uploadData.url || uploadData.file_url || uploadData.file?.url;
        const coverThumbnailUrl = recommendedCovers[selectedCoverIndex] || '';

        setUploadProgressText(isRtl ? 'جاري توثيق ونشر قصة الفيديو...' : 'Publishing video story...');
        const res = await fetch('/api/bulletin/stories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: isRtl ? 'قصة مرئية' : 'Video Story',
            description: isRtl ? 'شاهد قصة مرئية بالكامل 🎥' : 'Watch video story live 🎥',
            video_url: videoUrl,
            image_url: coverThumbnailUrl || undefined,
            page_id: null
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || (isRtl ? 'فشل نشر قصة الفيديو' : 'Failed to publish video story'));
        }

        if (onStoryCreated) onStoryCreated(data.story);
        toast.clear();
        toast.success(isRtl ? 'تم نشر قصة الفيديو بنجاح! 🎥' : 'Video story published successfully! 🎥');
        onClose();

      } else if (imageStories.length > 0) {
        // Publish Multiple Image Stories (Auto split)
        toast.info(isRtl 
          ? `جاري تقسيم ومعالجة عدد (${imageStories.length}) قصص تلقائياً...` 
          : `Processing and auto-splitting (${imageStories.length}) stories sequentially...`);

        let lastStory: any = null;

        for (let i = 0; i < imageStories.length; i++) {
          const item = imageStories[i];
          setUploadProgressText(isRtl 
            ? `جاري رفع القصة (${i + 1} من ${imageStories.length})...` 
            : `Uploading story (${i + 1} of ${imageStories.length})...`
          );

          const formData = new FormData();
          formData.append('file', item.file);

          const uploadRes = await fetch('/api/files/upload', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: formData
          });

          const uploadData = await uploadRes.json();
          if (!uploadRes.ok || (!uploadData.url && !uploadData.file_url && !uploadData.file?.url)) {
            throw new Error(`Failed story #${i+1} upload: ` + (uploadData.error || 'Server upload error'));
          }

          const imageUrl = uploadData.url || uploadData.file_url || uploadData.file?.url;

          // Assemble meta tags inside description for display styling
          const effectObj = EFFECTS.find(e => e.id === item.effect);
          const musicObj = MUSIC_TRACKS.find(m => m.id === item.music);
          
          const tags: string[] = [];
          if (effectObj && effectObj.id !== 'none') tags.push(`✨ ${isRtl ? effectObj.labelAr : effectObj.labelEn}`);
          if (musicObj && musicObj.id !== 'none') tags.push(`🎵 ${isRtl ? musicObj.labelAr : musicObj.labelEn}`);
          tags.push(`⏱️ ${item.duration}s`);

          const res = await fetch('/api/bulletin/stories', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              title: isRtl ? `قصة مصورة #${i + 1}` : `Photo Story #${i + 1}`,
              description: tags.join(' | '),
              image_url: imageUrl,
              page_id: null
            })
          });

          const storyData = await res.json();
          if (res.ok && storyData.success) {
            lastStory = storyData.story;
          }
        }

        if (onStoryCreated && lastStory) {
          onStoryCreated(lastStory);
        }

        toast.clear();
        toast.success(isRtl 
          ? `تهانينا! تم نشر عدد (${imageStories.length}) قصص مقسمة بنجاح! 🎉` 
          : `Successfully published (${imageStories.length}) split stories! 🎉`
        );
        onClose();
      }
    } catch (err: any) {
      console.error('[StoryUpload] Processing failed:', err);
      toast.error(err.message || (isRtl ? 'حدث خطأ أثناء معالجة ونشر القصص' : 'Error publishing stories'));
    } finally {
      setIsUploading(false);
    }
  };

  // Safe duration display formatting
  const formatTime = (secs: number) => {
    const s = Math.floor(secs % 60);
    return `${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="relative w-full max-w-sm md:max-w-[440px] bg-white dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans"
          >
          {/* Main Title Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-850 bg-gray-50/70 dark:bg-[#18181b]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center font-bold">
                <Sparkles size={15} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-xs md:text-sm font-extrabold text-gray-900 dark:text-white">
                  {isRtl ? 'انشاء قصة' : 'Create Story'}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isUploading}
              className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-750 dark:hover:text-white transition-all"
            >
              <X size={14} />
            </button>
          </div>

          {/* Loader Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center gap-3 text-center p-6 backdrop-blur-sm">
              <div className="relative">
                <Loader2 size={36} className="animate-spin text-accent" />
                <Sparkle size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent" />
              </div>
              <div className="space-y-1">
                <p className="text-white text-xs font-extrabold">{isRtl ? 'جاري معالجة ونشر القصة...' : 'Processing story...'}</p>
                <p className="text-[10px] text-gray-400 max-w-sm">{uploadProgressText}</p>
              </div>
            </div>
          )}

          {/* Dialog Contents */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!selectedFile ? (
              /* Drag & Drop Upload Portal */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-accent dark:hover:border-accent rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all bg-gray-50/40 dark:bg-zinc-900/10 group text-center"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                     const files = e.target.files ? Array.from(e.target.files) : [];
                     if (files.length > 0) handleFilesSelected(files);
                  }}
                />

                <div className="w-14 h-14 rounded-xl bg-accent/10 text-accent flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                  <Upload size={28} className="group-hover:translate-y-[-2px] transition-transform" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white">
                    {isRtl ? 'اسحب الملفات هنا أو انقر للتصفح' : 'Drag & Drop files here or click to browse'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    {isRtl 
                      ? 'يمكنك اختيار حتى 10 صور ليتم تقسيمها تلقائياً إلى قصص ممتالية، أو اختيار مقطع فيديو واحد ليتم تشغيله وقصه ذكياً'
                      : 'Upload up to 10 photos to split them automatically into separate stories, or choose a video clip to trim'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10.5px] font-bold border border-blue-500/10">
                    <ImageIcon size={12} />
                    {isRtl ? 'رفع حتى 10 صور' : 'Up to 10 Images'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/10 text-purple-500 text-[10.5px] font-bold border border-purple-500/10">
                    <VideoIcon size={12} />
                    {isRtl ? 'فيديو (قص ذكي لـ 15ث)' : 'Video (Smart Trim 15s)'}
                  </span>
                </div>
              </div>
            ) : (
              /* Design Studio Playground */
              <div className="flex flex-col gap-4 items-stretch">
                
                {/* 1. Left Side: Immersive 9:16 Vertical Story Live Preview */}
                <div className="flex flex-col gap-2.5">
                  <div className="relative w-36 sm:w-40 mx-auto aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-zinc-800/80 flex items-center justify-center group">
                    
                    {/* Video Player Render */}
                    {isVideo ? (
                      <video
                        ref={videoRef}
                        src={mediaPreviewUrl}
                        autoPlay
                        loop
                        muted={isMuted}
                        playsInline
                        onTimeUpdate={() => {
                          if (videoRef.current) {
                            const cur = videoRef.current.currentTime;
                            setCurrentTime(cur);
                            // Loop interval between startTimeOffset and startTimeOffset + 15
                            if (cur > startTimeOffset + 15) {
                              videoRef.current.currentTime = startTimeOffset;
                            } else if (cur < startTimeOffset) {
                              videoRef.current.currentTime = startTimeOffset;
                            }
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      /* Image Render with Live Filter CSS Classes applied */
                      <img
                        src={mediaPreviewUrl}
                        alt="Preview"
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          EFFECTS.find(e => e.id === (imageStories[activeImageIndex]?.effect || 'none'))?.class || ''
                        }`}
                      />
                    )}

                    {/* Gradient Top & Bottom Bars */}
                    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/85 via-black/35 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

                    {/* Header Overlay (User metadata + Expiration) */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between text-white z-15">
                      <div className="flex items-center gap-2">
                        <img
                          src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                          alt="Avatar"
                          className="w-7 h-7 rounded-lg border border-accent/30 object-cover"
                        />
                        <div>
                          <p className="text-[10px] font-extrabold leading-tight">
                            {user?.name || (isRtl ? 'مستكشف المنصة' : 'User')}
                          </p>
                          <span className="inline-flex items-center gap-0.5 text-[8px] text-gray-300">
                            <Clock size={8} />
                            {isRtl ? 'تختفي بعد 24 ساعة' : 'Expires in 24h'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setMediaPreviewUrl('');
                          setImageStories([]);
                          stopAudioPreview();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold border border-white/10 backdrop-blur-md transition-all"
                      >
                        {isRtl ? 'تغيير' : 'Change'}
                      </button>
                    </div>

                    {/* Active Audio Indicator Notes for Image */}
                    {!isVideo && activeMusicTrack !== 'none' && isMusicPlaying && (
                      <div className="absolute top-14 right-3 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded text-accent text-[8px] font-bold backdrop-blur-md border border-white/10">
                        <Music size={8} className="animate-bounce" />
                        <span>{MUSIC_TRACKS.find(m => m.id === activeMusicTrack)?.labelAr}</span>
                      </div>
                    )}

                    {/* Controls Overlay (Mute, Play/Pause) */}
                    <div className="absolute bottom-3 inset-x-3 flex items-center justify-between z-15 text-white">
                      
                      {/* Media Playback Controls */}
                      <div className="flex items-center gap-1.5">
                        {isVideo && (
                          <button
                            onClick={() => {
                              if (videoRef.current) {
                                if (isPlaying) {
                                  videoRef.current.pause();
                                } else {
                                  videoRef.current.play().catch(console.error);
                                }
                                setIsPlaying(!isPlaying);
                              }
                            }}
                            className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 transition-colors"
                          >
                            {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                          </button>
                        )}

                        {/* Mute/Unmute sound track */}
                        <button
                          onClick={toggleMusicMute}
                          className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 transition-colors"
                        >
                          {isMuted ? <VolumeX size={10} className="text-red-400" /> : <Volume2 size={10} className="text-accent" />}
                        </button>
                      </div>

                      {/* Video Clip Duration Badge / Track Duration */}
                      <div className="px-2 py-0.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md text-[9px] font-bold flex items-center gap-1">
                        <Clock size={10} className="text-accent" />
                        <span>
                          {isVideo 
                            ? `00:${formatTime(currentTime)} / 00:15`
                            : `${imageStories[activeImageIndex]?.duration || 15}s`
                          }
                        </span>
                      </div>
                    </div>

                    {/* Multi-photo pagination badge */}
                    {imageStories.length > 1 && (
                      <div className="absolute top-14 left-3 bg-black/65 px-2 py-0.5 rounded border border-white/10 text-[8px] font-bold text-white backdrop-blur-md">
                        {isRtl ? 'القصة' : 'Story'} {activeImageIndex + 1} / {imageStories.length}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Right Side: Controls Board (Effects, Music, Trimming, Multi-image layout) */}
                <div className="space-y-4">
                  
                  {/* Grid layout for Multiple Photos Selection if active */}
                  {imageStories.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block uppercase tracking-wider">
                        {isRtl ? `الصور المختارة (${imageStories.length} من 10)` : `Selected Images (${imageStories.length} of 10)`}
                      </span>
                      
                      <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 dark:bg-zinc-900/30 p-2 rounded-xl border border-gray-100 dark:border-zinc-800/60 max-h-[110px] overflow-y-auto">
                        {imageStories.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setActiveImageIndex(idx);
                              setMediaPreviewUrl(item.previewUrl);
                            }}
                            className={`relative w-10 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition-all shrink-0 ${
                              activeImageIndex === idx ? 'border-accent scale-105 shadow-md' : 'border-gray-200 dark:border-zinc-800 hover:opacity-80'
                            }`}
                          >
                            <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImageFromStories(idx);
                              }}
                              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-red-500 hover:bg-red-600 text-white shadow"
                            >
                              <X size={8} />
                            </button>
                            
                            {/* Short indicator of setting */}
                            {(item.effect !== 'none' || item.music !== 'none') && (
                              <div className="absolute bottom-0.5 inset-x-0 flex justify-center gap-0.5 bg-black/40 py-0.5">
                                {item.effect !== 'none' && <Sparkles size={6} className="text-accent" />}
                                {item.music !== 'none' && <Music size={6} className="text-blue-400" />}
                              </div>
                            )}
                          </div>
                        ))}

                        {imageStories.length < 10 && (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-10 h-14 rounded-lg border border-dashed border-gray-300 dark:border-zinc-800 flex flex-col items-center justify-center text-gray-400 hover:border-accent hover:text-accent transition-all shrink-0"
                          >
                            <Upload size={12} />
                            <span className="text-[8px] font-bold mt-0.5">{isRtl ? 'إضافة' : 'Add'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* VIDEO TRIMMER CARD & CHOOSE RECOMMENDED COVER (Thumbnail) */}
                  {isVideo && (
                    <div className="space-y-3">
                      {/* Trimming slider panel */}
                      {videoDuration > 15.5 && (
                        <div className="bg-gray-55 dark:bg-zinc-900/30 p-3 rounded-xl border border-gray-150 dark:border-zinc-800/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                              <Scissors size={12} className="text-accent" />
                              {isRtl ? 'قص ذكي للمقطع (15 ثانية):' : 'Crop segment loop (15s):'}
                            </span>
                            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono">
                              {isRtl ? 'يبدأ من:' : 'Starts at:'} {formatTime(startTimeOffset)}s
                            </span>
                          </div>

                          <div className="space-y-1">
                            <input
                              type="range"
                              min="0"
                              max={Math.max(0, videoDuration - 15)}
                              step="0.5"
                              value={startTimeOffset}
                              onChange={(e) => {
                                const offset = parseFloat(e.target.value);
                                setStartTimeOffset(offset);
                                if (videoRef.current) {
                                  videoRef.current.currentTime = offset;
                                }
                              }}
                              className="w-full accent-accent h-1 bg-gray-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                            />
                            <div className="flex items-center justify-between text-[8px] text-gray-450">
                              <span>00:00</span>
                              <span>{isRtl ? 'نهاية المقطع:' : 'Video End:'} {formatTime(videoDuration)}s</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cover selection panel */}
                      <div className="bg-gray-55 dark:bg-zinc-900/30 p-3 rounded-xl border border-gray-150 dark:border-zinc-800/60 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {isRtl ? 'توصيات المقطع' : 'Clip Recommendations'}
                          </span>
                          <button
                            type="button"
                            onClick={() => customCoverInputRef.current?.click()}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 hover:bg-accent/15 text-accent text-[9px] font-bold border border-accent/25 transition-all cursor-pointer"
                          >
                            <Upload size={9} />
                            <span>{isRtl ? 'رفع صورة غلاف' : 'Upload cover'}</span>
                          </button>
                          <input
                            ref={customCoverInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCustomCoverUpload}
                            className="hidden"
                          />
                        </div>
                        
                        {isGeneratingCovers ? (
                          <div className="flex items-center gap-1.5 justify-center py-3 text-[10px] text-gray-500">
                            <Loader2 size={12} className="animate-spin text-accent" />
                            <span>{isRtl ? 'جاري استخراج صور غلاف ممتازة...' : 'Generating cover previews...'}</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-1.5">
                            {recommendedCovers.map((thumb, idx) => (
                              <div
                                key={idx}
                                onClick={() => setSelectedCoverIndex(idx)}
                                className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:opacity-90 ${
                                  selectedCoverIndex === idx ? 'border-accent scale-[1.03] shadow-md' : 'border-gray-200 dark:border-zinc-800'
                                }`}
                              >
                                <img src={thumb} alt="" className="w-full h-full object-cover" />
                                {selectedCoverIndex === idx && (
                                  <div className="absolute inset-0 bg-accent/20 flex items-center justify-center text-white">
                                    <Check size={12} className="bg-accent rounded-full p-0.5" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PHOTO DESIGN PANEL (EFFECTS & MUSIC TRACKS & STORY DURATION) */}
                  {!isVideo && (
                    <div className="space-y-3">
                      
                      {/* Effect selector panel */}
                      <div className="bg-gray-55 dark:bg-zinc-900/30 p-3 rounded-xl border border-gray-150 dark:border-zinc-800/60 space-y-2">
                        <span className="text-[11px] font-bold text-gray-800 dark:text-gray-250 block">
                          {isRtl ? 'إضافة تأثير فلتر سينمائي للقصة:' : 'Apply creative photo filter effect:'}
                        </span>
                        
                        <div className="grid grid-cols-3 gap-1.5">
                          {EFFECTS.map((eff) => (
                            <button
                              key={eff.id}
                              type="button"
                              onClick={() => updateActiveImageSettings('effect', eff.id)}
                              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all border text-center justify-center ${
                                imageStories[activeImageIndex]?.effect === eff.id
                                  ? 'bg-accent/10 border-accent text-accent'
                                  : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <Sparkles size={9} className={imageStories[activeImageIndex]?.effect === eff.id ? 'text-accent' : 'text-gray-400'} />
                              <span>{isRtl ? eff.labelAr : eff.labelEn}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Music selector panel */}
                      <div className="bg-gray-55 dark:bg-zinc-900/30 p-3 rounded-xl border border-gray-150 dark:border-zinc-800/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-800 dark:text-gray-250 flex items-center gap-1">
                            <Music size={11} className="text-accent" />
                            {isRtl ? 'إضافة موسيقى خلفية للمشهد:' : 'Attach background audio track:'}
                          </span>
                          {imageStories[activeImageIndex]?.music !== 'none' && (
                            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-blue-500/10 text-blue-500 animate-pulse">
                              {isRtl ? 'تسمع الآن' : 'Playing vibe'}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {MUSIC_TRACKS.map((track) => (
                            <button
                              key={track.id}
                              type="button"
                              onClick={() => updateActiveImageSettings('music', track.id)}
                              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all border text-start justify-start ${
                                imageStories[activeImageIndex]?.music === track.id
                                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-500'
                                  : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <Music size={9} className={imageStories[activeImageIndex]?.music === track.id ? 'text-blue-500' : 'text-gray-400'} />
                              <span className="truncate">{isRtl ? track.labelAr : track.labelEn}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Duration slider panel */}
                      <div className="bg-gray-55 dark:bg-zinc-900/30 p-3 rounded-xl border border-gray-150 dark:border-zinc-800/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-800 dark:text-gray-250 flex items-center gap-1">
                            <Clock size={11} className="text-accent" />
                            {isRtl ? 'مدة عرض هذه القصة:' : 'Story playback duration:'}
                          </span>
                          <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                            {imageStories[activeImageIndex]?.duration || 15} {isRtl ? 'ثانية' : 'seconds'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <input
                            type="range"
                            min="5"
                            max="15"
                            step="1"
                            value={imageStories[activeImageIndex]?.duration || 15}
                            onChange={(e) => updateActiveImageSettings('duration', parseInt(e.target.value))}
                            className="w-full accent-accent h-1 bg-gray-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                          />
                          <div className="flex items-center justify-between text-[8px] text-gray-450">
                            <span>5s</span>
                            <span>15s ({isRtl ? 'أقصى مدة' : 'Maximum'})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-850 bg-gray-50/70 dark:bg-[#18181b]/50 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-705 text-gray-700 dark:text-gray-300 text-[10.5px] font-bold transition-all"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              onClick={handlePublish}
              disabled={(!selectedFile && imageStories.length === 0) || isUploading}
              className="flex-1 max-w-[190px] flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent hover:opacity-90 disabled:opacity-50 text-white text-[10.5px] font-bold shadow transition-all border border-accent/20"
            >
              <Send size={12} />
              <span>
                {imageStories.length > 1 
                  ? (isRtl ? `نشر عدد (${imageStories.length}) قصص الآن` : `Publish (${imageStories.length}) stories`)
                  : (isRtl ? 'مشاركة القصة الآن' : 'Share Story Now')
                }
              </span>
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
export default StoryUploadModal;
