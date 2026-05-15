import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { motion } from 'motion/react';
import { Lock, Sparkles, ShieldCheck } from 'lucide-react';

export const MaintenancePage: React.FC = () => {
  const { dir, language, theme } = useTheme();
  const { siteSettings } = useSettings();
  const siteName = language === 'ar' ? siteSettings.siteNameAr : siteSettings.siteName;

  return (
    <div className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#0a0a0b] overflow-hidden`}>
       {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative flex flex-col items-center gap-10 max-w-lg px-8 text-center"
      >
        {/* Animated Brand Pulse */}
        <div className="relative">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute inset-0 bg-amber-500 rounded-full blur-[60px]"
          />
          <div className="relative w-24 h-24 rounded-[4px] bg-gradient-to-br from-gray-900 to-black border border-gray-800/80 flex items-center justify-center shadow-2xl overflow-hidden">
             <Lock className="text-amber-500 w-12 h-12 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent opacity-50" />
          </div>
        </div>

        {/* Text & Status */}
        <div className="flex flex-col items-center gap-4">
          <div className="space-y-2">
             <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em] drop-shadow-sm">
                {siteName || 'SOVEREIGN'}
             </h2>
             <div className="flex items-center justify-center gap-3">
                <div className="h-px w-10 bg-gradient-to-r from-transparent to-gray-800" />
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.4em] translate-y-0.5">
                   {language === 'ar' ? 'وضع الصيانة السيادي' : 'SOVEREIGN MAINTENANCE MODE'}
                </span>
                <div className="h-px w-10 bg-gradient-to-l from-transparent to-gray-800" />
             </div>
          </div>

          <p className="text-sm text-gray-400 font-medium leading-relaxed mt-4">
            {language === 'ar' 
              ? 'نحن نقوم بتحديث النظام لضمان أعلى مستويات الأداء والأمان. سنعود قريباً.' 
              : 'Our systems are undergoing elite recalibration to ensure maximum performance and security. We will be back online shortly.'}
          </p>

          <div className="mt-8 flex items-center gap-2 px-4 py-2 rounded-[4px] bg-gray-900/30 border border-white/[0.03] backdrop-blur-md">
             <ShieldCheck size={14} className="text-amber-500" />
             <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em]">
                {language === 'ar' ? 'فريق المهندسين يعمل الآن' : 'ENGINEERING SQUAD ACTIVE'}
             </span>
          </div>
        </div>
      </motion.div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-10 flex items-center gap-4 opacity-30">
          <Sparkles size={16} className="text-gray-500" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em]">SYSTEM UPGRADE IN PROGRESS</span>
          <Sparkles size={16} className="text-gray-500" />
      </div>
    </div>
  );
};
