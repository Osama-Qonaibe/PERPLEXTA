import { Variants } from 'motion/react';

/**
 * Premium Sovereign Page Transition
 * Synchronized to 300ms for a distinctive, elite feel.
 */
export const sovereignPageTransition: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.23, 1, 0.32, 1] as [number, number, number, number],
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.23, 1, 0.32, 1] as [number, number, number, number],
    },
  },
};

export const sovereignItemTransition: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.23, 1, 0.32, 1] as [number, number, number, number]
    }
  }
};

/**
 * Shared Architectural Motion Config
 */
export const SOVEREIGN_TRANSITION = { 
  type: "tween" as const, 
  duration: 0.3, 
  ease: [0.23, 1, 0.32, 1] as [number, number, number, number]
};
