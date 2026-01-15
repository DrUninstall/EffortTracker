'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Play, Plus, X } from 'lucide-react';
import { TaskRecommendation } from '@/types';
import { Button } from '@/components/ui/button';
import { formatDailyTarget } from '@/utils/taskRecommendation';
import styles from './TaskGuidanceCard.module.css';

interface TaskGuidanceCardProps {
  recommendation: TaskRecommendation;
  onStartTimer: () => void;
  onQuickAdd: (amount: number) => void;
  onDismiss: () => void;
  habitUnit?: string;
}

export function TaskGuidanceCard({
  recommendation,
  onStartTimer,
  onQuickAdd,
  onDismiss,
  habitUnit,
}: TaskGuidanceCardProps) {
  const targetText = formatDailyTarget(
    recommendation.dailyTarget,
    recommendation.isHabit,
    habitUnit
  );

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.header}>
        <div className={styles.labelRow}>
          <Sparkles className={styles.icon} size={14} />
          <span className={styles.label}>Next up</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={styles.dismissButton}
          onClick={onDismiss}
          aria-label="Dismiss suggestion"
        >
          <X size={14} />
        </Button>
      </div>

      <div className={styles.content}>
        <h3 className={styles.taskName}>{recommendation.taskName}</h3>
        {targetText && (
          <p className={styles.target}>{targetText}</p>
        )}
        <p className={styles.reason}>{recommendation.reason}</p>
      </div>

      <div className={styles.actions}>
        {!recommendation.isHabit && (
          <Button
            variant="default"
            size="sm"
            className={styles.primaryAction}
            onClick={onStartTimer}
          >
            <Play size={14} />
            Start Timer
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className={styles.secondaryAction}
          onClick={() => onQuickAdd(recommendation.isHabit ? 1 : 25)}
        >
          <Plus size={14} />
          {recommendation.isHabit ? '+1' : '+25m'}
        </Button>
      </div>
    </motion.div>
  );
}
