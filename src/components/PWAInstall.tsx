import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Download, CheckCircle2, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const PWAInstall: React.FC<{ isSidebarOpen: boolean }> = ({ isSidebarOpen }) => {
  const { language, isInstallable, installApp, isInstalling } = useAppContext();
  const [showBanner, setShowBanner] = React.useState(true);
  const [isInstalled, setIsInstalled] = React.useState(false);

  if (!isInstallable || !showBanner) return null;

  const handleInstall = async () => {
    try {
      await installApp();
      // Logic for after success can be added here if needed
    } catch (err) {
      console.error('PWA Install failed', err);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="px-4 pb-4 mt-4"
      >
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 group transition-all duration-500 hover:border-emerald-500/40">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-500">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <Smartphone size={16} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {language === 'ar' ? 'بيربليكستا موبايل' : 'PERPLEXTA MOBILE'}
                </span>
              </div>
              <button 
                onClick={() => setShowBanner(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                id="close-pwa-banner"
              >
                <X size={14} />
              </button>
            </div>
            
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
              {language === 'ar' 
                ? 'ثبت التطبيق لتجربة أسرع وأكثر استقراراً في التنقل.' 
                : 'Install the app for a faster and more stable experience.'}
            </p>

            <button
              onClick={handleInstall}
              disabled={isInstalling}
              id="install-pwa-button"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-500 text-white text-[11px] font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:shadow-emerald-500/40 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isInstalling ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Download size={14} />
                  </motion.div>
                  {language === 'ar' ? 'جاري التثبيت...' : 'Installing...'}
                </>
              ) : isInstalled ? (
                <>
                  <CheckCircle2 size={14} />
                  {language === 'ar' ? 'تم التثبيت' : 'Installed'}
                </>
              ) : (
                <>
                  <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                  {language === 'ar' ? 'تثبيت نسخة التطبيق' : 'Install App Version'}
                </>
              )}
            </button>
          </div>
          
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-20 h-20 bg-emerald-500/5 blur-2xl rounded-full" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
