import { secureStorage } from "@/lib/storage";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { toast } from '../context/NotificationContext';

export const ServiceUpdateToast: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { language, dir } = useAppContext();
  const isAr = language === 'ar';

  useEffect(() => {
    // Check if user recently dismissed or updated within the last 30 minutes
    const lastDismissed = secureStorage.getSync('perplexta_update_dismissed');
    const updateApplied = secureStorage.getSync('perplexta_update_applied');
    const now = Date.now();
    
    if (lastDismissed && now - parseInt(lastDismissed, 10) < 30 * 60 * 1000) {
      return; // Do not show if dismissed recently
    }

    const onUpdateFound = () => {
      // If already applied in this session/version, skip
      if (updateApplied && now - parseInt(updateApplied, 10) < 60 * 60 * 1000) {
        return;
      }
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
    secureStorage.set('perplexta_update_dismissed', Date.now().toString());
    setVisible(false);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    // Save session state to prevent repetitive update prompts
    secureStorage.set('perplexta_update_applied', Date.now().toString());
    sessionStorage.setItem('perplexta_session_synced', 'true');

    try {
      // 1. Unregister all service workers to bypass service worker cache entirely
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      // 2. Clear all browser cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
    } catch (e) {
      console.error('Hard reset cache bypass error:', e);
    }

    // 3. Perform a true hard refresh bypassing local & CDN cache using a timestamp cache-buster
    const url = new URL(window.location.href);
    url.searchParams.set('u', Date.now().toString());
    window.location.replace(url.toString());
  };

  const isRtl = dir === 'rtl';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="service-update-toast"
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="toast-floating toast-pill-variant toast-update"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 shrink min-w-0">
            <span className="toast-live-dot">
              <span className="toast-live-dot-ping" />
              <span className="toast-live-dot-core" />
            </span>
            <span className="text-[10.5px] sm:text-xs font-bold text-[var(--fg-primary)] whitespace-nowrap font-sans truncate">
              {isAr ? 'يتوفر تحديث جديد للنظام' : 'Update available'}
            </span>
          </div>

          <div className="toast-divider" />

          <div className="flex items-center h-full shrink-0">
            <button
              id="service-update-dismiss-btn"
              type="button"
              onClick={close}
              className="toast-dismiss-btn font-sans"
            >
              {isAr ? 'لاحقاً' : 'Later'}
            </button>
            <button
              id="service-update-action-btn"
              type="button"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="toast-action-btn font-sans"
            >
              <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isAr ? 'تحديث الآن' : 'Update'}</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


