import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseTypingDebounceOptions {
  delay?: number;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export function useTypingDebounce(options: UseTypingDebounceOptions = {}) {
  const { delay = 3000, onTypingStart, onTypingStop } = options;
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startWriting = useCallback(() => {
    setIsWriting((prev) => {
      if (!prev && onTypingStart) {
        onTypingStart();
      }
      return true;
    });

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setIsWriting(false);
      if (onTypingStop) {
        onTypingStop();
      }
    }, delay);
  }, [delay, onTypingStart, onTypingStop]);

  const resetWriting = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsWriting(false);
    if (onTypingStop) {
      onTypingStop();
    }
  }, [onTypingStop]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    isWriting,
    setIsWriting,
    startWriting,
    resetWriting,
  };
}
