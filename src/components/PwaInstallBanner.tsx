import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { usePwaContext } from '../context/PwaContext';
import { isMobilePwaBannerHidden } from '../utils/sectionVisibility';
import { resolveImageUrl } from '../utils/imageResolver';
import { safeStorageGet } from '../utils/safeStorage';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Download, X, Share2, PlusSquare, Sparkles, Check, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { NotificationIconRenderer } from '../utils/imageProcessor';

export const PwaInstallBanner: React.FC = () => {
  const { siteSettings, language, theme, dir } = useAppContext();

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
  if (installState === 'installed' || isStandaloneMode || isMobilePwaBannerHidden(siteSettings?.blocked_paths)) return null;

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
  const logoUrl = rawLogo ? resolveImageUrl(rawLogo) : null;
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
            id="pwa-install-banner"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
            className={`fixed top-3 ${dir === 'rtl' ? 'left-3 md:left-4' : 'right-3 md:right-4'} z-[10090] flex items-center gap-2.5 p-1 sm:p-1.5 pl-3 pr-1 sm:pl-3.5 sm:pr-1.5 rounded-full bg-[var(--surface-card)]/95 backdrop-blur-md border border-[var(--border-main)] shadow-md select-none pointer-events-auto transition-theme max-w-[95%] sm:max-w-md w-auto`}
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-extrabold text-[var(--text-primary)] whitespace-nowrap">
                {siteName}
              </span>
              <span className="text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent whitespace-nowrap">
                {isAr ? 'التطبيق الأصلي' : 'Native App'}
              </span>
            </div>

            <div className="w-px h-3 bg-[var(--border-main)] shrink-0" />

            <div className="flex items-center gap-1 shrink-0">
              <button
                id="pwa-banner-dismiss-btn"
                type="button"
                onClick={handleClose}
                className="px-2 py-0.5 text-[9.5px] sm:text-[10.5px] font-bold rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-all cursor-pointer"
              >
                {isAr ? 'لاحقاً' : 'Later'}
              </button>
              
              {(installState as string) === 'installed' ? (
                <button
                  id="pwa-banner-open-btn"
                  type="button"
                  onClick={handleAction}
                  className="px-2.5 py-1 text-[9.5px] sm:text-[10.5px] font-extrabold rounded-full bg-accent text-white hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>{isAr ? 'فتح' : 'Open'}</span>
                </button>
              ) : installState === 'installing' ? (
                <button
                  id="pwa-banner-installing-btn"
                  type="button"
                  disabled
                  className="px-2.5 py-1 text-[9.5px] sm:text-[10.5px] font-bold rounded-full bg-accent/40 text-black cursor-wait flex items-center gap-1 shadow-xs"
                >
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>...</span>
                </button>
              ) : (
                <button
                  id="pwa-banner-install-btn"
                  type="button"
                  onClick={handleAction}
                  className="px-2.5 py-1 text-[9.5px] sm:text-[10.5px] font-extrabold rounded-full bg-accent text-white hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-2.5 h-2.5 shrink-0" />
                  <span>{isAr ? 'تثبيت الآن' : 'Install'}</span>
                </button>
              )}
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
                    : mobilePlatform === 'desktop'
                    ? isAr
                      ? 'انقر على أيقونة التثبيت في شريط العنوان أعلى متصفح جوجل كروم، أو اتبع الخطوات التالية:'
                      : 'Click the install icon in your Chrome address bar, or follow these steps:'
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
                      ) : mobilePlatform === 'desktop' ? (
                        <>
                          <span className="font-bold">{isAr ? 'أيقونة التثبيت في شريط العنوان' : 'Click Install Icon in Address Bar'}</span>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <span>{isAr ? 'ابحث عن أيقونة الحاسوب أو (⊕) بجوار رابط الموقع' : 'Look for computer/install icon next to URL'}</span>
                            <Download size={11} className="text-accent inline" />
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
                      ) : mobilePlatform === 'desktop' ? (
                        <>
                          <span className="font-bold">{isAr ? 'أو افتح قائمة كروم (⋮) واختر "تثبيت بيربليكستا"' : 'Or open Chrome menu (⋮) & select "Install Perplexta"'}</span>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <span>{isAr ? 'لفتح التطبيق في نافذة مستقلة' : 'To run as a standalone desktop app'}</span>
                            <ExternalLink size={11} className="text-accent inline" />
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
