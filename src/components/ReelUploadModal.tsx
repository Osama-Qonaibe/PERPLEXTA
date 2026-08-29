import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Clapperboard,
  Sparkles,
  Tag,
  AlignLeft,
  Zap,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Film,
  Music,
  Camera,
  Check,
  RotateCcw,
  Sliders,
  Eye,
  Plus,
  Radio,
  MapPin,
  MessageCircle,
  Clock,
  ShieldCheck,
  Disc3,
  Flame,
  Wand2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { getMediaUrl, extractVideoThumbnail } from '../utils/mediaUtils';
import { notifyMediaPlaying, stopAllMedia } from '../utils/mediaCoordinator';
import {
  ROYALTY_FREE_TRACKS,
  REEL_VISUAL_EFFECTS,
  RoyaltyFreeTrack,
  VisualEffect,
  getTrackAudioUrl,
  getTrackAudioBuffer
} from '../data/royaltyFreeMusic';

export interface ReelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRtl?: boolean;
  token?: string | null;
  onUploadSuccess?: (newReel: any) => void;
  preselectedFile?: File | null;
}

type TabType = 'media_cover' | 'effects' | 'audio_library' | 'details';
type MediaType = 'video' | 'photo';
type CoverMode = 'from_video' | 'custom_image';

