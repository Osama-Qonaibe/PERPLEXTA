/**
 * Hardware Constraints & Performance Detection Utility
 * Dynamically evaluates mobile/device hardware capabilities (RAM, CPU concurrency, Connection, Battery, Motion)
 * to adjust UI/UX rendering and conserve memory/battery on low-resource devices.
 */

import { useState, useEffect } from 'react';

export interface DeviceCapabilities {
  isLowEndDevice: boolean;
  isLowRam: boolean;
  isSaveDataEnabled: boolean;
  isReducedMotion: boolean;
  hardwareConcurrency: number;
  deviceMemoryGB: number;
  effectiveConnectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  performanceTier: 'low' | 'medium' | 'high';
  shouldDisableHeavyBlurs: boolean;
  shouldReduceAnimations: boolean;
}

// Extend Navigator interface for non-standard experimental properties
interface NavigatorExtended extends Navigator {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
    effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
}

/**
 * Evaluates current device constraints synchronously
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isLowEndDevice: false,
      isLowRam: false,
      isSaveDataEnabled: false,
      isReducedMotion: false,
      hardwareConcurrency: 8,
      deviceMemoryGB: 8,
      effectiveConnectionType: '4g',
      performanceTier: 'high',
      shouldDisableHeavyBlurs: false,
      shouldReduceAnimations: false
    };
  }

  const nav = navigator as NavigatorExtended;

  // 1. Device Memory (RAM in GB)
  const deviceMemoryGB = nav.deviceMemory || 8;
  const isLowRam = deviceMemoryGB <= 4;

  // 2. CPU Hardware Concurrency
  const hardwareConcurrency = nav.hardwareConcurrency || 4;
  const isLowCpu = hardwareConcurrency <= 4;

  // 3. Network Constraints & Data Saver
  const isSaveDataEnabled = Boolean(nav.connection?.saveData);
  const effectiveConnectionType = nav.connection?.effectiveType || '4g';
  const isSlowNetwork = effectiveConnectionType === 'slow-2g' || effectiveConnectionType === '2g' || effectiveConnectionType === '3g';

  // 4. Reduced Motion Preference
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  // 5. Tier Calculation
  let performanceTier: 'low' | 'medium' | 'high' = 'high';
  if (isLowRam || (isLowCpu && isSlowNetwork) || isSaveDataEnabled) {
    performanceTier = 'low';
  } else if (deviceMemoryGB <= 6 || hardwareConcurrency <= 6 || isSlowNetwork) {
    performanceTier = 'medium';
  }

  const isLowEndDevice = performanceTier === 'low';
  const shouldDisableHeavyBlurs = isLowEndDevice || isLowRam;
  const shouldReduceAnimations = isLowEndDevice || prefersReducedMotion;

  return {
    isLowEndDevice,
    isLowRam,
    isSaveDataEnabled,
    isReducedMotion: prefersReducedMotion,
    hardwareConcurrency,
    deviceMemoryGB,
    effectiveConnectionType,
    performanceTier,
    shouldDisableHeavyBlurs,
    shouldReduceAnimations
  };
}

/**
 * React Hook for reactive hardware performance adaptations
 */
export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>(detectDeviceCapabilities);

  useEffect(() => {
    const handleUpdate = () => {
      setCapabilities(detectDeviceCapabilities());
    };

    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleUpdate);
    }

    const nav = navigator as NavigatorExtended;
    if (nav.connection?.addEventListener) {
      nav.connection.addEventListener('change', handleUpdate);
    }

    return () => {
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleUpdate);
      }
      if (nav.connection?.removeEventListener) {
        nav.connection.removeEventListener('change', handleUpdate);
      }
    };
  }, []);

  return capabilities;
}
