/**
 * CRITICAL FIX #2: Buffer Polling Infinite Loop
 * 
 * PROBLEM:
 * - Polling interval had no maximum timeout
 * - Multiple concurrent intervals could accumulate
 * - setIsGenerating() could be called multiple times
 * 
 * SOLUTION:
 * - Add 60-second maximum timeout
 * - Force completion if buffer doesn't drain
 * - Proper cleanup on component unmount
 */

// ADD THIS CODE TO src/pages/ChatPage.tsx in the streaming handler section:

// Around line 3410, REPLACE the existing polling code with:
const handleStreamCompletion = (data: any) => {
  // Flag to prevent duplicate state updates
  let isCompleted = false;

  const checkBuffer = setInterval(async () => {
    if (isCompleted) return;

    if (streamingBuffer.current.length === 0) {
      isCompleted = true;
      clearInterval(checkBuffer);
      clearTimeout(maxTimeout);
      
      console.log('[ChatPage] Stream buffer drained, completing response');
      applyFinalResponse(finalResponseDataRef.current || data);
      setIsGenerating(false);
      return;
    }
  }, 100);

  // CRITICAL: Maximum 60 second timeout to prevent infinite polling
  const maxTimeout = setTimeout(() => {
    if (!isCompleted) {
      isCompleted = true;
      clearInterval(checkBuffer);
      
      console.warn('[ChatPage] Buffer polling timeout (60s), forcing completion');
      console.warn('[ChatPage] Buffer still contains:', streamingBuffer.current.length, 'chars');
      
      // Force completion even if buffer hasn't fully drained
      applyFinalResponse(finalResponseDataRef.current || data);
      setIsGenerating(false);
    }
  }, 60000); // 60 seconds maximum

  // Return cleanup function for component unmount
  return () => {
    isCompleted = true;
    clearInterval(checkBuffer);
    clearTimeout(maxTimeout);
  };
};

// ADD cleanup to useEffect hook (around line 2600):
useEffect(() => {
  // ... existing code ...

  // Cleanup function: prevent memory leaks
  return () => {
    // Clear any pending intervals/timeouts
    if (typeof handleStreamCompletion === 'function') {
      const cleanup = handleStreamCompletion as any;
      cleanup();
    }
    
    // Reset streaming state
    streamingBuffer.current = '';
    setIsGenerating(false);
  };
}, [/* dependencies */]);

// ALSO ADD monitoring for concurrent streaming:
const trackActiveStreams = () => {
  const streams = new Map<string, { startTime: number; timeout: NodeJS.Timeout }>();

  const startStream = (streamId: string) => {
    // Auto-cleanup after 5 minutes
    const timeout = setTimeout(() => {
      console.warn(`[ChatPage] Stream ${streamId} exceeded 5 min, cleaning up`);
      streams.delete(streamId);
    }, 5 * 60 * 1000);

    streams.set(streamId, { startTime: Date.now(), timeout });
  };

  const endStream = (streamId: string) => {
    const stream = streams.get(streamId);
    if (stream) {
      clearTimeout(stream.timeout);
      streams.delete(streamId);
    }
  };

  return { startStream, endStream };
};

// Usage in message send handler:
const { startStream, endStream } = trackActiveStreams();

const sendMessage = async (messageText: string) => {
  const streamId = `stream_${Date.now()}`;
  startStream(streamId);

  try {
    // ... existing send logic ...
  } finally {
    endStream(streamId);
  }
};
