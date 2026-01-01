'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Trophy, Flame, Target } from 'lucide-react';
import { useTaskStore } from '@/stores/taskStore';
import {
  getToday,
  getISOWeekRange,
  getDateRange,
  getDaysAgo,
  formatMinutes,
} from '@/utils/date';
import { calculateTotalHours, getMilestones, getNextMilestone } from '@/utils/records';
import type { Task, IncrementLog, TaskProgress } from '@/types';
import styles from './WeeklySummary.module.css';

interface WeekStats {
  totalMinutes: number;
  quotasHit: number;
  totalQuotas: number;
  bestDayMinutes: number;
  bestDayName: string;
}

function getWeekStats(
  getAllTaskProgress: (date: string) => TaskProgress[],
  logs: IncrementLog[],
  tasks: Task[],
  weekStart: string,
  weekEnd: string
): WeekStats {
  const weekDates = getDateRange(weekStart, weekEnd);
  const activeTasks = tasks.filter((t) => !t.is_archived);
  const timeTasks = activeTasks.filter((t) => t.task_type === 'TIME');

  // Calculate total minutes for the week
  const weekLogs = logs.filter(
    (l) => l.date >= weekStart && l.date <= weekEnd
  );
  const totalMinutes = weekLogs
    .filter((l) => timeTasks.some((t) => t.id === l.task_id))
    .reduce((sum, l) => sum + l.minutes, 0);

  // Count quotas hit
  let quotasHit = 0;
  let totalQuotas = 0;

  weekDates.forEach((date) => {
    const dayProgress = getAllTaskProgress(date);
    dayProgress.forEach((p) => {
      if (p.task.quota_type === 'DAILY') {
        totalQuotas++;
        if (p.isDone) quotasHit++;
      }
    });
  });

  // Add weekly quotas
  activeTasks
    .filter((t) => t.quota_type === 'WEEKLY')
    .forEach(() => {
      totalQuotas++;
      // Check if weekly quota was hit
      // (simplified - just count if any weekly task is done today)
    });

  // Find best day of the week
  const dailyMinutes = new Map<string, number>();
  weekDates.forEach((date) => {
    const dayLogs = weekLogs.filter((l) => l.date === date);
    const dayMinutes = dayLogs.reduce((sum, l) => sum + l.minutes, 0);
    dailyMinutes.set(date, dayMinutes);
  });

  let bestDayMinutes = 0;
  let bestDayDate = '';
  dailyMinutes.forEach((minutes, date) => {
    if (minutes > bestDayMinutes) {
      bestDayMinutes = minutes;
      bestDayDate = date;
    }
  });

  const bestDayName = bestDayDate
    ? new Date(bestDayDate).toLocaleDateString('en-US', { weekday: 'long' })
    : '';

  return {
    totalMinutes,
    quotasHit,
    totalQuotas,
    bestDayMinutes,
    bestDayName,
  };
}

export function WeeklySummary() {
  const { getAllTaskProgress, logs, tasks, isHydrated } = useTaskStore();

  const summaryData = useMemo(() => {
    if (!isHydrated) return null;

    const today = getToday();
    const { start: thisWeekStart, end: thisWeekEnd } = getISOWeekRange(today);

    // Get last week's date
    const lastWeekDay = getDaysAgo(7, today);
    const { start: lastWeekStart, end: lastWeekEnd } = getISOWeekRange(lastWeekDay);

    const thisWeek = getWeekStats(getAllTaskProgress, logs, tasks, thisWeekStart, thisWeekEnd);
    const lastWeek = getWeekStats(getAllTaskProgress, logs, tasks, lastWeekStart, lastWeekEnd);

    // Calculate trends
    const minutesTrend = lastWeek.totalMinutes > 0
      ? ((thisWeek.totalMinutes - lastWeek.totalMinutes) / lastWeek.totalMinutes) * 100
      : 0;
    const quotasTrend = lastWeek.quotasHit > 0
      ? ((thisWeek.quotasHit - lastWeek.quotasHit) / lastWeek.quotasHit) * 100
      : 0;

    // All-time stats
    const totalHours = calculateTotalHours(logs, tasks);
    const milestones = getMilestones(totalHours);
    const nextMilestone = getNextMilestone(totalHours);
    const progress = nextMilestone
      ? ((totalHours - (milestones[milestones.length - 1] || 0)) / (nextMilestone - (milestones[milestones.length - 1] || 0))) * 100
      : 100;

    return {
      thisWeek,
      lastWeek,
      minutesTrend,
      quotasTrend,
      totalHours,
      latestMilestone: milestones[milestones.length - 1] || 0,
      nextMilestone,
      milestoneProgress: progress,
    };
  }, [getAllTaskProgress, logs, tasks, isHydrated]);

  if (!isHydrated || !summaryData) {
    return null;
  }

  const { thisWeek, minutesTrend, quotasTrend, totalHours, nextMilestone, milestoneProgress } = summaryData;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>This Week</h3>

      <div className={styles.statsGrid}>
        {/* Total Effort */}
        <motion.div
          className={styles.statCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <div className={styles.statHeader}>
            <Target size={16} className={styles.statIcon} />
            <span className={styles.statLabel}>Total Effort</span>
          </div>
          <div className={styles.statValue}>{formatMinutes(thisWeek.totalMinutes)}</div>
          <TrendIndicator value={minutesTrend} />
        </motion.div>

        {/* Quotas Hit */}
        <motion.div
          className={styles.statCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={styles.statHeader}>
            <Flame size={16} className={styles.statIcon} />
            <span className={styles.statLabel}>Quotas Hit</span>
          </div>
          <div className={styles.statValue}>
            {thisWeek.quotasHit}
            <span className={styles.statTotal}>/{thisWeek.totalQuotas}</span>
          </div>
          <TrendIndicator value={quotasTrend} />
        </motion.div>

        {/* Best Day */}
        {thisWeek.bestDayMinutes > 0 && (
          <motion.div
            className={styles.statCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={styles.statHeader}>
              <Trophy size={16} className={styles.statIcon} />
              <span className={styles.statLabel}>Best Day</span>
            </div>
            <div className={styles.statValue}>{formatMinutes(thisWeek.bestDayMinutes)}</div>
            <span className={styles.statNote}>{thisWeek.bestDayName}</span>
          </motion.div>
        )}
      </div>

      {/* Milestone Progress */}
      {nextMilestone && (
        <motion.div
          className={styles.milestoneCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className={styles.milestoneHeader}>
            <span className={styles.milestoneLabel}>Next Milestone</span>
            <span className={styles.milestoneTarget}>{nextMilestone}h</span>
          </div>
          <div className={styles.milestoneBar}>
            <motion.div
              className={styles.milestoneProgress}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, milestoneProgress)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
            />
          </div>
          <span className={styles.milestoneNote}>
            {totalHours}h logged ({Math.round(milestoneProgress)}% to {nextMilestone}h)
          </span>
        </motion.div>
      )}
    </div>
  );
}

function TrendIndicator({ value }: { value: number }) {
  if (Math.abs(value) < 1) {
    return (
      <span className={`${styles.trend} ${styles.trendNeutral}`}>
        <Minus size={12} />
        <span>Same as last week</span>
      </span>
    );
  }

  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const className = isPositive ? styles.trendUp : styles.trendDown;

  return (
    <span className={`${styles.trend} ${className}`}>
      <Icon size={12} />
      <span>{Math.abs(Math.round(value))}% vs last week</span>
    </span>
  );
}
