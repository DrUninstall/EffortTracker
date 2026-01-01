'use client';

import React from 'react';
import { FloatingTimerBar } from '@/components/timer/FloatingTimerBar';
import { Toaster } from '@/components/ui/Toast';
import { ThemeProvider } from '@/components/ThemeProvider';
import { OnboardingContainer } from '@/components/onboarding';
import { PageTransition } from '@/components/PageTransition';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Client-side app shell that provides:
 * - Theme management (light/dark/system)
 * - Onboarding flow for new users
 * - Page transitions between routes
 * - Floating timer bar (persistent across pages)
 * - Toast notifications
 *
 * Note: Navigation is rendered outside AppShell in layout.tsx
 * to prevent it from being affected by page transitions.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <ThemeProvider />
      <OnboardingContainer>
        <PageTransition>
          {children}
        </PageTransition>
        <FloatingTimerBar />
      </OnboardingContainer>
      <Toaster />
    </>
  );
}
