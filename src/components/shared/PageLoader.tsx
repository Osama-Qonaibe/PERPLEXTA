import React from 'react';
import { motion } from 'framer-motion';

export function PageLoader() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        <span className="text-xs text-gray-600 tracking-widest uppercase">loading</span>
      </div>
    </motion.div>
  );
}
