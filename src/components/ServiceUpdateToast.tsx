import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { toast } from '../context/NotificationContext';

export const ServiceUpdateToast: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { language } = useAppContext();
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

    toast.success(
      isAr ? 'جاري جلب التحديثات الجديدة وتثبيت الجلسة...' : 'Fetching new updates & synchronizing session...',
      isAr ? 'تحديث النظام' : 'System Update'
    );

    try {
      // Clear service worker caches if supported to fetch fresh build
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
    } catch (e) {
      console.error('Update sync error:', e);
    }

    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="service-update-toast"
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="w-full pointer-events-auto p-2.5 sm:p-3 rounded-[var(--radius)] bg-[var(--surface-card)] border border-[var(--border-main)] shadow-xl transition-all"
        >
          <div className="flex items-start gap-2">
            <div className="p-1 rounded-md bg-accent/10 text-accent shrink-0 flex items-center justify-center mt-0.5">
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] sm:text-xs font-bold text-[var(--text-primary)]">
                  {isAr ? 'يتوفر تحديث جديد للنظام' : 'New System Update Available'}
                </h4>
                <button
                  id="service-update-close-btn"
                  type="button"
                  onClick={close}
                  aria-label={isAr ? 'إغلاق' : 'Close'}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-0.5 rounded shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="mt-1 text-[10px] sm:text-[10.5px] text-[var(--text-secondary)] leading-relaxed">
                {isAr
                  ? 'تم تجهيز نسخة محسّنة. اضغط تحديث لجلب أحدث التحديثات وحفظ الجلسة تلقائياً.'
                  : 'An optimized build is ready. Click update to fetch latest changes and persist your session.'}
              </p>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-[var(--border-main)] flex items-center justify-end gap-1.5">
            <button
              id="service-update-dismiss-btn"
              type="button"
              onClick={close}
              className="px-2.5 py-1 text-[10px] sm:text-[11px] font-medium rounded-[var(--radius)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-[var(--border-main)] transition-all"
            >
              {isAr ? 'لاحقاً' : 'Later'}
            </button>
            <button
              id="service-update-action-btn"
              type="button"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="px-3 py-1 text-[10px] sm:text-[11px] font-bold rounded-[var(--radius)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90 transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-75"
            >
              <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isAr ? 'تحديث الآن وجلب النسخة' : 'Update & Refresh'}</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


