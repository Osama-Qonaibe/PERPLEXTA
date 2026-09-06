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
    const lastDismissed = localStorage.getItem('perplexta_update_dismissed');
    const updateApplied = localStorage.getItem('perplexta_update_applied');
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
    localStorage.setItem('perplexta_update_dismissed', Date.now().toString());
    setVisible(false);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    // Save session state to prevent repetitive update prompts
    localStorage.setItem('perplexta_update_applied', Date.now().toString());
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
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
          className={`fixed top-3 ${isRtl ? 'left-3 md:left-4' : 'right-3 md:right-4'} z-[10100] flex items-center gap-2.5 p-1 sm:p-1.5 pl-3 pr-1 sm:pl-3.5 sm:pr-1.5 rounded-full bg-[var(--surface-card)]/95 backdrop-blur-md border border-[var(--border-main)] shadow-md select-none pointer-events-auto transition-theme max-w-[95%] sm:max-w-md w-auto`}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span>
            </span>
            <span className="text-[10px] sm:text-[11px] font-extrabold text-[var(--text-primary)] whitespace-nowrap">
              {isAr ? 'يتوفر تحديث جديد للنظام' : 'Update available'}
            </span>
          </div>

          <div className="w-px h-3 bg-[var(--border-main)] shrink-0" />

          <div className="flex items-center gap-1 shrink-0">
            <button
              id="service-update-dismiss-btn"
              type="button"
              onClick={close}
              className="px-2 py-0.5 text-[9.5px] sm:text-[10.5px] font-bold rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-all cursor-pointer"
            >
              {isAr ? 'لاحقاً' : 'Later'}
            </button>
            <button
              id="service-update-action-btn"
              type="button"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="px-2.5 py-1 text-[9.5px] sm:text-[10.5px] font-extrabold rounded-full bg-accent text-white hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center gap-1 disabled:opacity-75 cursor-pointer"
            >
              <RefreshCw className={`w-2.5 h-2.5 shrink-0 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isAr ? 'تحديث الآن' : 'Update'}</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


