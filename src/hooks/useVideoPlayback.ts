import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Preview video states
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreviewMuted, setIsPreviewMuted] = useState(false);
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

  // Retrieve cached resource state from context
  const resource = messageId ? resources[messageId] : undefined;

  const status: 'processing' | 'ready' | 'error' = hasInherentUrl
    ? 'ready'
    : (resource?.status || 'processing');

  const resolvedUrl = hasInherentUrl
    ? cleanRawSrc
    : (resource?.url || '');

  const progressData: ProgressData | null = resource?.progress || null;
  const generationError: string = resource?.error || '';

  // Trigger status polling if a numeric message ID exists in a processing state without standard url
  useEffect(() => {
    if (messageId && typeof messageId === 'number' && !hasInherentUrl && (!resource || resource.status === 'processing')) {
      pollVideoStatus(messageId);
    }
  }, [messageId, hasInherentUrl, pollVideoStatus, resource]);

  // 1. Source Detection
  const cleanDisplayUrl = resolvedUrl.split('#')[0];
  let vidAspect = '16:9';
  if (resolvedUrl.includes('#aspect=')) {
    const hash = resolvedUrl.split('#aspect=')[1] || '';
    vidAspect = hash.split('&')[0] || '16:9';
  }

  // 2. Provider Validation
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

  const providerMeta = validateProvider(cleanDisplayUrl);

  // Reset states on src change
  useEffect(() => {
    setIsVideoLoaded(false);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);

    const timer = setTimeout(() => {
      setIsVideoLoaded(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [resolvedUrl]);

  // Synchronize playback between preview modal and primary video player
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

  // 3. Playback Controls & Utility Handlers
  const handleDownload = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!resolvedUrl) return;
    try {
      const cleanUrl = resolvedUrl.split('#')[0];
      const cleanResponse = await fetch(cleanUrl);
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
      console.warn("Video download failed, using fallback direct download method...", err);
      const link = document.createElement('a');
      link.href = resolvedUrl;
      link.download = `Perplexta_Gen_${Date.now()}.mp4`;
      link.target = '_blank';
      link.click();
    }
  }, [resolvedUrl]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  }, []);

  const handleShare = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!resolvedUrl) return;
    const cleanUrl = resolvedUrl.split('#')[0];

    if (navigator.share) {
      try {
        setShareStatus('sharing');
        await navigator.share({
          title: 'Perplexta Cinematic AI Video',
          text: dir === 'rtl' 
            ? 'شاهد هذا العرض السينمائي المولد بواسطة الذكاء الاصطناعي لمنصة بيربليكستا!' 
            : 'Check out this cinematic AI synthesis artifact on Perplexta!',
          url: cleanUrl,
        });
        setShareStatus('idle');
      } catch (err) {
        setShareStatus('idle');
        if (err && (err as any).name !== 'AbortError') {
          copyToClipboard(cleanUrl);
        }
      }
    } else {
      copyToClipboard(cleanUrl);
    }
  }, [resolvedUrl, dir, copyToClipboard]);

  const togglePlay = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      vid.play().catch(ev => console.warn(ev));
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const toggleMute = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPct = clickX / rect.width;
    vid.currentTime = clickPct * vid.duration;
  }, []);

  // Preview Specific Handlers
  const togglePreviewPlay = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const vid = previewVideoRef.current;
    if (!vid) return;
    if (isPreviewPlaying) {
      vid.pause();
      setIsPreviewPlaying(false);
    } else {
      vid.play().catch(ev => console.warn(ev));
      setIsPreviewPlaying(true);
    }
  }, [isPreviewPlaying]);

  const togglePreviewMute = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const vid = previewVideoRef.current;
    if (!vid) return;
    vid.muted = !isPreviewMuted;
    setIsPreviewMuted(!isPreviewMuted);
  }, [isPreviewMuted]);

  const handlePreviewSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
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
    
    // Preview states
    isPreviewPlaying,
    setIsPreviewPlaying,
    isPreviewMuted,
    previewProgress,
    previewTime,
    previewDur,
    
    // Refs
    videoRef,
    previewVideoRef,
    
    // Extracted layout metrics
    cleanDisplayUrl,
    vidAspect,
    providerMeta,
    
    // Handlers
    handleDownload,
    handleShare,
    togglePlay,
    toggleMute,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleSeek,
    
    // Preview Handlers
    togglePreviewPlay,
    togglePreviewMute,
    handlePreviewSeek,
    handlePreviewTimeUpdate,
    handlePreviewLoadedMetadata,

    // Integrated Lifecycle Status Outputs
    status,
    progressData,
    generationError,
    resolvedUrl
  };
};
