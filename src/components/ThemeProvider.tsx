'use client';

import { useEffect } from 'react';
import { useTaskStore } from '@/stores/taskStore';

export function ThemeProvider() {
  const theme = useTaskStore((state) => state.settings.theme);
  const isHydrated = useTaskStore((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;

    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme !== 'system') {
      root.classList.add(theme);
    }
  }, [theme, isHydrated]);

  return null;
}
