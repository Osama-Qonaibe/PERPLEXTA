import { useRef, useEffect, TouchEvent } from 'react';

interface SwipeOptions {
  onSwipeClose: () => void;
  direction?: 'horizontal' | 'vertical' | 'both';
  threshold?: number;
  dir?: 'rtl' | 'ltr';
  isMobile?: boolean;
}

export function useSwipeToClose({
  onSwipeClose,
  direction = 'both',
  threshold = 50,
  dir = 'ltr',
  isMobile = true,
}: SwipeOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    if (!isMobile) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!isMobile || touchStartX.current === null || touchStartY.current === null) return;

    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    if (direction === 'vertical' || (direction === 'both' && absY > absX)) {
      // Vertical swipe check (swipe down)
      if (diffY > threshold) {
        onSwipeClose();
        touchStartX.current = null;
        touchStartY.current = null;
      }
    } else if (direction === 'horizontal' || (direction === 'both' && absX > absY)) {
      if (dir === 'rtl') {
        // RTL: swipe left-to-right (positive X movement) triggers dismiss
        if (diffX > threshold) {
          onSwipeClose();
          touchStartX.current = null;
          touchStartY.current = null;
        }
      } else {
        // LTR: swipe right-to-left (negative X movement) triggers dismiss
        if (diffX < -threshold) {
          onSwipeClose();
          touchStartX.current = null;
          touchStartY.current = null;
        }
      }
    }
  };

  const onTouchEnd = () => {
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

interface SwipeNavigationOptions {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  threshold?: number;
  dir?: 'rtl' | 'ltr';
  isMobile?: boolean;
}

export function useSwipeNavigation({
  isOpen,
  onOpen,
  onClose,
  threshold = 50,
  dir = 'ltr',
  isMobile = true,
}: SwipeNavigationOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isEdgeSwipe = useRef<boolean>(false);

  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: any) => {
      if (!e.touches || e.touches.length === 0) return;
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      touchStartX.current = clientX;
      touchStartY.current = clientY;

      // Check if edge swipe (to open when closed)
      if (!isOpen) {
        const edgeThreshold = 40; // pixels from edge
        if (dir === 'rtl') {
          // Right edge in RTL
          isEdgeSwipe.current = clientX >= window.innerWidth - edgeThreshold;
        } else {
          // Left edge in LTR
          isEdgeSwipe.current = clientX <= edgeThreshold;
        }
      } else {
        isEdgeSwipe.current = false;
      }
    };

    const handleTouchMove = (e: any) => {
      if (!e.touches || e.touches.length === 0 || touchStartX.current === null || touchStartY.current === null) return;

      const diffX = e.touches[0].clientX - touchStartX.current;
      const diffY = e.touches[0].clientY - touchStartY.current;

      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      // Only handle if horizontal movement dominates and exceeds minimum delta
      if (absX > absY && absX > 15) {
        if (!isOpen && isEdgeSwipe.current) {
          // Opening swipe
          if (dir === 'rtl' && diffX < -threshold) {
            onOpen();
            touchStartX.current = null;
            touchStartY.current = null;
          } else if (dir === 'ltr' && diffX > threshold) {
            onOpen();
            touchStartX.current = null;
            touchStartY.current = null;
          }
        } else if (isOpen) {
          // Closing swipe
          if (dir === 'rtl' && diffX > threshold) {
            onClose();
            touchStartX.current = null;
            touchStartY.current = null;
          } else if (dir === 'ltr' && diffX < -threshold) {
            onClose();
            touchStartX.current = null;
            touchStartY.current = null;
          }
        }
      }
    };

    const handleTouchEnd = () => {
      touchStartX.current = null;
      touchStartY.current = null;
      isEdgeSwipe.current = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onOpen, onClose, threshold, dir, isMobile]);
}

