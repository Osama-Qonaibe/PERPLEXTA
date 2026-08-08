import { useState, useEffect, useCallback } from 'react';
import { safeStorageGet, safeStorageSet } from '../utils/safeStorage';

export type PwaInstallState = 'idle' | 'installing' | 'installed' | 'dismissed';

export interface UsePwaInstallReturn {
  installState: PwaInstallState;
  canInstall: boolean;
  isStandalone: boolean;
  isIosSafari: boolean;
  promptInstall: () => Promise<boolean>;
  openApp: () => void;
  dismissBanner: () => void;
  resetState: () => void;
}

const STORAGE_DISMISSED_KEY = 'perplexta_pwa_dismissed';
const STORAGE_INSTALLED_KEY = 'perplexta_pwa_installed';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function usePwaInstall(): UsePwaInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installState, setInstallState] = useState<PwaInstallState>('idle');
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIosSafari, setIsIosSafari] = useState<boolean>(false);

  // Check standalone mode and iOS environment
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) || 
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(checkStandalone);
    setIsIosSafari(isIosDevice && !checkStandalone);

    // Check if previously installed
    const wasInstalled = safeStorageGet(STORAGE_INSTALLED_KEY) === 'true';
    if (checkStandalone || wasInstalled) {
      setInstallState('installed');
    }
  }, []);

  // Listen for native beforeinstallprompt & appinstalled browser events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only set to idle if not already marked as installed
      if (safeStorageGet(STORAGE_INSTALLED_KEY) !== 'true') {
        setInstallState('idle');
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setInstallState('installed');
      safeStorageSet(STORAGE_INSTALLED_KEY, 'true');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pwa-app-installed'));
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
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

    // Try opening standalone window or focus existing app scope
    const currentUrl = window.location.href;
    
    // Attempt launching standalone window
    const pwaWindow = window.open(
      currentUrl,
      '_blank',
      'fullscreen=yes,display-mode=standalone'
    );

    if (!pwaWindow) {
      // Fallback: reload or redirect to origin
      window.location.href = currentUrl;
    }
  }, []);

  // Dismiss banner with cooldown
  const dismissBanner = useCallback(() => {
    setInstallState('dismissed');
    safeStorageSet(STORAGE_DISMISSED_KEY, Date.now().toString());
  }, []);

  // Reset state (e.g. for testing or retry)
  const resetState = useCallback(() => {
    setInstallState('idle');
  }, []);

  const canInstall = Boolean(deferredPrompt) || isIosSafari;

  return {
    installState,
    canInstall,
    isStandalone,
    isIosSafari,
    promptInstall,
    openApp,
    dismissBanner,
    resetState,
  };
}
