export const motion = {
  fast: 0.12,
  base: 0.18,
  slow: 0.24,
  ease: [0.16, 1, 0.3, 1] as const,
  spring: {
    type: 'spring' as const,
    stiffness: 380,
    damping: 32,
    mass: 0.8,
  },
};

export const variants = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: motion.base, ease: motion.ease } },
  },
  fadeScale: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: motion.base, ease: motion.ease } },
  },
  dialog: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: motion.base, ease: motion.ease } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: motion.fast, ease: motion.ease } },
  },
  sheet: {
    hidden: { y: '100%' },
    visible: { y: 0, transition: { duration: motion.base, ease: motion.ease } },
    exit: { y: '100%', transition: { duration: motion.fast, ease: motion.ease } },
  },
  toast: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: motion.base, ease: motion.ease } },
    exit: { opacity: 0, y: -20, transition: { duration: motion.fast, ease: motion.ease } },
  },
  listItem: {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: motion.base, ease: motion.ease } },
  },
  page: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: motion.slow, ease: motion.ease } },
  },
};
