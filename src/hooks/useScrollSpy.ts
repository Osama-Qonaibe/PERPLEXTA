import { useState, useEffect, useCallback, RefObject } from 'react';

export interface UseScrollSpyOptions {
  sectionIds: string[];
  containerRef?: RefObject<HTMLElement | null>;
  offset?: number;
  activeDefault?: string;
  enabled?: boolean;
}

export interface ScrollSpyResult {
  activeSection: string;
  setActiveSection: (id: string) => void;
  scrollToSection: (id: string, customOffset?: number) => void;
  scrollProgress: number;
}

/**
 * Custom High-Performance Scroll-Spy Hook
 * Automatically monitors elements in a container or window, calculates active section,
 * and handles smooth navigation to sections.
 */
export function useScrollSpy({
  sectionIds,
  containerRef,
  offset = 80,
  activeDefault,
  enabled = true,
}: UseScrollSpyOptions): ScrollSpyResult {
  const [activeSection, setActiveSection] = useState<string>(
    activeDefault || sectionIds[0] || ''
  );
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Sync default if sectionIds change
  useEffect(() => {
    if (sectionIds.length > 0 && (!activeSection || !sectionIds.includes(activeSection))) {
      setActiveSection(sectionIds[0]);
    }
  }, [sectionIds, activeSection]);

  const updateSpy = useCallback(() => {
    if (!enabled || sectionIds.length === 0) return;

    const container = containerRef?.current;
    let scrollTop = 0;
    let scrollHeight = 0;
    let clientHeight = 0;

    if (container) {
      scrollTop = container.scrollTop;
      scrollHeight = container.scrollHeight;
      clientHeight = container.clientHeight;
    } else {
      scrollTop = window.scrollY || document.documentElement.scrollTop;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = window.innerHeight;
    }

    // Compute scroll progress percentage
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 0) {
      const progress = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
      setScrollProgress(progress);
    } else {
      setScrollProgress(0);
    }

    // Calculate active section based on scroll offset
    let currentActive = sectionIds[0];
    const containerRect = container ? container.getBoundingClientRect() : { top: 0, left: 0 };

    for (let i = 0; i < sectionIds.length; i++) {
      const id = sectionIds[i];
      const el = document.getElementById(id);
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      const relativeTop = container ? rect.top - containerRect.top : rect.top;

      if (relativeTop <= offset) {
        currentActive = id;
      }
    }

    // If near bottom of container, activate the last section
    if (maxScroll > 0 && scrollTop + clientHeight >= scrollHeight - 30) {
      currentActive = sectionIds[sectionIds.length - 1];
    }

    if (currentActive) {
      setActiveSection(currentActive);
    }
  }, [sectionIds, containerRef, offset, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef?.current;
    const target = container || window;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateSpy();
          ticking = false;
        });
        ticking = true;
      }
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    updateSpy();

    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, enabled, updateSpy]);

  const scrollToSection = useCallback(
    (id: string, customOffset?: number) => {
      const el = document.getElementById(id);
      if (!el) return;

      const container = containerRef?.current;
      const targetOffset = customOffset !== undefined ? customOffset : offset;

      if (container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const targetScrollTop = container.scrollTop + (elRect.top - containerRect.top) - (targetOffset - 20);

        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth',
        });
      } else {
        const elTop = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: Math.max(0, elTop - targetOffset),
          behavior: 'smooth',
        });
      }

      setActiveSection(id);
    },
    [containerRef, offset]
  );

  return {
    activeSection,
    setActiveSection,
    scrollToSection,
    scrollProgress,
  };
}
