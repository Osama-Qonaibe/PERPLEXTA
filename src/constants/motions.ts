import { Variants } from 'motion/react';

/**
 * Premium Perplexta Page Transition
 * Synchronized to 300ms for a distinctive, elite feel.
 */
export const perplextaPageTransition: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export const perplextaItemTransition: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1, 
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
    }
  }
};

/**
 * Shared Architectural Motion Config
 */
export const PERPLEXTA_TRANSITION = { 
  type: "tween" as const, 
  duration: 1.1, 
  ease: [0.6, 0.01, 0, 1] as [number, number, number, number]
};
