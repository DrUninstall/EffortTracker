'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '@/stores/taskStore';
import { Task, IncrementLog, TaskHistoryStats } from '@/types';
import { CalendarHeatMap } from '@/components/history/CalendarHeatMap';
import { WeeklySummary } from '@/components/history/WeeklySummary';
import { EffortChart } from '@/components/history/EffortChart';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getToday,
  getDaysAgo,
  getDateRange,
  getISOWeekRange,
  getISOWeeksInRange,
  formatMinutes,
  formatDateDisplayFull,
} from '@/utils/date';
import styles from './page.module.css';

type DateRangeOption = '7' | '30' | '365' | 'custom';

export default function HistoryPage() {
  const { tasks, logs, isHydrated } = useTaskStore();
  const [rangeOption, setRangeOption] = useState<DateRangeOption>('7');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('all');

  // Compute date range
  const dateRange = useMemo(() => {
    const today = getToday();
    const days = parseInt(rangeOption) || 7;
    return {
      start: getDaysAgo(days - 1, today),
      end: today,
    };
  }, [rangeOption]);

  // Get active tasks
  const activeTasks = useMemo(() => {
    return tasks.filter((t) => !t.is_archived);
  }, [tasks]);

  // Calculate stats for each task
  const taskStats = useMemo(() => {
    const stats: Map<string, TaskHistoryStats> = new Map();

    activeTasks.forEach((task) => {
      const taskLogs = logs.filter(
        (l) =>
          l.task_id === task.id &&
          l.date >= dateRange.start &&
          l.date <= dateRange.end
      );

      const isHabit = task.task_type === 'HABIT';

      if (isHabit) {
        if (task.quota_type === 'DAILY') {
          const dailyStats = computeDailyHabitStats(task, taskLogs, dateRange);
          stats.set(task.id, dailyStats);
        } else {
          const weeklyStats = computeWeeklyHabitStats(task, taskLogs, dateRange);
          stats.set(task.id, weeklyStats);
        }
      } else {
        if (task.quota_type === 'DAILY') {
          const dailyStats = computeDailyStats(task, taskLogs, dateRange);
          stats.set(task.id, dailyStats);
        } else {
          const weeklyStats = computeWeeklyStats(task, taskLogs, dateRange);
          stats.set(task.id, weeklyStats);
        }
      }
    });

    return stats;
  }, [activeTasks, logs, dateRange]);

  // Filtered stats
  const filteredStats = useMemo(() => {
    if (selectedTaskId === 'all') {
      return Array.from(taskStats.values());
    }
    const stat = taskStats.get(selectedTaskId);
    return stat ? [stat] : [];
  }, [taskStats, selectedTaskId]);

  // Calculate totals
  const totals = useMemo(() => {
    // Separate time-based and habit stats
    const timeStats = filteredStats.filter((s) => {
      const task = activeTasks.find((t) => t.id === s.taskId);
      return task?.task_type === 'TIME';
    });
    const habitStats = filteredStats.filter((s) => {
      const task = activeTasks.find((t) => t.id === s.taskId);
      return task?.task_type === 'HABIT';
    });

    const totalMinutes = timeStats.reduce(
      (sum, s) => sum + s.totalMinutes,
      0
    );
    const totalCompletions = habitStats.reduce(
      (sum, s) => sum + (s.totalCount || 0),
      0
    );
    const avgHitRate =
      filteredStats.length > 0
        ? filteredStats.reduce((sum, s) => sum + s.quotaHitRate, 0) /
          filteredStats.length
        : 0;
    return { totalMinutes, totalCompletions, avgHitRate, hasTimeStats: timeStats.length > 0, hasHabitStats: habitStats.length > 0 };
  }, [filteredStats, activeTasks]);

  if (!isHydrated) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>History</h1>
        <p className={styles.subtitle}>
          {formatDateDisplayFull(dateRange.start)} –{' '}
          {formatDateDisplayFull(dateRange.end)}
        </p>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <Select value={rangeOption} onValueChange={(v) => setRangeOption(v as DateRangeOption)}>
          <SelectTrigger className={styles.filterSelect}>
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
          <SelectTrigger className={styles.filterSelect}>
            <SelectValue placeholder="Select task" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tasks</SelectItem>
            {activeTasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {task.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className={styles.summary}>
        {totals.hasTimeStats && (
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Total Effort</span>
            <span className={styles.summaryValue}>
              {formatMinutes(totals.totalMinutes)}
            </span>
          </div>
        )}
        {totals.hasHabitStats && (
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Completions</span>
            <span className={styles.summaryValue}>
              {totals.totalCompletions}
            </span>
          </div>
        )}
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Avg Hit Rate</span>
          <span className={styles.summaryValue}>
            {Math.round(totals.avgHitRate)}%
          </span>
        </div>
      </div>

      {/* Weekly Summary */}
      <WeeklySummary />

      {/* Calendar Heat Map */}
      <CalendarHeatMap />

      {/* Effort Chart */}
      <EffortChart />

      {/* Task Stats */}
      <div className={styles.statsGrid}>
        {filteredStats.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No data for this period</p>
          </div>
        ) : (
          filteredStats.map((stat) => {
            const task = activeTasks.find((t) => t.id === stat.taskId);
            if (!task) return null;

            const isHabit = task.task_type === 'HABIT';

            return (
              <motion.div
                key={stat.taskId}
                className={styles.statCard}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className={styles.statTaskName}>{task.name}</h3>
                <div className={styles.statGrid}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Total</span>
                    <span className={styles.statValue}>
                      {isHabit
                        ? `${stat.totalCount || 0} ${task.habit_unit || 'times'}`
                        : formatMinutes(stat.totalMinutes)}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Avg/day</span>
                    <span className={styles.statValue}>
                      {isHabit
                        ? (stat.avgCountPerDay || 0).toFixed(1)
                        : formatMinutes(Math.round(stat.avgMinutesPerDay))}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Hit Rate</span>
                    <span
                      className={styles.statValue}
                      data-status={
                        stat.quotaHitRate >= 80
                          ? 'good'
                          : stat.quotaHitRate >= 50
                          ? 'ok'
                          : 'low'
                      }
                    >
                      {Math.round(stat.quotaHitRate)}%
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Longest Streak</span>
                    <span className={styles.statValue}>
                      {stat.longestStreak}{' '}
                      {task.quota_type === 'DAILY' ? 'days' : 'weeks'}
                    </span>
                  </div>
                  {!isHabit && task.quota_type === 'DAILY' && stat.avgOverflow > 0 && (
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Avg Overflow</span>
                      <span className={styles.statValue}>
                        +{formatMinutes(Math.round(stat.avgOverflow))}
                      </span>
                    </div>
                  )}
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Days Logged</span>
                    <span className={styles.statValue}>
                      {stat.daysWithLogs}/{stat.daysInRange}
                    </span>
                  </div>
                </div>

                {/* Calibration hints */}
                {renderCalibrationHint(task, stat)}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Helper function to compute daily task stats
function computeDailyStats(
  task: Task,
  logs: IncrementLog[],
  dateRange: { start: string; end: string }
): TaskHistoryStats {
  const dailyQuota = task.daily_quota_minutes || 0;
  const dates = getDateRange(dateRange.start, dateRange.end);

  // Group logs by date
  const logsByDate = new Map<string, number>();
  logs.forEach((log) => {
    const current = logsByDate.get(log.date) || 0;
    logsByDate.set(log.date, current + log.minutes);
  });

  let totalMinutes = 0;
  let daysHit = 0;
  let daysWithLogs = 0;
  let totalOverflow = 0;
  let currentStreak = 0;
  let longestStreak = 0;

  dates.forEach((date) => {
    const dayMinutes = logsByDate.get(date) || 0;
    totalMinutes += dayMinutes;

    if (dayMinutes > 0) {
      daysWithLogs++;
    }

    if (dayMinutes >= dailyQuota) {
      daysHit++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
      totalOverflow += dayMinutes - dailyQuota;
    } else {
      currentStreak = 0;
    }
  });

  const daysInRange = dates.length;
  const quotaHitRate = daysInRange > 0 ? (daysHit / daysInRange) * 100 : 0;
  const avgMinutesPerDay = daysInRange > 0 ? totalMinutes / daysInRange : 0;
  const avgOverflow = daysHit > 0 ? totalOverflow / daysHit : 0;

  return {
    taskId: task.id,
    totalMinutes,
    avgMinutesPerDay,
    quotaHitRate,
    avgOverflow,
    longestStreak,
    daysInRange,
    daysWithLogs,
  };
}

// Helper function to compute weekly task stats
function computeWeeklyStats(
  task: Task,
  logs: IncrementLog[],
  dateRange: { start: string; end: string }
): TaskHistoryStats {
  const weeklyQuota = task.weekly_quota_minutes || 0;
  const weeks = getISOWeeksInRange(dateRange.start, dateRange.end);
  const dates = getDateRange(dateRange.start, dateRange.end);

  // Group logs by week
  const logsByWeek = new Map<string, number>();
  logs.forEach((log) => {
    const week = getISOWeekRange(log.date);
    const current = logsByWeek.get(week.start) || 0;
    logsByWeek.set(week.start, current + log.minutes);
  });

  let totalMinutes = 0;
  let weeksHit = 0;
  let currentStreak = 0;
  let longestStreak = 0;

  weeks.forEach((week) => {
    const weekMinutes = logsByWeek.get(week.start) || 0;
    totalMinutes += weekMinutes;

    if (weekMinutes >= weeklyQuota) {
      weeksHit++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  const weeksInRange = weeks.length;
  const daysInRange = dates.length;
  const daysWithLogs = new Set(logs.map((l) => l.date)).size;
  const quotaHitRate = weeksInRange > 0 ? (weeksHit / weeksInRange) * 100 : 0;
  const avgMinutesPerDay = daysInRange > 0 ? totalMinutes / daysInRange : 0;

  return {
    taskId: task.id,
    totalMinutes,
    avgMinutesPerDay,
    quotaHitRate,
    avgOverflow: 0, // Not applicable for weekly
    longestStreak,
    daysInRange,
    daysWithLogs,
  };
}

// Helper function to compute daily HABIT task stats
function computeDailyHabitStats(
  task: Task,
  logs: IncrementLog[],
  dateRange: { start: string; end: string }
): TaskHistoryStats {
  const habitQuota = task.habit_quota_count || 0;
  const dates = getDateRange(dateRange.start, dateRange.end);

  // Group logs by date
  const logsByDate = new Map<string, number>();
  logs.forEach((log) => {
    const current = logsByDate.get(log.date) || 0;
    logsByDate.set(log.date, current + (log.count || 0));
  });

  let totalCount = 0;
  let daysHit = 0;
  let daysWithLogs = 0;
  let currentStreak = 0;
  let longestStreak = 0;

  dates.forEach((date) => {
    const dayCount = logsByDate.get(date) || 0;
    totalCount += dayCount;

    if (dayCount > 0) {
      daysWithLogs++;
    }

    if (dayCount >= habitQuota) {
      daysHit++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  const daysInRange = dates.length;
  const quotaHitRate = daysInRange > 0 ? (daysHit / daysInRange) * 100 : 0;
  const avgCountPerDay = daysInRange > 0 ? totalCount / daysInRange : 0;

  return {
    taskId: task.id,
    totalMinutes: 0,
    totalCount,
    avgMinutesPerDay: 0,
    avgCountPerDay,
    quotaHitRate,
    avgOverflow: 0,
    longestStreak,
    daysInRange,
    daysWithLogs,
  };
}

// Helper function to compute weekly HABIT task stats
function computeWeeklyHabitStats(
  task: Task,
  logs: IncrementLog[],
  dateRange: { start: string; end: string }
): TaskHistoryStats {
  const habitQuota = task.habit_quota_count || 0;
  const weeks = getISOWeeksInRange(dateRange.start, dateRange.end);
  const dates = getDateRange(dateRange.start, dateRange.end);

  // Group logs by week
  const logsByWeek = new Map<string, number>();
  logs.forEach((log) => {
    const week = getISOWeekRange(log.date);
    const current = logsByWeek.get(week.start) || 0;
    logsByWeek.set(week.start, current + (log.count || 0));
  });

  let totalCount = 0;
  let weeksHit = 0;
  let currentStreak = 0;
  let longestStreak = 0;

  weeks.forEach((week) => {
    const weekCount = logsByWeek.get(week.start) || 0;
    totalCount += weekCount;

    if (weekCount >= habitQuota) {
      weeksHit++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  const weeksInRange = weeks.length;
  const daysInRange = dates.length;
  const daysWithLogs = new Set(logs.map((l) => l.date)).size;
  const quotaHitRate = weeksInRange > 0 ? (weeksHit / weeksInRange) * 100 : 0;
  const avgCountPerDay = daysInRange > 0 ? totalCount / daysInRange : 0;

  return {
    taskId: task.id,
    totalMinutes: 0,
    totalCount,
    avgMinutesPerDay: 0,
    avgCountPerDay,
    quotaHitRate,
    avgOverflow: 0,
    longestStreak,
    daysInRange,
    daysWithLogs,
  };
}

// Render calibration hint based on stats
function renderCalibrationHint(task: Task, stat: TaskHistoryStats) {
  // Only show hints for 14+ days of data
  if (stat.daysInRange < 14) return null;

  const isHabit = task.task_type === 'HABIT';

  // High hit rate with overflow - suggest increasing quota (only for time tasks)
  if (!isHabit && stat.quotaHitRate >= 90 && stat.avgOverflow >= 15) {
    return (
      <div className={styles.calibrationHint} data-type="increase">
        <p>
          You consistently exceed your quota. Consider increasing it by{' '}
          {Math.round(stat.avgOverflow)}m.
        </p>
      </div>
    );
  }

  // Low hit rate - suggest reducing quota
  if (stat.quotaHitRate <= 40) {
    return (
      <div className={styles.calibrationHint} data-type="decrease">
        <p>
          This quota seems ambitious. Consider reducing it
          {task.quota_type === 'DAILY' ? ' or switching to weekly' : ''}.
        </p>
      </div>
    );
  }

  return null;
}
