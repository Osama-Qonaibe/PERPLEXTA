import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';

export const GlobalLoadingOverlay: React.FC = () => {
  const { isOperationPending } = useAppContext();

  return (
    <AnimatePresence>
      {isOperationPending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          style={{ pointerEvents: 'all' }}
        >
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-main)] shadow-2xl">
            <div className="relative w-12 h-12 flex items-center justify-center">
              {/* Subtle outer pulse */}
              <motion.div
                className="absolute inset-0 rounded-[4px] border-2 border-[var(--text-primary)] opacity-20"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Inner spinning element */}
              <motion.div 
                className="w-8 h-8 rounded-[4px] border-t-2 border-r-2 border-emerald-500"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
