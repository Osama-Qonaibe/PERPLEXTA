import { applyNonce } from './csp';

const CONSENT_KEY = 'perplexta_cookie_consent_granted';

/**
 * Checks if the user has granted consent for tracking cookies/analytics.
 */
export const getCookieConsent = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === 'true';
  } catch (e) {
    return false;
  }
};

/**
 * Sets the cookie consent status and fires a dynamic global event for react components.
 */
export const setCookieConsent = (granted: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_KEY, granted ? 'true' : 'false');
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: { granted } }));
};

/**
 * Checks if the cookie consent preference has been set by the user at least once.
 */
export const isCookieConsentSet = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(CONSENT_KEY) !== null;
  } catch (e) {
    return false;
  }
};

/**
 * Dynamically injects Google Tag Manager (GTM) script safely into <head> using the existing CSP nonce.
 * Ensures GTM is ONLY initialized if user consent has been granted.
 */
export const initializeGTM = (gtmId: string): void => {
  if (typeof window === 'undefined' || !gtmId) return;

  // Verify user consent before injecting
  if (!getCookieConsent()) {
    console.warn('[GTM Service] Blocked GTM initialization: Cookie consent is not granted.');
    return;
  }

  const scriptId = 'gtm-script';
  if (document.getElementById(scriptId)) return;

  // 1. Push start event to dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js'
  });

  // 2. Create and inject the main GTM script
  const script = document.createElement('script');
  script.id = scriptId;
  applyNonce(script);
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;

  document.head.appendChild(script);
  console.log(`[GTM Service] GTM container (${gtmId}) safely initialized with CSP nonce.`);
};
