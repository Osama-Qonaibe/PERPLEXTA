import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from './AppContext';

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

export interface VideoResourceState {
  status: 'processing' | 'ready' | 'error';
  url?: string;
  progress?: ProgressData;
  error?: string;
}

interface VideoResourceContextProps {
  resources: Record<string | number, VideoResourceState>;
  activeMessageId: string | number | null;
  setActiveMessageId: (id: string | number | null) => void;
  pollVideoStatus: (messageId: number) => Promise<void>;
  registerProcessingVideo: (messageId: string | number) => void;
  markVideoFailed: (messageId: string | number, errorMsg: string) => void;
  relinkMessageId: (tempId: string | number, dbId: number) => void;
}

const VideoResourceContext = createContext<VideoResourceContextProps | undefined>(undefined);

export const VideoResourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket, token } = useAppContext();
  const [resources, setResources] = useState<Record<string | number, VideoResourceState>>({});
  const [activeMessageId, setActiveMessageId] = useState<string | number | null>(null);
  
  const activeMessageIdRef = useRef<string | number | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    activeMessageIdRef.current = activeMessageId;
  }, [activeMessageId]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

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
        console.warn(`[VideoResourceProvider] Connection error when polling for message ${messageId}:`, err);
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
      setActiveMessageId,
      pollVideoStatus,
      registerProcessingVideo,
      markVideoFailed,
      relinkMessageId
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
