import { Variants } from 'motion/react';

// Single standardized speed and cubic bezier easing curve across the entire platform
const UNIFIED_EASE: [number, number, number, number] = [0.25, 1, 0.2, 1];
export const UNIFIED_DURATION = 0.25;

export const perplextaPageTransition: Variants = {
  initial: { opacity: 0, x: 0, y: 0 },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: UNIFIED_DURATION, ease: UNIFIED_EASE },
  },
  exit: {
    opacity: 0,
    x: 0,
    y: 0,
    transition: { duration: UNIFIED_DURATION, ease: UNIFIED_EASE },
  },
};

export const perplextaItemTransition: Variants = {
  initial: { opacity: 0, x: 0, y: 0 },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: UNIFIED_DURATION, ease: UNIFIED_EASE },
  },
  exit: {
    opacity: 0,
    x: 0,
    y: 0,
    transition: { duration: UNIFIED_DURATION, ease: UNIFIED_EASE },
  },
};

export const PERPLEXTA_TRANSITION = {
  type: 'tween' as const,
  duration: UNIFIED_DURATION,
  ease: UNIFIED_EASE,
};

export const SIDEBAR_TRANSITION = {
  type: 'tween' as const,
  duration: UNIFIED_DURATION,
  ease: UNIFIED_EASE,
};

export const SIDEBAR_MOTION_TRANSITION = {
  width:   { type: 'tween' as const, duration: UNIFIED_DURATION, ease: UNIFIED_EASE },
  x:       { type: 'tween' as const, duration: UNIFIED_DURATION, ease: UNIFIED_EASE },
  opacity: { type: 'tween' as const, duration: UNIFIED_DURATION, ease: UNIFIED_EASE },
};

export const FADE_IN: Variants = {
  initial: { opacity: 0, x: 0, y: 0 },
  animate: { opacity: 1, x: 0, y: 0, transition: { duration: UNIFIED_DURATION, ease: UNIFIED_EASE } },
  exit:    { opacity: 0, x: 0, y: 0, transition: { duration: UNIFIED_DURATION, ease: UNIFIED_EASE } },
};

export const FADE_IN_UP: Variants = {
  initial: { opacity: 0, x: 0, y: 0 },
  animate: { opacity: 1, x: 0, y: 0, transition: { duration: UNIFIED_DURATION, ease: UNIFIED_EASE } },
  exit:    { opacity: 0, x: 0, y: 0, transition: { duration: UNIFIED_DURATION, ease: UNIFIED_EASE } },
};

