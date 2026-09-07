import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type HapticPreset = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

const HAPTIC_PATTERNS: Record<HapticPreset, number | number[]> = {
  light: 8,
  selection: 10,
  medium: 18,
  heavy: 35,
  success: [12, 40, 20],
  warning: [25, 50, 25],
  error: [40, 60, 40],
};

/**
 * Triggers native haptic vibration feedback using Capacitor Haptics plugin
 * with smooth fallback to standard Web Vibration API for web/PWA viewports.
 */
export async function triggerHaptic(type: HapticPreset | number | number[] = 'light'): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  // 1. Try Native Capacitor Haptics Plugin (Primary on iOS / Android standalone PWA)
  try {
    if (typeof type === 'string') {
      switch (type) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          return true;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          return true;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          return true;
        case 'selection':
          await Haptics.selectionChanged();
          return true;
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          return true;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          return true;
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          return true;
      }
    }
  } catch {
    // Graceful fallback to Navigator Vibration API
  }

  // 2. Fallback to Web Vibration API
  if ('navigator' in window && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      let pattern: number | number[];
      if (typeof type === 'string') {
        pattern = HAPTIC_PATTERNS[type] ?? HAPTIC_PATTERNS.light;
      } else {
        pattern = type;
      }
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Helper callback wrapper for UI button event handlers
 */
export function hapticTouch(preset: HapticPreset = 'light') {
  return () => {
    triggerHaptic(preset);
  };
}

