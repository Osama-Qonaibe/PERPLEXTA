import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { ShieldAlert, Clock, LogOut } from 'lucide-react';

export const InactivityWarningModal: React.FC = () => {
  const {
    showInactivityWarning,
    inactivityCountdown,
    extendSession,
    logout,
    language,
    dir,
    t
  } = useAppContext();

  if (!showInactivityWarning) return null;

  const getWarningDescription = () => {
    const isAr = dir === 'rtl';
    if (isAr) {
      return (
        <span className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed block">
          لقد كنت غير نشط لفترة من الوقت. لحماية حسابك وأمان بياناتك الرقمية، سيتم تسجيل خروجك تلقائياً خلال{' '}
          <strong className="text-emerald-500 font-extrabold text-base tracking-wider">
            {inactivityCountdown}
          </strong>{' '}
          ثانية.
        </span>
      );
    }
    return (
      <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed block">
        We noticed you have been inactive. For your system security and privacy protection, you will be automatically logged out in{' '}
        <strong className="text-emerald-500 font-extrabold text-base tracking-wider">
          {inactivityCountdown}
        </strong>{' '}
        seconds.
      </span>
    );
  };

  const isAr = dir === 'rtl';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden font-sans select-none">
        {/* Dark Backdrop overlay with strong blur effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={extendSession} // any click on the backdrop also securely extends session
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Action Window Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md mx-4 overflow-hidden rounded-[8px] bg-white dark:bg-[#121214] border border-gray-100 dark:border-gray-800/80 shadow-2xl shadow-emerald-500/5 p-6 md:p-8"
        >
          {/* Top Decorative Alert Icon Header */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-5 flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 animate-ping duration-2000" />
              {/* Inner container */}
              <div className="relative w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
                <ShieldAlert className="w-7 h-7 text-emerald-500" />
              </div>
            </div>

            {/* Modal Title */}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight mb-3">
              {isAr ? 'جلسة العمل على وشك الانتهاء' : 'Session Security Monitor'}
            </h3>

            {/* Description containing remaining seconds */}
            <div className="mb-6 bg-gray-50/50 dark:bg-gray-950/20 rounded-[4px] px-4 py-3 border border-gray-100/50 dark:border-gray-900/30">
              {getWarningDescription()}
            </div>

            {/* Countdown Slider Progress Visual */}
            <div className="w-full bg-gray-100 dark:bg-gray-800 h-1 rounded-full overflow-hidden mb-6">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: `${(inactivityCountdown / 60) * 100}%` }}
                transition={{ duration: 0.15, ease: 'linear' }}
                className="bg-emerald-500 h-full"
              />
            </div>

            {/* Trigger buttons layout */}
            <div className="w-full flex flex-col sm:flex-row gap-3">
              {/* Stay Logged In Option */}
              <button
                type="button"
                onClick={extendSession}
                className="flex-1 order-1 sm:order-2 px-5 py-2.5 rounded-[4px] font-medium text-sm transition-all duration-300 bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-2 shadow-sm"
              >
                <Clock className="w-4 h-4" />
                <span>{isAr ? 'البقاء متصلاً' : 'Stay Logged In'}</span>
              </button>

              {/* Force Logout Option */}
              <button
                type="button"
                onClick={() => logout(true)}
                className="flex-1 order-2 sm:order-1 px-5 py-2.5 rounded-[4px] font-medium text-sm transition-all duration-300 bg-transparent border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{isAr ? 'تسجيل الخروج الآن' : 'Logout Now'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
