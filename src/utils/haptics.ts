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
 * Triggers a haptic vibration feedback on supported devices using Navigator Vibration API.
 * Safely guards against unsupported browsers, desktop environments, or unexpected errors.
 */
export function triggerHaptic(type: HapticPreset | number | number[] = 'light'): boolean {
  if (typeof window === 'undefined' || !('navigator' in window)) {
    return false;
  }

  if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') {
    return false;
  }

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

/**
 * Helper hook / wrapper for React components
 */
export function hapticTouch(preset: HapticPreset = 'light') {
  return () => {
    triggerHaptic(preset);
  };
}
