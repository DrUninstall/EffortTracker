'use client';

import { useEffect } from 'react';
import { useTaskStore } from '@/stores/taskStore';

/**
 * Handles Zustand store hydration from IndexedDB
 * This component triggers hydration on mount
 */
export function HydrationHandler() {
  useEffect(() => {
    // Zustand persist middleware handles hydration automatically
    // This is just a placeholder for any additional initialization logic
    const unsubscribe = useTaskStore.persist.onFinishHydration(() => {
      console.log('Store hydration complete');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return null;
}
