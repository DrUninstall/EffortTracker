'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Play, Undo2 } from 'lucide-react';
import { TaskProgress, LogSource } from '@/types';
import { formatMinutes } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  taskProgress: TaskProgress;
  onQuickAdd: (minutes: number) => void;
  onStartTimer: () => void;
  onUndo: () => boolean;
  canUndo: boolean;
}

const QUICK_ADD_OPTIONS = [5, 10, 15, 25];

const PRIORITY_LABELS = {
  CORE: 'Core',
  IMPORTANT: 'Important',
  OPTIONAL: 'Optional',
};

const PRIORITY_COLORS = {
  CORE: 'var(--priority-core)',
  IMPORTANT: 'var(--priority-important)',
  OPTIONAL: 'var(--priority-optional)',
};

export function TaskCard({
  taskProgress,
  onQuickAdd,
  onStartTimer,
  onUndo,
  canUndo,
}: TaskCardProps) {
  const { task, progress, effectiveQuota, remaining, isDone, carryoverApplied } =
    taskProgress;

  const progressPercent = Math.min(100, (progress / effectiveQuota) * 100);
  const quotaLabel =
    task.quota_type === 'DAILY'
      ? `${task.daily_quota_minutes}m/day`
      : `${task.weekly_quota_minutes}m/week`;

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={
        {
          '--card-accent': task.color || PRIORITY_COLORS[task.priority],
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span
            className={styles.priorityDot}
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
            title={PRIORITY_LABELS[task.priority]}
          />
          <h3 className={styles.name}>{task.name}</h3>
          <AnimatePresence>
            {isDone && (
              <motion.div
                className={styles.doneIndicator}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Check size={16} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className={styles.quotaInfo}>
          <span className={styles.quotaLabel}>{quotaLabel}</span>
          {carryoverApplied > 0 && (
            <span className={styles.carryover}>
              (−{carryoverApplied}m carryover)
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressSection}>
        <Progress
          value={progressPercent}
          className={styles.progressBar}
          indicatorClassName={isDone ? styles.progressComplete : undefined}
          aria-label={`Progress: ${progress} of ${effectiveQuota} minutes`}
        />
        <div className={styles.progressStats}>
          <span className={styles.progressValue}>{formatMinutes(progress)}</span>
          <span className={styles.progressDivider}>/</span>
          <span className={styles.quotaValue}>{formatMinutes(effectiveQuota)}</span>
          {!isDone && remaining > 0 && (
            <span className={styles.remaining}>
              ({formatMinutes(remaining)} left)
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <div className={styles.quickAddButtons}>
          {QUICK_ADD_OPTIONS.map((minutes) => (
            <Button
              key={minutes}
              variant="outline"
              size="sm"
              className={styles.quickAddButton}
              onClick={() => onQuickAdd(minutes)}
            >
              +{minutes}
            </Button>
          ))}
        </div>
        <div className={styles.mainActions}>
          {canUndo && (
            <Button
              variant="ghost"
              size="icon"
              className={styles.undoButton}
              onClick={onUndo}
              title="Undo last log"
            >
              <Undo2 size={18} />
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            className={styles.startButton}
            onClick={onStartTimer}
          >
            <Play size={16} />
            Start
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
