import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useVideoResource, ProgressData } from '../context/VideoResourceContext';

export interface UseVideoPlaybackProps {
  src?: string;
  messageId?: string | number;
  dir?: string;
}

export interface ProviderMeta {
  provider: 'google' | 'gcs' | 'perplexta' | 'external' | 'unknown';
  isValid: boolean;
  label: string;
}

const extractUrlFromMarkdown = (rawSrc: string): string => {
  if (!rawSrc) return '';
  if (rawSrc.includes('](')) {
    const match = rawSrc.match(/\]\((.*?)\)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return rawSrc;
};

export const useVideoPlayback = ({ src = '', messageId, dir = 'ltr' }: UseVideoPlaybackProps) => {
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'sharing'>('idle');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreviewMuted, setIsPreviewMuted] = useState(true);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewDur, setPreviewDur] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const { resources, pollVideoStatus } = useVideoResource();

  const cleanRawSrc = extractUrlFromMarkdown(src);
  const hasInherentUrl = !!cleanRawSrc && (
    cleanRawSrc.includes('.mp4') || 
    cleanRawSrc.includes('mixkit') || 
    cleanRawSrc.includes('/uploads/') || 
    cleanRawSrc.startsWith('http')
  );

  const resource = messageId ? resources[messageId] : undefined;

  const status: 'processing' | 'ready' | 'error' = hasInherentUrl
    ? 'ready'
    : (resource?.status || 'processing');

  const resolvedUrl = hasInherentUrl
    ? cleanRawSrc
    : (resource?.url || '');

  const progressData: ProgressData | null = resource?.progress || null;
  const generationError: string = resource?.error || '';

  useEffect(() => {
    if (messageId && typeof messageId === 'number' && !hasInherentUrl && (!resource || resource.status === 'processing')) {
      pollVideoStatus(messageId);
    }
  }, [messageId, hasInherentUrl, pollVideoStatus, resource]);

  const cleanDisplayUrl = useMemo(() => resolvedUrl.split('#')[0], [resolvedUrl]);
  
  let vidAspect = '16:9';
  if (resolvedUrl.includes('#aspect=')) {
    const hash = resolvedUrl.split('#aspect=')[1] || '';
    vidAspect = hash.split('&')[0] || '16:9';
  }

  const validateProvider = useCallback((url: string): ProviderMeta => {
    if (!url) {
      return { provider: 'unknown', isValid: false, label: 'No Source' };
    }
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('googleapis.com') && !lowerUrl.includes('commondatastorage')) {
      return { provider: 'google', isValid: true, label: 'Google Veo Synthesizer' };
    }
    if (lowerUrl.includes('commondatastorage.googleapis.com')) {
      return { provider: 'gcs', isValid: true, label: 'Cloud Storage Library' };
    }
    if (lowerUrl.startsWith('/') || lowerUrl.includes('/api/') || lowerUrl.includes(window.location.hostname)) {
      return { provider: 'perplexta', isValid: true, label: 'Perplexta Local Secure Storage' };
    }
    if (lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')) {
      return { provider: 'external', isValid: true, label: 'External Media Source' };
    }
    return { provider: 'unknown', isValid: false, label: 'Unverified Provider' };
  }, []);

  const providerMeta = useMemo(() => validateProvider(cleanDisplayUrl), [validateProvider, cleanDisplayUrl]);

  useEffect(() => {
    setIsVideoLoaded(false);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);

    const timer = setTimeout(() => {
      setIsVideoLoaded(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, [resolvedUrl]);

  const handleCanPlay = useCallback(() => {
    setIsVideoLoaded(true);
  }, []);

  useEffect(() => {
    if (!isPreviewOpen) {
      if (previewVideoRef.current) {
        previewVideoRef.current.pause();
        setIsPreviewPlaying(false);
      }
      return;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPreviewOpen]);

  const handleDownload = useCallback(async (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!resolvedUrl) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const cleanResponse = await fetch(cleanDisplayUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      const cleanBlob = await cleanResponse.blob();
      const cleanObjectUrl = window.URL.createObjectURL(cleanBlob);
      const link = document.createElement('a');
      link.href = cleanObjectUrl;
      link.download = `Perplexta_Gen_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(cleanObjectUrl);
    } catch (err) {
      clearTimeout(timeoutId);
      // Video download failed or timed out silent fallback
      const link = document.createElement('a');
      link.href = resolvedUrl;
      link.download = `Perplexta_Gen_${Date.now()}.mp4`;
      link.target = '_blank';
      link.click();
    }
  }, [resolvedUrl, cleanDisplayUrl]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  }, []);

  const handleShare = useCallback(async (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!resolvedUrl) return;

    if (navigator.share) {
      try {
        setShareStatus('sharing');
        await navigator.share({
          title: 'Perplexta Cinematic AI Video',
          text: dir === 'rtl' 
            ? 'شاهد هذا العرض السينمائي المولد بواسطة الذكاء الاصطناعي لمنصة بيربليكستا!' 
            : 'Check out this cinematic AI synthesis artifact on Perplexta!',
          url: cleanDisplayUrl,
        });
        setShareStatus('idle');
      } catch (err) {
        setShareStatus('idle');
        if (err && (err as any).name !== 'AbortError') {
          copyToClipboard(cleanDisplayUrl);
        }
      }
    } else {
      copyToClipboard(cleanDisplayUrl);
    }
  }, [resolvedUrl, cleanDisplayUrl, dir, copyToClipboard]);

  const togglePlay = useCallback((e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      vid.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const toggleMute = useCallback((e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setCurrentTime(vid.currentTime);
    setProgress((vid.currentTime / vid.duration) * 100);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setDuration(vid.duration);
    setIsVideoLoaded(true);
  }, []);

  const handleSeek = useCallback((e: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPct = clickX / rect.width;
    vid.currentTime = clickPct * vid.duration;
  }, []);

  const togglePreviewPlay = useCallback((e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const vid = previewVideoRef.current;
    if (!vid) return;
    if (isPreviewPlaying) {
      vid.pause();
      setIsPreviewPlaying(false);
    } else {
      vid.play().catch(() => {});
      setIsPreviewPlaying(true);
    }
  }, [isPreviewPlaying]);

  const togglePreviewMute = useCallback((e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const vid = previewVideoRef.current;
    if (!vid) return;
    vid.muted = !isPreviewMuted;
    setIsPreviewMuted(!isPreviewMuted);
  }, [isPreviewMuted]);

  const handlePreviewSeek = useCallback((e: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const vid = previewVideoRef.current;
    if (!vid || !vid.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPct = clickX / rect.width;
    vid.currentTime = clickPct * vid.duration;
  }, []);

  const handlePreviewTimeUpdate = useCallback(() => {
    const vid = previewVideoRef.current;
    if (!vid) return;
    setPreviewTime(vid.currentTime);
    setPreviewProgress((vid.currentTime / vid.duration) * 100);
  }, []);

  const handlePreviewLoadedMetadata = useCallback(() => {
    const vid = previewVideoRef.current;
    if (!vid) return;
    setPreviewDur(vid.duration);
  }, []);

  return {
    shareStatus,
    isPreviewOpen,
    setIsPreviewOpen,
    isPlaying,
    setIsPlaying,
    isMuted,
    setIsMuted,
    progress,
    setProgress,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    isVideoLoaded,
    setIsVideoLoaded,
    handleCanPlay,
    
    isPreviewPlaying,
    setIsPreviewPlaying,
    isPreviewMuted,
    previewProgress,
    previewTime,
    previewDur,
    
    videoRef,
    previewVideoRef,
    
    cleanDisplayUrl,
    vidAspect,
    providerMeta,
    
    handleDownload,
    handleShare,
    togglePlay,
    toggleMute,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleSeek,
    
    togglePreviewPlay,
    togglePreviewMute,
    handlePreviewSeek,
    handlePreviewTimeUpdate,
    handlePreviewLoadedMetadata,

    status,
    progressData,
    generationError,
    resolvedUrl
  };
};
