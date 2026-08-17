import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { usePwaContext } from '../context/PwaContext';
import { resolveImageUrl } from '../utils/imageResolver';
import { safeStorageGet } from '../utils/safeStorage';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Download, X, Share2, PlusSquare, Sparkles, Check, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';

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

  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const [isVisible, setIsVisible] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check dismissal cooldown from storage
    const lastDismissedTime = safeStorageGet('perplexta_pwa_dismissed');
    const savedCount = parseInt(safeStorageGet('perplexta_pwa_dismiss_count') || '0', 10);
    
    let cooldownMs = 24 * 60 * 60 * 1000;
    if (savedCount === 2) cooldownMs = 3 * 24 * 60 * 60 * 1000;
    else if (savedCount >= 3) cooldownMs = 7 * 24 * 60 * 60 * 1000;

    const isCooldownActive = lastDismissedTime && (Date.now() - Number(lastDismissedTime) < cooldownMs);

    // Check if already running in standalone mode (already installed and opened)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    
    // Hide if installed OR already running standalone OR dismissed
    if (isStandaloneMode || installState === 'installed' || installState === 'dismissed' || isCooldownActive) {
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
    // 1. If installed, just open the app
    if (installState === 'installed') {
      openApp();
      return;
    }

    // 2. If browser supports PWA and has a captured prompt, trigger it.
    if (canInstall && hasPrompt) {
      await promptInstall();
      return;
    }

    // 3. Fallback: If no prompt captured (e.g. iOS/unsupported), show guide.
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
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[9990] pointer-events-auto"
          >
            <div
              className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all ${
                isDark
                  ? 'bg-[#121215]/95 border-accent/30 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8)]'
                  : 'bg-white/95 border-accent/30 text-gray-900 shadow-[0_10px_30px_rgba(156,163,175,0.15)]'
              }`}
            >
              {/* Subtle Emerald Glow Accent */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-accent/15 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start gap-3.5 relative z-10">
                {/* App Logo */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-xl border border-accent/40 bg-accent/10 flex items-center justify-center p-2 shadow-[0_0_12px_rgba(156,163,175,0.25)] overflow-hidden">
                    <img
                      src={logoUrl}
                      alt={siteName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <Smartphone size={22} className="text-accent absolute hidden only:block" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center text-black text-[9px] font-black">
                    {installState === 'installed' ? (
                      <Check size={10} className="stroke-[3]" />
                    ) : (
                      <Sparkles size={10} className="fill-current" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6 rtl:pr-0 rtl:pl-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-sm tracking-tight truncate">
                      {siteName}
                    </h4>
                    {installState === 'installed' ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-accent/20 border border-accent/40 text-accent uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        {isAr ? 'مثبّت الآن' : 'Installed'}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-accent/15 border border-accent/30 text-accent uppercase tracking-wider">
                        {isAr ? 'التطبيق الأصلي' : 'Official PWA'}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {installState === 'installed'
                      ? isAr
                        ? 'تم تثبيت التطبيق بنجاح! يمكنك الآن فتحه واستخدامه بتجربة مستقلة بالكامل.'
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
                        className="flex-1 py-2 px-3.5 rounded-xl bg-accent hover:bg-accent text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-[0_0_20px_rgba(156,163,175,0.5)] cursor-pointer"
                      >
                        <ExternalLink size={14} className="stroke-[2.5]" />
                        <span>{isAr ? 'فتح التطبيق' : 'Open App'}</span>
                      </button>
                    ) : installState === 'installing' ? (
                      <button
                        type="button"
                        disabled
                        className="flex-1 py-2 px-3.5 rounded-xl bg-accent/60 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-wait opacity-80"
                      >
                        <Loader2 size={14} className="animate-spin stroke-[2.5]" />
                        <span>{isAr ? 'جاري التثبيت...' : 'Installing...'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAction}
                        className="flex-1 py-2 px-3.5 rounded-xl bg-accent hover:bg-accent text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-[0_0_15px_rgba(156,163,175,0.4)] cursor-pointer"
                      >
                        <Download size={14} className="stroke-[2.5]" />
                        <span>{isAr ? 'تثبيت الآن' : 'Install Now'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleClose}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                        isDark
                          ? 'bg-gray-800/80 border-gray-700/80 text-gray-300 hover:bg-gray-700'
                          : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isAr ? 'ذكرني لاحقاً' : 'Remind me later'}
                    </button>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="absolute top-0 ltr:right-0 rtl:left-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tailored Step-by-Step Platform Installation Modal */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl relative overflow-hidden ${
                isDark
                  ? 'bg-[#121215] border-accent/30 text-white'
                  : 'bg-white border-accent/30 text-gray-900'
              }`}
            >
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="absolute top-4 ltr:right-4 rtl:left-4 p-1 rounded-full bg-gray-500/10 text-gray-400 hover:text-gray-200 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent p-3">
                  <Smartphone size={28} />
                </div>

                <h3 className="text-base font-extrabold">
                  {isAr ? `تثبيت ${siteName} على جهازك` : `Install ${siteName} on Your Device`}
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400">
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

                <div className="w-full space-y-3 mt-2 text-right rtl:text-right ltr:text-left">
                  {/* Step 1 */}
                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                    isDark ? 'bg-gray-800/50 border-gray-700/60' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </div>
                    <div className="text-xs flex-1">
                      {mobilePlatform === 'ios-safari' ? (
                        <>
                          <span className="font-bold">{isAr ? 'اضغط زر المشاركة' : 'Tap Share Icon'}</span>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <span>{isAr ? 'في شريط Safari الأسفل' : 'At bottom of Safari'}</span>
                            <Share2 size={13} className="text-blue-400 inline" />
                          </div>
                        </>
                      ) : mobilePlatform === 'ios-other' ? (
                        <>
                          <span className="font-bold">{isAr ? 'افتح في Safari أو اضغط مشاركة' : 'Open in Safari or Tap Share'}</span>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <span>{isAr ? 'يدعم Safari التثبيت الكامل' : 'Safari provides native iOS PWA support'}</span>
                            <Share2 size={13} className="text-blue-400 inline" />
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-bold">{isAr ? 'افتح قائمة المتصفح (⋮ أو ≡)' : 'Open Browser Menu (⋮ or ≡)'}</span>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <span>{isAr ? 'في أعلى أو أسفل الشاشة' : 'In top or bottom navigation bar'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                    isDark ? 'bg-gray-800/50 border-gray-700/60' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </div>
                    <div className="text-xs flex-1">
                      {mobilePlatform === 'ios-safari' || mobilePlatform === 'ios-other' ? (
                        <>
                          <span className="font-bold">{isAr ? 'اختر "الإضافة إلى الشاشة الرئيسية"' : 'Select "Add to Home Screen"'}</span>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <span>{isAr ? 'من قائمة الخيارات المتاحة' : 'From the actions list'}</span>
                            <PlusSquare size={13} className="text-accent inline" />
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-bold">{isAr ? 'اختر "تثبيت التطبيق" أو "إضافة للشاشة"' : 'Select "Install App" or "Add to Home Screen"'}</span>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <PlusSquare size={13} className="text-accent inline" />
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
                  className="w-full mt-4 py-2.5 rounded-xl bg-accent text-black font-extrabold text-xs cursor-pointer shadow-[0_0_15px_rgba(156,163,175,0.3)]"
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
