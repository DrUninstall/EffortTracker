'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Simple fade-in animation for page content.
 * We avoid AnimatePresence mode="wait" as it can cause blank screens
 * when pages have their own AnimatePresence or layout animations.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.15,
        ease: 'easeOut',
      }}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}
    >
      {children}
    </motion.div>
  );
}
