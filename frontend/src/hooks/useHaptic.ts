import { useCallback } from 'react';

/**
 * useHaptic — Unified haptic feedback for all interactive elements
 * Uses Vibration API + visual fallback. Every tap should feel alive.
 */
export const useHaptic = () => {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {}
  }, []);

  const light = useCallback(() => vibrate(10), [vibrate]);
  const medium = useCallback(() => vibrate(20), [vibrate]);
  const heavy = useCallback(() => vibrate([30, 20, 30]), [vibrate]);
  const success = useCallback(() => vibrate([10, 30, 10]), [vibrate]);
  const error = useCallback(() => vibrate([20, 30, 20, 30]), [vibrate]);
  const selection = useCallback(() => vibrate(5), [vibrate]);

  return { vibrate, light, medium, heavy, success, error, selection };
};

export default useHaptic;
