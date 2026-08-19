import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

export interface FloatingPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  direction?: 'rtl' | 'ltr';
  placement?: 'outward-sidebar' | 'bottom-start' | 'bottom-end' | 'auto';
  children: React.ReactNode;
  className?: string;
  width?: number;
}

export const FloatingPopover: React.FC<FloatingPopoverProps> = ({
  isOpen,
  onClose,
  triggerRect,
  direction = 'rtl',
  placement = 'outward-sidebar',
  children,
  className = '',
  width = 150,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen || !triggerRect) return;

    const computeCoords = () => {
      const rect = triggerRect;
      const popoverWidth = width;
      const estimatedHeight = 90; // Default height for 2-3 items menu
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = rect.top;
      let left = rect.left;

      if (placement === 'outward-sidebar') {
        if (direction === 'rtl') {
          // Sidebar is on the right in RTL.
          // Pop OUTWARD to the left (into the main content canvas).
          left = rect.left - popoverWidth - 8;
          top = rect.top - 4;

          // Screen boundary safety
          if (left < 12) {
            left = Math.max(12, rect.right + 8);
          }
        } else {
          // Sidebar is on the left in LTR.
          // Pop OUTWARD to the right (into the main content canvas).
          left = rect.right + 8;
          top = rect.top - 4;

          // Screen boundary safety
          if (left + popoverWidth > viewportWidth - 12) {
            left = Math.max(12, rect.left - popoverWidth - 8);
          }
        }
      } else if (placement === 'bottom-end') {
        top = rect.bottom + 6;
        left = direction === 'rtl' ? rect.left : rect.right - popoverWidth;
      } else {
        // default bottom-start or auto
        top = rect.bottom + 6;
        left = direction === 'rtl' ? rect.right - popoverWidth : rect.left;
      }

      // Vertical screen boundary safety
      if (top + estimatedHeight > viewportHeight - 12) {
        top = Math.max(12, viewportHeight - estimatedHeight - 12);
      }

      setCoords({ top, left });
    };

    computeCoords();

    const handleScroll = (e: Event) => {
      // If scroll happens outside the popover itself, close popover
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, triggerRect, direction, placement, width, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && triggerRect && (
        <div className="fixed inset-0 z-[99990] pointer-events-auto overflow-hidden">
          {/* Invisible Backdrop for click-outside dismissal */}
          <div 
            className="fixed inset-0 bg-transparent z-[99991]" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
          />

          {/* Floating Popover Container */}
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${width}px`,
            }}
            className={`z-[99999] rounded-xl p-1.5 shadow-2xl border transition-theme backdrop-blur-xl ${
              className ? className : 'bg-[var(--surface-card)] border-[var(--border-main)] text-[var(--text-primary)] shadow-black/20 dark:shadow-black/60'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
