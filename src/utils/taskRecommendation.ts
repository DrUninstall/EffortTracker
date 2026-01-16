// Task recommendation utilities for guidance system
import { Task, TaskProgress, TaskWarning, TaskRecommendation, Priority, WarningSeverity } from '@/types';
import { getISOWeekRange, getDateRange, getToday } from './date';

// Priority weights for scoring
const PRIORITY_WEIGHTS: Record<Priority, number> = {
  CORE: 3,
  IMPORTANT: 2,
  OPTIONAL: 1,
};

// Severity weights for scoring
const SEVERITY_WEIGHTS: Record<WarningSeverity, number> = {
  none: 0,
  low: 10,
  medium: 20,
  high: 30,
  critical: 40,
};

/**
 * Calculate urgency score for a task
 * Higher score = more urgent to work on
 */
function calculateUrgencyScore(
  progress: TaskProgress,
  warning?: TaskWarning
): number {
  let score = 0;

  // Priority component (0-30)
  score += PRIORITY_WEIGHTS[progress.task.priority] * 10;

  // Remaining ratio component (0-30)
  // Higher remaining = higher score
  if (progress.effectiveQuota > 0) {
    const remainingRatio = progress.remaining / progress.effectiveQuota;
    score += remainingRatio * 30;
  }

  // Warning severity component (0-40)
  if (warning) {
    score += SEVERITY_WEIGHTS[warning.severity];
  }

  // Bonus for tasks that are almost done (encouragement to finish)
  if (progress.effectiveQuota > 0) {
    const completionRatio = progress.progress / progress.effectiveQuota;
    if (completionRatio >= 0.7 && completionRatio < 1) {
      score += 5; // Small bonus for nearly complete tasks
    }
  }

  return Math.min(100, Math.round(score));
}

/**
 * Generate reason text for why a task is recommended
 */
function generateReason(
  progress: TaskProgress,
  warning?: TaskWarning
): string {
  const { task, remaining, isDone, effectiveQuota } = progress;

  if (isDone) {
    return 'Completed for today';
  }

  // Critical warning takes precedence
  if (warning?.severity === 'critical') {
    return `Critical: ${warning.message}`;
  }

  // High/medium warning
  if (warning && (warning.severity === 'high' || warning.severity === 'medium')) {
    return warning.message;
  }

  // Priority-based reasons
  if (task.priority === 'CORE') {
    if (progress.progress === 0) {
      return 'Core task - not started yet';
    }
    return `Core task - ${remaining} ${progress.progressUnit === 'minutes' ? 'min' : ''} remaining`;
  }

  // Low warning
  if (warning?.severity === 'low') {
    return 'Slightly behind pace';
  }

  // Default reason
  if (progress.progress === 0) {
    return 'Not started today';
  }

  const percentComplete = Math.round((progress.progress / effectiveQuota) * 100);
  return `${percentComplete}% complete`;
}

/**
 * Calculate daily target for a task
 */
export function calculateDailyTarget(
  task: Task,
  progress: TaskProgress,
  currentDate: string = getToday()
): number {
  if (progress.isDone) return 0;

  if (task.quota_type === 'DAILY') {
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
    return task.daily_quota_minutes || 0;
  }

  // For habits, return 1 as the default increment
  if (task.task_type === 'HABIT') {
    return 1;
  }

  return progress.remaining;
}

/**
 * Get task recommendation based on progress and warnings
 */
export function getTaskRecommendation(
  allProgress: TaskProgress[],
  warnings: TaskWarning[],
  currentDate: string = getToday()
): TaskRecommendation | null {
  // Filter to incomplete tasks only
  const incompleteTasks = allProgress.filter((p) => !p.isDone);

  if (incompleteTasks.length === 0) {
    return null;
  }

  // Create a map of warnings by task ID
  const warningMap = new Map<string, TaskWarning>();
  for (const warning of warnings) {
    warningMap.set(warning.taskId, warning);
  }

  // Score all incomplete tasks
  const scoredTasks = incompleteTasks.map((progress) => {
    const warning = warningMap.get(progress.task.id);
    const score = calculateUrgencyScore(progress, warning);
    return { progress, warning, score };
  });

  // Sort by score (highest first)
  scoredTasks.sort((a, b) => b.score - a.score);

  // Get the top recommendation
  const top = scoredTasks[0];
  const { progress, warning, score } = top;

  const dailyTarget = calculateDailyTarget(progress.task, progress, currentDate);
  const reason = generateReason(progress, warning);

  return {
    taskId: progress.task.id,
    taskName: progress.task.name,
    reason,
    urgencyScore: score,
    dailyTarget,
    priority: progress.task.priority,
    isHabit: progress.task.task_type === 'HABIT',
  };
}

/**
 * Get daily target text for display
 */
export function formatDailyTarget(
  target: number,
  isHabit: boolean,
  unit?: string
): string {
  if (target <= 0) return '';

  if (isHabit) {
    const unitText = unit ? ` ${unit}` : '';
    return `${target}${unitText} today`;
  }

  if (target < 60) {
    return `~${target}m today`;
  }

  const hours = Math.floor(target / 60);
  const minutes = target % 60;
  if (minutes === 0) {
    return `~${hours}h today`;
  }
  return `~${hours}h ${minutes}m today`;
}
