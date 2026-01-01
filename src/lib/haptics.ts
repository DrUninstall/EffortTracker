/**
 * Haptic Feedback Library
 *
 * Centralized haptic patterns for consistent tactile feedback across the app.
 * Uses the Vibration API (navigator.vibrate) which is supported on most mobile browsers.
 *
 * Pattern format: Array of milliseconds [vibrate, pause, vibrate, pause, ...]
 */

export const HAPTIC_PATTERNS = {
  // Light interactions
  light: [10],              // Quick-add tap, minor interactions
  tick: [5],                // Very subtle feedback

  // Medium interactions
  medium: [20],             // Timer start/stop, mode switches
  confirm: [15, 10, 15],    // Confirmation feedback

  // Heavy interactions
  heavy: [30],              // Major actions, stopping timer

  // Success patterns
  success: [20, 50, 20],    // Quota complete (not full celebration)
  celebration: [20, 50, 20, 80], // Milestone, new record, achievement

  // Utility patterns
  undo: [5, 30, 5],         // Revert action
  warning: [40, 20, 40],    // Error or warning state

  // Timer-specific
  checkpoint: [15, 30, 15], // Pomodoro checkpoint reached
  timerEnd: [30, 50, 30, 50, 30], // Timer/phase complete
} as const;

export type HapticPattern = keyof typeof HAPTIC_PATTERNS;

/**
 * Check if haptic feedback is supported and enabled
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger a haptic feedback pattern
 *
 * @param pattern - The pattern name to trigger
 * @returns boolean indicating if the haptic was triggered
 */
export function triggerHaptic(pattern: HapticPattern): boolean {
  if (!isHapticSupported()) {
    return false;
  }

  try {
    navigator.vibrate(HAPTIC_PATTERNS[pattern]);
    return true;
  } catch {
    // Vibration failed (e.g., permission denied, browser restrictions)
    return false;
  }
}

/**
 * Trigger a custom haptic pattern
 *
 * @param pattern - Array of vibration durations in milliseconds
 * @returns boolean indicating if the haptic was triggered
 */
export function triggerCustomHaptic(pattern: number[]): boolean {
  if (!isHapticSupported()) {
    return false;
  }

  try {
    navigator.vibrate(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Stop any ongoing haptic feedback
 */
export function stopHaptic(): void {
  if (isHapticSupported()) {
    navigator.vibrate(0);
  }
}
