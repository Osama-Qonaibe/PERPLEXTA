import { safeStorageGet, safeStorageSet, safeStorageRemove } from '@/utils/safeStorage';

export interface CookieConsentState {
  version: number;
  essential: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  updatedAt: string;
}

const STORAGE_KEY = 'perplexta_cookie_consent_v1';
const CURRENT_VERSION = 1;

export function getStoredConsent(): CookieConsentState | null {
  const raw = safeStorageGet(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CookieConsentState;
    if (parsed.version === CURRENT_VERSION) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveConsent(preferences: {
  analytics: boolean;
  marketing: boolean;
  functional?: boolean;
}): CookieConsentState {
  const consentState: CookieConsentState = {
    version: CURRENT_VERSION,
    essential: true,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
    functional: preferences.functional ?? true,
    updatedAt: new Date().toISOString(),
  };

  safeStorageSet(STORAGE_KEY, JSON.stringify(consentState));
  applyConsentToGtag(consentState);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: consentState }));
  }

  return consentState;
}

export function clearConsent(): void {
  safeStorageRemove(STORAGE_KEY);
}

export function applyConsentToGtag(consent: CookieConsentState) {
  if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
    (window as any).gtag('consent', 'update', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied',
      functionality_storage: consent.functional ? 'granted' : 'denied',
      security_storage: 'granted',
    });
  }
}

export function isConsentRequired(): boolean {
  return getStoredConsent() === null;
}

