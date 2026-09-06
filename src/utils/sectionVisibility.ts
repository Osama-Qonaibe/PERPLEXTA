/**
 * Utility functions for checking and managing page, section, and feature visibility
 * based on admin-configured `blocked_paths` in system settings.
 * Supports both General (All Devices) and Mobile Version specific visibility controls.
 */

export function parseBlockedPaths(blockedPathsStr?: string): string[] {
  if (!blockedPathsStr) return [];
  return blockedPathsStr
    .split(',')
    .map(p => p.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks if a path or section key is blocked either globally or specifically on mobile.
 */
export function isPathBlocked(pathToCheck: string, blockedPathsStr?: string, isMobile?: boolean): boolean {
  if (!blockedPathsStr) return false;
  const blockedList = parseBlockedPaths(blockedPathsStr);
  const cleanPath = pathToCheck.toLowerCase().trim().replace(/^\/+/, ''); // e.g. "subscription" or "studio"

  return blockedList.some(blocked => {
    const cleanBlocked = blocked.replace(/^\/+/, '');
    if (!cleanBlocked) return false;

    // Check mobile-specific prefix e.g. "mobile_subscription" or "hide_mobile_subscription"
    const isMobilePrefix = cleanBlocked.startsWith('mobile_') || cleanBlocked.startsWith('hide_mobile_');
    const targetKey = cleanBlocked.replace(/^mobile_/, '').replace(/^hide_mobile_/, '').replace(/^hide_/, '');

    // If it's a mobile-only rule and we're NOT on mobile, ignore it
    if (isMobilePrefix && !isMobile) {
      return false;
    }

    // Direct match
    if (cleanPath === targetKey) return true;
    if (cleanPath === cleanBlocked) return true;

    // Alias & synonym handling
    if (['subscription', 'pricing', 'subscriptions'].includes(cleanPath)) {
      if (['subscription', 'pricing', 'subscriptions'].includes(targetKey)) return true;
    }
    if (cleanPath === 'studio') {
      if (targetKey === 'studio') return true;
    }
    if (['google-hub', 'google_hub', 'googlehub'].includes(cleanPath)) {
      if (['google-hub', 'google_hub', 'googlehub', 'google'].includes(targetKey)) return true;
    }
    if (['viralbook', 'bulletin', 'ads', 'bulletinboard'].includes(cleanPath)) {
      if (['viralbook', 'bulletin', 'ads', 'bulletinboard'].includes(targetKey)) return true;
    }
    if (cleanPath === 'rewards') {
      if (targetKey === 'rewards') return true;
    }
    if (['explore', 'discover', 'recommendations'].includes(cleanPath)) {
      if (['explore', 'discover', 'recommendations'].includes(targetKey)) return true;
    }

    return false;
  });
}

/**
 * Checks if Google Sign-In is hidden either globally or on mobile specifically.
 */
export function isGoogleAuthHidden(blockedPathsStr?: string, isMobile?: boolean): boolean {
  if (!blockedPathsStr) return false;
  const list = parseBlockedPaths(blockedPathsStr);

  return list.some(item => {
    const clean = item.replace(/^\/+/, '');
    
    // Global Google Auth Block
    if (['hide_google_auth', 'google_auth', 'hide-google-auth'].includes(clean)) {
      return true;
    }

    // Mobile-Specific Google Auth Block
    if (isMobile && ['hide_mobile_google_auth', 'mobile_google_auth', 'hide-mobile-google-auth'].includes(clean)) {
      return true;
    }

    return false;
  });
}

/**
 * Checks if Mobile PWA Install Banner is explicitly hidden in System Settings.
 */
export function isMobilePwaBannerHidden(blockedPathsStr?: string): boolean {
  if (!blockedPathsStr) return false;
  const list = parseBlockedPaths(blockedPathsStr);
  return list.some(item => 
    ['hide_mobile_pwa', 'mobile_pwa', 'hide_pwa', 'pwa_banner', 'hide_mobile_pwa_banner'].includes(item.replace(/^\/+/, ''))
  );
}

/**
 * Checks if a feature key is blocked specifically on mobile version.
 */
export function isFeatureBlockedOnMobile(featureKey: string, blockedPathsStr?: string): boolean {
  if (!blockedPathsStr) return false;
  const list = parseBlockedPaths(blockedPathsStr);
  const cleanKey = featureKey.toLowerCase().trim().replace(/^\/+/, '');

  return list.some(item => {
    const clean = item.replace(/^\/+/, '');
    return clean === `hide_mobile_${cleanKey}` || clean === `mobile_${cleanKey}` || clean === `hide_mobile_${cleanKey}_page`;
  });
}