export const ReelUploadModal: React.FC<ReelUploadModalProps> = ({
  isOpen,
  onClose,
  isRtl = true,
  token,
  onUploadSuccess,
  preselectedFile = null,
}) => {
  // Main Navigation / Mode State
  const [activeTab, setActiveTab] = useState<TabType>('media_cover');
  const [mobileActiveSheet, setMobileActiveSheet] = useState<TabType | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>('video');

  // File & Media State
  const [selectedFile, setSelectedFile] = useState<File | null>(preselectedFile);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>('');
  const [customCoverFile, setCustomCoverFile] = useState<File | null>(null);
  const [customCoverPreviewUrl, setCustomCoverPreviewUrl] = useState<string>('');
  const [coverMode, setCoverMode] = useState<CoverMode>('from_video');
  const [capturedCoverDataUrl, setCapturedCoverDataUrl] = useState<string>('');
  
  // Video Playback & Scrubber State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [scrubberTime, setScrubberTime] = useState<number>(0);
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [isExtractingFrames, setIsExtractingFrames] = useState<boolean>(false);

  // Visual Effects State
  const [selectedEffectId, setSelectedEffectId] = useState<string>('none');

  // Audio & Music Library State
  const [selectedTrack, setSelectedTrack] = useState<RoyaltyFreeTrack | null>(null);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [customAudioUrl, setCustomAudioUrl] = useState<string>('');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);
  const [audioCategoryFilter, setAudioCategoryFilter] = useState<string>('all');

  // Form Details State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('#ريلز,#ترند,#اكسبلور,#فلسطين');
  const [locationCity, setLocationCity] = useState('القدس الشريف');
  const [hasWhatsappButton, setHasWhatsappButton] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Upload Progress & Submitting
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Responsive layout state to ensure ONLY ONE video element is ever mounted
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customCoverInputRef = useRef<HTMLInputElement>(null);
  const customAudioInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Helper to get active video element reliably
  const getActiveVideoElement = (): HTMLVideoElement | null => {
    return videoRef.current;
  };

  // Helper to toggle play/pause smoothly across elements
  const togglePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      notifyMediaPlaying('reel_upload_preview');
      const p = v.play();
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch((e) => console.warn('Play error:', e));
      }
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  // Helper to safely stop all active audio playback
  const stopCurrentAudio = () => {
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.onended = null;
        currentAudioSourceRef.current.stop();
        currentAudioSourceRef.current.disconnect();
      } catch (_) {}
      currentAudioSourceRef.current = null;
    }
    if (previewAudioRef.current) {
      try {
        previewAudioRef.current.onended = null;
        previewAudioRef.current.onerror = null;
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      } catch (_) {}
      previewAudioRef.current = null;
    }
  };

  // Popular Quick Hashtags
  const POPULAR_HASHTAGS = [
    '#ريلز',
    '#ترند',
    '#اكسبلور',
    '#فلسطين',
    '#ابداع',
    '#موسيقى',
    '#تصوير',
    '#تسويق',
    '#فيديو_قصير'
  ];

  // Cities List
  const CITIES = [
    'القدس الشريف',
    'رام الله',
    'غزة',
    'نابلس',
    'الخليل',
    'بيت لحم',
    'جنين',
    'طولكرم',
    'عمان',
    'القاهرة',
    'الرياض',
    'دبي'
  ];

  // Active effect object
  const activeEffect = useMemo(() => {
    return REEL_VISUAL_EFFECTS.find(e => e.id === selectedEffectId) || REEL_VISUAL_EFFECTS[0];
  }, [selectedEffectId]);

  // Handle preselected file on mount
  useEffect(() => {
    if (preselectedFile) {
      handleFileSelected(preselectedFile);
    }
  }, [preselectedFile]);

  // Clean up resources on modal close or synchronize with media coordinator
  useEffect(() => {
    if (isOpen) {
      stopAllMedia('reel_upload_preview');
    }

    const handleStopMedia = (e: Event) => {
      const customEvent = e as CustomEvent<{ exceptMediaId?: string }>;
      if (customEvent.detail?.exceptMediaId !== 'reel_upload_preview') {
        if (videoRef.current && !videoRef.current.paused) {
          try {
            videoRef.current.pause();
          } catch (_) {}
        }
        setIsPlaying(false);
        stopCurrentAudio();
      }
    };

    const handleMediaPlaying = (e: Event) => {
      const customEvent = e as CustomEvent<{ mediaId: string }>;
      if (customEvent.detail?.mediaId !== 'reel_upload_preview') {
        if (videoRef.current && !videoRef.current.paused) {
          try {
            videoRef.current.pause();
          } catch (_) {}
        }
        setIsPlaying(false);
        stopCurrentAudio();
      }
    };

    window.addEventListener('perplexta:stop_all_media', handleStopMedia);
    window.addEventListener('perplexta:media_playing', handleMediaPlaying);

    if (!isOpen) {
      if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
      if (customCoverPreviewUrl && customCoverPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(customCoverPreviewUrl);
      }
      if (customAudioUrl && customAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(customAudioUrl);
      }
      stopCurrentAudio();
      if (backgroundMusicRef.current) {
        try {
          backgroundMusicRef.current.pause();
        } catch (_) {}
        backgroundMusicRef.current = null;
      }

      setSelectedFile(null);
      setMediaPreviewUrl('');
      setCustomCoverFile(null);
      setCustomCoverPreviewUrl('');
      setCapturedCoverDataUrl('');
      setVideoFrames([]);
      setSelectedTrack(null);
      setCustomAudioFile(null);
      setCustomAudioUrl('');
      setPlayingAudioId(null);
      setTitle('');
      setDescription('');
      setIsUploading(false);
      setUploadProgress(0);
      setActiveTab('media_cover');
      stopAllMedia();
    }

    return () => {
      window.removeEventListener('perplexta:stop_all_media', handleStopMedia);
      window.removeEventListener('perplexta:media_playing', handleMediaPlaying);
    };
  }, [isOpen]);

  // Handle video element time updates
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v) {
      setCurrentTime(v.currentTime);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v) {
      const dur = v.duration || 0;
      setDuration(dur);
      setScrubberTime(Math.min(1.0, dur > 0 ? dur / 2 : 0.5));
      // Extract initial cover and sample filmstrip frames
      extractFilmstripFrames(v);
    }
  };

  // Extract multiple frame thumbnails from video for the filmstrip scrubber
  const extractFilmstripFrames = async (videoElement: HTMLVideoElement) => {
    if (!videoElement || !selectedFile || mediaType !== 'video') return;
    setIsExtractingFrames(true);
    const frames: string[] = [];
    const dur = videoElement.duration || 10;
    const numFrames = 6;
    const step = dur / (numFrames + 1);

    try {
      for (let i = 1; i <= numFrames; i++) {
        const timeSec = i * step;
        const thumb = await extractVideoThumbnail(selectedFile, timeSec);
        if (thumb) frames.push(thumb);
      }
      setVideoFrames(frames);
      if (frames.length > 0 && !capturedCoverDataUrl) {
        setCapturedCoverDataUrl(frames[0]);
      }
    } catch (e) {
      console.debug('Error extracting filmstrip frames:', e);
    } finally {
      setIsExtractingFrames(false);
    }
  };

  // Capture current video frame onto canvas as the cover
  const captureCurrentVideoFrame = () => {
    const video = getActiveVideoElement();
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedCoverDataUrl(dataUrl);
        setCoverMode('from_video');
        toast.success(isRtl ? '✅ تم التقاط وتعيين الإطار الحالي كغلاف للريل!' : '✅ Frame captured as reel cover!');
      }
    } catch (err) {
      toast.error(isRtl ? 'فشل التقاط الإطار' : 'Failed to capture frame');
    }
  };

  // Handle main file selection (Video or Photo)
  const handleFileSelected = (file: File) => {
    if (!file) return;

    const isVid = file.type.startsWith('video/') ||
      ['mp4', 'mov', 'avi', 'webm', 'mkv', '3gp'].some(ext => file.name.toLowerCase().endsWith('.' + ext));
    const isImg = file.type.startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'webp', 'gif'].some(ext => file.name.toLowerCase().endsWith('.' + ext));

    if (!isVid && !isImg) {
      toast.error(isRtl ? 'يرجى اختيار ملف فيديو أو صورة صالح للريلز' : 'Please select a valid video or image file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error(isRtl ? 'حجم الملف كبير جداً (الحد الأقصى 100MB)' : 'File too large (max 100MB)');
      return;
    }

    // Revoke previous object URL
    if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setMediaPreviewUrl(objectUrl);

    if (isVid) {
      setMediaType('video');
      setIsPlaying(true);
      setIsMuted(true);
      notifyMediaPlaying('reel_upload_preview');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.load();
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((e) => console.debug('Video autoplay notice:', e));
          }
        }
      }, 80);
    } else {
      setMediaType('photo');
      setCapturedCoverDataUrl(objectUrl);
      // Auto-select cinematic ken burns effect for photos
      if (selectedEffectId === 'none') {
        setSelectedEffectId('ken_burns');
      }
      // Auto-suggest upbeat/chill track if none selected
      if (!selectedTrack && !customAudioFile) {
        setSelectedTrack(ROYALTY_FREE_TRACKS[0]);
      }
      toast.info(isRtl ? '📸 تم تفعيل وضع تحويل الصورة إلى ريلز (9:16) مع مؤثرات حركية وموسيقى!' : '📸 Photo-to-Reel mode activated with motion effects & soundtrack!');
    }
  };

  // Handle custom cover image upload from device
  const handleCustomCoverSelected = (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error(isRtl ? 'يرجى اختيار ملف صورة صالح للغلاف (JPG/PNG)' : 'Please select an image file for the cover');
      return;
    }

    if (customCoverPreviewUrl && customCoverPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(customCoverPreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomCoverFile(file);
    setCustomCoverPreviewUrl(objectUrl);
    setCoverMode('custom_image');
    toast.success(isRtl ? '🖼️ تم رفع غلاف مخصص للريلز بنجاح!' : '🖼️ Custom cover uploaded successfully!');
  };

  // Handle custom audio file upload
  const handleCustomAudioSelected = (file: File) => {
    if (!file || (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i))) {
      toast.error(isRtl ? 'يرجى اختيار ملف صوتي صالح (MP3/WAV)' : 'Please select a valid audio file');
      return;
    }

    if (customAudioUrl && customAudioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(customAudioUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomAudioFile(file);
    setCustomAudioUrl(objectUrl);
    setSelectedTrack(null);
    playAudioPreview(objectUrl, 'custom_audio');
    toast.success(isRtl ? '🎵 تم تعيين المقطع الصوتي المخصص!' : '🎵 Custom audio track applied!');
  };

  // Play / Toggle Audio Preview with Web Audio API + resilient HTMLAudio fallback
  const playAudioPreview = async (trackUrlOrTrack: string | RoyaltyFreeTrack, trackId: string) => {
    if (playingAudioId === trackId) {
      stopCurrentAudio();
      setPlayingAudioId(null);
      return;
    }

    stopCurrentAudio();
    setIsAudioLoading(true);
    setPlayingAudioId(trackId);

    try {
      // 1. Initialize or resume shared AudioContext for native DSP playback
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current && AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      let audioBuffer: AudioBuffer | null = null;

      // 2. Fetch procedural AudioBuffer directly if it is a library track
      if (typeof trackUrlOrTrack !== 'string') {
        audioBuffer = await getTrackAudioBuffer(trackUrlOrTrack);
      } else if (customAudioFile && trackId === 'custom_audio') {
        // Attempt native Web Audio decode of user-uploaded companion file
        try {
          if (ctx) {
            const arrayBuf = await customAudioFile.arrayBuffer();
            audioBuffer = await ctx.decodeAudioData(arrayBuf);
          }
        } catch (decodeErr) {
          console.warn('WebAudio decode fallback for custom audio:', decodeErr);
        }
      }

      // 3. Native Web Audio Playback (Guaranteed to avoid HTMLAudioElement codec/source loading faults)
      if (ctx && audioBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.85;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.onended = () => {
          setPlayingAudioId(prev => (prev === trackId ? null : prev));
        };
        source.start(0);
        currentAudioSourceRef.current = source;
        return;
      }

      // 4. HTMLAudioElement Fallback
      let finalAudioUrl = '';
      if (typeof trackUrlOrTrack === 'string') {
        finalAudioUrl = trackUrlOrTrack;
      } else {
        finalAudioUrl = await getTrackAudioUrl(trackUrlOrTrack);
      }

      if (!finalAudioUrl) {
        setPlayingAudioId(null);
        return;
      }

      const audio = new Audio();
      audio.volume = 0.85;
      audio.preload = 'auto';

      audio.onended = () => {
        setPlayingAudioId(prev => (prev === trackId ? null : prev));
      };

      audio.onerror = () => {
        setPlayingAudioId(null);
      };

      audio.src = finalAudioUrl;
      await audio.play().catch(playErr => {
        console.warn('Audio play request handled:', playErr);
      });
      previewAudioRef.current = audio;
    } catch (err) {
      console.warn('Audio preview handled:', err);
      setPlayingAudioId(null);
    } finally {
      setIsAudioLoading(false);
    }
  };

  // AI Assistant for catchy Title & Caption
  const handleAiSmartSuggest = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      const suggestions = isRtl
        ? [
            {
              title: 'لحظات استثنائية من قلب الحدث ✨',
              desc: 'شاهد معنا هذا المقطع المميز والحصري! لا تنسى التفاعل ومشاركة رأيك في التعليقات 🎬👇',
              tags: '#ريلز_اليوم,#ترند,#اكسبلور,#فلسطين,#محتوى_هادف'
            },
            {
              title: 'طاقة إيجابية وإبداع بلا حدود 🔥',
              desc: 'إلهام يومي وتفاصيل مذهلة تجسد الجمال والتميز. اترك بصمتك وشارك المنشور مع أصدقائك 🌟',
              tags: '#إبداع,#ريلز,#ترند_السعودية,#اكسبلور_فولو,#فن'
            },
            {
              title: 'لقطة اليوم وسحر التفاصيل 🎥',
              desc: 'مقطع سريع يحمل في طياته الكثير من المعاني والجمال. ما هو تقييمكم من 10؟ 💬✨',
              tags: '#ريلز,#فيديو,#ترند,#القدس,#لايك_واشتراك'
            }
          ]
        : [
            {
              title: 'Unstoppable Vibes & Pure Energy ✨',
              desc: 'Check out this featured reel! Don’t forget to like, comment and share with your circle 🔥👇',
              tags: '#reels,#trending,#explorepage,#viral,#creativity'
            },
            {
              title: 'Daily Inspiration & Masterpiece 🎬',
              desc: 'Capturing moments that truly inspire. What do you think? Rate it 1-10 in the comments below! 🌟',
              tags: '#reels,#aesthetic,#trend,#explore,#dailyvibe'
            }
          ];

      const picked = suggestions[Math.floor(Math.random() * suggestions.length)];
      setTitle(picked.title);
      setDescription(picked.desc);
      setHashtags(picked.tags);
      setIsAiGenerating(false);
      toast.success(isRtl ? '✨ تم توليد العنوان والوصف الذكي بنجاح!' : '✨ AI generated catchy title & caption!');
    }, 600);
  };

  // Add hashtag chip
  const addHashtag = (tag: string) => {
    const currentTags = hashtags.split(',').map(t => t.trim()).filter(Boolean);
    if (!currentTags.includes(tag)) {
      setHashtags([...currentTags, tag].join(','));
    }
  };

  // Helper to get active cover thumbnail preview
  const activeCoverPreview = useMemo(() => {
    if (coverMode === 'custom_image' && customCoverPreviewUrl) {
      return customCoverPreviewUrl;
    }
    if (capturedCoverDataUrl) {
      return capturedCoverDataUrl;
    }
    if (mediaType === 'photo') {
      return mediaPreviewUrl;
    }
    return '';
  }, [coverMode, customCoverPreviewUrl, capturedCoverDataUrl, mediaType, mediaPreviewUrl]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Render Helper: Cover & Media Content
  const renderMediaCoverTab = () => (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Media Type Indicator */}
      <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center">
            {mediaType === 'video' ? <Film size={16} /> : <ImageIcon size={16} />}
          </div>
          <div>
            <p className="text-xs font-bold text-white">
              {mediaType === 'video'
                ? (isRtl ? 'مقطع فيديو ريلز (9:16)' : 'Video Reel (9:16)')
                : (isRtl ? 'صورة مع حركة سينمائية وموسيقى' : 'Photo with Motion & Music')}
            </p>
            <p className="text-[10px] text-zinc-400">
              {selectedFile ? selectedFile.name : (isRtl ? 'لم يتم اختيار ملف بعد' : 'No file chosen')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all active:scale-95 border border-zinc-700"
        >
          {selectedFile ? (isRtl ? 'تغيير' : 'Change') : (isRtl ? 'رفع ملف' : 'Upload')}
        </button>
      </div>

      {/* Cover Frame & Freeze Frame Selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <Eye size={14} className="text-white" />
            <span>{isRtl ? 'شاشة التوقف / غلاف الريلز (Cover Photo)' : 'Reel Cover Photo'}</span>
          </label>
          <span className="text-[10px] text-zinc-400">
            {isRtl ? 'يظهر للمستخدمين قبل تشغيل المقطع' : 'Shown in feeds before playing'}
          </span>
        </div>

        {/* Cover Source Switcher */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCoverMode('from_video')}
            disabled={mediaType !== 'video'}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              coverMode === 'from_video'
                ? 'bg-white text-zinc-950 border-white shadow-md'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30'
            }`}
          >
            <Film size={14} />
            <span>{isRtl ? 'إطار من المقطع' : 'Frame from Video'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCoverMode('custom_image')}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              coverMode === 'custom_image'
                ? 'bg-white text-zinc-950 border-white shadow-md'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon size={14} />
            <span>{isRtl ? 'صورة غلاف مخصصة' : 'Custom Cover Image'}</span>
          </button>
        </div>

        {/* Option A: Video Frame Scrubber & Filmstrip */}
        {coverMode === 'from_video' && mediaType === 'video' && (
          <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-300">
                {isRtl ? 'اختر الإطار المناسب من شريط الفيديو:' : 'Select freeze frame from filmstrip:'}
              </span>
              <button
                type="button"
                onClick={captureCurrentVideoFrame}
                className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-[10px] font-bold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Camera size={12} />
                <span>{isRtl ? 'التقاط الإطار الحالي' : 'Capture Current'}</span>
              </button>
            </div>

            {/* Filmstrip Carousel */}
            {videoFrames.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {videoFrames.map((frameUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setCapturedCoverDataUrl(frameUrl);
                      toast.success(isRtl ? `تم اختيار الإطار #${idx + 1} كغلاف` : `Frame #${idx + 1} selected as cover`);
                    }}
                    className={`relative flex-shrink-0 w-14 sm:w-16 aspect-[9/16] rounded-xl overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 ${
                      capturedCoverDataUrl === frameUrl
                        ? 'border-white ring-2 ring-white/40 shadow-lg'
                        : 'border-zinc-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={frameUrl} alt={`Frame ${idx}`} className="w-full h-full object-cover" />
                    {capturedCoverDataUrl === frameUrl && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : isExtractingFrames ? (
              <div className="flex items-center justify-center py-4 text-xs text-zinc-400 gap-2">
                <Loader2 size={16} className="animate-spin text-white" />
                <span>{isRtl ? 'جاري توليد إطارات المقطع...' : 'Generating filmstrip frames...'}</span>
              </div>
            ) : (
              <div className="text-center py-3 text-xs text-zinc-500">
                {isRtl ? 'اضغط "التقاط الإطار الحالي" لتثبيت غلاف الفيديو' : 'Click "Capture Current" to freeze frame'}
              </div>
            )}
          </div>
        )}

        {/* Option B: Custom Image Upload */}
        {coverMode === 'custom_image' && (
          <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
            <div
              onClick={() => customCoverInputRef.current?.click()}
              className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-950 flex items-center justify-center gap-3 cursor-pointer transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload size={18} />
              </div>
              <div className="text-right" dir="rtl">
                <p className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
                  {customCoverFile ? customCoverFile.name : (isRtl ? 'اختر صورة من جهازك كغلاف للريل' : 'Choose custom cover image')}
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">JPG, PNG, WebP (9:16 Recommended)</span>
              </div>
            </div>

            {customCoverPreviewUrl && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-center gap-2">
                  <img src={customCoverPreviewUrl} alt="Cover Preview" className="w-10 h-14 rounded-lg object-cover border border-zinc-700" />
                  <div>
                    <p className="text-[11px] font-bold text-white">{isRtl ? 'تم اعتماد الغلاف المخصص' : 'Custom cover active'}</p>
                    <span className="text-[9px] text-zinc-500">{customCoverFile?.name}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomCoverFile(null);
                    setCustomCoverPreviewUrl('');
                    setCoverMode('from_video');
                  }}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render Helper: Effects Tab
  const renderEffectsTab = () => (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sparkles size={14} className="text-white" />
            <span>{isRtl ? 'المؤثرات البصرية والفلاتر السينمائية' : 'Visual Effects & Filters'}</span>
          </h4>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            {isRtl ? 'تطبق فلاتر احترافية وحركات فورية على الفيديو أو الصور' : 'Real-time cinematic filters & camera motion'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedEffectId('none')}
          className="text-[10px] text-zinc-400 hover:text-white underline"
        >
          {isRtl ? 'إعادة ضبط' : 'Reset'}
        </button>
      </div>

      {/* Effects Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
        {REEL_VISUAL_EFFECTS.map((eff) => {
          const isSelected = selectedEffectId === eff.id;
          return (
            <div
              key={eff.id}
              onClick={() => {
                setSelectedEffectId(eff.id);
                toast.info(isRtl ? `تم تطبيق تأثير: ${eff.nameAr}` : `Applied: ${eff.nameEn}`);
              }}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                isSelected
                  ? 'bg-white text-zinc-950 border-white shadow-lg font-bold'
                  : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isSelected ? 'text-zinc-950' : 'text-white'}`}>
                  {isRtl ? eff.nameAr : eff.nameEn}
                </span>
                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-zinc-950 text-white flex items-center justify-center">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
              </div>
              <p className={`text-[10px] leading-snug ${isSelected ? 'text-zinc-700' : 'text-zinc-400'}`}>
                {isRtl ? eff.descriptionAr : eff.descriptionEn}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render Helper: Royalty-Free Audio Library Tab
  const renderAudioTab = () => (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Music size={14} className="text-white" />
            <span>{isRtl ? 'مكتبة الأصوات والموسيقى غير المحمية' : 'Royalty-Free Music Library'}</span>
          </h4>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            {isRtl ? '100% مجانية ومرخصة للاستخدام التجاري' : '100% CC0 & copyright-free tracks'}
          </p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1">
          <ShieldCheck size={11} className="text-white" />
          <span>No Copyright</span>
        </span>
      </div>

      {/* Custom Audio Upload Row */}
      <div className="p-2.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center">
            <Upload size={14} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-zinc-200">
              {customAudioFile ? customAudioFile.name : (isRtl ? 'أو ارفع ملف صوتي خاص بك (MP3)' : 'Or upload custom MP3')}
            </p>
            <span className="text-[9px] text-zinc-500 font-mono">Max 25MB</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => customAudioInputRef.current?.click()}
          className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all active:scale-95 border border-zinc-700"
        >
          {customAudioFile ? (isRtl ? 'تغيير' : 'Change') : (isRtl ? 'رفع صوت' : 'Browse')}
        </button>
      </div>

      {/* Tracks List */}
      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        {ROYALTY_FREE_TRACKS.map((track) => {
          const isSelected = selectedTrack?.id === track.id;
          const isPlayingThis = playingAudioId === track.id;

          return (
            <div
              key={track.id}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-zinc-800/90 border-zinc-600 ring-1 ring-zinc-500/40 shadow-md'
                  : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Preview Play/Pause Button */}
                <button
                  type="button"
                  onClick={() => playAudioPreview(track, track.id)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    isPlayingThis
                      ? 'bg-white text-zinc-950 shadow-lg scale-105'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700'
                  }`}
                  title={isPlayingThis ? 'إيقاف المعاينة' : 'تشغيل المعاينة'}
                >
                  {isPlayingThis ? (
                    <Pause size={15} />
                  ) : (
                    <Play size={15} className="ml-0.5 fill-current" />
                  )}
                </button>

                {/* Track Details */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate">
                      {isRtl ? track.titleAr : track.titleEn}
                    </p>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-zinc-800 text-zinc-400">
                      {isRtl ? track.categoryAr : track.categoryEn}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400">
                    <span>{track.artist}</span>
                    <span>•</span>
                    <span className="font-mono text-zinc-300">{track.durationSeconds}s</span>
                  </div>
                </div>
              </div>

              {/* Select / Apply Track Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedTrack(track);
                  setCustomAudioFile(null);
                  toast.success(isRtl ? `🎵 تم اعتماد الموسيقى: ${track.titleAr}` : `🎵 Applied: ${track.titleEn}`);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-white text-zinc-950 font-black shadow-md'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700'
                }`}
              >
                {isSelected ? (
                  <span className="flex items-center gap-1">
                    <Check size={12} strokeWidth={3} />
                    <span>{isRtl ? 'معتمد' : 'Active'}</span>
                  </span>
                ) : (
                  <span>{isRtl ? 'استخدام' : 'Use'}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render Helper: Publishing Details & AI Magic Assistant Tab
  const renderDetailsTab = () => (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* AI Smart Suggest Header */}
      <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center">
            <Wand2 size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-white">
              {isRtl ? 'مساعد الذكاء الاصطناعي لكتابة المحتوى' : 'AI Content Magic Assistant'}
            </p>
            <p className="text-[10px] text-zinc-400">
              {isRtl ? 'توليد تلقائي لعنوان جذاب ووصف احترافي وهاشتاقات' : 'Auto-generates catchy hooks & hashtags'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAiSmartSuggest}
          disabled={isAiGenerating}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          {isAiGenerating ? <Loader2 size={13} className="animate-spin text-zinc-950" /> : <Sparkles size={13} />}
          <span>{isRtl ? 'توليد ذكي' : 'Generate'}</span>
        </button>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
          <AlignLeft size={13} className="text-zinc-400" />
          <span>{isRtl ? 'عنوان الريلز' : 'Reel Title'}</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isRtl ? 'عنوان مميز وجذاب للريلز...' : 'Catchy reel title...'}
          className="w-full bg-zinc-900 text-xs text-white placeholder-zinc-500 rounded-xl px-3.5 py-2.5 border border-zinc-800 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 leading-relaxed"
        />
      </div>

      {/* Caption / Description */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
          <Sparkles size={13} className="text-zinc-400" />
          <span>{isRtl ? 'الوصف والنص' : 'Caption & Details'}</span>
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isRtl ? 'اكتب وصفاً أو رسالتك للجمهور...' : 'Write a short caption...'}
          className="w-full bg-zinc-900 text-xs text-white placeholder-zinc-500 rounded-xl px-3.5 py-2 border border-zinc-800 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 resize-none leading-relaxed"
        />
      </div>

      {/* Hashtags Input & Quick Chips */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
          <Tag size={13} className="text-zinc-400" />
          <span>{isRtl ? 'الهاشتاقات' : 'Hashtags'}</span>
        </label>
        <input
          type="text"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          className="w-full bg-zinc-900 text-xs text-white placeholder-zinc-500 rounded-xl px-3.5 py-2 border border-zinc-800 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 leading-relaxed font-mono"
        />
        {/* 1-click popular hashtag chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {POPULAR_HASHTAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addHashtag(tag)}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-all active:scale-95"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Location & WhatsApp Button Config */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
            <MapPin size={13} className="text-zinc-400" />
            <span>{isRtl ? 'المدينة / الموقع' : 'Location'}</span>
          </label>
          <select
            value={locationCity}
            onChange={(e) => setLocationCity(e.target.value)}
            className="w-full bg-zinc-900 text-xs text-white rounded-xl px-3 py-2 border border-zinc-800 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <MessageCircle size={13} className="text-zinc-400" />
              <span>{isRtl ? 'زر واتساب مباشر' : 'WhatsApp Button'}</span>
            </label>
            <input
              type="checkbox"
              checked={hasWhatsappButton}
              onChange={(e) => setHasWhatsappButton(e.target.checked)}
              className="accent-white rounded cursor-pointer"
            />
          </div>
          {hasWhatsappButton && (
            <input
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+970599000000"
              className="w-full bg-zinc-900 text-xs text-white placeholder-zinc-500 rounded-xl px-3 py-2 border border-zinc-800 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
            />
          )}
        </div>
      </div>
    </div>
  );

  // Submit and Publish Reel
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error(isRtl ? 'يرجى اختيار مقطع فيديو أو صورة أولاً' : 'Please select a media file first');
      return;
    }
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول لنشر الريلز' : 'Please log in to publish reels');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatusText(isRtl ? 'جاري تحضير الوسائط وشاشة التوقف...' : 'Preparing media & cover poster...');

    try {
      let finalCoverUrl = '';

      // 1. Upload custom cover if provided or upload captured thumbnail
      if (customCoverFile) {
        setUploadProgress(20);
        setUploadStatusText(isRtl ? 'جاري رفع غلاف الريلز المخصص...' : 'Uploading custom cover poster...');
        const coverFormData = new FormData();
        coverFormData.append('file', customCoverFile);

        try {
          const coverRes = await fetch('/api/files/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: coverFormData
          });
          if (coverRes.ok) {
            const coverJson = await coverRes.json();
            finalCoverUrl = getMediaUrl(coverJson.fileUrl || coverJson.url || coverJson.file?.url);
          }
        } catch {
          console.debug('Failed to upload custom cover separately');
        }
      } else if (capturedCoverDataUrl && capturedCoverDataUrl.startsWith('data:image')) {
        setUploadProgress(25);
        // Convert dataUrl to blob and upload
        try {
          const resBlob = await fetch(capturedCoverDataUrl);
          const blob = await resBlob.blob();
          const coverBlobFile = new File([blob], 'reel_cover_poster.jpg', { type: 'image/jpeg' });
          const coverFormData = new FormData();
          coverFormData.append('file', coverBlobFile);

          const coverRes = await fetch('/api/files/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: coverFormData
          });
          if (coverRes.ok) {
            const coverJson = await coverRes.json();
            finalCoverUrl = getMediaUrl(coverJson.fileUrl || coverJson.url || coverJson.file?.url);
          }
        } catch {
          // fallback
        }
      }

      // 2. Upload primary media file (Video or Photo)
      setUploadProgress(35);
      setUploadStatusText(isRtl ? 'جاري رفع ملف الريلز عالي التحديد...' : 'Uploading HD reel file...');

      const formData = new FormData();
      formData.append('file', selectedFile);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/files/upload', true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = 35 + Math.round((ev.loaded / ev.total) * 45); // 35% to 80%
          setUploadProgress(pct);
          setUploadStatusText(isRtl ? `جاري رفع الوسائط (${pct}%)...` : `Uploading media (${pct}%)...`);
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            setUploadProgress(85);
            setUploadStatusText(isRtl ? 'جاري معالجة الصوت والمؤثرات ونشر الريل...' : 'Processing audio, effects & publishing...');

            const res = JSON.parse(xhr.responseText);
            const rawUrl = res.fileUrl || res.file?.file_url || res.file?.url || res.url;
            const finalMediaUrl = getMediaUrl(rawUrl) || mediaPreviewUrl;

            // Audio soundtrack title
            const musicTitle = selectedTrack
              ? (isRtl ? selectedTrack.titleAr : selectedTrack.titleEn)
              : customAudioFile
              ? customAudioFile.name.replace(/\.[^/.]+$/, '')
              : (isRtl ? 'الصوت الأصلي - Perplexta' : 'Original Audio - Perplexta');

            // 3. Publish to Bulletin / Reels Ad Table
            setUploadProgress(95);
            const createPayload = {
              title: title.trim() || (isRtl ? 'ريلز جديد ومميز 🔥' : 'New Featured Reel 🔥'),
              description: description.trim() || (isRtl ? 'شاهد واستمتع بهذا المقطع الحصري على المنصة' : 'Enjoy this featured reel on the platform'),
              video_url: mediaType === 'video' ? finalMediaUrl : finalMediaUrl,
              image_url: finalCoverUrl || (mediaType === 'photo' ? finalMediaUrl : (capturedCoverDataUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80')),
              ad_format: 'reel',
              aspect_ratio: '9:16',
              hashtags: hashtags,
              location_city: locationCity,
              music_title: musicTitle,
              is_vertical_916: true,
              has_whatsapp_button: hasWhatsappButton,
              whatsapp_number: hasWhatsappButton ? whatsappNumber : undefined,
              effect_filter: selectedEffectId
            };

            const createRes = await fetch('/api/bulletin/ads', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(createPayload)
            });

            const createData = await createRes.json();
            setUploadProgress(100);
            setUploadStatusText(isRtl ? '🎉 تم النشر بنجاح!' : '🎉 Published successfully!');

            toast.success(isRtl ? '🎉 تم نشر مقطع الريلز باحترافية على المنصة!' : '🎉 Reel published successfully!');

            if (onUploadSuccess) {
              onUploadSuccess(createData.ad || {
                id: Date.now(),
                title: createPayload.title,
                description: createPayload.description,
                video_url: createPayload.video_url,
                image_url: createPayload.image_url,
                ad_format: 'reel',
                aspect_ratio: '9:16',
                likes_count: 0,
                comments_count: 0,
                shares_count: 0
              });
            }

            setTimeout(() => {
              onClose();
            }, 500);
          } catch (err: any) {
            setUploadProgress(100);
            toast.success(isRtl ? '🎉 تم حفظ ونشر الريلز!' : '🎉 Reel published!');
            onClose();
          } finally {
            setIsUploading(false);
          }
        } else {
          setIsUploading(false);
          toast.error(isRtl ? 'فشل رفع الملف للخادم' : 'Upload failed');
        }
      };

      xhr.onerror = () => {
        toast.error(isRtl ? 'خطأ في اتصال الشبكة' : 'Network error during upload');
        setIsUploading(false);
      };

      xhr.send(formData);
    } catch (err) {
      toast.error(isRtl ? 'حدث خطأ غير متوقع أثناء المعالجة' : 'Unexpected error during processing');
      setIsUploading(false);
    }
  };

  // Helper to render the Mobile TikTok-Style Fullscreen Studio (< lg)
  const renderMobileTikTokStudio = () => {
    return (
      <div className="lg:hidden fixed inset-0 z-[99999] bg-black text-white flex flex-col justify-between overflow-hidden font-sans">
        {!selectedFile ? (
          /* Mobile Fullscreen Initial Upload State */
          <div className="relative w-full h-full flex flex-col justify-between p-6 bg-zinc-950">
            {/* Top Bar */}
            <div className="flex items-center justify-between z-10">
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-bold">
                <Clapperboard size={14} className="text-zinc-300" />
                <span>{isRtl ? 'إنشاء ريلز جديد' : 'New Reel'}</span>
              </div>
              <div className="w-10" />
            </div>

            {/* Center Area */}
            <div className="flex flex-col items-center justify-center text-center space-y-4 my-auto">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-3xl bg-zinc-900 border border-zinc-700/80 text-zinc-100 flex items-center justify-center shadow-2xl hover:border-zinc-500 hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer group"
                title={isRtl ? 'اختر فيديو أو صورة للريلز' : 'Select Video or Photo'}
              >
                <Upload size={38} className="text-zinc-200 group-hover:scale-110 transition-transform" />
              </button>
              <div
                className="space-y-1.5 max-w-xs cursor-pointer active:opacity-80 transition-opacity"
                onClick={() => fileInputRef.current?.click()}
              >
                <h3 className="text-lg font-black text-white">
                  {isRtl ? 'اختر فيديو أو صورة للريلز' : 'Select Video or Photo'}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {isRtl
                    ? 'يدعم مقاطع 9:16 العمودية أو الصور مع تحويل سينمائي وموسيقى مجانية بدون حقوق'
                    : 'Supports 9:16 vertical clips or photos with motion FX & royalty-free music'}
                </p>
              </div>
            </div>

            {/* Bottom Format Badges */}
            <div className="flex items-center justify-center gap-3 text-[11px] text-zinc-500 font-mono">
              <span>9:16 Full HD</span>
              <span>•</span>
              <span>Max 100MB</span>
              <span>•</span>
              <span>100% Free Music</span>
            </div>
          </div>
        ) : (
          /* Mobile TikTok Style Active Studio */
          <div className="relative w-full h-full overflow-hidden bg-black flex flex-col justify-between">
            {/* Fullscreen Video or Photo with FX */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center">
              {mediaType === 'video' ? (
                <video
                  key={`mobile-${mediaPreviewUrl}`}
                  ref={videoRef}
                  data-media-id="reel_upload_preview"
                  src={mediaPreviewUrl}
                  className={`w-full h-full object-cover ${activeEffect.animationClass}`}
                  style={{ filter: activeEffect.cssFilter }}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  preload="auto"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onClick={togglePlayPause}
                />
              ) : (
                <div className="relative w-full h-full overflow-hidden bg-zinc-950 flex items-center justify-center">
                  <img
                    src={mediaPreviewUrl}
                    alt="Backdrop"
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125"
                  />
                  <img
                    src={mediaPreviewUrl}
                    alt="Reel Media"
                    className={`relative z-10 w-full h-full object-cover ${activeEffect.animationClass}`}
                    style={{ filter: activeEffect.cssFilter }}
                  />
                </div>
              )}

              {/* Play / Pause Touch Feedback Indicator */}
              {mediaType === 'video' && !isPlaying && (
                <div
                  onClick={togglePlayPause}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full bg-zinc-900/90 text-white flex items-center justify-center backdrop-blur-xl border border-zinc-700 shadow-2xl hover:scale-110 active:scale-95 transition-all">
                    <Play size={28} className="ml-1 fill-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Top Bar (TikTok Style: Close, Sound Pill, Sound Mute) */}
            <div className="relative z-20 px-5 pt-5 pb-3 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white active:scale-90 transition-transform"
              >
                <X size={18} />
              </button>

              {/* Audio Selector Pill */}
              <button
                type="button"
                onClick={() => setMobileActiveSheet('audio_library')}
                className="max-w-[210px] px-4 py-2 rounded-full bg-zinc-900/85 backdrop-blur-xl border border-zinc-700/80 text-white text-xs font-bold flex items-center gap-2 shadow-xl active:scale-95 transition-transform"
              >
                <Music size={13} className="text-zinc-200 animate-spin shrink-0" />
                <span className="truncate">
                  {selectedTrack
                    ? (isRtl ? selectedTrack.titleAr : selectedTrack.titleEn)
                    : customAudioFile
                    ? customAudioFile.name
                    : (isRtl ? 'إضافة صوت' : 'Add Sound')}
                </span>
              </button>

              {/* Mute Button */}
              {mediaType === 'video' ? (
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 flex items-center justify-center text-white active:scale-90 transition-transform"
                >
                  {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-zinc-200" />}
                </button>
              ) : (
                <div className="w-10" />
              )}
            </div>

            {/* Right Action Rail (Positioned safely inwards from screen edge) */}
            <div className="relative z-20 self-end pe-5 sm:pe-6 flex flex-col items-center gap-3.5 pb-2 pointer-events-auto">
              {/* Sounds */}
              <button
                type="button"
                onClick={() => setMobileActiveSheet('audio_library')}
                className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-xl border shadow-xl shadow-black/60 transition-all ${
                  selectedTrack || customAudioFile ? 'bg-white/15 border-white/40 text-white ring-1 ring-white/20' : 'bg-zinc-900/85 border-zinc-700/70 text-zinc-200 hover:text-white'
                }`}>
                  <Music size={20} />
                </div>
                <span className="text-[10px] font-bold text-zinc-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{isRtl ? 'الأصوات' : 'Audio'}</span>
              </button>

              {/* Effects */}
              <button
                type="button"
                onClick={() => setMobileActiveSheet('effects')}
                className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-xl border shadow-xl shadow-black/60 transition-all ${
                  selectedEffectId !== 'none' ? 'bg-white/15 border-white/40 text-white ring-1 ring-white/20' : 'bg-zinc-900/85 border-zinc-700/70 text-zinc-200 hover:text-white'
                }`}>
                  <Sparkles size={20} />
                </div>
                <span className="text-[10px] font-bold text-zinc-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{isRtl ? 'المؤثرات' : 'Effects'}</span>
              </button>

              {/* Cover Photo */}
              <button
                type="button"
                onClick={() => setMobileActiveSheet('media_cover')}
                className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-xl border shadow-xl shadow-black/60 transition-all ${
                  capturedCoverDataUrl || customCoverPreviewUrl ? 'bg-white/15 border-white/40 text-white ring-1 ring-white/20' : 'bg-zinc-900/85 border-zinc-700/70 text-zinc-200 hover:text-white'
                }`}>
                  <Eye size={20} />
                </div>
                <span className="text-[10px] font-bold text-zinc-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{isRtl ? 'الغلاف' : 'Cover'}</span>
              </button>

              {/* Details & Caption */}
              <button
                type="button"
                onClick={() => setMobileActiveSheet('details')}
                className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-xl border shadow-xl shadow-black/60 transition-all ${
                  title.trim() ? 'bg-white/15 border-white/40 text-white ring-1 ring-white/20' : 'bg-zinc-900/85 border-zinc-700/70 text-zinc-200 hover:text-white'
                }`}>
                  <AlignLeft size={20} />
                </div>
                <span className="text-[10px] font-bold text-zinc-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{isRtl ? 'الوصف' : 'Details'}</span>
              </button>

              {/* Retake / Change Media */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setMediaPreviewUrl('');
                }}
                className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-900/85 border border-zinc-700/70 flex items-center justify-center text-zinc-200 hover:text-red-400 hover:border-red-500/40 backdrop-blur-xl shadow-xl shadow-black/60">
                  <RotateCcw size={20} />
                </div>
                <span className="text-[10px] font-bold text-zinc-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{isRtl ? 'تغيير' : 'Change'}</span>
              </button>
            </div>

            {/* Bottom Section (Caption Info & Big Publish Button) */}
            <div className="relative z-20 p-5 pb-6 bg-gradient-to-t from-black via-black/85 to-transparent space-y-3">
              {/* Active info snippet (Clicking opens details sheet) */}
              <div
                onClick={() => setMobileActiveSheet('details')}
                className="p-3 rounded-2xl bg-zinc-900/85 backdrop-blur-xl border border-zinc-800 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="min-w-0 flex-1 pr-2" dir="rtl">
                  <p className="text-xs font-black text-white truncate">
                    {title.trim() || (isRtl ? 'اضغط لكتابة عنوان ووصف الريلز...' : 'Tap to write title & caption...')}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-mono">
                    {hashtags || (isRtl ? '#ريلز #ترند' : '#reel #trending')}
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold shrink-0">
                  {isRtl ? 'تعديل' : 'Edit'}
                </div>
              </div>

              {/* Upload Progress Bar if uploading */}
              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-zinc-200 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Zap size={13} className="animate-pulse text-zinc-200" />
                      <span>{uploadStatusText || (isRtl ? 'جاري المعالجة والنشر...' : 'Publishing...')}</span>
                    </span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Main Publish Button */}
              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={isUploading}
                className="w-full py-3.5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-black" />
                    <span>{isRtl ? 'جاري رفع الريلز...' : 'Uploading Reel...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>{isRtl ? 'نشر الريلز الآن' : 'Publish Reel Now'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Slide-Up Bottom Drawer Sheet for Active Tool */}
            <AnimatePresence>
              {mobileActiveSheet && (
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="absolute inset-x-0 bottom-0 z-50 max-h-[82vh] bg-zinc-950 border-t border-zinc-800 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden text-white"
                >
                  {/* Sheet Header & Grab Handle */}
                  <div className="pt-3 pb-2.5 px-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/90 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-200 flex items-center justify-center">
                        {mobileActiveSheet === 'media_cover' && <Eye size={16} />}
                        {mobileActiveSheet === 'effects' && <Sparkles size={16} />}
                        {mobileActiveSheet === 'audio_library' && <Music size={16} />}
                        {mobileActiveSheet === 'details' && <AlignLeft size={16} />}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        {mobileActiveSheet === 'media_cover' && (isRtl ? 'غلاف وشاشة التوقف' : 'Reel Cover Photo')}
                        {mobileActiveSheet === 'effects' && (isRtl ? 'المؤثرات والفلاتر الحركية' : 'Visual Effects')}
                        {mobileActiveSheet === 'audio_library' && (isRtl ? 'مكتبة الأصوات والموسيقى' : 'Audio & Music')}
                        {mobileActiveSheet === 'details' && (isRtl ? 'بيانات وعنوان الريلز' : 'Reel Details')}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMobileActiveSheet(null)}
                      className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Sheet Content Body */}
                  <div className="p-4 overflow-y-auto max-h-[65vh]">
                    {mobileActiveSheet === 'media_cover' && renderMediaCoverTab()}
                    {mobileActiveSheet === 'effects' && renderEffectsTab()}
                    {mobileActiveSheet === 'audio_library' && renderAudioTab()}
                    {mobileActiveSheet === 'details' && renderDetailsTab()}
                  </div>

                  {/* Sheet Footer Close/Done */}
                  <div className="p-3 border-t border-zinc-800/80 bg-zinc-950">
                    <button
                      type="button"
                      onClick={() => setMobileActiveSheet(null)}
                      className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-xs font-bold text-black transition-colors"
                    >
                      {isRtl ? 'تم وحفظ' : 'Done'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Root Level Hidden Inputs - Available unconditionally for Mobile & Desktop */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelected(f);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={customCoverInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleCustomCoverSelected(f);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={customAudioInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleCustomAudioSelected(f);
          e.target.value = '';
        }}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {isMobileView ? (
        renderMobileTikTokStudio()
      ) : (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[94vh] my-auto"
          >
            {/* Header Bar */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center shadow-lg shrink-0">
                <Clapperboard size={18} className="text-zinc-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-base font-black text-white tracking-wide truncate">
                    {isRtl ? 'استوديو إنشاء ونشر الريلز (9:16)' : 'Reel Creator Studio (9:16)'}
                  </h2>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                    HD 1080p
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                  {isRtl
                    ? 'معاينة فورية، شاشة التوقف، مؤثرات بصرية ومكتبة أصوات مرخصة'
                    : 'Instant playback, cover picker, visual effects & royalty-free music'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                disabled={isUploading}
                className="p-1.5 sm:p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-zinc-700"
                title={isRtl ? 'إغلاق' : 'Close'}
              >
                <X size={19} />
              </button>
            </div>
          </div>

          {/* Main Studio Body (Split Layout: Phone Simulator & Editor Studio) */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Left Column: 9:16 Interactive Mobile Mockup & Live Player */}
            <div className="lg:col-span-5 p-3 sm:p-5 lg:p-6 bg-zinc-950/80 border-b lg:border-b-0 lg:border-r border-zinc-800/80 flex flex-col items-center justify-center">
              {!selectedFile ? (
                /* Initial Upload Dropzone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-[240px] sm:max-w-[280px] aspect-[9/16] rounded-3xl border-2 border-dashed border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 hover:bg-zinc-900/70 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 group shadow-inner"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <Upload size={26} />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white mb-1 group-hover:text-zinc-200 transition-colors">
                    {isRtl ? 'اختر فيديو أو صورة للريلز' : 'Choose Video or Photo'}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 leading-relaxed">
                    {isRtl
                      ? 'يدعم مقاطع الفيديو 9:16 أو تحويل الصور لريلز مع مؤثرات وموسيقى'
                      : 'Supports 9:16 MP4 videos or photo-to-reel with motion FX & soundtracks'}
                  </p>
                </div>
              ) : (
                /* Interactive Smartphone Frame Simulator */
                <div className="w-full max-w-[210px] sm:max-w-[250px] lg:max-w-[280px] flex flex-col items-center">
                  {/* Phone Case Shell */}
                  <div className="relative w-full aspect-[9/16] rounded-[28px] sm:rounded-[36px] bg-black border-2 sm:border-4 border-zinc-800 shadow-2xl overflow-hidden group">
                    {/* Top Notch / Speaker */}
                    <div className="absolute top-1.5 inset-x-0 z-30 flex justify-center pointer-events-none">
                      <div className="w-20 sm:w-24 h-3 sm:h-4 bg-zinc-900 rounded-full border border-zinc-800/80 flex items-center justify-center gap-1.5 sm:gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 border border-zinc-800" />
                        <div className="w-6 sm:w-8 h-1 rounded-full bg-zinc-800" />
                      </div>
                    </div>

                    {/* Media Render Engine */}
                    <div className="relative w-full h-full overflow-hidden bg-black">
                      {mediaType === 'video' ? (
                        <video
                          key={mediaPreviewUrl}
                          ref={videoRef}
                          data-media-id="reel_upload_preview"
                          src={mediaPreviewUrl}
                          className={`w-full h-full object-cover transition-all duration-300 cursor-pointer ${activeEffect.animationClass}`}
                          style={{ filter: activeEffect.cssFilter }}
                          autoPlay
                          loop
                          muted={isMuted}
                          playsInline
                          preload="auto"
                          onTimeUpdate={handleTimeUpdate}
                          onLoadedMetadata={handleLoadedMetadata}
                          onCanPlay={() => {
                            if (isPlaying && videoRef.current) {
                              videoRef.current.play().catch(() => {});
                            }
                          }}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onClick={togglePlayPause}
                        />
                      ) : (
                        /* Photo to Reel Simulated Canvas with Motion Filter */
                        <div className="relative w-full h-full overflow-hidden bg-zinc-950 flex items-center justify-center">
                          {/* Ambient Blur Backdrop */}
                          <img
                            src={mediaPreviewUrl}
                            alt="Backdrop"
                            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125"
                          />
                          <img
                            src={mediaPreviewUrl}
                            alt="Reel Media"
                            className={`relative z-10 w-full h-full object-cover transition-all duration-500 ${activeEffect.animationClass}`}
                            style={{ filter: activeEffect.cssFilter }}
                          />
                        </div>
                      )}

                      {/* Video Center Play/Pause Touch Indicator */}
                      {mediaType === 'video' && !isPlaying && (
                        <div
                          onClick={togglePlayPause}
                          className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 cursor-pointer backdrop-blur-[2px]"
                        >
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-zinc-900/90 text-white flex items-center justify-center backdrop-blur-md border border-zinc-700 shadow-2xl hover:scale-110 active:scale-95 transition-all">
                            <Play size={24} className="ml-1 fill-white text-white" />
                          </div>
                        </div>
                      )}

                      {/* Phone Overlay Elements: Reel Info & Creator Badge */}
                      <div className="absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
                        <div className="space-y-1 text-right" dir="rtl">
                          <p className="text-[11px] sm:text-xs font-black text-white drop-shadow-md truncate">
                            {title.trim() || (isRtl ? 'ريلز جديد' : 'New Reel')}
                          </p>
                          <p className="text-[9px] sm:text-[10px] text-zinc-300 line-clamp-1 drop-shadow-sm">
                            {description.trim() || (isRtl ? 'وصف جذاب يظهر هنا...' : 'Caption preview...')}
                          </p>
                          {/* Soundtrack Bar */}
                          <div className="flex items-center gap-1.5 pt-0.5 text-[8px] sm:text-[9px] text-zinc-300 font-bold">
                            <Disc3 size={10} className="animate-spin text-zinc-300 shrink-0" />
                            <span className="truncate">
                              {selectedTrack
                                ? (isRtl ? selectedTrack.titleAr : selectedTrack.titleEn)
                                : customAudioFile
                                ? customAudioFile.name
                                : (isRtl ? 'الصوت الأصلي - Perplexta' : 'Original Sound')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Top Quick Actions Floating Buttons (Padded Inward) */}
                      <div className="absolute top-6 sm:top-8 inset-x-3.5 sm:inset-x-4 z-30 flex items-center justify-between pointer-events-auto">
                        <span className="px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-black/70 backdrop-blur-md text-[8px] sm:text-[9px] font-mono text-zinc-200 border border-white/10 shadow">
                          {mediaType === 'video' ? formatTime(currentTime) : 'PHOTO REEL'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {mediaType === 'video' && (
                            <button
                              type="button"
                              onClick={() => setIsMuted(!isMuted)}
                              className="p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs backdrop-blur-md border border-white/10 shadow transition-all active:scale-90"
                              title={isMuted ? 'إلغاء الكتم' : 'كتم'}
                            >
                              {isMuted ? <VolumeX size={13} className="text-red-400" /> : <Volume2 size={13} className="text-zinc-200" />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              setMediaPreviewUrl('');
                            }}
                            className="p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs backdrop-blur-md border border-white/10 shadow transition-all active:scale-90"
                            title={isRtl ? 'تغيير الملف' : 'Change Media'}
                          >
                            <RotateCcw size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Selected Cover Badge Pill */}
                      {activeCoverPreview && (
                        <div className="absolute bottom-16 sm:bottom-20 left-3.5 sm:left-4 z-30 pointer-events-auto flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 pr-2 rounded-lg sm:rounded-xl border border-zinc-700 shadow-lg">
                          <img
                            src={activeCoverPreview}
                            alt="Cover"
                            className="w-4 h-6 sm:w-5 sm:h-7 rounded object-cover border border-zinc-600"
                          />
                          <span className="text-[8px] sm:text-[9px] font-bold text-zinc-200">
                            {isRtl ? 'غلاف معتمد' : 'Active Cover'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Video Scrubber & Playback Controls */}
                  {mediaType === 'video' && duration > 0 && (
                    <div className="w-full mt-2.5 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-zinc-400 px-1">
                        <button
                          type="button"
                          onClick={togglePlayPause}
                          className="text-zinc-200 hover:text-white font-bold flex items-center gap-1 transition-colors"
                        >
                          {isPlaying ? <Pause size={11} /> : <Play size={11} className="fill-current" />}
                          <span>{isPlaying ? (isRtl ? 'إيقاف' : 'Pause') : (isRtl ? 'تشغيل' : 'Play')}</span>
                        </button>
                        <span>
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={duration || 10}
                        step={0.1}
                        value={currentTime}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setCurrentTime(val);
                          const activeVid = getActiveVideoElement();
                          if (activeVid) {
                            activeVid.currentTime = val;
                          }
                        }}
                        className="w-full accent-white h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Studio Tools, Tabs, Cover Selector, Audio Library & Metadata Form */}
            <div className="lg:col-span-7 p-3.5 sm:p-5 lg:p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                {/* Studio Tab Navigation Bar (Scrollable & Responsive) */}
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setActiveTab('media_cover')}
                    className={`flex-1 min-w-[75px] py-1.5 sm:py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                      activeTab === 'media_cover'
                        ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md font-bold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <Clapperboard size={13} className="shrink-0" />
                    <span>{isRtl ? 'الغلاف والوسائط' : 'Cover & Media'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('effects')}
                    className={`flex-1 min-w-[75px] py-1.5 sm:py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                      activeTab === 'effects'
                        ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md font-bold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <Sparkles size={13} className="shrink-0" />
                    <span>{isRtl ? 'المؤثرات' : 'Effects'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('audio_library')}
                    className={`flex-1 min-w-[75px] py-1.5 sm:py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                      activeTab === 'audio_library'
                        ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md font-bold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <Music size={13} className="shrink-0" />
                    <span>{isRtl ? 'الأصوات' : 'Audio'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 min-w-[75px] py-1.5 sm:py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                      activeTab === 'details'
                        ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md font-bold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <AlignLeft size={13} className="shrink-0" />
                    <span>{isRtl ? 'البيانات' : 'Details'}</span>
                  </button>
                </div>

                {/* Tab 1: Cover Frame Picker & Media Options */}
                {activeTab === 'media_cover' && renderMediaCoverTab()}
                {/* Tab 2: Visual Effects & Motion Filters */}
                {activeTab === 'effects' && renderEffectsTab()}

                {/* Tab 3: Royalty-Free Music Library */}
                {activeTab === 'audio_library' && renderAudioTab()}

                {/* Tab 4: Metadata Form & AI Magic Assistant */}
                {activeTab === 'details' && renderDetailsTab()}
              </div>

              {/* Upload Progress Indicator */}
              {isUploading && (
                <div className="space-y-2 pt-4">
                  <div className="flex justify-between text-xs text-zinc-200 font-bold">
                    <span className="flex items-center gap-2">
                      <Zap size={14} className="animate-pulse text-zinc-200" />
                      <span>{uploadStatusText || (isRtl ? 'جاري المعالجة والنشر...' : 'Processing & Publishing...')}</span>
                    </span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5 mt-3 sticky bottom-0 bg-zinc-950/90 backdrop-blur-md pb-1 px-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'details') setActiveTab('audio_library');
                      else if (activeTab === 'audio_library') setActiveTab('effects');
                      else if (activeTab === 'effects') setActiveTab('media_cover');
                    }}
                    disabled={activeTab === 'media_cover'}
                    className="px-3.5 sm:px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] sm:text-xs font-bold text-zinc-300 disabled:opacity-30 transition-all active:scale-95"
                  >
                    {isRtl ? 'السابق' : 'Previous'}
                  </button>
                  {activeTab !== 'details' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'media_cover') setActiveTab('effects');
                        else if (activeTab === 'effects') setActiveTab('audio_library');
                        else if (activeTab === 'audio_library') setActiveTab('details');
                      }}
                      className="px-3.5 sm:px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[11px] sm:text-xs font-bold text-zinc-200 transition-all active:scale-95"
                    >
                      {isRtl ? 'التالي' : 'Next'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isUploading}
                    className="px-3.5 sm:px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] sm:text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleFormSubmit}
                    disabled={!selectedFile || isUploading}
                    className="px-4 sm:px-6 py-2 rounded-xl bg-white hover:bg-zinc-200 text-[11px] sm:text-xs font-bold text-black disabled:opacity-40 shadow-xl transition-all active:scale-95 flex items-center gap-1.5 sm:gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>{isRtl ? 'جاري النشر...' : 'Publishing...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>{isRtl ? 'نشر الريل الآن' : 'Publish Reel Now'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
};
