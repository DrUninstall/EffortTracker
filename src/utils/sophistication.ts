// Hormozi: Sophistication level - measuring quality/quantity of metrics tracked
import type { IncrementLog, SophisticationScore, SophisticationLevel } from '@/types';

/**
 * Calculate sophistication level for a task
 * Beginner: Just tracks time
 * Intermediate: Tracks time + outcomes + quality
 * Advanced: Full data capture with context tags
 */
export function calculateSophisticationLevel(
  taskId: string,
  logs: IncrementLog[]
): SophisticationScore {
  const taskLogs = logs.filter((l) => l.task_id === taskId);

  if (taskLogs.length === 0) {
    return {
      task_id: taskId,
      level: 'basic',
      score: 0,
      breakdown: {
        outcome_tracking: 0,
        quality_tracking: 0,
        energy_tracking: 0,
        context_tracking: 0,
      },
      next_level_at: 33,
    };
  }

  const total = taskLogs.length;

  // Calculate percentage of logs with each type of data
  const withOutcomes = taskLogs.filter((l) => l.outcome_count != null).length;
  const withQuality = taskLogs.filter((l) => l.quality_rating != null).length;
  const withEnergy = taskLogs.filter((l) => l.energy_level != null).length;
  const withTags = taskLogs.filter(
    (l) => l.context_tags && l.context_tags.length > 0
  ).length;

  const breakdown = {
    outcome_tracking: Math.round((withOutcomes / total) * 100),
    quality_tracking: Math.round((withQuality / total) * 100),
    energy_tracking: Math.round((withEnergy / total) * 100),
    context_tracking: Math.round((withTags / total) * 100),
  };

  // Calculate overall score (weighted)
  let score = 0;
  score += (withOutcomes / total) * 30; // 30% weight on outcomes
  score += (withQuality / total) * 30; // 30% weight on quality
  score += (withEnergy / total) * 20; // 20% weight on energy
  score += (withTags / total) * 20; // 20% weight on context

  score = Math.round(score);

  // Determine level
  let level: SophisticationLevel;
  let nextLevelAt: number;

  if (score < 33) {
    level = 'basic';
    nextLevelAt = 33;
  } else if (score < 66) {
    level = 'intermediate';
    nextLevelAt = 66;
  } else {
    level = 'advanced';
    nextLevelAt = 100;
  }

  return {
    task_id: taskId,
    level,
    score,
    breakdown,
    next_level_at: nextLevelAt,
  };
}

/**
 * Get overall sophistication level across all tasks
 */
export function calculateOverallSophistication(
  logs: IncrementLog[]
): SophisticationScore {
  if (logs.length === 0) {
    return {
      task_id: 'overall',
      level: 'basic',
      score: 0,
      breakdown: {
        outcome_tracking: 0,
        quality_tracking: 0,
        energy_tracking: 0,
        context_tracking: 0,
      },
      next_level_at: 33,
    };
  }

  const total = logs.length;

  const withOutcomes = logs.filter((l) => l.outcome_count != null).length;
  const withQuality = logs.filter((l) => l.quality_rating != null).length;
  const withEnergy = logs.filter((l) => l.energy_level != null).length;
  const withTags = logs.filter(
    (l) => l.context_tags && l.context_tags.length > 0
  ).length;

  const breakdown = {
    outcome_tracking: Math.round((withOutcomes / total) * 100),
    quality_tracking: Math.round((withQuality / total) * 100),
    energy_tracking: Math.round((withEnergy / total) * 100),
    context_tracking: Math.round((withTags / total) * 100),
  };

  let score = 0;
  score += (withOutcomes / total) * 30;
  score += (withQuality / total) * 30;
  score += (withEnergy / total) * 20;
  score += (withTags / total) * 20;

  score = Math.round(score);

  let level: SophisticationLevel;
  let nextLevelAt: number;

  if (score < 33) {
    level = 'basic';
    nextLevelAt = 33;
  } else if (score < 66) {
    level = 'intermediate';
    nextLevelAt = 66;
  } else {
    level = 'advanced';
    nextLevelAt = 100;
  }

  return {
    task_id: 'overall',
    level,
    score,
    breakdown,
    next_level_at: nextLevelAt,
  };
}

/**
 * Get suggestions for leveling up
 */
export function getSophisticationSuggestions(
  score: SophisticationScore
): string[] {
  const suggestions: string[] = [];

  if (score.level === 'basic') {
    suggestions.push('Start tracking outcomes for your sessions (reps, pages, calls)');
    suggestions.push('Rate your session quality (1-5 stars) after each session');
  }

  if (score.level === 'intermediate') {
    suggestions.push('Track your energy level after sessions');
    suggestions.push('Add context tags (morning, caffeinated, deep-work, etc.)');
  }

  // Specific suggestions based on breakdown
  if (score.breakdown.outcome_tracking < 50) {
    suggestions.push('Track outcomes more consistently to unlock pattern insights');
  }

  if (score.breakdown.quality_tracking < 50) {
    suggestions.push('Rate more sessions to identify your best performance patterns');
  }

  if (score.breakdown.energy_tracking < 50 && score.level !== 'basic') {
    suggestions.push('Track energy levels to understand what drains vs energizes you');
  }

  if (score.breakdown.context_tracking < 50 && score.level === 'advanced') {
    suggestions.push('Add more context tags to discover what conditions lead to peak performance');
  }

  return suggestions;
}
