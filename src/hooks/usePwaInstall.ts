import { useState, useEffect, useCallback } from 'react';
import { safeStorageGet, safeStorageSet } from '../utils/safeStorage';

export type PwaInstallState = 'idle' | 'installing' | 'installed' | 'dismissed';
export type MobilePlatform = 'ios-safari' | 'ios-other' | 'android-chrome' | 'android-other' | 'desktop';

export interface UsePwaInstallReturn {
  installState: PwaInstallState;
  canInstall: boolean;
  isStandalone: boolean;
  isIos: boolean;
  isIosSafari: boolean;
  isAndroid: boolean;
  isAndroidChrome: boolean;
  mobilePlatform: MobilePlatform;
  dismissCount: number;
  hasPrompt: boolean;
  promptInstall: () => Promise<boolean>;
  openApp: () => void;
  dismissBanner: () => void;
  resetDismissals: () => void;
  resetState: () => void;
}

const STORAGE_DISMISSED_KEY = 'perplexta_pwa_dismissed';
const STORAGE_DISMISS_COUNT_KEY = 'perplexta_pwa_dismiss_count';
const STORAGE_INSTALLED_KEY = 'perplexta_pwa_installed';

/**
 * Calculates required cooldown period in ms based on dismissal count.
 * 1st dismissal: 24h
 * 2nd dismissal: 3 days (72h)
 * 3+ dismissals: 7 days (168h)
 */
export function getDismissCooldownMs(count: number): number {
  if (count <= 1) return 24 * 60 * 60 * 1000;
  if (count === 2) return 3 * 24 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000;
}

