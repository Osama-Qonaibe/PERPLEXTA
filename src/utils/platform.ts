import { Capacitor } from '@capacitor/core';

/**
 * Perplexta Platform & Device Architecture Helper
 * Provides high-precision device and environment detection for native mobile optimization.
 */

export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
};

export const getNativePlatform = (): 'android' | 'ios' | 'web' => {
  if (typeof window === 'undefined') return 'web';
  return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
};

export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const isAndroidDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
};

export const isStandalonePwa = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true;
};

export const isMobileViewport = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024;
};

export const isCompactPhone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 640;
};

export const isTouchCapable = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Returns true if the active session is on a mobile device, standalone PWA, or Capacitor APK.
 */
export const isMobileEnvironment = (): boolean => {
  return isNativeApp() || isStandalonePwa() || isMobileViewport();
};
