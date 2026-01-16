'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Target } from 'lucide-react';
import { TaskProgress } from '@/types';
import styles from './DailyProgressRing.module.css';

interface DailyProgressRingProps {
  progress: TaskProgress[];
}

export function DailyProgressRing({ progress }: DailyProgressRingProps) {
  // Calculate overall progress
  const stats = useMemo(() => {
    if (progress.length === 0) {
      return { percent: 0, completed: 0, total: 0, allDone: false };
    }

    const completed = progress.filter(p => p.isDone).length;
    const total = progress.length;
    const percent = Math.round((completed / total) * 100);
    const allDone = completed === total;

    return { percent, completed, total, allDone };
  }, [progress]);

  // SVG ring calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.percent / 100) * circumference;

  if (progress.length === 0) {
    return null;
  }

  return (
    <div
      className={styles.container}
      role="region"
      aria-label={`Daily progress: ${stats.percent}% complete, ${stats.completed} of ${stats.total} quotas hit`}
    >
      <div className={styles.ringWrapper}>
        <svg className={styles.ring} viewBox="0 0 120 120">
          {/* Background ring */}
          <circle
            className={styles.ringBg}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="8"
          />
          {/* Progress ring */}
          <motion.circle
            className={`${styles.ringProgress} ${stats.allDone ? styles.ringComplete : ''}`}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            transform="rotate(-90 60 60)"
          />
        </svg>

        {/* Center content */}
        <div className={styles.centerContent}>
          {stats.allDone ? (
            <motion.div
              className={styles.doneIcon}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Sparkles size={24} />
            </motion.div>
          ) : (
            <div className={styles.statsDisplay}>
              <span className={styles.percent}>{stats.percent}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Status text */}
      <div className={styles.statusText}>
        {stats.allDone ? (
          <span className={styles.allDone}>All quotas complete!</span>
        ) : (
          <span className={styles.progress}>
            <Target size={14} />
            {stats.completed}/{stats.total} quotas hit
          </span>
        )}
      </div>
    </div>
  );
}
