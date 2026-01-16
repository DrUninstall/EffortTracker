'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { TaskProgress } from '@/types';
import styles from './DailyProgressRing.module.css';

interface DailyProgressRingProps {
  progress: TaskProgress[];
}

export function DailyProgressRing({ progress }: DailyProgressRingProps) {
  // Calculate overall progress
  const stats = useMemo(() => {
    if (progress.length === 0) {
      return { completed: 0, total: 0, allDone: false };
    }

    const completed = progress.filter(p => p.isDone).length;
    const total = progress.length;
    const allDone = completed === total;

    return { completed, total, allDone };
  }, [progress]);

  // Get completion status for each task in order
  const segments = useMemo(() => {
    return progress.map((p, index) => ({
      id: p.task.id,
      isDone: p.isDone,
      index,
    }));
  }, [progress]);

  if (progress.length === 0) {
    return null;
  }

  return (
    <div
      className={styles.container}
      role="region"
      aria-label={`Daily progress: ${stats.completed} of ${stats.total} quotas hit`}
    >
      <div className={styles.barWrapper}>
        <div className={styles.segmentedBar}>
          {segments.map((segment, index) => (
            <motion.div
              key={segment.id}
              className={`${styles.segment} ${segment.isDone ? styles.segmentFilled : ''}`}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                ease: 'easeOut'
              }}
            />
          ))}
        </div>
        <div className={styles.statusText}>
          {stats.allDone ? (
            <span className={styles.allDone}>
              <Sparkles size={14} />
              All done!
            </span>
          ) : (
            <span className={styles.progress}>
              {stats.completed}/{stats.total}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
