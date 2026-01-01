import { Task, IncrementLog, TaskHistoryStats } from '@/types';
import { getDateRange, getISOWeekRange } from '@/utils/date';

/**
 * Personal Records System
 * Tracks and detects personal bests across various metrics
 */

export interface PersonalRecord {
  type: 'longest_streak' | 'best_day' | 'weekly_champion' | 'milestone';
  value: number;
  unit: string;
  date?: string;
  taskId?: string;
  taskName?: string;
  description: string;
  isNew?: boolean;
}

export interface AllTimeRecords {
  longestStreak: number;
  bestDayMinutes: number;
  bestDayDate: string;
  totalHours: number;
  totalCompletions: number;
  mostQuotasInWeek: number;
  mostQuotasWeekStart: string;
}

/**
 * Calculate best day (most minutes logged)
 */
export function findBestDay(
  logs: IncrementLog[],
  tasks: Task[]
): { minutes: number; date: string } {
  const timeTasks = new Set(
    tasks.filter((t) => t.task_type === 'TIME').map((t) => t.id)
  );

  const dailyMinutes = new Map<string, number>();

  logs.forEach((log) => {
    if (timeTasks.has(log.task_id)) {
      const current = dailyMinutes.get(log.date) || 0;
      dailyMinutes.set(log.date, current + log.minutes);
    }
  });

  let bestDate = '';
  let bestMinutes = 0;

  dailyMinutes.forEach((minutes, date) => {
    if (minutes > bestMinutes) {
      bestMinutes = minutes;
      bestDate = date;
    }
  });

  return { minutes: bestMinutes, date: bestDate };
}

/**
 * Calculate total hours logged
 */
export function calculateTotalHours(
  logs: IncrementLog[],
  tasks: Task[]
): number {
  const timeTasks = new Set(
    tasks.filter((t) => t.task_type === 'TIME').map((t) => t.id)
  );

  const totalMinutes = logs
    .filter((log) => timeTasks.has(log.task_id))
    .reduce((sum, log) => sum + log.minutes, 0);

  return Math.round(totalMinutes / 60);
}

/**
 * Calculate total habit completions
 */
export function calculateTotalCompletions(
  logs: IncrementLog[],
  tasks: Task[]
): number {
  const habitTasks = new Set(
    tasks.filter((t) => t.task_type === 'HABIT').map((t) => t.id)
  );

  return logs
    .filter((log) => habitTasks.has(log.task_id))
    .reduce((sum, log) => sum + (log.count || 0), 0);
}

/**
 * Find week with most quotas hit
 */
export function findBestWeek(
  logs: IncrementLog[],
  tasks: Task[]
): { count: number; weekStart: string } {
  if (logs.length === 0) {
    return { count: 0, weekStart: '' };
  }

  // Get all unique dates and find min/max
  const dates = Array.from(new Set(logs.map((l) => l.date))).sort();
  if (dates.length === 0) {
    return { count: 0, weekStart: '' };
  }

  // Group logs by week
  const weekQuotas = new Map<string, number>();

  // For each unique week, count quotas hit
  dates.forEach((date) => {
    const { start } = getISOWeekRange(date);

    if (!weekQuotas.has(start)) {
      // Count quotas hit for this week
      let quotasHit = 0;

      tasks.forEach((task) => {
        const { start: weekStart, end: weekEnd } = getISOWeekRange(date);
        const taskLogs = logs.filter(
          (l) =>
            l.task_id === task.id && l.date >= weekStart && l.date <= weekEnd
        );

        if (task.task_type === 'HABIT') {
          const weekDates = getDateRange(weekStart, weekEnd);
          weekDates.forEach((d) => {
            const dayLogs = taskLogs.filter((l) => l.date === d);
            const dayCount = dayLogs.reduce((sum, l) => sum + (l.count || 0), 0);
            if (dayCount >= (task.habit_quota_count || 0)) {
              quotasHit++;
            }
          });
        } else {
          // TIME task
          if (task.quota_type === 'DAILY') {
            const weekDates = getDateRange(weekStart, weekEnd);
            weekDates.forEach((d) => {
              const dayLogs = taskLogs.filter((l) => l.date === d);
              const dayMinutes = dayLogs.reduce((sum, l) => sum + l.minutes, 0);
              if (dayMinutes >= (task.daily_quota_minutes || 0)) {
                quotasHit++;
              }
            });
          } else {
            const weekMinutes = taskLogs.reduce((sum, l) => sum + l.minutes, 0);
            if (weekMinutes >= (task.weekly_quota_minutes || 0)) {
              quotasHit++;
            }
          }
        }
      });

      weekQuotas.set(start, quotasHit);
    }
  });

  let bestWeek = '';
  let bestCount = 0;

  weekQuotas.forEach((count, weekStart) => {
    if (count > bestCount) {
      bestCount = count;
      bestWeek = weekStart;
    }
  });

  return { count: bestCount, weekStart: bestWeek };
}

/**
 * Get milestone achievements
 */
export function getMilestones(totalHours: number): number[] {
  const milestones = [10, 50, 100, 250, 500, 1000, 2500, 5000];
  return milestones.filter((m) => totalHours >= m);
}

/**
 * Get next milestone
 */
export function getNextMilestone(totalHours: number): number | null {
  const milestones = [10, 50, 100, 250, 500, 1000, 2500, 5000];
  const next = milestones.find((m) => m > totalHours);
  return next || null;
}

/**
 * Get all personal records for display
 */
export function getPersonalRecords(
  logs: IncrementLog[],
  tasks: Task[],
  longestStreak: number
): PersonalRecord[] {
  const records: PersonalRecord[] = [];

  // Longest streak
  if (longestStreak > 0) {
    records.push({
      type: 'longest_streak',
      value: longestStreak,
      unit: 'days',
      description: `${longestStreak} day streak`,
    });
  }

  // Best day
  const bestDay = findBestDay(logs, tasks);
  if (bestDay.minutes > 0) {
    const hours = Math.floor(bestDay.minutes / 60);
    const mins = bestDay.minutes % 60;
    records.push({
      type: 'best_day',
      value: bestDay.minutes,
      unit: 'minutes',
      date: bestDay.date,
      description: hours > 0 ? `${hours}h ${mins}m in one day` : `${mins}m in one day`,
    });
  }

  // Total hours milestone
  const totalHours = calculateTotalHours(logs, tasks);
  const milestones = getMilestones(totalHours);
  if (milestones.length > 0) {
    const latestMilestone = milestones[milestones.length - 1];
    records.push({
      type: 'milestone',
      value: latestMilestone,
      unit: 'hours',
      description: `${latestMilestone} total hours`,
    });
  }

  return records;
}

/**
 * Format hours for display
 */
export function formatHoursDisplay(hours: number): string {
  if (hours < 1) return '< 1h';
  if (hours < 10) return `${hours}h`;
  return `${hours.toLocaleString()}h`;
}
