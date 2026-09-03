import { useCallback } from 'react';
import { triggerHaptic, HapticPreset } from '../utils/haptics';

/**
 * Custom React hook for triggering haptic vibration feedback on tactile interactions
 */
export function useHaptic() {
  const trigger = useCallback((preset: HapticPreset = 'light') => {
    return triggerHaptic(preset);
  }, []);

  return {
    triggerHaptic: trigger,
    trigger,
  };
}
