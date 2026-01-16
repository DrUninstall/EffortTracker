// Hormozi: 70/20/10 Allocation tracking (like Google's resource allocation)
// 70% on CORE (what's working), 20% on IMPORTANT (adjacent/growth), 10% on OPTIONAL (experiments)
import type { IncrementLog, Task, AllocationScore, FocusScore } from '@/types';

/**
 * Calculate allocation score for a given period
 */
export function calculateAllocation(
  date: string,
  period: 'day' | 'week' | 'month',
  logs: IncrementLog[],
  tasks: Task[]
): AllocationScore {
  const periodLogs = filterLogsByPeriod(date, period, logs);

  // Group by priority
  let coreMinutes = 0;
  let importantMinutes = 0;
  let optionalMinutes = 0;

  periodLogs.forEach((log) => {
    const task = tasks.find((t) => t.id === log.task_id);
    if (!task) return;

    switch (task.priority) {
      case 'CORE':
        coreMinutes += log.minutes;
        break;
      case 'IMPORTANT':
        importantMinutes += log.minutes;
        break;
      case 'OPTIONAL':
        optionalMinutes += log.minutes;
        break;
    }
  });

  const totalMinutes = coreMinutes + importantMinutes + optionalMinutes;

  if (totalMinutes === 0) {
    return {
      period,
      date,
      core_percentage: 0,
      important_percentage: 0,
      optional_percentage: 0,
      is_balanced: false,
      warnings: ['No time logged for this period'],
    };
  }

  const corePercentage = Math.round((coreMinutes / totalMinutes) * 100);
  const importantPercentage = Math.round((importantMinutes / totalMinutes) * 100);
  const optionalPercentage = Math.round((optionalMinutes / totalMinutes) * 100);

  // Check if balanced (allow some flexibility)
  const isBalanced = isAllocationBalanced(
    corePercentage,
    importantPercentage,
    optionalPercentage
  );

  const warnings = generateAllocationWarnings(
    corePercentage,
    importantPercentage,
    optionalPercentage
  );

  return {
    period,
    date,
    core_percentage: corePercentage,
    important_percentage: importantPercentage,
    optional_percentage: optionalPercentage,
    is_balanced: isBalanced,
    warnings,
  };
}

/**
 * Calculate focus score (simplified: just CORE / total)
 */
export function calculateFocusScore(
  date: string,
  logs: IncrementLog[],
  tasks: Task[]
): FocusScore {
  const dayLogs = logs.filter((l) => l.date === date);

  let coreMinutes = 0;
  let importantMinutes = 0;
  let optionalMinutes = 0;

  dayLogs.forEach((log) => {
    const task = tasks.find((t) => t.id === log.task_id);
    if (!task) return;

    switch (task.priority) {
      case 'CORE':
        coreMinutes += log.minutes;
        break;
      case 'IMPORTANT':
        importantMinutes += log.minutes;
        break;
      case 'OPTIONAL':
        optionalMinutes += log.minutes;
        break;
    }
  });

  const totalMinutes = coreMinutes + importantMinutes + optionalMinutes;
  const focusPercentage =
    totalMinutes > 0 ? Math.round((coreMinutes / totalMinutes) * 100) : 0;

  let status: 'excellent' | 'good' | 'fair' | 'poor';
  if (focusPercentage >= 70) status = 'excellent';
  else if (focusPercentage >= 50) status = 'good';
  else if (focusPercentage >= 30) status = 'fair';
  else status = 'poor';

  return {
    date,
    core_minutes: coreMinutes,
    important_minutes: importantMinutes,
    optional_minutes: optionalMinutes,
    total_minutes: totalMinutes,
    focus_percentage: focusPercentage,
    status,
  };
}

/**
 * Filter logs by period
 */
function filterLogsByPeriod(
  date: string,
  period: 'day' | 'week' | 'month',
  logs: IncrementLog[]
): IncrementLog[] {
  if (period === 'day') {
    return logs.filter((l) => l.date === date);
  }

  if (period === 'week') {
    // Assume date is week start (Monday)
    const weekStart = new Date(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    return logs.filter((l) => l.date >= weekStartStr && l.date <= weekEndStr);
  }

  if (period === 'month') {
    const monthStart = date.substring(0, 7); // YYYY-MM
    return logs.filter((l) => l.date.startsWith(monthStart));
  }

  return [];
}

/**
 * Check if allocation is balanced
 */
function isAllocationBalanced(
  core: number,
  important: number,
  optional: number
): boolean {
  // Allow some flexibility:
  // CORE: 60-80% (target 70%)
  // IMPORTANT: 10-30% (target 20%)
  // OPTIONAL: 0-20% (target 10%)

  const coreOk = core >= 60 && core <= 80;
  const importantOk = important >= 10 && important <= 30;
  const optionalOk = optional <= 20;

  return coreOk && importantOk && optionalOk;
}

/**
 * Generate warnings for allocation issues
 */
function generateAllocationWarnings(
  core: number,
  important: number,
  optional: number
): string[] {
  const warnings: string[] = [];

  if (core < 60) {
    warnings.push(
      `Low CORE focus (${core}%). You're spreading too thin. Target: 70%`
    );
  }

  if (core > 80) {
    warnings.push(
      `Very high CORE focus (${core}%). Consider investing in growth (IMPORTANT tasks).`
    );
  }

  if (important < 10) {
    warnings.push(
      `Low IMPORTANT allocation (${important}%). Not investing enough in growth. Target: 20%`
    );
  }

  if (optional > 20) {
    warnings.push(
      `Too much time on OPTIONAL tasks (${optional}%). Focus on your core priorities. Target: 10%`
    );
  }

  if (important > 30) {
    warnings.push(
      `High IMPORTANT allocation (${important}%). Make sure you're not neglecting core work.`
    );
  }

  return warnings;
}

/**
 * Calculate weekly average focus score
 */
export function calculateWeeklyFocusAverage(
  weekStart: string,
  logs: IncrementLog[],
  tasks: Task[]
): number {
  const scores: number[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const focusScore = calculateFocusScore(dateStr, logs, tasks);
    if (focusScore.total_minutes > 0) {
      scores.push(focusScore.focus_percentage);
    }
  }

  if (scores.length === 0) return 0;

  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}
