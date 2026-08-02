import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';

export const InstallAppBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show banner for iOS if not in standalone mode
    if (ios && !('standalone' in window.navigator && window.navigator.standalone)) {
      setShowBanner(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showBanner || window.matchMedia('(display-mode: standalone)').matches) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-4 right-4 z-50 rounded-lg bg-emerald-950 p-4 shadow-lg border border-emerald-800"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="text-emerald-100">
            <h4 className="font-bold">Install Perplexta</h4>
            <p className="text-sm text-emerald-200/80">
              {isIOS 
                ? "Tap the Share button and select 'Add to Home Screen' to install." 
                : "Install our app for a better experience."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isIOS && (
              <button
                onClick={handleInstall}
                className="flex items-center gap-2 rounded bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600"
              >
                <Download size={16} />
                Install
              </button>
            )}
            <button
              onClick={() => setShowBanner(false)}
              className="rounded p-2 text-emerald-200 hover:bg-emerald-900"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
