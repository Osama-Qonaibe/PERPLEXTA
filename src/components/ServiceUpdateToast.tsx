import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { resolveImageUrl } from '../utils/imageResolver';
import { NotificationIconRenderer } from '../utils/imageProcessor';
import { VersionManager } from '../utils/versionManager';

export const ServiceUpdateToast: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [targetHash, setTargetHash] = useState<string | null>(null);
  const { siteSettings, language, theme } = useAppContext();
  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  const rawLogo = siteSettings?.logoBase64 || siteSettings?.logoLightBase64;
  const logoUrl = rawLogo ? resolveImageUrl(rawLogo) : null;
  const siteName = siteSettings?.siteName || 'Perplexta AI';

  useEffect(() => {
    const onUpdateFound = (e: Event) => {
      const customEvent = e as CustomEvent<{ serverHash?: string }>;
      const hash = customEvent.detail?.serverHash;
      if (hash) {
        setTargetHash(hash);
      }
      setVisible(true);
    };

    const onSwUpdated = () => {
      // Service worker updated -> verify version hash with VersionManager
      VersionManager.checkVersion();
    };

    window.addEventListener('pwa-version-mismatch', onUpdateFound);
    window.addEventListener('service-worker-updated', onSwUpdated);
    return () => {
      window.removeEventListener('pwa-version-mismatch', onUpdateFound);
      window.removeEventListener('service-worker-updated', onSwUpdated);
    };
  }, []);

  const close = () => {
    if (targetHash) {
      VersionManager.dismissVersion(targetHash);
    }
    setVisible(false);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    setTimeout(async () => {
      await VersionManager.applyHardReset(targetHash || undefined);
    }, 150);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="w-full p-3 rounded-xl bg-[var(--surface-card)] border border-[var(--border-main)] shadow-lg backdrop-blur-xl pointer-events-auto"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="flex items-start gap-2">
            {/* Update Icon */}
            <div className="w-6 h-6 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 text-accent mt-0.5">
              <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
            </div>

            {/* Content Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h3 className="text-[11px] font-bold text-[var(--text-primary)] truncate">
                  {isAr ? 'تحديث متاح للمنصة' : 'Update Available'}
                </h3>
                <button
                  type="button"
                  onClick={close}
                  className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors shrink-0"
                  title={isAr ? 'إغلاق' : 'Close'}
                  aria-label="Close"
                >
                  <X size={12} />
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                {isAr
                  ? 'نسخة جديدة جاهزة للاستخدام الآن.'
                  : 'A new version is ready to use.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-[var(--border-main)]">
            <button
              type="button"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1 py-1 px-2 rounded-md bg-accent text-white font-bold text-[10px] hover:opacity-90 transition-opacity flex items-center justify-center gap-1 whitespace-nowrap shadow-xs cursor-pointer disabled:opacity-75"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isAr ? 'تحديث الآن' : 'Update Now'}</span>
            </button>
            <button
              type="button"
              onClick={close}
              className="flex-1 py-1 px-1.5 rounded-md bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-main)] font-medium text-[10px] hover:bg-[var(--surface-inset)] transition-colors text-center whitespace-nowrap cursor-pointer"
            >
              {isAr ? 'لاحقاً' : 'Later'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
