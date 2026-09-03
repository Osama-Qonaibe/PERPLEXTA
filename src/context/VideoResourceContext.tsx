import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from './AppContext';
import { getGlobalMuteState, setGlobalMuteState } from '../utils/mediaCoordinator';

export interface ProgressData {
  progress: number;
  renderedFrames: number;
  totalFrames: number;
  phase: string;
  phase_ar: string;
  fps?: number;
  currentStep?: number;
  totalSteps?: number;
}

export type MediaAspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9' | 'auto' | string;
export type MediaFitMode = 'cover' | 'contain' | 'ambient' | 'fill';
export type MediaFormatType = 'video' | 'reel' | 'story' | 'feed' | 'sidebar' | 'banner' | 'instream' | 'square' | 'portrait' | 'auto';

export interface MediaMetadata {
  aspectRatio?: MediaAspectRatio;
  fitMode?: MediaFitMode;
  format?: MediaFormatType;
  naturalWidth?: number;
  naturalHeight?: number;
  calculatedRatio?: number;
  title?: string;
  posterUrl?: string;
}

export interface VideoResourceState {
  status: 'processing' | 'ready' | 'error';
  url?: string;
  progress?: ProgressData;
  error?: string;
  metadata?: MediaMetadata;
}

interface VideoResourceContextProps {
  resources: Record<string | number, VideoResourceState>;
  activeMessageId: string | number | null;
  activePlaybackId: string | null;
  setActiveMessageId: (id: string | number | null) => void;
  setActivePlaybackId: (id: string | null) => void;
  pollVideoStatus: (messageId: number) => Promise<void>;
  registerProcessingVideo: (messageId: string | number) => void;
  markVideoFailed: (messageId: string | number, errorMsg: string) => void;
  relinkMessageId: (tempId: string | number, dbId: number) => void;
  updateMediaMetadata: (id: string | number, metadata: Partial<MediaMetadata>) => void;
  getMediaMetadata: (id: string | number) => MediaMetadata | undefined;
  globalMuted: boolean;
  setGlobalMuted: (muted: boolean) => void;
}

const VideoResourceContext = createContext<VideoResourceContextProps | undefined>(undefined);

