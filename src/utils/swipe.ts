import { useRef, TouchEvent } from 'react';

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
