/**
 * View Transitions API Helper for Native-like PWA Navigation
 * Provides seamless cross-fading and slide transitions for iOS and Android web applications.
 */

import { useCallback } from 'react';
import { useNavigate, NavigateOptions, To } from 'react-router-dom';
import { triggerHaptic } from './haptics';

// Type declaration for View Transitions API if not present in default DOM types
declare global {
  interface Document {
    startViewTransition?: (callback: () => void | Promise<void>) => {
      finished: Promise<void>;
      ready: Promise<void>;
      updateCallbackDone: Promise<void>;
      skipTransition: () => void;
    };
  }
}

/**
 * Executes a state or DOM change inside a View Transition if supported by the browser,
 * otherwise executes it immediately with fallback.
 */
export function performViewTransition(callback: () => void | Promise<void>): Promise<void> {
  if (typeof document !== 'undefined' && 'startViewTransition' in document && typeof document.startViewTransition === 'function') {
    const transition = document.startViewTransition(callback);
    return transition.finished.catch(() => {
      // Ignore transition cancellations gracefully
    });
  }
  
  // Fallback for browsers without View Transitions API
  try {
    const result = callback();
    if (result instanceof Promise) {
      return result;
    }
  } catch (err) {
    console.error('Error during fallback view transition:', err);
  }
  return Promise.resolve();
}

/**
 * Custom hook providing a navigation function that automatically leverages
 * the View Transitions API for native-like page transitions in PWA mode.
 */
export function useViewTransitionNavigate() {
  const navigate = useNavigate();

  const transitionNavigate = useCallback(
    (to: To | number, options?: NavigateOptions) => {
      triggerHaptic('selection');
      performViewTransition(() => {
        if (typeof to === 'number') {
          navigate(to);
        } else {
          navigate(to, options);
        }
      });
    },
    [navigate]
  );

  return transitionNavigate;
}
