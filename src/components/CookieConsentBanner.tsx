import React, { useEffect } from 'react';
import { setCookieConsent, isCookieConsentSet } from '../utils/gtmService';

export const CookieConsentBanner: React.FC = () => {
  useEffect(() => {
    // Silently initialize consent without intrusive popups
    if (!isCookieConsentSet()) {
      setCookieConsent(true);
    }
  }, []);

  // Popup is hidden as requested
  return null;
};
