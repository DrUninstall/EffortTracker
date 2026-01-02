import { TaskProgress } from '@/types';

/**
 * Progress-aware greetings system
 * Generates encouraging, context-aware messages based on progress and time of day
 */

// Morning greetings (5am - 12pm)
const MORNING_GREETINGS = [
  "Good morning! Fresh start ahead.",
  "Rise and shine! Ready to make progress?",
  "New day, new opportunities.",
  "Morning! Time to build momentum.",
];

// Afternoon greetings (12pm - 5pm)
const AFTERNOON_GREETINGS = [
  "Good afternoon! Keep going.",
  "Afternoon check-in! How's progress?",
  "Still going strong!",
  "Halfway through the day!",
];

// Evening greetings (5pm - 9pm)
const EVENING_GREETINGS = [
  "Good evening! Winding down?",
  "Evening session! You've got this.",
  "Time to finish strong.",
  "Almost there for today!",
];

// Night greetings (9pm - 5am)
const NIGHT_GREETINGS = [
  "Burning the midnight oil?",
  "Night owl mode activated.",
  "Late night progress!",
  "Rest is productive too.",
];

// All done greetings
const ALL_DONE_GREETINGS = [
  "All done for today! Well earned rest.",
  "Quotas complete! Great work today.",
  "Mission accomplished. Time to recharge.",
  "Everything done! Enjoy your evening.",
  "You nailed it today!",
];

// Most done greetings (>50% complete)
const MOST_DONE_GREETINGS = [
  "Great momentum! Almost there.",
  "Crushing it! Just a bit more.",
  "Nice progress! Keep pushing.",
  "Solid effort! The finish line is close.",
];

// Almost there greetings (80-99% complete on any task)
const ALMOST_THERE_GREETINGS = [
  "So close! Just a little more.",
  "Almost there! You've got this.",
  "The finish line is in sight!",
  "Nearly done! Keep going.",
  "Just a few more minutes!",
];

// Streak greetings
const STREAK_GREETINGS = [
  "Your streak is on fire! Keep it up.",
  "Consistency is key, and you have it!",
  "Streak going strong!",
  "Don't break the chain!",
];

// Low progress encouragement (not judgy)
const ENCOURAGEMENT_GREETINGS = [
  "Every minute counts. You've got this.",
  "Start small, dream big.",
  "Progress at your own pace.",
  "Just getting started is the hardest part.",
];

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function getGreeting(progress: TaskProgress[], hour?: number): string {
  const currentHour = hour ?? new Date().getHours();
  const timeOfDay = getTimeOfDay(currentHour);

  // If no tasks, return time-based greeting
  if (progress.length === 0) {
    switch (timeOfDay) {
      case 'morning': return getRandomItem(MORNING_GREETINGS);
      case 'afternoon': return getRandomItem(AFTERNOON_GREETINGS);
      case 'evening': return getRandomItem(EVENING_GREETINGS);
      case 'night': return getRandomItem(NIGHT_GREETINGS);
    }
  }

  const allDone = progress.every(p => p.isDone);
  const completedCount = progress.filter(p => p.isDone).length;
  const mostDone = completedCount > progress.length / 2;
  const hasLongStreak = progress.some(p => p.streak && p.streak.currentStreak > 7);
  const hasStrongHabit = progress.some(p => p.streak && p.streak.habitStrength > 70);

  // Check for "almost there" on any task (80-99% progress)
  const almostThereTask = progress.find(p => {
    if (p.isDone) return false;
    const percent = (p.progress / p.effectiveQuota) * 100;
    return percent >= 80 && percent < 100;
  });

  // Priority: All done > Almost there > Long streak/Strong habit > Most done > Time of day
  if (allDone) {
    return getRandomItem(ALL_DONE_GREETINGS);
  }

  // Show almost there encouragement (subtle nudge)
  if (almostThereTask && Math.random() > 0.4) {
    return getRandomItem(ALMOST_THERE_GREETINGS);
  }

  if ((hasLongStreak || hasStrongHabit) && Math.random() > 0.5) {
    return getRandomItem(STREAK_GREETINGS);
  }

  if (mostDone) {
    return getRandomItem(MOST_DONE_GREETINGS);
  }

  // Low progress encouragement (only show sometimes to avoid being annoying)
  if (completedCount === 0 && Math.random() > 0.7) {
    return getRandomItem(ENCOURAGEMENT_GREETINGS);
  }

  // Default to time-based greeting
  switch (timeOfDay) {
    case 'morning': return getRandomItem(MORNING_GREETINGS);
    case 'afternoon': return getRandomItem(AFTERNOON_GREETINGS);
    case 'evening': return getRandomItem(EVENING_GREETINGS);
    case 'night': return getRandomItem(NIGHT_GREETINGS);
  }
}

/**
 * Get a summary of today's progress
 */
export function getProgressSummary(progress: TaskProgress[]): string {
  if (progress.length === 0) {
    return "No tasks to track yet";
  }

  const completedCount = progress.filter(p => p.isDone).length;
  const totalCount = progress.length;

  if (completedCount === totalCount) {
    return `${completedCount}/${totalCount} quotas complete`;
  }

  if (completedCount === 0) {
    return `${totalCount} task${totalCount > 1 ? 's' : ''} to go`;
  }

  return `${completedCount}/${totalCount} done`;
}
