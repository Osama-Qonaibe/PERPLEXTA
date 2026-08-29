import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { resolveImageUrl } from '../utils/imageResolver';
import { NotificationIconRenderer } from '../utils/imageProcessor';

export const ServiceUpdateToast: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { siteSettings, language, theme } = useAppContext();
  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  const rawLogo = siteSettings?.logoBase64 || siteSettings?.logoLightBase64;
  const logoUrl = rawLogo ? resolveImageUrl(rawLogo) : null;
  const siteName = siteSettings?.siteName || 'Perplexta AI';

  useEffect(() => {
    const onUpdateFound = () => {
      setVisible(true);
    };
    window.addEventListener('pwa-version-mismatch', onUpdateFound);
    window.addEventListener('service-worker-updated', onUpdateFound);
    return () => {
      window.removeEventListener('pwa-version-mismatch', onUpdateFound);
      window.removeEventListener('service-worker-updated', onUpdateFound);
    };
  }, []);

  const close = () => {
    setVisible(false);
  };

  const handleUpdate = () => {
    setIsUpdating(true);
    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-1.5rem)] max-w-sm pointer-events-auto"
        >
          <div
            className={`rounded-2xl border shadow-xl backdrop-blur-xl px-3 py-2.5 flex items-center gap-2.5 transition-all ${
              isDark
                ? 'bg-[#141416]/95 border-accent/30 text-white shadow-[0_10px_25px_rgba(0,0,0,0.6)]'
                : 'bg-white/95 border-accent/30 text-gray-900 shadow-[0_10px_25px_rgba(156,163,175,0.2)]'
            }`}
          >
            {/* Compact Icon */}
            <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0 text-accent p-1 overflow-hidden">
              <NotificationIconRenderer
                src={logoUrl}
                alt={siteName}
                size={24}
                fallbackIcon={<Sparkles className="w-4 h-4 text-accent" />}
              />
            </div>

            {/* Content Text */}
            <div className="flex-1 min-w-0">
              <h4 className="font-extrabold text-xs tracking-tight truncate leading-tight">
                {isAr ? 'تحديث متاح للمنصة' : 'Platform Update Available'}
              </h4>
              <p className="text-[10px] text-gray-400 dark:text-gray-400 truncate leading-normal mt-0.5">
                {isAr
                  ? 'نسخة جديدة جاهزة للاستخدام الآن'
                  : 'A new version is ready to use'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="bg-accent hover:opacity-90 active:scale-95 text-black px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer shadow-sm disabled:opacity-75"
              >
                <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'تحديث' : 'Update'}</span>
              </button>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-500/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
