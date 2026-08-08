import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Sparkles, ExternalLink, ArrowRight, ArrowLeft, X, LayoutDashboard } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { usePwaContext } from '../context/PwaContext';
import { resolveImageUrl } from '../utils/imageResolver';

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
    const handleInstalled = () => {
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

  // Countdown timer for automatic redirect to dashboard
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative overflow-hidden ${
              isDark
                ? 'bg-[#121214] border-emerald-500/30 text-white shadow-[0_0_50px_rgba(16,185,129,0.15)]'
                : 'bg-white border-emerald-500/30 text-gray-900 shadow-[0_0_50px_rgba(16,185,129,0.2)]'
            }`}
          >
            {/* Top decorative glow bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

            {/* Countdown progress bar */}
            {!autoRedirectPaused && (
              <div className="absolute top-1 left-0 right-0 h-0.5 bg-gray-200/20 overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: `${(countdown / 5) * 100}%` }}
                  transition={{ ease: 'linear', duration: 1 }}
                  className="h-full bg-emerald-500"
                />
              </div>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className={`absolute top-4 ltr:right-4 rtl:left-4 p-1.5 rounded-xl transition-colors ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <X size={18} />
            </button>

            {/* Header Content */}
            <div className="flex flex-col items-center text-center mt-2">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  {logoUrl ? (
                    <img src={logoUrl} alt={siteName} className="w-10 h-10 object-contain" />
                  ) : (
                    <CheckCircle2 className="w-9 h-9 text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-md">
                  <Sparkles size={13} className="fill-current" />
                </div>
              </div>

              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-2">
                {isAr ? 'تم التثبيت بنجاح 🎉' : 'App Installed 🎉'}
              </span>

              <h3 className="text-xl font-black tracking-tight mb-2">
                {isAr ? `مرحباً بك في ${siteName}` : `Welcome to ${siteName}`}
              </h3>

              <p className="text-xs text-gray-400 leading-relaxed max-w-xs mb-6">
                {isAr
                  ? 'تم تثبيت التطبيق بنجاح على شاشتك الرئيسية! يمكنك الآن الانتقال للوحة التحكم أو فتح التطبيق مباشرة.'
                  : 'The application was successfully installed on your device. You can now open the app or go directly to the dashboard.'}
              </p>

              {/* Countdown badge if auto-redirect is running */}
              {!autoRedirectPaused && (
                <div className="text-[11px] text-emerald-400/90 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg mb-5 flex items-center gap-2">
                  <span>
                    {isAr
                      ? `التوجيه التلقائي للوحة التحكم خلال ${countdown} ثوانٍ...`
                      : `Redirecting to dashboard in ${countdown}s...`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAutoRedirectPaused(true)}
                    className="underline text-[10px] text-gray-400 hover:text-white"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleGoToDashboard}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
                >
                  <LayoutDashboard size={16} />
                  <span>{isAr ? 'الانتقال إلى لوحة التحكم' : 'Go to Dashboard'}</span>
                  {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                </button>

                <button
                  type="button"
                  onClick={handleOpenStandalone}
                  className={`w-full py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
                    isDark
                      ? 'bg-gray-800/80 border-gray-700/80 text-gray-200 hover:bg-gray-700'
                      : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  <ExternalLink size={15} />
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