export function usePwaInstall(): UsePwaInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installState, setInstallState] = useState<PwaInstallState>('idle');
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isIosSafari, setIsIosSafari] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isAndroidChrome, setIsAndroidChrome] = useState<boolean>(false);
  const [mobilePlatform, setMobilePlatform] = useState<MobilePlatform>('desktop');
  const [dismissCount, setDismissCount] = useState<number>(0);

  // Detect browser, mobile OS & standalone mode
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = window.navigator.userAgent.toLowerCase();
    
    // Check iOS
    const iosDevice = /iphone|ipad|ipod/.test(ua) || 
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    
    const isOtherIosBrowser = /crios|fxios|edgios|opti|focus/i.test(ua);
    const iosSafari = iosDevice && /safari/i.test(ua) && !isOtherIosBrowser;

    // Check Android
    const androidDevice = /android/i.test(ua);
    const isOtherAndroidBrowser = /samsungbrowser|firefox|opr|edga/i.test(ua);
    const androidChrome = androidDevice && /chrome/i.test(ua) && !isOtherAndroidBrowser;

    // Determine platform taxonomy
    let platform: MobilePlatform = 'desktop';
    if (iosSafari) platform = 'ios-safari';
    else if (iosDevice) platform = 'ios-other';
    else if (androidChrome) platform = 'android-chrome';
    else if (androidDevice) platform = 'android-other';

    setIsIos(iosDevice);
    setIsIosSafari(iosSafari);
    setIsAndroid(androidDevice);
    setIsAndroidChrome(androidChrome);
    setMobilePlatform(platform);

    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(checkStandalone);

    // Read dismissal metrics & cooldown
    const savedCount = parseInt(safeStorageGet(STORAGE_DISMISS_COUNT_KEY) || '0', 10);
    setDismissCount(savedCount);

    const lastDismissedTime = safeStorageGet(STORAGE_DISMISSED_KEY);
    if (lastDismissedTime && !checkStandalone) {
      const elapsed = Date.now() - Number(lastDismissedTime);
      const cooldownMs = getDismissCooldownMs(savedCount);
      if (elapsed < cooldownMs) {
        setInstallState('dismissed');
      }
    }

    // Check if early prompt was captured by index.html script
    if (typeof window !== 'undefined' && (window as any).__deferredPwaPrompt) {
      setDeferredPrompt((window as any).__deferredPwaPrompt);
    }

    // Check if marked as installed
    const wasInstalled = safeStorageGet(STORAGE_INSTALLED_KEY) === 'true';
    if (checkStandalone || wasInstalled) {
      setInstallState('installed');
    }
  }, []);

  // Listen for native beforeinstallprompt, captured prompt, & appinstalled browser events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCaptured = () => {
      if ((window as any).__deferredPwaPrompt) {
        setDeferredPrompt((window as any).__deferredPwaPrompt);
        if (safeStorageGet(STORAGE_INSTALLED_KEY) !== 'true') {
          const lastDismissedTime = safeStorageGet(STORAGE_DISMISSED_KEY);
          const savedCount = parseInt(safeStorageGet(STORAGE_DISMISS_COUNT_KEY) || '0', 10);
          const elapsed = lastDismissedTime ? Date.now() - Number(lastDismissedTime) : Infinity;
          if (elapsed >= getDismissCooldownMs(savedCount)) {
            setInstallState('idle');
          }
        }
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPwaPrompt = e;
      setDeferredPrompt(e);
      if (safeStorageGet(STORAGE_INSTALLED_KEY) !== 'true') {
        const lastDismissedTime = safeStorageGet(STORAGE_DISMISSED_KEY);
        const savedCount = parseInt(safeStorageGet(STORAGE_DISMISS_COUNT_KEY) || '0', 10);
        const elapsed = lastDismissedTime ? Date.now() - Number(lastDismissedTime) : Infinity;
        if (elapsed >= getDismissCooldownMs(savedCount)) {
          setInstallState('idle');
        }
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      (window as any).__deferredPwaPrompt = null;
      setInstallState('installed');
      safeStorageSet(STORAGE_INSTALLED_KEY, 'true');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pwa-app-installed'));
      }
    };

    window.addEventListener('pwa-prompt-captured', handleCaptured);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-prompt-captured', handleCaptured);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger installation prompt
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    setInstallState('installing');

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult && choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setInstallState('installed');
        safeStorageSet(STORAGE_INSTALLED_KEY, 'true');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pwa-app-installed'));
        }
        return true;
      } else {
        setInstallState('idle');
        return false;
      }
    } catch (err) {
      console.error('[PWA Install] Error triggering prompt:', err);
      setInstallState('idle');
      return false;
    }
  }, [deferredPrompt]);

  // Open App action (Launches standalone mode or opens app window)
  const openApp = useCallback(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = window.location.href;
    const pwaWindow = window.open(
      currentUrl,
      '_blank',
      'fullscreen=yes,display-mode=standalone'
    );

    if (!pwaWindow) {
      window.location.href = currentUrl;
    }
  }, []);

  // Dismiss banner with progressive cooldown and counter
  const dismissBanner = useCallback(() => {
    const currentCount = parseInt(safeStorageGet(STORAGE_DISMISS_COUNT_KEY) || '0', 10);
    const nextCount = currentCount + 1;

    setInstallState('dismissed');
    setDismissCount(nextCount);
    safeStorageSet(STORAGE_DISMISS_COUNT_KEY, nextCount.toString());
    safeStorageSet(STORAGE_DISMISSED_KEY, Date.now().toString());
  }, []);

  // Reset dismissal history
  const resetDismissals = useCallback(() => {
    setDismissCount(0);
    safeStorageSet(STORAGE_DISMISS_COUNT_KEY, '0');
    safeStorageSet(STORAGE_DISMISSED_KEY, '');
    setInstallState('idle');
  }, []);

  // Reset state (e.g. for testing or retry)
  const resetState = useCallback(() => {
    setInstallState('idle');
  }, []);

  const hasPrompt = deferredPrompt !== null;
  const canInstall = !isStandalone && installState !== 'installed';

  return {
    installState,
    canInstall,
    isStandalone,
    isIos,
    isIosSafari,
    isAndroid,
    isAndroidChrome,
    mobilePlatform,
    dismissCount,
    hasPrompt,
    promptInstall,
    openApp,
    dismissBanner,
    resetDismissals,
    resetState,
  };
}
