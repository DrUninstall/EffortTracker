/**
 * Persistent Reminders System
 *
 * Uses the Web Notifications API for PWA reminder functionality.
 * Inspired by Due app's approach - persistent but user-controlled.
 */

// Notification permission state
export type NotificationPermission = 'default' | 'granted' | 'denied';

// Reminder configuration
export interface ReminderConfig {
  taskId: string;
  taskName: string;
  intervalMinutes: number; // How often to remind (1-60)
  enabled: boolean;
  startTime?: string; // HH:MM format, optional start time
  endTime?: string; // HH:MM format, optional end time
}

// Storage key for reminders
const REMINDERS_STORAGE_KEY = 'effort-ledger-reminders';

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    // Fallback for older browsers
    return new Promise((resolve) => {
      Notification.requestPermission((result) => {
        resolve(result);
      });
    });
  }
}

/**
 * Show a notification
 */
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notification = new Notification(title, {
      icon: '/EffortTracker/icons/icon-192.png',
      badge: '/EffortTracker/icons/icon-192.png',
      tag: 'effort-ledger-reminder',
      ...options,
    } as NotificationOptions);

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);

    return notification;
  } catch {
    // Service worker notification fallback
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options,
      });
    }
    return null;
  }
}

/**
 * Show a reminder notification for a task
 */
export function showTaskReminder(
  taskName: string,
  remaining: string,
  onClick?: () => void
): Notification | null {
  const notification = showNotification(
    `Time to work on ${taskName}!`,
    {
      body: `${remaining} remaining to hit your quota`,
      requireInteraction: false,
      silent: false,
    }
  );

  if (notification && onClick) {
    notification.onclick = () => {
      onClick();
      notification.close();
      // Focus the app window
      window.focus();
    };
  }

  return notification;
}

/**
 * Load reminders from storage
 */
export function loadReminders(): ReminderConfig[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(REMINDERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save reminders to storage
 */
export function saveReminders(reminders: ReminderConfig[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  } catch {
    // Storage error
  }
}

/**
 * Add or update a reminder
 */
export function setReminder(config: ReminderConfig): void {
  const reminders = loadReminders();
  const existingIndex = reminders.findIndex((r) => r.taskId === config.taskId);

  if (existingIndex >= 0) {
    reminders[existingIndex] = config;
  } else {
    reminders.push(config);
  }

  saveReminders(reminders);
}

/**
 * Remove a reminder
 */
export function removeReminder(taskId: string): void {
  const reminders = loadReminders().filter((r) => r.taskId !== taskId);
  saveReminders(reminders);
}

/**
 * Get reminder for a specific task
 */
export function getReminder(taskId: string): ReminderConfig | null {
  const reminders = loadReminders();
  return reminders.find((r) => r.taskId === taskId) || null;
}

/**
 * Check if current time is within reminder window
 */
function isWithinTimeWindow(startTime?: string, endTime?: string): boolean {
  if (!startTime && !endTime) return true;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (startTime) {
    const [startH, startM] = startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    if (currentMinutes < startMinutes) return false;
  }

  if (endTime) {
    const [endH, endM] = endTime.split(':').map(Number);
    const endMinutes = endH * 60 + endM;
    if (currentMinutes > endMinutes) return false;
  }

  return true;
}

// Active reminder intervals
const activeIntervals = new Map<string, number>();

/**
 * Start reminder checking for a task
 */
export function startReminderInterval(
  taskId: string,
  taskName: string,
  intervalMinutes: number,
  getRemaining: () => string,
  onClick?: () => void
): void {
  // Stop existing interval for this task
  stopReminderInterval(taskId);

  const config = getReminder(taskId);
  if (!config?.enabled) return;

  const intervalMs = intervalMinutes * 60 * 1000;

  const intervalId = window.setInterval(() => {
    // Check if still enabled
    const currentConfig = getReminder(taskId);
    if (!currentConfig?.enabled) {
      stopReminderInterval(taskId);
      return;
    }

    // Check time window
    if (!isWithinTimeWindow(currentConfig.startTime, currentConfig.endTime)) {
      return;
    }

    // Show reminder
    showTaskReminder(taskName, getRemaining(), onClick);
  }, intervalMs);

  activeIntervals.set(taskId, intervalId);
}

/**
 * Stop reminder checking for a task
 */
export function stopReminderInterval(taskId: string): void {
  const intervalId = activeIntervals.get(taskId);
  if (intervalId) {
    clearInterval(intervalId);
    activeIntervals.delete(taskId);
  }
}

/**
 * Stop all reminder intervals
 */
export function stopAllReminders(): void {
  activeIntervals.forEach((intervalId) => {
    clearInterval(intervalId);
  });
  activeIntervals.clear();
}

// Quick preset intervals (in minutes)
export const REMINDER_PRESETS = [
  { label: 'Every minute', value: 1 },
  { label: 'Every 5 minutes', value: 5 },
  { label: 'Every 15 minutes', value: 15 },
  { label: 'Every 30 minutes', value: 30 },
  { label: 'Every hour', value: 60 },
];
