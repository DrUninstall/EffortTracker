'use client';

import React from 'react';
import type { FocusScore as FocusScoreType } from '@/types';
import styles from './FocusScore.module.css';

interface FocusScoreProps {
  score: FocusScoreType;
}

export function FocusScore({ score }: FocusScoreProps) {
  if (score.total_minutes === 0) {
    return null; // Don't show if no time logged today
  }

  const { focus_percentage, status, core_minutes, total_minutes } = score;

  const statusConfig = {
    excellent: {
      label: 'Excellent Focus',
      color: '#10b981', // green
      emoji: '🎯',
    },
    good: {
      label: 'Good Focus',
      color: '#3b82f6', // blue
      emoji: '✅',
    },
    fair: {
      label: 'Fair Focus',
      color: '#f59e0b', // orange
      emoji: '⚠️',
    },
    poor: {
      label: 'Low Focus',
      color: '#ef4444', // red
      emoji: '🔴',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={styles.container} data-status={status}>
      <div className={styles.header}>
        <span className={styles.emoji}>{config.emoji}</span>
        <div>
          <h3 className={styles.label}>{config.label}</h3>
          <p className={styles.subtitle}>
            {core_minutes}m CORE / {total_minutes}m total
          </p>
        </div>
      </div>

      <div className={styles.scoreDisplay}>
        <div className={styles.percentage}>{focus_percentage}%</div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${focus_percentage}%`,
              backgroundColor: config.color,
            }}
          />
        </div>
      </div>

      {status === 'poor' && (
        <div className={styles.warning}>
          You're spreading too thin. Focus on CORE priorities.
        </div>
      )}

      {status === 'excellent' && (
        <div className={styles.praise}>
          Great focus today! You're crushing your core work.
        </div>
      )}
    </div>
  );
}
