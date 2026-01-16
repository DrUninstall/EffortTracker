// Pace calculation utilities for warning system
import { Task, IncrementLog, PaceProjection, TaskWarning, WarningSeverity, TaskProgress } from '@/types';
import { getISOWeekRange, getDateRange, getToday, getDaysFromNow, parseDate } from './date';

/**
 * Calculate pace projection for a weekly task
 */
export function calculatePaceProjection(
  task: Task,
  logs: IncrementLog[],
  currentDate: string = getToday()
): PaceProjection | null {
  // Only applies to weekly TIME tasks
  if (task.quota_type !== 'WEEKLY' || task.task_type !== 'TIME') {
    return null;
  }

  const weeklyQuota = task.weekly_quota_minutes || 0;
  if (weeklyQuota <= 0) return null;

  const { start, end } = getISOWeekRange(currentDate);
  const datesInWeek = getDateRange(start, end);

  // Calculate days elapsed (including today)
  const todayIndex = datesInWeek.indexOf(currentDate);
  const daysElapsed = todayIndex >= 0 ? todayIndex + 1 : 1;
  const daysRemaining = 7 - daysElapsed;

  // Get all logs in this week
  const weekLogs = logs.filter(
    (l) => l.task_id === task.id && l.date >= start && l.date <= end
  );
  const progress = weekLogs.reduce((sum, l) => sum + l.minutes, 0);

  // Calculate paces
  const currentPace = daysElapsed > 0 ? progress / daysElapsed : 0;
  const remaining = Math.max(0, weeklyQuota - progress);
  const requiredPace = daysRemaining > 0 ? remaining / daysRemaining : remaining > 0 ? Infinity : 0;

  // Calculate projected completion
  let projectedCompletion: string | null = null;
  if (currentPace > 0 && remaining > 0) {
    const daysToComplete = Math.ceil(remaining / currentPace);
    if (daysElapsed + daysToComplete <= 7) {
      projectedCompletion = getDaysFromNow(daysToComplete - 1, currentDate);
    }
  } else if (remaining === 0) {
    projectedCompletion = currentDate;
  }

  // Calculate deficit (how far behind ideal pace)
  const idealProgress = (weeklyQuota / 7) * daysElapsed;
  const deficit = Math.max(0, idealProgress - progress);

  // Determine severity
  const severity = calculateSeverity(progress, weeklyQuota, daysRemaining, deficit);

  return {
    taskId: task.id,
    taskName: task.name,
    currentPace: Math.round(currentPace),
    requiredPace: Math.round(requiredPace),
    projectedCompletion,
    deficit: Math.round(deficit),
    daysElapsed,
    daysRemaining,
    severity,
  };
}

/**
 * Calculate warning severity based on pace metrics
 */
function calculateSeverity(
  progress: number,
  quota: number,
  daysRemaining: number,
  deficit: number
): WarningSeverity {
  // Task already completed
  if (progress >= quota) return 'none';

  const percentComplete = (progress / quota) * 100;
  const deficitRatio = deficit / quota;

  // Critical: >50% behind with ≤1 day remaining
  if (deficitRatio > 0.5 && daysRemaining <= 1) return 'critical';

  // High: >40% behind with ≤2 days remaining, or >60% behind any time
  if ((deficitRatio > 0.4 && daysRemaining <= 2) || deficitRatio > 0.6) return 'high';

  // Medium: >25% behind with ≤3 days remaining, or >40% behind any time
  if ((deficitRatio > 0.25 && daysRemaining <= 3) || deficitRatio > 0.4) return 'medium';

  // Low: >15% behind
  if (deficitRatio > 0.15) return 'low';

  return 'none';
}

/**
 * Generate warning message from pace projection
 */
export function getTaskWarning(projection: PaceProjection): TaskWarning | null {
  if (projection.severity === 'none') return null;

  let warningType: TaskWarning['warningType'];
  let message: string;

  switch (projection.severity) {
    case 'critical':
      warningType = 'critical';
      message = `Critical: ${projection.deficit}m behind with ${projection.daysRemaining} day${projection.daysRemaining === 1 ? '' : 's'} left`;
      break;
    case 'high':
      warningType = 'at_risk';
      message = `At risk: Need ${projection.requiredPace}m/day to hit quota`;
      break;
    case 'medium':
    case 'low':
      warningType = 'behind_pace';
      message = `${projection.deficit}m behind pace (${projection.requiredPace}m/day needed)`;
      break;
    default:
      return null;
  }

  return {
    taskId: projection.taskId,
    taskName: projection.taskName,
    warningType,
    severity: projection.severity,
    message,
    projection,
  };
}

/**
 * Get all warnings for tasks
 */
export function getTaskWarnings(
  tasks: Task[],
  logs: IncrementLog[],
  currentDate: string = getToday()
): TaskWarning[] {
  const warnings: TaskWarning[] = [];

  for (const task of tasks) {
    if (task.is_archived) continue;

    const projection = calculatePaceProjection(task, logs, currentDate);
    if (projection) {
      const warning = getTaskWarning(projection);
      if (warning) {
        warnings.push(warning);
      }
    }
  }

  // Sort by severity (critical first)
  const severityOrder: Record<WarningSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    none: 4,
  };

  return warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Calculate daily target for a task to stay on pace
 */
export function calculateDailyTarget(
  task: Task,
  progress: TaskProgress,
  currentDate: string = getToday()
): number {
  if (progress.isDone) return 0;

  if (task.quota_type === 'DAILY') {
    // For daily tasks, target is simply the remaining amount
    return progress.remaining;
  }

  if (task.quota_type === 'WEEKLY' && task.task_type === 'TIME') {
    const { end } = getISOWeekRange(currentDate);
    const datesRemaining = getDateRange(currentDate, end);
    const daysRemaining = datesRemaining.length;

    if (daysRemaining <= 0) return progress.remaining;
    return Math.ceil(progress.remaining / daysRemaining);
  }

  if (task.quota_type === 'DAYS_PER_WEEK') {
    // For days-per-week, target is the daily quota if not yet completed today
    return task.daily_quota_minutes || 0;
  }

  return progress.remaining;
}

/**
 * Severity indicator for display
 */
export const SEVERITY_INDICATORS: Record<WarningSeverity, string> = {
  none: '',
  low: '!',
  medium: '!!',
  high: '!!!',
  critical: '!!!!',
};

/**
 * Severity colors for styling
 */
export const SEVERITY_COLORS: Record<WarningSeverity, string> = {
  none: 'inherit',
  low: 'var(--color-warning-low, #f59e0b)',
  medium: 'var(--color-warning-medium, #f97316)',
  high: 'var(--color-warning-high, #ef4444)',
  critical: 'var(--color-warning-critical, #dc2626)',
};
