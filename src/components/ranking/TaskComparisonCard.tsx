'use client';

import React from 'react';
import { Task } from '@/types';
import styles from './TaskComparisonCard.module.css';

interface TaskComparisonCardProps {
  task: Task;
  showRank?: boolean;
}

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

function formatQuota(task: Task): string {
  if (task.task_type === 'HABIT') {
    const count = task.habit_quota_count || 0;
    const unit = task.habit_unit || 'times';
    if (task.quota_type === 'DAILY') {
      return `${count} ${unit}/day`;
    } else {
      return `${count} ${unit}/week`;
    }
  }

  // TIME task
  const minutes = task.quota_type === 'DAILY'
    ? task.daily_quota_minutes || 0
    : task.weekly_quota_minutes || 0;

  const quotaLabel = task.quota_type === 'DAILY' ? '/day' : '/week';

  return `${minutes}m${quotaLabel}`;
}

export function TaskComparisonCard({ task, showRank = false }: TaskComparisonCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div
          className={styles.priorityDot}
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
        />
        <h3 className={styles.name}>{task.name}</h3>
      </div>
      <div className={styles.meta}>
        <span className={styles.quota}>{formatQuota(task)}</span>
        <span className={styles.separator}>•</span>
        <span className={styles.priority}>{PRIORITY_LABELS[task.priority]}</span>
        {showRank && task.priorityRank !== undefined && (
          <>
            <span className={styles.separator}>•</span>
            <span className={styles.rank}>Rank #{task.priorityRank}</span>
          </>
        )}
      </div>
    </div>
  );
}
