/**
 * Perplexta Standardized Animation System
 * Smooth, lightweight motion variants adhering to design system timing tokens.
 */
import { Variants, Transition } from 'motion/react';

export const standardEase: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const standardDuration = 0.18;

export const standardTransition: Transition = {
  duration: standardDuration,
  ease: standardEase,
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: standardTransition },
  exit: { opacity: 0, transition: { duration: 0.12, ease: standardEase } },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: standardTransition },
  exit: { opacity: 0, y: 8, transition: { duration: 0.12, ease: standardEase } },
};

export const slideDown: Variants = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0, transition: standardTransition },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12, ease: standardEase } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: standardTransition },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.12, ease: standardEase } },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};
