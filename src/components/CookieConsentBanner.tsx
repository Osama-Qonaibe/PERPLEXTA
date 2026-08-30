import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, ShieldCheck, Settings, Check, X, ChevronRight, Lock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getStoredConsent, saveConsent, CookieConsentState } from '../utils/consentManager';

export const CookieConsentBanner: React.FC = () => {
  const { language } = useAppContext();
  const isAr = language === 'ar';

  const [isVisible, setIsVisible] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  // Preference state
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      // Show banner after brief delay to avoid layout jump
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      setAnalyticsEnabled(stored.analytics);
      setMarketingEnabled(stored.marketing);
    }

    const handleOpenSettings = () => {
      const current = getStoredConsent();
      if (current) {
        setAnalyticsEnabled(current.analytics);
        setMarketingEnabled(current.marketing);
      }
      setShowPreferencesModal(true);
    };

    window.addEventListener('open-cookie-preferences', handleOpenSettings);
    return () => {
      window.removeEventListener('open-cookie-preferences', handleOpenSettings);
    };
  }, []);

  const handleAcceptAll = () => {
    saveConsent({ analytics: true, marketing: true, functional: true });
    setIsVisible(false);
    setShowPreferencesModal(false);
  };

  const handleRejectOptional = () => {
    saveConsent({ analytics: false, marketing: false, functional: true });
    setIsVisible(false);
    setShowPreferencesModal(false);
  };

  const handleSavePreferences = () => {
    saveConsent({ analytics: analyticsEnabled, marketing: marketingEnabled, functional: true });
    setIsVisible(false);
    setShowPreferencesModal(false);
  };

  return (
    <>
      {/* Quick Cookie Banner */}
      <AnimatePresence>
        {isVisible && !showPreferencesModal && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full p-3 rounded-xl bg-[var(--surface-card)] border border-[var(--border-main)] shadow-lg backdrop-blur-xl pointer-events-auto"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 text-accent mt-0.5">
                <Cookie size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="text-[11px] font-bold text-[var(--text-primary)] truncate">
                    {isAr ? 'ملفات تعريف الارتباط' : 'Cookie Notice'}
                  </h3>
                  <button
                    type="button"
                    onClick={handleRejectOptional}
                    className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors"
                    title={isAr ? 'إغلاق واقتصار على الضروري' : 'Close and use essential only'}
                    aria-label="Close"
                  >
                    <X size={12} />
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  {isAr
                    ? 'نستخدم ملفات أساسية لعمل المنصة، وإذنك للتحليلات لتحسين التجربة.'
                    : 'We use essential cookies for operations and analytics to improve experience.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 py-1 px-2 rounded-md bg-accent text-white font-bold text-[10px] hover:opacity-90 transition-opacity text-center whitespace-nowrap shadow-xs"
              >
                {isAr ? 'قبول الكل' : 'Accept All'}
              </button>
              <button
                type="button"
                onClick={handleRejectOptional}
                className="flex-1 py-1 px-1.5 rounded-md bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-main)] font-medium text-[10px] hover:bg-[var(--surface-inset)] transition-colors text-center whitespace-nowrap"
              >
                {isAr ? 'الضرورية فقط' : 'Essential Only'}
              </button>
              <button
                type="button"
                onClick={() => setShowPreferencesModal(true)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-accent hover:bg-[var(--surface-subtle)] transition-colors shrink-0"
                title={isAr ? 'تخصيص الخيارات' : 'Customize preferences'}
                aria-label={isAr ? 'تخصيص الخيارات' : 'Customize preferences'}
              >
                <Settings size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Granular Preferences Modal */}
      <AnimatePresence>
        {showPreferencesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-2xl bg-[var(--surface-card)] border border-[var(--border-main)] shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]"
              dir={isAr ? 'rtl' : 'ltr'}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-main)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)]">
                      {isAr ? 'مركز تفضيلات الخصوصية' : 'Privacy Preferences Center'}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      {isAr ? 'تحكم كامل في جمع البيانات والملفات' : 'Manage your data and cookie permissions'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreferencesModal(false)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {/* 1. Essential */}
                <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Lock size={15} className="text-accent" />
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        {isAr ? 'ملفات تعريف الارتباط الأساسية والسيادية' : 'Essential Sovereign Cookies'}
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {isAr ? 'مفعّلة دائمًا' : 'Always Active'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {isAr
                      ? 'ضرورية للغاية لعمل المنصة، الحفاظ على جلسة تسجيل الدخول الآمنة، وتأمين التشفير ومنع الهجمات. لا يمكن تعطيلها.'
                      : 'Strictly necessary for platform operation, secure session authentication, and encryption enforcement. Cannot be switched off.'}
                  </p>
                </div>

                {/* 2. Analytics */}
                <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        {isAr ? 'التحليلات وقياس الأداء' : 'Analytics & Performance'}
                      </h4>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
                        {isAr
                          ? 'تساعدنا في فهم كيفية تفاعل المستخدمين مع المنصة، واكتشاف أي أخطاء برمجية لتطوير الأداء وتسريعه.'
                          : 'Allows us to count visits and traffic sources to measure and improve platform speed and responsiveness.'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-3 rtl:mr-3 rtl:ml-0 shrink-0">
                      <input
                        type="checkbox"
                        checked={analyticsEnabled}
                        onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:right-[2px] rtl:after:left-auto after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                </div>

                {/* 3. Marketing & Personalization */}
                <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        {isAr ? 'التخصيص والتسويق' : 'Personalization & Marketing'}
                      </h4>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
                        {isAr
                          ? 'تُستخدم لتخصيص الإعلانات والعروض الترويجية وربط تجربة الاستخدام بالحملات التسويقية الخارجية.'
                          : 'Used to provide tailored announcements, campaign performance measurement, and personalized experiences.'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-3 rtl:mr-3 rtl:ml-0 shrink-0">
                      <input
                        type="checkbox"
                        checked={marketingEnabled}
                        onChange={(e) => setMarketingEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:right-[2px] rtl:after:left-auto after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-[var(--border-main)] flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleRejectOptional}
                  className="py-2 px-4 rounded-xl bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-main)] font-semibold text-xs hover:bg-[var(--surface-inset)] transition-colors"
                >
                  {isAr ? 'رفض غير الضروري' : 'Reject Non-Essential'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="py-2 px-4 rounded-xl bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-main)] font-semibold text-xs hover:bg-[var(--surface-inset)] transition-colors"
                  >
                    {isAr ? 'قبول الكل' : 'Accept All'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    className="py-2 px-4 rounded-xl bg-accent text-white font-bold text-xs hover:opacity-90 transition-opacity"
                  >
                    {isAr ? 'حفظ التفضيلات' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
