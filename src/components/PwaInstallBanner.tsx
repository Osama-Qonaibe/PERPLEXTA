import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { usePwaContext } from '../context/PwaContext';
import { resolveImageUrl } from '../utils/imageResolver';
import { safeStorageGet } from '../utils/safeStorage';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Download, X, Share2, PlusSquare, Sparkles, Check, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { NotificationIconRenderer } from '../utils/imageProcessor';

export const PwaInstallBanner: React.FC = () => {
  const { siteSettings, language, theme } = useAppContext();

  const {
    installState,
    canInstall,
    isStandalone,
    mobilePlatform,
    hasPrompt,
    promptInstall,
    openApp,
    dismissBanner
  } = usePwaContext();

  const isStandaloneMode = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
  if (installState === 'installed' || isStandaloneMode) return null;

  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const [isVisible, setIsVisible] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const lastDismissedTime = safeStorageGet('perplexta_pwa_dismissed');
    const savedCount = parseInt(safeStorageGet('perplexta_pwa_dismiss_count') || '0', 10);
    
    let cooldownMs = 24 * 60 * 60 * 1000;
    if (savedCount === 2) cooldownMs = 3 * 24 * 60 * 60 * 1000;
    else if (savedCount >= 3) cooldownMs = 7 * 24 * 60 * 60 * 1000;

    const isCooldownActive = lastDismissedTime && (Date.now() - Number(lastDismissedTime) < cooldownMs);

    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isStandaloneMode || (installState as string) === 'installed' || installState === 'dismissed' || isCooldownActive) {
      setIsVisible(false);
      return;
    }

    if (canInstall) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [canInstall, installState, isStandalone]);

  const handleAction = async () => {
    if ((installState as string) === 'installed') {
      openApp();
      return;
    }

    if (canInstall && hasPrompt) {
      await promptInstall();
      return;
    }

    if (canInstall && !hasPrompt) {
      setShowGuideModal(true);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    dismissBanner();
  };

  const rawLogo = siteSettings?.logoBase64 || siteSettings?.logoLightBase64;
  const logoUrl = rawLogo ? resolveImageUrl(rawLogo) : '/app-assets/icon.png';
  const siteName = isAr
    ? (siteSettings?.siteNameAr || siteSettings?.siteName || 'PERPLEXTA')
    : (siteSettings?.siteName || 'PERPLEXTA');

  if (!isVisible && !showGuideModal) return null;

  return (
    <>
      {/* Floating Bottom PWA Install & Launch Banner */}
      <AnimatePresence>
        {isVisible && !showGuideModal && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-[340px] z-[9990] pointer-events-auto ltr:sm:right-5 rtl:sm:left-5 rtl:sm:right-auto"
          >
            <div
              className={`p-2.5 sm:p-3 rounded-2xl border shadow-xl backdrop-blur-xl relative overflow-hidden transition-all ${
                isDark
                  ? 'bg-[#121215]/95 border-accent/30 text-white shadow-[0_10px_25px_rgba(0,0,0,0.7)]'
                  : 'bg-white/95 border-accent/30 text-gray-900 shadow-[0_10px_25px_rgba(156,163,175,0.18)]'
              }`}
            >
              <div className="flex items-start gap-2.5 relative z-10">
                {/* App Logo */}
                <div className="relative shrink-0 mt-0.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-accent/35 bg-accent/10 flex items-center justify-center p-1 shadow-sm overflow-hidden">
                    <NotificationIconRenderer
                      src={logoUrl}
                      alt={siteName}
                      size={32}
                      className="w-full h-full"
                      fallbackIcon={<Smartphone size={18} className="text-accent" />}
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent flex items-center justify-center text-black text-[8px] font-black">
                    {(installState as string) === 'installed' ? (
                      <Check size={8} className="stroke-[3]" />
                    ) : (
                      <Sparkles size={8} className="fill-current" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-5 rtl:pr-0 rtl:pl-5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-extrabold text-xs tracking-tight truncate max-w-[150px] sm:max-w-[170px] leading-tight">
                      {siteName}
                    </h4>
                    {(installState as string) === 'installed' ? (
                      <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-md bg-accent/20 border border-accent/40 text-accent uppercase tracking-wider flex items-center gap-0.5">
                        <CheckCircle2 size={8} />
                        {isAr ? 'مثبّت' : 'Installed'}
                      </span>
                    ) : (
                      <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-md bg-accent/15 border border-accent/30 text-accent uppercase tracking-wider">
                        {isAr ? 'التطبيق الأصلي' : 'Official PWA'}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-0.5 line-clamp-1 leading-normal">
                    {(installState as string) === 'installed'
                      ? isAr
                        ? 'تم تثبيت التطبيق بنجاح! جاهز للاستخدام.'
                        : 'App installed! Ready for native use.'
                      : isAr
                      ? 'ثبّت التطبيق للوصول السريع بدون متصفح.'
                      : 'Install for instant browser-free access.'}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {(installState as string) === 'installed' ? (
                      <button
                        type="button"
                        onClick={handleAction}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-accent hover:opacity-90 active:scale-95 text-black font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all shadow-sm cursor-pointer"
                      >
                        <ExternalLink size={12} className="stroke-[2.5]" />
                        <span>{isAr ? 'فتح التطبيق' : 'Open App'}</span>
                      </button>
                    ) : installState === 'installing' ? (
                      <button
                        type="button"
                        disabled
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-accent/60 text-black font-extrabold text-[11px] flex items-center justify-center gap-1 cursor-wait opacity-80"
                      >
                        <Loader2 size={12} className="animate-spin stroke-[2.5]" />
                        <span>{isAr ? 'جاري التثبيت...' : 'Installing...'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAction}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-accent hover:opacity-90 active:scale-95 text-black font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all shadow-sm cursor-pointer"
                      >
                        <Download size={12} className="stroke-[2.5]" />
                        <span>{isAr ? 'تثبيت الآن' : 'Install'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleClose}
                      className={`px-2 py-1.5 rounded-lg border text-[10.5px] font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                        isDark
                          ? 'bg-gray-800/80 border-gray-700/80 text-gray-300 hover:bg-gray-700 hover:text-white'
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
                  className="absolute top-0 ltr:right-0 rtl:left-0 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-500/10 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tailored Step-by-Step Platform Installation Modal */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`w-full max-w-xs sm:max-w-sm rounded-2xl p-4 sm:p-5 border shadow-2xl relative overflow-hidden ${
                isDark
                  ? 'bg-[#121215] border-accent/30 text-white'
                  : 'bg-white border-accent/30 text-gray-900'
              }`}
            >
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="absolute top-3 ltr:right-3 rtl:left-3 p-1 rounded-lg bg-gray-500/10 text-gray-400 hover:text-gray-200 cursor-pointer"
              >
                <X size={15} />
              </button>

              <div className="flex flex-col items-center text-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent p-2">
                  <Smartphone size={20} />
                </div>

                <h3 className="text-sm font-extrabold">
                  {isAr ? `تثبيت ${siteName} على جهازك` : `Install ${siteName} on Your Device`}
                </h3>

                <p className="text-[11px] text-gray-400 leading-snug">
                  {mobilePlatform === 'ios-safari'
                    ? isAr
                      ? 'اتبع الخطوات التالية في متصفح Safari لإنشاء اختصار على الشاشة الرئيسية:'
                      : 'Follow these steps in Safari to add the app to your Home Screen:'
                    : mobilePlatform === 'ios-other'
                    ? isAr
                      ? 'افتح الصفحة في متصفح Safari للتمكن من التثبيت المباشر:'
                      : 'For best results on iOS, open this page in Safari or use the Share menu:'
                    : mobilePlatform === 'android-other'
                    ? isAr
                      ? 'استخدم قائمة المتصفح لإضافة التطبيق إلى الشاشة الرئيسية:'
                      : 'Use your browser options menu to install the application:'
                    : isAr
                    ? 'افتح قائمة المتصفح ثم اختر إضافة إلى الشاشة الرئيسية لتثبيت التطبيق:'
                    : 'Open your browser menu and choose Add to Home Screen to install the app:'}
                </p>

                <div className="w-full space-y-2 mt-1 text-right rtl:text-right ltr:text-left">
                  {/* Step 1 */}
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                    isDark ? 'bg-gray-800/50 border-gray-700/60' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="w-6 h-6 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </div>
                    <div className="text-[11px] flex-1">
                      {mobilePlatform === 'ios-safari' ? (
                        <>
                          <span className="font-bold">{isAr ? 'اضغط زر المشاركة' : 'Tap Share Icon'}</span>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <span>{isAr ? 'في شريط Safari الأسفل' : 'At bottom of Safari'}</span>
                            <Share2 size={11} className="text-blue-400 inline" />
                          </div>
                        </>
                      ) : mobilePlatform === 'ios-other' ? (
                        <>
                          <span className="font-bold">{isAr ? 'افتح في Safari أو اضغط مشاركة' : 'Open in Safari or Tap Share'}</span>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <span>{isAr ? 'يدعم Safari التثبيت الكامل' : 'Safari provides native iOS PWA support'}</span>
                            <Share2 size={11} className="text-blue-400 inline" />
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-bold">{isAr ? 'افتح قائمة المتصفح (⋮ أو ≡)' : 'Open Browser Menu (⋮ or ≡)'}</span>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <span>{isAr ? 'في أعلى أو أسفل الشاشة' : 'In navigation bar'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                    isDark ? 'bg-gray-800/50 border-gray-700/60' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="w-6 h-6 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </div>
                    <div className="text-[11px] flex-1">
                      {mobilePlatform === 'ios-safari' || mobilePlatform === 'ios-other' ? (
                        <>
                          <span className="font-bold">{isAr ? 'اختر "الإضافة إلى الشاشة الرئيسية"' : 'Select "Add to Home Screen"'}</span>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <span>{isAr ? 'من قائمة الخيارات المتاحة' : 'From the actions list'}</span>
                            <PlusSquare size={11} className="text-accent inline" />
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-bold">{isAr ? 'اختر "تثبيت التطبيق" أو "إضافة للشاشة"' : 'Select "Install App" or "Add to Home Screen"'}</span>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <PlusSquare size={11} className="text-accent inline" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowGuideModal(false);
                    handleClose();
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-accent hover:opacity-90 text-black font-extrabold text-xs cursor-pointer transition-opacity"
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
