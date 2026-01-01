'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface ShortcutHandlers {
  onNewTask?: () => void;
  onQuickAddToTask?: (taskIndex: number) => void;
  onShowShortcuts?: () => void;
}

/**
 * Global keyboard shortcuts hook
 *
 * Shortcuts:
 * - g t: Go to Today (home)
 * - g h: Go to History
 * - g s: Go to Settings
 * - n: New task dialog
 * - 1-9: Quick add to task #N (5 minutes)
 * - ?: Show shortcuts modal
 * - Escape: Close any open dialog
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const pendingKey = useRef<string | null>(null);
  const pendingTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore if any modifier keys are held (except shift for ?)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      // Handle "g" prefix for navigation
      if (pendingKey.current === 'g') {
        pendingKey.current = null;
        if (pendingTimeout.current) {
          clearTimeout(pendingTimeout.current);
          pendingTimeout.current = null;
        }

        switch (key) {
          case 't':
            event.preventDefault();
            router.push('/');
            return;
          case 'h':
            event.preventDefault();
            router.push('/history');
            return;
          case 's':
            event.preventDefault();
            router.push('/settings');
            return;
        }
        return;
      }

      // Start "g" prefix sequence
      if (key === 'g') {
        pendingKey.current = 'g';
        // Clear after 500ms if no follow-up key
        pendingTimeout.current = setTimeout(() => {
          pendingKey.current = null;
        }, 500);
        return;
      }

      // Single key shortcuts
      switch (key) {
        case 'n':
          event.preventDefault();
          handlers.onNewTask?.();
          return;

        case '?':
          event.preventDefault();
          handlers.onShowShortcuts?.();
          return;

        case 'escape':
          // Escape is typically handled by individual dialogs
          return;

        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          // Quick-add to task N (only on home page)
          if (pathname === '/' || pathname === '') {
            event.preventDefault();
            const taskIndex = parseInt(key) - 1;
            handlers.onQuickAddToTask?.(taskIndex);
          }
          return;
      }
    },
    [router, pathname, handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (pendingTimeout.current) {
        clearTimeout(pendingTimeout.current);
      }
    };
  }, [handleKeyDown]);
}

/**
 * Shortcuts reference for display
 */
export const KEYBOARD_SHORTCUTS = [
  { keys: ['g', 't'], description: 'Go to Today' },
  { keys: ['g', 'h'], description: 'Go to History' },
  { keys: ['g', 's'], description: 'Go to Settings' },
  { keys: ['n'], description: 'New task' },
  { keys: ['1-9'], description: 'Quick add to task #N' },
  { keys: ['?'], description: 'Show shortcuts' },
  { keys: ['Esc'], description: 'Close dialog' },
];
