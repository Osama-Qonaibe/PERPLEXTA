import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { usePwaContext } from '../context/PwaContext';
import { resolveImageUrl } from '../utils/imageResolver';
import { safeStorageGet } from '@/utils/safeStorage';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Download, X, Share2, PlusSquare, Sparkles, Check, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';

export const PwaInstallBanner: React.FC = () => {
  const { 
    siteSettings, 
    language, 
    theme 
  } = useAppContext();

  const {
    installState,
    canInstall,
    isStandalone,
    isIosSafari,
    promptInstall,
    openApp,
    dismissBanner
  } = usePwaContext();

  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const [isVisible, setIsVisible] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check dismissal cooldown (suppress for 3 days after user dismisses)
    const dismissedTime = safeStorageGet('perplexta_pwa_dismissed');
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const isCooldownActive = dismissedTime && (Date.now() - Number(dismissedTime) < threeDaysMs);

    if (isStandalone || isCooldownActive || installState === 'dismissed') {
      setIsVisible(false);
      return;
    }

    // Show banner if canInstall or if installed (to give option to open app)
    if (canInstall || installState === 'installed') {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [canInstall, installState, isStandalone]);

  const handleAction = async () => {
    if (installState === 'installed') {
      openApp();
    } else if (canInstall) {
      if (isIosSafari) {
        setShowIosGuide(true);
      } else {
        await promptInstall();
      }
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    dismissBanner();
  };

  const rawLogo = siteSettings?.logoBase64 || siteSettings?.logoLightBase64;
  const logoUrl = rawLogo ? resolveImageUrl(rawLogo) : '/icon.png';
  const siteName = isAr
    ? (siteSettings?.siteNameAr || siteSettings?.siteName || 'PERPLEXTA')
    : (siteSettings?.siteName || 'PERPLEXTA');

  if (!isVisible && !showIosGuide) return null;

  return (
    <>
      {/* Floating Bottom PWA Install & Launch Banner */}
      <AnimatePresence>
        {isVisible && !showIosGuide && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[9990] pointer-events-auto"
          >
            <div
              className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all ${
                isDark
                  ? 'bg-[#121215]/95 border-emerald-500/30 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8)]'
                  : 'bg-white/95 border-emerald-500/30 text-gray-900 shadow-[0_10px_30px_rgba(16,185,129,0.15)]'
              }`}
            >
              {/* Subtle Emerald Glow Accent */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start gap-3.5 relative z-10">
                {/* App Logo */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center p-2 shadow-[0_0_12px_rgba(16,185,129,0.25)] overflow-hidden">
                    <img
                      src={logoUrl}
                      alt={siteName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <Smartphone size={22} className="text-emerald-500 absolute hidden only:block" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-black text-[9px] font-black">
                    {installState === 'installed' ? (
                      <Check size={10} className="stroke-[3]" />
                    ) : (
                      <Sparkles size={10} className="fill-current" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6 rtl:pr-0 rtl:pl-6">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm tracking-tight truncate">
                      {siteName}
                    </h4>
                    {installState === 'installed' ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        {isAr ? 'مثبّت الآن' : 'Installed'}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 uppercase tracking-wider">
                        {isAr ? 'التطبيق الأصلي' : 'Official PWA'}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {installState === 'installed'
                      ? isAr
                        ? 'تم تثبيت التطبيق بنجاح! يمكنك الآن فتحه واستخدامه بتجربة مستقلاًّ بالكامل.'
                        : 'App installed successfully! Launch it now for a full native experience.'
                      : isAr
                      ? 'ثبّت التطبيق على جهازك للحصول على أداء أسرع ووصول فوري دون الحاجة لفتح المتصفح.'
                      : 'Install on your home screen for instant access, ultra-fast response, and native performance.'}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-3">
                    {installState === 'installed' ? (
                      <button
                        type="button"
                        onClick={handleAction}
                        className="flex-1 py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.5)] cursor-pointer"
                      >
                        <ExternalLink size={14} className="stroke-[2.5]" />
                        <span>{isAr ? 'فتح التطبيق' : 'Open App'}</span>
                      </button>
                    ) : installState === 'installing' ? (
                      <button
                        type="button"
                        disabled
                        className="flex-1 py-2 px-3.5 rounded-xl bg-emerald-500/60 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-wait opacity-80"
                      >
                        <Loader2 size={14} className="animate-spin stroke-[2.5]" />
                        <span>{isAr ? 'جاري التثبيت...' : 'Installing...'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAction}
                        className="flex-1 py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
                      >
                        <Download size={14} className="stroke-[2.5]" />
                        <span>{isAr ? 'تثبيت الآن' : 'Install Now'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleClose}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                        isDark
                          ? 'bg-gray-800/80 border-gray-700/80 text-gray-300 hover:bg-gray-700'
                          : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isAr ? 'لاحقاً' : 'Later'}
                    </button>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={handleClose}
                  className={`absolute top-0 ltr:right-0 rtl:left-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer`}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Installation Instruction Modal */}
      <AnimatePresence>
        {showIosGuide && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl relative overflow-hidden ${
                isDark
                  ? 'bg-[#121215] border-emerald-500/30 text-white'
                  : 'bg-white border-emerald-500/30 text-gray-900'
              }`}
            >
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="absolute top-4 ltr:right-4 rtl:left-4 p-1 rounded-full bg-gray-500/10 text-gray-400 hover:text-gray-200 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 p-3 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  <Smartphone size={28} />
                </div>

                <h3 className="text-base font-extrabold">
                  {isAr ? `تثبيت ${siteName} على iPhone` : `Install ${siteName} on iPhone`}
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isAr
                    ? 'اتبع الخطوتين البسيطتين أدناه لإضافة التطبيق إلى الشاشة الرئيسية:'
                    : 'Follow these simple steps to add the app to your Home Screen:'}
                </p>

                <div className="w-full space-y-3 mt-2 text-right rtl:text-right ltr:text-left">
                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                    isDark ? 'bg-gray-800/50 border-gray-700/60' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </div>
                    <div className="text-xs">
                      <span className="font-bold">{isAr ? 'اضغط زر المشاركة' : 'Tap Share Icon'}</span>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <span>{isAr ? 'في أسفل المتصفح' : 'At the bottom of Safari'}</span>
                        <Share2 size={13} className="text-blue-400 inline" />
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                    isDark ? 'bg-gray-800/50 border-gray-700/60' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </div>
                    <div className="text-xs">
                      <span className="font-bold">{isAr ? 'اختر "الإضافة إلى الشاشة الرئيسية"' : 'Select "Add to Home Screen"'}</span>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <span>{isAr ? 'من قائمة الخيارات' : 'From the action menu'}</span>
                        <PlusSquare size={13} className="text-emerald-400 inline" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowIosGuide(false);
                    handleClose();
                  }}
                  className="w-full mt-4 py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  {isAr ? 'تم، فهمت ذلك' : 'Got it, thanks!'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

