import { Variants } from 'motion/react';

/**
 * Premium Sovereign Page Transition
 * Simplified to a fast fade (150ms) for stability and speed.
 */
export const sovereignPageTransition: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.15,
      ease: "easeOut",
      staggerChildren: 0,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: "easeIn",
    },
  },
};

export const sovereignItemTransition: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1, 
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};
