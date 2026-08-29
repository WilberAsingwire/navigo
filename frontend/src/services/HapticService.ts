/*
  NAVIGO Haptic Service
  Provides premium tactile feedback using the Web Vibration API.
*/

export const Haptic = {
  /**
   * Light tick for buttons or simple interactions
   */
  tick: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium pulse for confirmations or selection
   */
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 50, 20]);
    }
  },

  /**
   * Double pulse for warnings or errors
   */
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50, 100, 50]);
    }
  },

  /**
   * Strong pulse for critical events (e.g., Ride Matched!)
   */
  alert: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 100, 100, 100, 500]);
    }
  },

  /**
   * Subtle pattern for loading or waiting
   */
  loading: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 30, 10]);
    }
  }
};
