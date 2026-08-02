import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share, Plus, ShieldCheck, Zap, Monitor, Smartphone, CheckCircle2, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DefaultLogo } from './DefaultLogo';

export const PWAInstallPromptModal: React.FC = () => {
  const {
    showInstallPromptModal,
    closeInstallPromptModal,
    dismissInstallPrompt,
    installApp,
    isInstallable,
    isStandalone,
    isIOS,
    isAndroid,
    language,
    theme,
    siteSettings
  } = useAppContext();

  if (isStandalone || !showInstallPromptModal) return null;

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const logoUrl = (theme === 'light' && siteSettings?.logoLightBase64) ? siteSettings.logoLightBase64 : siteSettings?.logoBase64;

  const handleInstallClick = async () => {
    await installApp();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissInstallPrompt}
          className="fixed inset-0 bg-black/75 backdrop-blur-md transition-all duration-300"
        />

        {/* Modal Card */}
        <motion.div
          dir={dir}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative max-w-lg w-full rounded-2xl border shadow-2xl overflow-hidden z-10 transition-theme ${
            theme === 'dark'
              ? 'bg-[#121214] border-gray-800/80 text-gray-100'
              : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          {/* Top Decorative Ambient Glow Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />

          {/* Close Button */}
          <button
            onClick={dismissInstallPrompt}
            className={`absolute top-4 ${dir === 'rtl' ? 'left-4' : 'right-4'} p-2 rounded-full text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all z-20`}
            title={language === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X size={18} />
          </button>

          <div className="p-6 sm:p-8">
            {/* Header / Brand & Icon Section */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-emerald-500/30 bg-[var(--bg-secondary)] flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.25)] relative z-10">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Perplexta App" className="w-full h-full object-cover" />
                  ) : (
                    <DefaultLogo className="w-12 h-12" iconClassName="w-7 h-7" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 z-20 bg-emerald-500 text-black p-1 rounded-full shadow-lg">
                  <Zap size={10} className="fill-black" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {language === 'ar' ? 'تطبيق مستقل PWA' : 'Sovereign App'}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                    {isIOS ? <Smartphone size={11} /> : <Monitor size={11} />}
                    {isIOS ? 'iOS / Safari' : isAndroid ? 'Android' : 'Desktop & Mobile'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight mt-1 font-sans text-start">
                  {language === 'ar' ? 'تثبيت تطبيق بيربليكستا' : 'Install Perplexta App'}
                </h3>
              </div>
            </div>

            {/* Compelling Value Statement */}
            <p className="text-xs sm:text-sm text-gray-400 font-sans leading-relaxed text-start mb-6">
              {language === 'ar'
                ? 'احصل على التطبيق الفاخر لسطح المكتب والجوّال للوصول السريع الفوري، والتخزين المؤقت الذكي دون اتصال، وبدون شريط المتصفح.'
                : 'Experience the full sovereign desktop & mobile application with instant 1-tap launch, offline intelligence caching, zero lag, and background synchronization.'}
            </p>

            {/* Platform Specific Action / Guide Card */}
            {isIOS ? (
              <div className={`p-4 rounded-xl border mb-6 text-start transition-theme ${
                theme === 'dark' ? 'bg-[#1a1a1d] border-gray-800' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2 mb-3 text-emerald-500 font-bold text-xs uppercase tracking-wider">
                  <Sparkles size={14} />
                  <span>{language === 'ar' ? 'خطوات التثبيت على جهاز iPhone' : 'Easy Installation Steps for iPhone'}</span>
                </div>
                <div className="space-y-2.5 text-xs text-gray-300">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {language === 'ar' ? 'اضغط على زر المشاركة' : 'Tap the Share icon'}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-emerald-400 font-semibold">
                        <Share size={12} />
                        {language === 'ar' ? 'مشاركة' : 'Share'}
                      </span>
                      {language === 'ar' ? 'في أسفل الشاشة.' : 'in your Safari toolbar.'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {language === 'ar' ? 'اختر' : 'Scroll down and select'}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                        <Plus size={12} />
                        {language === 'ar' ? 'إضافة إلى الشاشة الرئيسية' : 'Add to Home Screen'}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                    <span>
                      {language === 'ar' ? 'تاكّد من الضغط على "إضافة" في أعلى الزاوية ليظهر التطبيق فوراً.' : 'Tap "Add" in the top right corner to enjoy the standalone app.'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className={`p-3 rounded-xl border flex items-center gap-3 text-start transition-theme ${
                  theme === 'dark' ? 'bg-[#18181b] border-gray-800' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <Zap size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-500">
                      {language === 'ar' ? 'تشغيل فوري' : 'Instant 1-Click Launch'}
                    </h4>
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {language === 'ar' ? 'بدون انتظار فتح المتصفح' : 'Launches as a native app'}
                    </p>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex items-center gap-3 text-start transition-theme ${
                  theme === 'dark' ? 'bg-[#18181b] border-gray-800' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-teal-400">
                      {language === 'ar' ? 'تخزين دون اتصال' : 'Offline Engine'}
                    </h4>
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {language === 'ar' ? 'سرعة فائقة واستجابة فورية' : 'Zero lag background cache'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {!isIOS && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Download size={17} />
                  <span>{language === 'ar' ? 'تثبيت التطبيق الآن' : 'Install Application Now'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={dismissInstallPrompt}
                className={`w-full ${!isIOS ? 'sm:w-auto' : 'sm:flex-1'} py-3 px-5 rounded-xl font-bold text-xs sm:text-sm transition-all border ${
                  theme === 'dark'
                    ? 'border-gray-800 hover:bg-gray-800 text-gray-300'
                    : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                }`}
              >
                {isIOS
                  ? (language === 'ar' ? 'حسناً، فهمت' : 'Got It, Thanks')
                  : (language === 'ar' ? 'التذكير لاحقاً' : 'Remind Me Later')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
