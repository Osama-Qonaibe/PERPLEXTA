import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Share, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const PWACinematicModal: React.FC = () => {
  const {
    language,
    isInstallationRunning,
    installProgress,
    installSuccess,
    closeInstallationModal,
    isStandalone
  } = useAppContext();

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const isIOS = typeof window !== 'undefined' && 
                (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const handleBackdropClick = () => {
    if (installSuccess) {
      closeInstallationModal();
    }
  };

  return (
    <AnimatePresence>
      {isInstallationRunning && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
            className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={`relative w-full max-w-md bg-[#0b0c0e] border border-gray-800/80 rounded-sm shadow-2xl p-6 md:p-8 overflow-hidden z-10 box-border text-center`}
            dir={dir}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

            {isIOS && !isStandalone ? (
              <div className="py-4">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-16 h-16 mx-auto bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mb-6 relative shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                >
                  <Share size={24} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                </motion.div>

                <h2 className="text-lg md:text-xl font-bold text-white mb-3">
                  {language === 'ar' ? 'تثبيت بيربليكستا السيادية' : 'Install Sovereign Perplexta'}
                </h2>

                <p className="text-xs text-gray-400 mb-6 leading-relaxed max-w-sm mx-auto">
                  {language === 'ar'
                    ? 'لتجربة تصفح مستقلة وسريعة بالكامل، يرجى تفعيل واجهة التطبيق عبر الخطوات التالية:'
                    : 'For a completely independent, fast, and native browsing experience, add the app to your home screen:'}
                </p>

                <div className={`p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-[4px] text-right mb-6`} dir="rtl">
                  <div className="text-xs text-gray-300 leading-relaxed space-y-2.5">
                    <p className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px] shrink-0 font-bold">١</span>
                      <span>اضغط على زر <strong className="text-emerald-400">مشاركة (Share)</strong> في شريط متصفح Safari.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px] shrink-0 font-bold">٢</span>
                      <span>اختر من القائمة المنسدلة <strong className="text-emerald-400">إضافة للشاشة الرئيسية (Add to Home Screen)</strong>.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px] shrink-0 font-bold">٣</span>
                      <span>قم بتأكيد الاسم ثم اضغط <strong className="text-emerald-400">إضافة (Add)</strong> لبدء تشغيله فوراً.</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeInstallationModal}
                  className="w-full py-2.5 px-4 rounded-sm bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition-all duration-300 active:scale-95 cursor-pointer"
                >
                  {language === 'ar' ? 'إغلاق الإرشادات' : 'Close Instructions'}
                </button>
              </div>
            ) : installSuccess ? (
              <div className="py-4">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-16 h-16 mx-auto bg-emerald-500/10 border border-emerald-500/40 rounded-full flex items-center justify-center mb-6 relative shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                >
                  <ShieldCheck size={32} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping opacity-60 pointer-events-none" />
                </motion.div>

                <h2 className="text-lg md:text-xl font-black text-white tracking-wide mb-3">
                  {language === 'ar' ? 'تم تثبيت التطبيق بنجاح!' : 'PERPLEXTA INSTALLED SUCCESSFULLY!'}
                </h2>

                <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto mb-6">
                  {language === 'ar'
                    ? 'تم بناء مصفوفة التشغيل المحلي لبيئة التطبيق بنجاح. سيتم الآن إغلاق صفحة الويب لفتح التطبيق المثبت على جهازك مباشرة.'
                    : 'The localized independent app instance is fully compiled. The web context will close shortly to launch Perplexta.'}
                </p>

                <button
                  onClick={closeInstallationModal}
                  className="w-full py-2.5 px-5 rounded-sm bg-gradient-to-r from-emerald-600 to-emerald-400 text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.01] transition-all duration-300 active:scale-95 cursor-pointer"
                >
                  {language === 'ar' ? 'ابدأ الاستخدام الآن' : 'START USING NOW'}
                </button>
              </div>
            ) : (
              <div className="py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] mb-5 mx-auto">
                  <Sparkles size={24} className="animate-pulse" />
                </div>

                <h2 className="text-base sm:text-lg font-black text-white font-sans mb-1.5">
                  {language === 'ar' ? 'جاري تثبيت بيربليكستا السيادية' : 'INSTALLING SOVEREIGN PERPLEXTA'}
                </h2>
                <p className="text-[11px] text-gray-500 mb-6 font-sans">
                  {language === 'ar'
                    ? 'يتم الآن تهيئة الملفات وتأمين بيئة التشغيل المستقلة على جهازك...'
                    : 'Configuring files and safeguarding the native offline runtime execution on your device...'}
                </p>

                <div className="text-center my-4 relative">
                  <span className="text-4xl font-extrabold text-white tracking-tighter drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    {installProgress}%
                  </span>
                </div>

                <div className="relative h-2 w-full bg-[#12141a] rounded-full overflow-hidden border border-gray-800/40 mb-2">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full relative"
                    style={{ width: `${installProgress}%` }}
                    layoutId="install-pwa-bar"
                    transition={{ ease: "easeInOut" }}
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white animate-pulse" />
                  </motion.div>
                </div>

                <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">
                  {language === 'ar' ? 'يرجى عدم غلق أو مغادرة هذه الصفحة' : 'DO NOT CLOSE OR EXIT THIS SCREEN'}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
