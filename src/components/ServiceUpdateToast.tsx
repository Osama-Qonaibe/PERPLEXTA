import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Sparkles } from 'lucide-react';

export const ServiceUpdateToast: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleManualMismatch = () => {
      setVisible(true);
    };
    window.addEventListener('pwa-version-mismatch', handleManualMismatch);
    return () => window.removeEventListener('pwa-version-mismatch', handleManualMismatch);
  }, []);

  const close = () => {
    setVisible(false);
  };

  const handleUpdate = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md"
        >
          <div className="bg-[#1a1a1c] border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
              <Sparkles className="w-6 h-6 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </div>
            
            <div className="flex-grow">
              <h4 className="text-white font-medium text-sm">تحديث متاح للمنصة</h4>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                هناك نسخة جديدة جاهزة للاستخدام. قم بالتحديث الآن للاستفادة من أحدث الميزات.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleUpdate}
                className="bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                تحديث
              </button>
              <button
                onClick={close}
                className="text-gray-500 hover:text-white transition-colors text-center text-[10px] uppercase tracking-wider"
              >
                لاحقاً
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
