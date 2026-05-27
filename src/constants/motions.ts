import { Variants } from 'motion/react';

export const perplextaPageTransition: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.15,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export const perplextaItemTransition: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1, 
    transition: {
      duration: 0.15,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
    }
  }
};

export const PERPLEXTA_TRANSITION = { 
  type: "tween" as const, 
  duration: 0.2, 
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
};

export const SIDEBAR_TRANSITION = {
  type: "tween" as const,
  duration: 0.25,
  ease: [0.25, 1, 0.2, 1] as [number, number, number, number]
};
