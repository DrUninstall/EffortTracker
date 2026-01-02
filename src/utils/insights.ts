/**
 * History Insights Generator
 *
 * Provides pattern detection and calibration hints based on user data.
 * Framed as helpful data, not judgment.
 */

import { Task, IncrementLog, TaskHistoryStats } from '@/types';
import { getDateRange, getDayOfWeek, getISOWeekRange } from '@/utils/date';

// Insight types
export type InsightType = 'pattern' | 'calibration' | 'achievement' | 'encouragement';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  taskId?: string;
  priority: number; // Higher = more important
}

/**
 * Generate insights from task history
 */
export function generateInsights(
  tasks: Task[],
  logs: IncrementLog[],
  stats: Map<string, TaskHistoryStats>
): Insight[] {
  const insights: Insight[] = [];

  // Analyze each task
  tasks.forEach((task) => {
    const taskStats = stats.get(task.id);
    if (!taskStats) return;

    // Skip if not enough data
    if (taskStats.daysInRange < 7) return;

    const isHabit = task.task_type === 'HABIT';

    // 1. Best day pattern
    const bestDay = findBestDayOfWeek(task, logs);
    if (bestDay) {
      insights.push({
        id: `pattern-best-day-${task.id}`,
        type: 'pattern',
        title: `Most productive on ${bestDay.day}`,
        description: `You tend to do more ${task.name} on ${bestDay.day}s (avg ${bestDay.average}${isHabit ? '' : 'm'})`,
        taskId: task.id,
        priority: 2,
      });
    }

    // 2. Quota calibration - too ambitious
    if (taskStats.quotaHitRate < 40 && taskStats.daysInRange >= 14) {
      const suggestedQuota = calculateSuggestedQuota(task, taskStats);
      insights.push({
        id: `calibration-decrease-${task.id}`,
        type: 'calibration',
        title: `${task.name} quota seems ambitious`,
        description: suggestedQuota
          ? `Consider ${suggestedQuota} based on your actual average`
          : `You've hit it ${Math.round(taskStats.quotaHitRate)}% of days. Consider adjusting.`,
        taskId: task.id,
        priority: 4,
      });
    }

    // 3. Quota calibration - consistently exceeding
    if (!isHabit && taskStats.quotaHitRate >= 90 && taskStats.avgOverflow >= 15) {
      insights.push({
        id: `calibration-increase-${task.id}`,
        type: 'calibration',
        title: `Ready to level up ${task.name}?`,
        description: `You consistently exceed your quota by ~${Math.round(taskStats.avgOverflow)}m. Consider increasing it.`,
        taskId: task.id,
        priority: 3,
      });
    }

    // 4. Achievement - high consistency
    if (taskStats.quotaHitRate >= 80 && taskStats.daysInRange >= 14) {
      insights.push({
        id: `achievement-consistent-${task.id}`,
        type: 'achievement',
        title: `Great consistency on ${task.name}!`,
        description: `${Math.round(taskStats.quotaHitRate)}% hit rate over ${taskStats.daysInRange} days. You've built a solid habit.`,
        taskId: task.id,
        priority: 1,
      });
    }

    // 5. Longest streak achievement
    if (taskStats.longestStreak >= 7) {
      insights.push({
        id: `achievement-streak-${task.id}`,
        type: 'achievement',
        title: `${taskStats.longestStreak}-${task.quota_type === 'WEEKLY' ? 'week' : 'day'} streak!`,
        description: `Your longest streak on ${task.name}. Impressive dedication!`,
        taskId: task.id,
        priority: 2,
      });
    }
  });

  // 6. Overall encouragement if low activity
  const totalDaysWithLogs = new Set(logs.map((l) => l.date)).size;
  if (totalDaysWithLogs < 3 && logs.length > 0) {
    insights.push({
      id: 'encouragement-getting-started',
      type: 'encouragement',
      title: 'Building momentum',
      description: 'Every day you log is a win. Keep showing up!',
      priority: 5,
    });
  }

  // Sort by priority (higher first)
  return insights.sort((a, b) => b.priority - a.priority);
}

/**
 * Find the best day of the week for a task
 */
function findBestDayOfWeek(
  task: Task,
  logs: IncrementLog[]
): { day: string; average: number } | null {
  const taskLogs = logs.filter((l) => l.task_id === task.id);
  if (taskLogs.length < 7) return null;

  const isHabit = task.task_type === 'HABIT';
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Group by day of week
  const dayTotals: Record<number, { sum: number; count: number }> = {};
  for (let i = 0; i < 7; i++) {
    dayTotals[i] = { sum: 0, count: 0 };
  }

  taskLogs.forEach((log) => {
    const dayIndex = new Date(log.date).getDay();
    dayTotals[dayIndex].sum += isHabit ? (log.count || 0) : log.minutes;
    dayTotals[dayIndex].count += 1;
  });

  // Find day with highest average
  let bestDay = 0;
  let bestAverage = 0;

  Object.entries(dayTotals).forEach(([day, data]) => {
    if (data.count > 0) {
      const avg = data.sum / data.count;
      if (avg > bestAverage) {
        bestAverage = avg;
        bestDay = parseInt(day);
      }
    }
  });

  // Only return if the best day is significantly better (>20% more)
  const overallAvg = taskLogs.reduce((sum, l) => sum + (isHabit ? (l.count || 0) : l.minutes), 0) / taskLogs.length;
  if (bestAverage < overallAvg * 1.2) return null;

  return {
    day: dayNames[bestDay],
    average: Math.round(bestAverage),
  };
}

/**
 * Calculate a suggested quota based on actual performance
 */
function calculateSuggestedQuota(task: Task, stats: TaskHistoryStats): string | null {
  const isHabit = task.task_type === 'HABIT';

  // Use 75th percentile of actual performance as suggested quota
  // For simplicity, use average + some buffer
  if (isHabit) {
    if (stats.avgCountPerDay === undefined) return null;
    const suggested = Math.ceil(stats.avgCountPerDay * 0.9);
    if (suggested < 1) return null;
    return `${suggested} ${task.habit_unit || 'times'}/day`;
  } else {
    const suggested = Math.round(stats.avgMinutesPerDay * 0.9);
    if (suggested < 5) return null;
    return `${suggested}m/day`;
  }
}

/**
 * Get a motivational insight for the day
 */
export function getDailyMotivation(): string {
  const motivations = [
    'Small steps lead to big changes.',
    'Progress, not perfection.',
    'Every minute counts.',
    'You showed up today. That matters.',
    'Consistency beats intensity.',
    'Focus on the process, not just the outcome.',
    'Your effort is adding up.',
    'One task at a time.',
  ];

  // Use date as seed for consistent daily message
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = seed % motivations.length;

  return motivations[index];
}

/**
 * Format duration in human-readable form
 */
export function formatDurationReadable(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  if (remainingMins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours}h ${remainingMins}m`;
}
