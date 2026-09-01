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
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="w-full pointer-events-auto p-2.5 sm:p-3 rounded-[var(--radius)] bg-[var(--surface-card)] border border-[var(--border-main)] shadow-xl transition-all relative overflow-hidden"
          >
            <div className="flex items-start gap-2 relative z-10">
              <div className="p-1 rounded-md bg-accent/10 text-accent shrink-0 flex items-center justify-center mt-0.5">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <h4 className="text-[11px] sm:text-xs font-bold text-[var(--text-primary)] leading-tight">
                      {siteName}
                    </h4>
                    {(installState as string) === 'installed' ? (
                      <span className="text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                        {isAr ? 'مثبّت' : 'Installed'}
                      </span>
                    ) : (
                      <span className="text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                        {isAr ? 'التطبيق الأصلي' : 'Native App'}
                      </span>
                    )}
                  </div>

                  <button
                    id="pwa-banner-close-btn"
                    type="button"
                    onClick={handleClose}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-0.5 rounded shrink-0"
                    aria-label={isAr ? 'إغلاق' : 'Close'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="mt-1 text-[10px] sm:text-[10.5px] text-[var(--text-secondary)] leading-relaxed">
                  {(installState as string) === 'installed'
                    ? (isAr ? 'تم التثبيت بنجاح! جاهز للاستخدام الفوري.' : 'Successfully installed! Ready to launch.')
                    : (isAr ? 'تثبيت التطبيق لتجربة أسرع وأسهل بدون متصفح' : 'Install the app for a faster and easier experience without a browser.')}
                </p>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-[var(--border-main)] flex items-center justify-end gap-1.5 relative z-10">
              <button
                id="pwa-banner-dismiss-btn"
                type="button"
                onClick={handleClose}
                className="px-2.5 py-1 text-[10px] sm:text-[11px] font-medium rounded-[var(--radius)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-[var(--border-main)] transition-all"
              >
                {isAr ? 'لاحقاً' : 'Later'}
              </button>
              
              {(installState as string) === 'installed' ? (
                <button
                  id="pwa-banner-open-btn"
                  type="button"
                  onClick={handleAction}
                  className="px-3 py-1 text-[10px] sm:text-[11px] font-bold rounded-[var(--radius)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90 transition-all shadow-xs"
                >
                  {isAr ? 'فتح التطبيق' : 'Open'}
                </button>
              ) : installState === 'installing' ? (
                <button
                  id="pwa-banner-installing-btn"
                  type="button"
                  disabled
                  className="px-3 py-1 text-[10px] sm:text-[11px] font-bold rounded-[var(--radius)] bg-accent/40 text-black cursor-wait flex items-center gap-1 shadow-xs"
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{isAr ? 'تثبيت...' : 'Installing...'}</span>
                </button>
              ) : (
                <button
                  id="pwa-banner-install-btn"
                  type="button"
                  onClick={handleAction}
                  className="px-3 py-1 text-[10px] sm:text-[11px] font-bold rounded-[var(--radius)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90 transition-all shadow-xs"
                >
                  {isAr ? 'تثبيت الآن' : 'Install Now'}
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
