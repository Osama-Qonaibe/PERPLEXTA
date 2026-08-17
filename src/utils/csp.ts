/**
 * Retrieves the CSP nonce from window.__CSP_NONCE__ or standard nonced scripts in the DOM.
 * It validates that the found nonce is a plausible Base64 string to avoid injection attacks or using dummy/stale placeholders.
 */
export const getCSPNonce = (): string => {
  if (typeof window !== 'undefined') {
    // 1. Check the official globally injected variable
    if ((window as any).__CSP_NONCE__) {
      const nonce = (window as any).__CSP_NONCE__;
      if (isValidNonce(nonce)) {
        return nonce;
      }
    }

    // 2. Fallback to searching the DOM for a style/script with nonce attribute
    const scriptEl = document.querySelector('script[nonce]');
    if (scriptEl) {
      const nonce = scriptEl.getAttribute('nonce') || (scriptEl as any).nonce;
      if (nonce && isValidNonce(nonce)) {
        return nonce;
      }
    }

    // 3. Fallback to meta tag if present
    const metaEl = document.querySelector('meta[name="csp-nonce"]');
    if (metaEl) {
      const nonce = metaEl.getAttribute('content');
      if (nonce && isValidNonce(nonce)) {
        return nonce;
      }
    }
  }
  return '';
};

/**
 * Validates whether the given string is a plausible base64 CSP nonce.
 * Typically nonces are 16 or 32-byte base64 strings (e.g. 24 or 44 characters).
 * We check if the string contains only valid base64 characters and is of reasonable length.
 */
const isValidNonce = (nonce: string): boolean => {
  if (!nonce || typeof nonce !== 'string') return false;
  // Nonce must be at least 16 chars and contain only alphanumeric, +, /, = characters
  if (nonce.length < 16) return false;
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(nonce);
};

/**
 * Dynamically applies the valid CSP nonce to a given element's nonce property and attribute.
 */
export const applyNonce = (el: HTMLElement | HTMLScriptElement | HTMLStyleElement): void => {
  const nonce = getCSPNonce();
  if (nonce) {
    // Set as property
    if ('nonce' in el) {
      (el as any).nonce = nonce;
    }
    // Also set as custom attribute explicitly
    el.setAttribute('nonce', nonce);
  }
};
