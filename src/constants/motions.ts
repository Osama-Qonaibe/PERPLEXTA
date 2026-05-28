import { Variants } from 'motion/react';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const perplextaPageTransition: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.15, ease: EASE },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1, ease: EASE },
  },
};

export const perplextaItemTransition: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.15, ease: EASE },
  },
};

export const PERPLEXTA_TRANSITION = {
  type: 'tween' as const,
  duration: 0.2,
  ease: EASE,
};

export const SIDEBAR_TRANSITION = {
  type: 'tween' as const,
  duration: 1.7,
  ease: [0.25, 1, 0.2, 1] as [number, number, number, number],
};

export const SIDEBAR_MOTION_TRANSITION = {
  width:   { type: 'tween' as const, duration: 1.7, ease: [0.25, 1, 0.2, 1] as [number, number, number, number] },
  x:       { type: 'tween' as const, duration: 1.7, ease: [0.25, 1, 0.2, 1] as [number, number, number, number] },
  opacity: { type: 'tween' as const, duration: 1.2, ease: [0.25, 1, 0.2, 1] as [number, number, number, number] },
};

export const FADE_IN: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: EASE } },
  exit:    { opacity: 0, transition: { duration: 0.12, ease: EASE } },
};

export const FADE_IN_UP: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE } },
  exit:    { opacity: 0, y: 6, transition: { duration: 0.12, ease: EASE } },
};
