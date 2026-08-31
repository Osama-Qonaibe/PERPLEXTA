import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCookieConsent, setCookieConsent, isCookieConsentSet } from '../utils/gtmService';
import { useAppContext } from '../context/AppContext';
import { toast } from '../context/NotificationContext';

export const CookieConsentBanner: React.FC = () => {
  const { language } = useAppContext();
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    // Check if user has already set their preference
    if (!isCookieConsentSet()) {
      // Show with a slight delay for elegant presentation
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const isAr = language === 'ar';

  const handleAccept = () => {
    setCookieConsent(true);
    setVisible(false);
    toast.success(
      isAr ? 'تم قبول ملفات الارتباط وتفعيل إعدادات الخصوصية بنجاح' : 'Cookies accepted and privacy settings activated successfully',
      isAr ? 'إعدادات الكوكيز' : 'Cookie Settings'
    );
  };

  const handleDecline = () => {
    setCookieConsent(false);
    setVisible(false);
    toast.info(
      isAr ? 'تم رفض ملفات الارتباط الاختيارية وتطبيق الحد الأدنى' : 'Optional cookies declined and minimal tracking applied',
      isAr ? 'إعدادات الكوكيز' : 'Cookie Settings'
    );
  };

  if (!visible) return null;

  return (
    <div 
      id="cookie-consent-banner"
      className="w-full pointer-events-auto p-2.5 sm:p-3 rounded-[var(--radius)] bg-[var(--surface-card)] border border-[var(--border-main)] shadow-xl animate-fade-in transition-all"
    >
      <div className="flex items-start gap-2">
        <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] sm:text-xs font-bold text-[var(--text-primary)]">
              {isAr ? 'سياسة ملفات الارتباط' : 'Cookie Policy'}
            </h4>
            <button 
              id="cookie-close-btn"
              onClick={() => setVisible(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded transition-colors shrink-0"
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <p className="mt-1 text-[10px] sm:text-[10.5px] text-[var(--text-secondary)] leading-relaxed">
            {isAr 
              ? 'نستخدم ملفات تعريف الارتباط لتحسين تجربة الاستخدام والأداء.'
              : 'We use cookies to improve user experience and performance.'
            }
          </p>

          {/* Legal Links in distinct blue */}
          <div className="mt-1.5 flex items-center flex-wrap gap-2 text-[10px]">
            <Link
              id="cookie-link-terms"
              to="/terms"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold underline underline-offset-2 transition-colors"
            >
              {isAr ? 'شروط الخدمة' : 'Terms of Service'}
            </Link>
            <span className="text-gray-300 dark:text-gray-700 select-none">•</span>
            <Link
              id="cookie-link-privacy"
              to="/privacy"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold underline underline-offset-2 transition-colors"
            >
              {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-[var(--border-main)] flex items-center justify-end gap-1.5">
        <button
          id="cookie-decline-btn"
          onClick={handleDecline}
          className="px-2.5 py-1 text-[10px] sm:text-[11px] font-medium rounded-[var(--radius)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-[var(--border-main)] transition-all"
        >
          {isAr ? 'رفض' : 'Decline'}
        </button>
        <button
          id="cookie-accept-btn"
          onClick={handleAccept}
          className="px-3 py-1 text-[10px] sm:text-[11px] font-bold rounded-[var(--radius)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90 transition-all shadow-xs"
        >
          {isAr ? 'قبول' : 'Accept'}
        </button>
      </div>
    </div>
  );
};

