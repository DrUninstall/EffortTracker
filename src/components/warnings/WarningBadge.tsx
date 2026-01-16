'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { WarningSeverity } from '@/types';
import styles from './WarningBadge.module.css';

interface WarningBadgeProps {
  severity: WarningSeverity;
  message?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function WarningBadge({
  severity,
  message,
  size = 'sm',
  showIcon = true,
}: WarningBadgeProps) {
  if (severity === 'none') return null;

  const indicatorCount = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 3,
  }[severity];

  return (
    <span
      className={`${styles.badge} ${styles[severity]} ${styles[size]}`}
      title={message}
      aria-label={message || `${severity} warning`}
    >
      {showIcon && (
        <AlertTriangle className={styles.icon} aria-hidden="true" />
      )}
      <span className={styles.indicators} aria-hidden="true">
        {'!'.repeat(indicatorCount)}
      </span>
    </span>
  );
}
