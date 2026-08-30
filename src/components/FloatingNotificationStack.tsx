import React from 'react';
import { useAppContext } from '../context/AppContext';
import { CookieConsentBanner } from './CookieConsentBanner';
import { PwaInstallBanner } from './PwaInstallBanner';
import { ServiceUpdateToast } from './ServiceUpdateToast';

/**
 * FloatingNotificationStack coordinates all bottom floating system banners & toasts
 * (Cookie Consent, PWA Install Banner, Platform Update Toast, and future bottom notices)
 * ensuring they stack vertically in an elegant column (one above the other) without collisions or overlaps,
 * strictly adhering to the unified design language.
 */
export const FloatingNotificationStack: React.FC = () => {
  const { language } = useAppContext();
  const isAr = language === 'ar';

  return (
    <div
      id="perplexta-floating-notification-stack"
      className={`fixed bottom-3 sm:bottom-4 z-[9990] flex flex-col-reverse gap-2 pointer-events-none w-[calc(100vw-1.5rem)] sm:w-[280px] max-h-[calc(100dvh-5rem)] overflow-y-auto overflow-x-hidden p-0.5 custom-scrollbar transition-all ${
        isAr ? 'left-3 sm:left-4 right-auto' : 'right-3 sm:right-4 left-auto'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <CookieConsentBanner />
      <PwaInstallBanner />
      <ServiceUpdateToast />
    </div>
  );
};
