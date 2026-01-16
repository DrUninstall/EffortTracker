// Hormozi: Pattern detection - "Do 100, analyze top 10%" system
import type { IncrementLog, PatternAnalysis, Task } from '@/types';

/**
 * Detect patterns in the top 20% of sessions by quality
 * This implements Hormozi's meta-learning framework
 */
export function detectPatterns(
  taskId: string,
  logs: IncrementLog[],
  tasks: Task[]
): PatternAnalysis | null {
  // 1. Filter to logs for this task with quality ratings
  const taskLogs = logs.filter(
    (l) => l.task_id === taskId && l.quality_rating != null
  );

  // 2. Need at least 20 sessions for meaningful patterns
  if (taskLogs.length < 20) {
    return null;
  }

  // 3. Sort by quality, take top 20%
  const sorted = taskLogs.sort(
    (a, b) => (b.quality_rating || 0) - (a.quality_rating || 0)
  );
  const top20Count = Math.ceil(sorted.length * 0.2);
  const bestSessions = sorted.slice(0, top20Count);

  // 4. Analyze patterns in best sessions
  const timeOfDay = findTimeOfDayPattern(bestSessions);
  const dayOfWeek = findDayOfWeekPattern(bestSessions);
  const avgDuration = calculateAvgDuration(bestSessions);
  const commonTags = findCommonTags(bestSessions);
  const energyCorrelation = findEnergyCorrelation(bestSessions);

  // 5. Calculate confidence (based on sample size and consistency)
  const confidence = calculateConfidence(bestSessions, taskLogs.length);

  // 6. Generate recommendation
  const recommendation = generateRecommendation({
    time_of_day: timeOfDay,
    day_of_week: dayOfWeek,
    avg_duration: avgDuration,
    common_tags: commonTags,
    energy_correlation: energyCorrelation,
  });

  return {
    task_id: taskId,
    best_sessions: bestSessions,
    patterns: {
      time_of_day: timeOfDay,
      day_of_week: dayOfWeek,
      avg_duration: avgDuration,
      common_tags: commonTags,
      energy_correlation: energyCorrelation,
    },
    confidence,
    recommendation,
  };
}

/**
 * Find if best sessions cluster around a time of day
 */
function findTimeOfDayPattern(sessions: IncrementLog[]): string | undefined {
  const timeSlots = {
    morning: 0, // 5am-12pm
    afternoon: 0, // 12pm-5pm
    evening: 0, // 5pm-10pm
    night: 0, // 10pm-5am
  };

  sessions.forEach((session) => {
    const hour = new Date(session.created_at).getHours();

    if (hour >= 5 && hour < 12) timeSlots.morning++;
    else if (hour >= 12 && hour < 17) timeSlots.afternoon++;
    else if (hour >= 17 && hour < 22) timeSlots.evening++;
    else timeSlots.night++;
  });

  // Return time slot if >60% of best sessions happen then
  const total = sessions.length;
  const threshold = total * 0.6;

  if (timeSlots.morning >= threshold) return 'morning';
  if (timeSlots.afternoon >= threshold) return 'afternoon';
  if (timeSlots.evening >= threshold) return 'evening';
  if (timeSlots.night >= threshold) return 'night';

  return undefined;
}

/**
 * Find if best sessions cluster on a specific day
 */
function findDayOfWeekPattern(sessions: IncrementLog[]): string | undefined {
  const dayCounts: Record<string, number> = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };

  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  sessions.forEach((session) => {
    const date = new Date(session.created_at);
    const dayName = dayNames[date.getDay()];
    dayCounts[dayName]++;
  });

  // Return day if >40% of best sessions happen then
  const total = sessions.length;
  const threshold = total * 0.4;

  for (const [day, count] of Object.entries(dayCounts)) {
    if (count >= threshold) return day;
  }

  return undefined;
}

/**
 * Calculate average duration of best sessions
 */
function calculateAvgDuration(sessions: IncrementLog[]): number {
  if (sessions.length === 0) return 0;
  const sum = sessions.reduce((acc, s) => acc + s.minutes, 0);
  return Math.round(sum / sessions.length);
}

/**
 * Find tags that appear in >50% of best sessions
 */
function findCommonTags(sessions: IncrementLog[]): string[] {
  const tagCounts: Record<string, number> = {};

  sessions.forEach((session) => {
    if (session.context_tags) {
      session.context_tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  const threshold = sessions.length * 0.5;
  return Object.entries(tagCounts)
    .filter(([_, count]) => count >= threshold)
    .map(([tag]) => tag)
    .sort((a, b) => (tagCounts[b] || 0) - (tagCounts[a] || 0));
}

/**
 * Determine if best sessions correlate with high energy
 */
function findEnergyCorrelation(
  sessions: IncrementLog[]
): 'high' | 'medium' | 'low' | undefined {
  const sessionsWithEnergy = sessions.filter((s) => s.energy_level != null);
  if (sessionsWithEnergy.length === 0) return undefined;

  const avgEnergy =
    sessionsWithEnergy.reduce((sum, s) => sum + (s.energy_level || 0), 0) /
    sessionsWithEnergy.length;

  if (avgEnergy >= 4) return 'high';
  if (avgEnergy >= 3) return 'medium';
  return 'low';
}

/**
 * Calculate confidence in pattern detection
 */
function calculateConfidence(
  bestSessions: IncrementLog[],
  totalSessions: number
): number {
  // More sessions = higher confidence
  const sampleSizeScore = Math.min((totalSessions / 50) * 50, 50);

  // Higher average quality in best sessions = higher confidence
  const avgQuality =
    bestSessions.reduce((sum, s) => sum + (s.quality_rating || 0), 0) /
    bestSessions.length;
  const qualityScore = (avgQuality / 5) * 50;

  return Math.round(sampleSizeScore + qualityScore);
}

/**
 * Generate human-readable recommendation
 */
function generateRecommendation(patterns: {
  time_of_day?: string;
  day_of_week?: string;
  avg_duration?: number;
  common_tags?: string[];
  energy_correlation?: 'high' | 'medium' | 'low';
}): string {
  const parts: string[] = ['Your best sessions happen'];

  if (patterns.time_of_day) {
    parts.push(`in the ${patterns.time_of_day}`);
  }

  if (patterns.day_of_week) {
    parts.push(
      parts.length > 1
        ? `on ${patterns.day_of_week}s`
        : `on ${patterns.day_of_week}s`
    );
  }

  if (patterns.avg_duration) {
    parts.push(`for about ${patterns.avg_duration} minutes`);
  }

  if (patterns.common_tags && patterns.common_tags.length > 0) {
    parts.push(`when ${patterns.common_tags.join(', ')}`);
  }

  if (parts.length === 1) {
    return "Keep doing what you're doing! Track more sessions to discover patterns.";
  }

  return parts.join(' ') + '. Try to replicate these conditions.';
}

/**
 * Get all patterns for all tasks
 */
export function getAllPatterns(
  logs: IncrementLog[],
  tasks: Task[]
): PatternAnalysis[] {
  const activeTasks = tasks.filter((t) => !t.is_archived);
  const patterns: PatternAnalysis[] = [];

  activeTasks.forEach((task) => {
    const pattern = detectPatterns(task.id, logs, tasks);
    if (pattern) {
      patterns.push(pattern);
    }
  });

  return patterns;
}
