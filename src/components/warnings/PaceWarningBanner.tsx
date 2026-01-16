'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { TaskWarning } from '@/types';
import { Button } from '@/components/ui/button';
import styles from './PaceWarningBanner.module.css';

interface PaceWarningBannerProps {
  warning: TaskWarning;
  onDismiss: () => void;
  onNavigateToTask?: (taskId: string) => void;
}

export function PaceWarningBanner({
  warning,
  onDismiss,
  onNavigateToTask,
}: PaceWarningBannerProps) {
  return (
    <AnimatePresence>
      <motion.div
        className={`${styles.banner} ${styles[warning.severity]}`}
        role="alert"
        aria-live="polite"
        aria-label={`Pace warning for ${warning.taskName}: ${warning.message}`}
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className={styles.content}>
          <AlertTriangle className={styles.icon} aria-hidden="true" />
          <div className={styles.text}>
            <span className={styles.taskName}>{warning.taskName}</span>
            <span className={styles.message} aria-hidden="true">{warning.message}</span>
          </div>
        </div>
        <div className={styles.actions}>
          {onNavigateToTask && (
            <Button
              variant="ghost"
              size="sm"
              className={styles.viewButton}
              onClick={() => onNavigateToTask(warning.taskId)}
            >
              View
              <ChevronRight size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={styles.dismissButton}
            onClick={onDismiss}
            aria-label="Dismiss warning"
          >
            <X size={16} />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
