import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Sparkles, ExternalLink, ArrowRight, ArrowLeft, X, LayoutDashboard } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { usePwaContext } from '../context/PwaContext';
import { resolveImageUrl } from '../utils/imageResolver';
import { NotificationIconRenderer } from '../utils/imageProcessor';

export const PwaInstallSuccessService: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [autoRedirectPaused, setAutoRedirectPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();
  const { siteSettings, language, theme } = useAppContext();
  const { openApp } = usePwaContext();

  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  const siteName = siteSettings?.siteName || 'Perplexta AI';
  const rawLogo = siteSettings?.logoBase64 || siteSettings?.logoLightBase64;
  const logoUrl = rawLogo ? resolveImageUrl(rawLogo) : null;

  useEffect(() => {
    const isStandaloneMode = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
    const alreadyCelebrated = localStorage.getItem('perplexta_install_celebrated') === 'true';

    if (isStandaloneMode && alreadyCelebrated) {
      return;
    }

    const handleInstalled = () => {
      if (localStorage.getItem('perplexta_install_celebrated') === 'true') return;
      localStorage.setItem('perplexta_install_celebrated', 'true');
      setShowModal(true);
      setCountdown(5);
      setAutoRedirectPaused(false);
    };

    window.addEventListener('pwa-app-installed', handleInstalled);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('pwa-app-installed', handleInstalled);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showModal || autoRedirectPaused) return;

    if (countdown <= 0) {
      handleGoToDashboard();
      return;
    }

    timerRef.current = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showModal, countdown, autoRedirectPaused]);

  const handleClose = () => {
    setShowModal(false);
    setAutoRedirectPaused(true);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleGoToDashboard = () => {
    setShowModal(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    navigate('/chat');
  };

  const handleOpenStandalone = () => {
    setShowModal(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    openApp();
  };

  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className={`w-full max-w-xs sm:max-w-sm rounded-2xl border p-4 sm:p-5 shadow-2xl relative overflow-hidden ${
              isDark
                ? 'bg-[#121214] border-accent/30 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8)]'
                : 'bg-white border-accent/30 text-gray-900 shadow-[0_10px_30px_rgba(156,163,175,0.2)]'
            }`}
          >
            {/* Top decorative glow bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gray-500/10 via-teal-400 to-gray-500/5" />

            {/* Countdown progress bar */}
            {!autoRedirectPaused && (
              <div className="absolute top-0.5 left-0 right-0 h-0.5 bg-gray-200/20 overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: `${(countdown / 5) * 100}%` }}
                  transition={{ ease: 'linear', duration: 1 }}
                  className="h-full bg-accent"
                />
              </div>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className={`absolute top-3 ltr:right-3 rtl:left-3 p-1 rounded-lg transition-colors ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <X size={15} />
            </button>

            {/* Header Content */}
            <div className="flex flex-col items-center text-center mt-1">
              <div className="relative mb-2.5">
                <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center p-1.5 shadow-sm overflow-hidden">
                  <NotificationIconRenderer
                    src={logoUrl}
                    alt={siteName}
                    size={36}
                    fallbackIcon={<CheckCircle2 className="w-6 h-6 text-accent" />}
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-[4px] bg-accent flex items-center justify-center text-black shadow-sm">
                  <Sparkles size={9} className="fill-current" />
                </div>
              </div>

              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-accent/15 text-accent border border-accent/30 mb-1.5">
                {isAr ? 'تم التثبيت بنجاح 🎉' : 'App Installed 🎉'}
              </span>

              <h3 className="text-sm font-extrabold tracking-tight mb-1">
                {isAr ? `مرحباً بك في ${siteName}` : `Welcome to ${siteName}`}
              </h3>

              <p className="text-[11px] text-gray-400 leading-relaxed max-w-xs mb-3.5">
                {isAr
                  ? 'تم تثبيت التطبيق بنجاح على جهازك! يمكنك الآن استخدامه مباشرة.'
                  : 'The application was installed successfully. Ready for instant use.'}
              </p>

              {/* Countdown badge if auto-redirect is running */}
              {!autoRedirectPaused && (
                <div className="text-[10px] text-accent/90 font-medium bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-lg mb-3 flex items-center gap-1.5">
                  <span>
                    {isAr
                      ? `التوجيه للوحة التحكم خلال ${countdown}ث...`
                      : `Redirecting in ${countdown}s...`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAutoRedirectPaused(true)}
                    className="underline text-[9.5px] text-gray-400 hover:text-white"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleGoToDashboard}
                  className="w-full py-2 px-3 rounded-xl bg-accent hover:opacity-90 active:scale-95 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <LayoutDashboard size={14} />
                  <span>{isAr ? 'الانتقال إلى لوحة التحكم' : 'Go to Dashboard'}</span>
                  {isAr ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
                </button>

                <button
                  type="button"
                  onClick={handleOpenStandalone}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                    isDark
                      ? 'bg-gray-800/80 border-gray-700/80 text-gray-200 hover:bg-gray-700'
                      : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  <ExternalLink size={13} />
                  <span>{isAr ? 'فتح التطبيق المستقل' : 'Open Standalone App'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
