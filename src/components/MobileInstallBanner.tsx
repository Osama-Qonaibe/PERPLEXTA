import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Sparkles, Smartphone, Monitor } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DefaultLogo } from './DefaultLogo';

export const MobileInstallBanner: React.FC = () => {
  const {
    isStandalone,
    installApp,
    isIOS,
    language,
    theme,
    siteSettings
  } = useAppContext();

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      return sessionStorage.getItem('perplexta_mobile_banner_dismissed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('perplexta_mobile_banner_dismissed', 'true');
    } catch (e) {}
  };

  const handleInstall = async () => {
    await installApp();
  };

  if (isStandalone || isDismissed) return null;

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const logoUrl = (theme === 'light' && siteSettings?.logoLightBase64) ? siteSettings.logoLightBase64 : siteSettings?.logoBase64;

  return (
    <AnimatePresence>
      <motion.div
        dir={dir}
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="block md:hidden fixed top-[68px] inset-x-3 z-[9970] pointer-events-auto"
      >
        <div 
          className={`relative py-2 px-2.5 rounded-xl border shadow-lg backdrop-blur-xl transition-all ${
            theme === 'dark'
              ? 'bg-[#141417]/95 border-emerald-500/30 text-gray-100 shadow-[0_6px_20px_rgba(0,0,0,0.6)]'
              : 'bg-white/95 border-emerald-500/40 text-gray-900 shadow-[0_6px_20px_rgba(16,185,129,0.15)]'
          }`}
        >
          {/* Subtle Emerald Glow Accent */}
          <div className="absolute top-0 inset-x-4 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_6px_rgba(16,185,129,0.8)]" />

          <div className="flex items-center justify-between gap-2">
            {/* Logo and Text */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg border border-emerald-500/30 bg-[var(--bg-secondary)] flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.25)] relative overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="App" className="w-full h-full object-cover" />
                ) : (
                  <DefaultLogo className="w-6 h-6" iconClassName="w-3.5 h-3.5" />
                )}
              </div>

              <div className="flex flex-col min-w-0 text-start leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold font-sans tracking-tight truncate text-emerald-500">
                    {language === 'ar' ? 'تطبيق بيربليكستا' : 'Perplexta App'}
                  </span>
                  <span className="text-[8px] font-black px-1 py-0 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                    PWA
                  </span>
                </div>
                <p className="text-[9.5px] text-gray-400 font-sans truncate">
                  {language === 'ar' ? 'تثبيت سريع لتجربة أفضل' : 'Fast 1-tap mobile access'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-extrabold text-[10.5px] font-sans shadow-[0_0_10px_rgba(16,185,129,0.35)] transition-all cursor-pointer whitespace-nowrap"
              >
                <Download size={12} className="stroke-[2.5]" />
                <span>{language === 'ar' ? 'تنزيل' : 'Install'}</span>
              </button>

              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                title={language === 'ar' ? 'إغلاق الإشعار' : 'Dismiss notification'}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
