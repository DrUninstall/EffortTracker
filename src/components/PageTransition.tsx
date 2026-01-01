'use client';

import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Wrapper for page content.
 * Framer Motion animations were causing issues with page transitions,
 * so we use a simple CSS-based approach instead.
 */
export function PageTransition({ children }: PageTransitionProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}
    >
      {children}
    </div>
  );
}
