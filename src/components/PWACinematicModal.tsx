import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, X, Share } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useSwipeToClose } from '../utils/swipe';

export const PWACinematicModal: React.FC = () => {
  const {
    language,
    isInstallationRunning,
    installProgress,
    installLogs,
    installSuccess,
    closeInstallationModal,
    isStandalone
  } = useAppContext();

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const swipeHandlers = useSwipeToClose({
    onSwipeClose: closeInstallationModal,
    direction: 'both',
    dir: dir as 'rtl' | 'ltr',
    isMobile: true
  });

  const isIOS = typeof window !== 'undefined' && 
                (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  return (
    <AnimatePresence>
      {isInstallationRunning && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeInstallationModal}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", duration: 0.5 }}
            onTouchStart={swipeHandlers.onTouchStart}
            onTouchMove={swipeHandlers.onTouchMove}
            onTouchEnd={swipeHandlers.onTouchEnd}
            className={`relative w-full max-w-lg bg-[#0e1014] border border-gray-800/80 rounded-sm shadow-2xl p-6 md:p-8 overflow-hidden z-10 box-border ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
            dir={dir}
          >
            {/* Close button */}
            <button
              onClick={closeInstallationModal}
              className={`absolute top-4 ${dir === 'rtl' ? 'left-4' : 'right-4'} text-gray-500 hover:text-white hover:bg-white/5 p-1 rounded-sm transition-all cursor-pointer`}
            >
              <X size={18} />
            </button>

            {/* Glowing top line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse" />

            {installSuccess ? (
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 mx-auto bg-emerald-500/10 border border-emerald-500/40 rounded-full flex items-center justify-center mb-6 relative shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                >
                  <ShieldCheck size={42} className="text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                  <span className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping opacity-60 pointer-events-none" />
                </motion.div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-widest uppercase mb-4 animate-pulse">
                  SOVEREIGN DEPLOYMENT APPLIED // تم التثبيت السيادي
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white font-sans tracking-wide">
                  {language === 'ar' ? 'اكتمل تأمين وتثبيت التطبيق بنجاح' : 'PERPLEXTA SECURED SUCCESSFULLY'}
                </h2>

                <p className="text-xs text-gray-400 mt-3 leading-relaxed font-sans max-w-sm mx-auto">
                  {language === 'ar'
                    ? 'تم بناء مصفوفة التشغيل المحلي ودمج بروتوكولات الأمان السيادي لبيربليكستا بنجاح. التطبيق الآن جاهز للاستدعاء الفوري ومثبّت بالكامل على جهازك.'
                    : 'The sovereign local volume and offline runtime of Perplexta are successfully operational. Secure application launcher is now fully loaded.'}
                </p>

                {isIOS && !isStandalone && (
                  <div className={`mt-4 p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-[4px] ${dir === 'rtl' ? 'text-right' : 'text-left'} flex items-start gap-3.5 max-w-sm mx-auto shadow-sm`} dir={dir}>
                    <div className="text-emerald-500 w-5 h-5 flex items-center justify-center shrink-0">
                      <Share size={16} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    </div>
                    <div className="text-[11px] text-gray-400 font-sans leading-relaxed">
                      {language === 'ar' ? (
                        <span>
                          أبل آيفون / آيباد: اضغط على زر <strong className="text-emerald-500">مشاركة</strong> في Safari ثم حدد <strong className="text-emerald-500">إضافة للشاشة الرئيسية</strong> لتفعيل أيقونة التشغيل المثبتة.
                        </span>
                      ) : (
                        <span>
                          Apple iOS device: Tap the <strong className="text-emerald-500">Share</strong> button in Safari and select <strong className="text-emerald-500">Add to Home Screen</strong> to activate your secure launcher icon.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Start Line and End Line Verification Box */}
                <div className={`my-6 p-4 rounded-sm bg-[#111317]/80 border border-emerald-500/20 ${dir === 'rtl' ? 'text-right' : 'text-left'} text-[10px] font-mono text-gray-500 space-y-2 relative overflow-hidden`} dir={dir}>
                  {/* Glowing laser track */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                  
                  <div className="flex justify-between border-b border-gray-800/40 pb-1.5">
                    <span className="text-gray-400">{language === 'ar' ? '[خط البدء: التهيئة]' : '[START_LINE: INITIALIZED]'}</span>
                    <span className="text-emerald-500 font-bold font-mono">00:00:01 // SUCCESS</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-800/40 pb-1.5">
                    <span className="text-gray-400">{language === 'ar' ? '[مسار النقل المؤمّن]' : '[TELEMETRY STATE]'}</span>
                    <span className="text-gray-300">CORE_PROTOCOL SECURED_SERVICE_WORKER</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{language === 'ar' ? '[خط النهاية: جاهز]' : '[END_LINE: FINALIZED]'}</span>
                    <span className="text-emerald-400 font-bold font-mono">00:00:04 // SECURED_SHELL_OK</span>
                  </div>
                </div>

                <button
                  onClick={closeInstallationModal}
                  className="w-full py-3 px-6 rounded-sm bg-gradient-to-r from-emerald-600 to-emerald-400 text-white font-black text-xs sm:text-sm font-sans uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all duration-300 active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-emerald-400/30"
                >
                  <ShieldCheck size={16} className="text-white animate-pulse" />
                  <span>{language === 'ar' ? 'ولوج للواجهة الرئاسية (تفعيل)' : 'ACTIVATE SECURE PLATFORM'}</span>
                </button>
              </div>
            ) : (
              <>
                {/* Header Telemetry Branding */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-widest uppercase mb-3 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    SECURE PLATFORM SYNCING // مزامنة آمنة
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white font-sans tracking-wide">
                    {language === 'ar' ? 'جاري تثبيت بيربليكستا السيادية' : 'INSTALLING SOVEREIGN PERPLEXTA'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed font-sans max-w-sm mx-auto">
                    {language === 'ar'
                      ? 'بروتوكول حقن فوري وتثبيت محمي بنسبة 100% لتجاوز قيود النوافذ الخارجية'
                      : 'Sovereign 100% encrypted volume injection. Finalizing fast application handshake...'}
                  </p>
                </div>

                {/* Big Countdown Metric HUD */}
                <div className="text-center my-6 relative py-4">
                  <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
                  <div className="text-5xl sm:text-6xl font-sans font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                    {installProgress}<span className="text-emerald-500 text-3xl font-normal">%</span>
                  </div>
                  <div className="text-[10px] text-emerald-500/70 font-mono tracking-widest mt-2 uppercase">
                    {language === 'ar' ? 'سريان الحزم النشطة' : 'ACTIVE PACKETS SYNCHRONIZATION'}
                  </div>
                </div>

                {/* Start Line and End Line Visual Matrix */}
                <div className="my-8 relative px-4 text-left" dir="ltr">
                  {/* Labels & Vertical Lines of Start and End */}
                  <div className="flex justify-between items-end mb-2.5 text-[9px] font-mono text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-3 bg-emerald-500 inline-block drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
                      <span>{language === 'ar' ? '[خط البدء: التهيئة]' : '[START_LINE: INIT_BOOT]'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>{language === 'ar' ? '[خط النهاية: جاهز]' : '[END_LINE: CLIENT_SECURED]'}</span>
                      <span className="w-1.5 h-3 bg-emerald-500 inline-block drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
                    </div>
                  </div>

                  {/* Bounded physical horizontal track with boundary neon ticks */}
                  <div className="relative h-7 w-full border-x border-emerald-500/30 bg-[#12141a]/60 rounded-sm overflow-hidden flex items-center px-0.5" dir="ltr">
                    {/* Visual grid ticks inside the bar */}
                    <div className="absolute inset-y-0 left-0 right-0 flex justify-between px-4 pointer-events-none opacity-10">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="w-px h-full bg-emerald-500" />
                      ))}
                    </div>

                    {/* Left Absolute boundary line */}
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]" />

                    {/* Progress fill bar */}
                    <motion.div
                      className="h-4 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-sm relative shadow-[0_0_15px_rgba(16,185,129,0.6)]"
                      style={{ width: `${installProgress}%` }}
                      layoutId="install-pwa-bar"
                      transition={{ ease: "easeInOut" }}
                    >
                      {/* Laser leading head */}
                      <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-full shadow-[0_0_12px_#fff,0_0_24px_rgba(16,185,129,1)] animate-pulse right-0" />
                    </motion.div>

                    {/* Right Absolute boundary line */}
                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                  </div>

                  {/* Progress meta tags */}
                  <div className="flex justify-between items-center mt-2 text-[8px] font-mono text-gray-500">
                    <span>00:00:01</span>
                    <span>
                      STATUS:{' '}
                      {installSuccess
                        ? 'SUCCESS'
                        : installProgress === 100
                        ? (language === 'ar' ? 'جاري التحقق النهائي...' : 'FINALIZING...')
                        : (language === 'ar' ? 'جاري تجميع الأصول...' : 'COMPILING_ASSETS')}
                    </span>
                    <span>00:00:04</span>
                  </div>
                </div>

                {/* Telemetry scrolling console box */}
                <div className="bg-[#0b0c0f] border border-gray-800/80 rounded-sm p-4 h-32 overflow-hidden flex flex-col justify-end">
                  <div className={`overflow-y-auto custom-scrollbar flex flex-col gap-1.5 text-[9px] font-mono select-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    {installLogs.map((log, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-start gap-1.5 leading-relaxed ${index === installLogs.length - 1 ? 'text-emerald-400 drop-shadow-[0_0_3px_rgba(16,185,129,0.4)]' : 'text-gray-500'}`}
                      >
                        <span className="text-emerald-500 shrink-0">&gt;</span>
                        <span className={`flex-1 ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>{log}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Secure certification seal tagline */}
                <div className="mt-6 flex items-center justify-between text-[10px] font-mono text-gray-500 border-t border-gray-800/60 pt-4">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.6)] animate-pulse" />
                    <span>CIPHER AES-256 ACTIVE</span>
                  </span>
                  <span>VERIFICATION NODE: #99A8F</span>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