export const VideoResourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket, token } = useAppContext();
  const [resources, setResources] = useState<Record<string | number, VideoResourceState>>({});
  const [activeMessageId, setActiveMessageId] = useState<string | number | null>(null);
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);
  const [globalMuted, setGlobalMutedStateReact] = useState<boolean>(() => {
    return getGlobalMuteState();
  });
  
  const activeMessageIdRef = useRef<string | number | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    activeMessageIdRef.current = activeMessageId;
  }, [activeMessageId]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Autoplay Diagnostics and Browser Compatibility Check
  useEffect(() => {
    const runAutoplayDiagnostics = async () => {
      console.log(
        '%c🔍 PERPLEXTA MEDIA DIAGNOSTICS: Starting Browser Playback Capability Scan...',
        'color: #10b981; font-weight: bold; font-size: 13px;'
      );

      const navAny = navigator as any;
      const report: Record<string, any> = {
        userAgent: navigator.userAgent,
        userActivation: {
          isActive: !!navAny.userActivation?.isActive,
          hasBeenActive: !!navAny.userActivation?.hasBeenActive,
        },
        audioContextState: 'unknown',
        mutedAutoplay: 'unknown',
        unmutedAutoplay: 'unknown',
        cookieEnabled: navigator.cookieEnabled,
        isIframe: window.self !== window.top,
      };

      // 1. AudioContext State Check
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const testCtx = new AudioCtx();
          report.audioContextState = testCtx.state;
          // Clean up to prevent leaking resources
          testCtx.close().catch(() => {});
        } else {
          report.audioContextState = 'unsupported';
        }
      } catch (err: any) {
        report.audioContextState = `error: ${err.message || err}`;
      }

      // 2. Playback diagnostics with a dummy video
      const testVideo = document.createElement('video');
      testVideo.playsInline = true;
      testVideo.setAttribute('playsinline', 'true');
      testVideo.style.display = 'none';
      testVideo.style.width = '1px';
      testVideo.style.height = '1px';
      testVideo.style.position = 'absolute';
      testVideo.style.opacity = '0';
      
      // Minimal base64 silent video to allow actual playback attempt
      testVideo.src = 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAzZtb292AAAAbG12aGQAAAAA0bM8utGzPLsAALuUAAAD6QABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACNXRyYWsAAABcdGtoZAAAAAnRszy60bM8ugAAAAEAAAAAAAD6QAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAMAdWR0YQAAAChtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAOG1kYXQAAAAnEAAAHwQA8ABgAAYAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAg==';

      // We append it to body to ensure the browser processes it correctly as part of the DOM
      try {
        document.body.appendChild(testVideo);
      } catch (_) {}

      // A. Muted Autoplay Test
      testVideo.muted = true;
      try {
        await testVideo.play();
        report.mutedAutoplay = 'ALLOWED';
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          report.mutedAutoplay = 'BLOCKED_BY_BROWSER_POLICY';
        } else {
          report.mutedAutoplay = `FAILED_WITH_ERROR (${err.name || 'UnknownError'}): ${err.message || err}`;
        }
      }

      // B. Unmuted Autoplay Test
      testVideo.muted = false;
      try {
        await testVideo.play();
        report.unmutedAutoplay = 'ALLOWED';
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          report.unmutedAutoplay = 'BLOCKED_BY_BROWSER_POLICY';
        } else {
          report.unmutedAutoplay = `FAILED_WITH_ERROR (${err.name || 'UnknownError'}): ${err.message || err}`;
        }
      }

      // Cleanup
      try {
        if (testVideo.parentNode) {
          testVideo.parentNode.removeChild(testVideo);
        }
      } catch (_) {}

      // 3. Output beautiful structured logs
      const isMutedBlocked = report.mutedAutoplay === 'BLOCKED_BY_BROWSER_POLICY';
      const isUnmutedBlocked = report.unmutedAutoplay === 'BLOCKED_BY_BROWSER_POLICY';
      const isSuspended = report.audioContextState === 'suspended';

      console.groupCollapsed(
        `%c📊 Perplexta Media Diagnostic Report: ${
          isMutedBlocked || isUnmutedBlocked ? '⚠️ RESTRICTIONS DETECTED' : '✅ ALL SYSTEMS GO'
        }`,
        `color: ${isMutedBlocked || isUnmutedBlocked ? '#f59e0b' : '#10b981'}; font-weight: bold;`
      );
      
      console.log('User Agent:', report.userAgent);
      console.log('Running inside iframe:', report.isIframe);
      console.log('User Has Interacted with Page:', report.userActivation.hasBeenActive ? 'Yes (hasBeenActive)' : 'No (Requires gesture)');
      console.log('Audio Context State:', report.audioContextState);
      console.log('Muted Autoplay Status:', report.mutedAutoplay);
      console.log('Unmuted Autoplay Status:', report.unmutedAutoplay);

      if (report.isIframe) {
        console.warn(
          '⚠️ WARNING: The application is running inside an iframe. Chrome/Safari strict sandbox rules block unmuted autoplay and can sometimes suspend the AudioContext unless the iframe has explicit "allow=autoplay" permissions.'
        );
      }

      if (isMutedBlocked) {
        console.error(
          '❌ MUTED AUTOPLAY BLOCKED: Your browser is blocking even muted autoplay. This is typical under extreme battery-saving modes, strict browser privacy extensions, or customized browser safety shields.'
        );
      }

      if (isUnmutedBlocked) {
        console.warn(
          '⚠️ UNMUTED AUTOPLAY BLOCKED: Browser autoplay policy requires an explicit user gesture (e.g., a click or tap on the page) before any unmuted video can begin playing with sound. This is standard modern browser behavior to prevent noisy ads.'
        );
      }

      if (isSuspended) {
        console.warn(
          '⚠️ AUDIO CONTEXT SUSPENDED: Audio playback is currently locked by the browser. It will automatically resume as soon as the user interacts with the page.'
        );
      }

      console.groupEnd();
    };

    // Run diagnostics slightly after mount to ensure DOM is fully ready
    const timer = setTimeout(runAutoplayDiagnostics, 1500);
    return () => clearTimeout(timer);
  }, []);

  const setGlobalMuted = useCallback((muted: boolean) => {
    setGlobalMutedStateReact(muted);
    setGlobalMuteState(muted);
  }, []);

  // Sync React state if mute triggers occur globally outside of the react context
  useEffect(() => {
    const handleMuteChange = (e: Event) => {
      const customEvt = e as CustomEvent<{ muted: boolean }>;
      if (customEvt.detail && typeof customEvt.detail.muted === 'boolean') {
        setGlobalMutedStateReact(customEvt.detail.muted);
      }
    };

    window.addEventListener('perplexta:mute_change', handleMuteChange);
    return () => {
      window.removeEventListener('perplexta:mute_change', handleMuteChange);
    };
  }, []);

  const updateMediaMetadata = useCallback((id: string | number, metadata: Partial<MediaMetadata>) => {
    setResources(prev => {
      const existing = prev[id] || { status: 'ready' as const };
      return {
        ...prev,
        [id]: {
          ...existing,
          metadata: {
            ...(existing.metadata || {}),
            ...metadata
          }
        }
      };
    });
  }, []);

  const getMediaMetadata = useCallback((id: string | number): MediaMetadata | undefined => {
    return resources[id]?.metadata;
  }, [resources]);

  const registerProcessingVideo = useCallback((messageId: string | number) => {
    setResources(prev => ({
      ...prev,
      [messageId]: {
        status: 'processing' as const,
        progress: {
          progress: 0,
          renderedFrames: 0,
          totalFrames: 120,
          phase: 'Initializing secure video synthesis task...',
          phase_ar: 'تهيئة مهمة معالجة وتوليف الفيديو الفنية المشفرة...',
          fps: 0,
          currentStep: 0,
          totalSteps: 20
        }
      }
    }));
    setActiveMessageId(messageId);
  }, []);

  const markVideoFailed = useCallback((messageId: string | number, errorMsg: string) => {
    setResources(prev => ({
      ...prev,
      [messageId]: {
        status: 'error' as const,
        error: errorMsg
      }
    }));
  }, []);

  const relinkMessageId = useCallback((tempId: string | number, dbId: number) => {
    setResources(prev => {
      if (!prev[tempId]) return prev;
      const next = { ...prev };
      next[dbId] = next[tempId];
      delete next[tempId];
      return next;
    });
    if (activeMessageIdRef.current === tempId) {
      setActiveMessageId(dbId);
    }
  }, []);

  const pollVideoStatus = useCallback(async (messageId: number) => {
    let attempts = 0;
    const maxAttempts = 100; // ~5 mins max with 3s intervals
    const delay = 3000;

    const poll = async () => {
      if (!tokenRef.current) return;
      try {
        const res = await fetch(`/api/video-resources/message/${messageId}`, {
          headers: {
            'Authorization': `Bearer ${tokenRef.current}`
          }
        });

        if (res.status === 404) {
          attempts++;
          if (attempts >= maxAttempts) {
            setResources(prev => ({
              ...prev,
              [messageId]: {
                status: 'error' as const,
                error: 'Polling timeout: video generation reached maximum limit.'
              }
            }));
            return;
          }
          setTimeout(poll, delay);
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (data && data.file_url) {
            setResources(prev => ({
              ...prev,
              [messageId]: {
                status: 'ready' as const,
                url: data.file_url,
                progress: {
                  progress: 100,
                  renderedFrames: 120,
                  totalFrames: 120,
                  phase: 'Composed! Master stream sequence finalized.',
                  phase_ar: 'اكتمل التوليد! جاري إنهاء تنسيق مقطع الفيديو فائق الدقة.',
                  fps: 24,
                  currentStep: 20,
                  totalSteps: 20
                }
              }
            }));
            if (activeMessageIdRef.current === messageId) {
              setActiveMessageId(null);
            }
            return;
          }
        }

        attempts++;
        if (attempts >= maxAttempts) {
          setResources(prev => ({
            ...prev,
            [messageId]: { status: 'error' as const, error: 'Failed to retrieve video stream details.' }
          }));
          return;
        }
        setTimeout(poll, delay);
      } catch (err: any) {
        // Connection error silent fallback
        attempts++;
        if (attempts >= maxAttempts) {
          setResources(prev => ({
            ...prev,
            [messageId]: { status: 'error' as const, error: err.message || 'Error occurred during network handshake.' }
          }));
          return;
        }
        setTimeout(poll, delay);
      }
    };

    poll();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onProgress = (data: any) => {
      if (!data) return;
      const targetId = activeMessageIdRef.current;
      if (!targetId) return;

      setResources(prev => {
        const current = prev[targetId] || { status: 'processing' as const };
        let nextStatus: 'processing' | 'ready' | 'error' = current.status;
        if (data.progress >= 100) {
          nextStatus = 'ready' as const;
        }

        return {
          ...prev,
          [targetId]: {
            ...current,
            status: nextStatus,
            progress: {
              progress: data.progress,
              renderedFrames: data.renderedFrames,
              totalFrames: data.totalFrames,
              phase: data.phase,
              phase_ar: data.phase_ar,
              fps: data.fps,
              currentStep: data.currentStep,
              totalSteps: data.totalSteps
            },
          }
        };
      });

      if (data.progress >= 100 && typeof targetId === 'number') {
        pollVideoStatus(targetId);
      }
    };

    socket.on('video_progress', onProgress);

    return () => {
      socket.off('video_progress', onProgress);
    };
  }, [socket, pollVideoStatus]);

  return (
    <VideoResourceContext.Provider value={{
      resources,
      activeMessageId,
      activePlaybackId,
      setActiveMessageId,
      setActivePlaybackId,
      pollVideoStatus,
      registerProcessingVideo,
      markVideoFailed,
      relinkMessageId,
      updateMediaMetadata,
      getMediaMetadata,
      globalMuted,
      setGlobalMuted
    }}>
      {children}
    </VideoResourceContext.Provider>
  );
};

export const useVideoResource = () => {
  const context = useContext(VideoResourceContext);
  if (!context) {
    throw new Error('useVideoResource must be used within a VideoResourceProvider');
  }
  return context;
};
