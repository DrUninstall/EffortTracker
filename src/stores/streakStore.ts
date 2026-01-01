import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { StreakData, Task, IncrementLog } from '@/types';
import { zustandStorage } from '@/lib/storage';
import {
  getToday,
  getYesterday,
  getISOWeekRange,
  getDaysAgo,
} from '@/utils/date';

// Maximum freezes a user can stockpile
const MAX_FREEZES = 2;

// Days of streak completion to earn a freeze
const DAYS_PER_FREEZE = 7;

interface TaskStreakData {
  [taskId: string]: StreakData;
}

interface StreakState {
  streaks: TaskStreakData;
  isHydrated: boolean;

  // Actions
  setHydrated: (value: boolean) => void;
  getStreak: (taskId: string) => StreakData | null;
  updateStreak: (
    taskId: string,
    task: Task,
    logs: IncrementLog[],
    today?: string
  ) => StreakData;
  resetStreak: (taskId: string) => void;
  clearAllStreaks: () => void;
}

// Default streak data for a new task
function createDefaultStreak(): StreakData {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: '',
    freezesAvailable: 0,
    freezeUsedDates: [],
    streakStartDate: '',
  };
}

// Check if a task quota was completed on a given date
function wasQuotaCompleted(
  task: Task,
  logs: IncrementLog[],
  date: string
): boolean {
  const taskLogs = logs.filter(
    (l) => l.task_id === task.id && l.date === date
  );

  if (task.task_type === 'HABIT') {
    const count = taskLogs.reduce((sum, l) => sum + (l.count || 0), 0);
    const quota = task.habit_quota_count || 0;
    return count >= quota;
  } else {
    // TIME task
    const minutes = taskLogs.reduce((sum, l) => sum + l.minutes, 0);
    if (task.quota_type === 'DAILY') {
      return minutes >= (task.daily_quota_minutes || 0);
    } else {
      // WEEKLY - check the whole week
      const { start, end } = getISOWeekRange(date);
      const weekLogs = logs.filter(
        (l) => l.task_id === task.id && l.date >= start && l.date <= end
      );
      const weekMinutes = weekLogs.reduce((sum, l) => sum + l.minutes, 0);
      return weekMinutes >= (task.weekly_quota_minutes || 0);
    }
  }
}

// Calculate streak for a task
function computeStreak(
  task: Task,
  logs: IncrementLog[],
  existingStreak: StreakData | null,
  today: string
): StreakData {
  const streak = existingStreak ? { ...existingStreak } : createDefaultStreak();

  // Check if today's quota is completed
  const todayCompleted = wasQuotaCompleted(task, logs, today);

  // For weekly tasks, we track streak by weeks, not days
  const isWeekly = task.quota_type === 'WEEKLY';

  if (isWeekly) {
    // Weekly streak logic
    return computeWeeklyStreak(task, logs, streak, today);
  }

  // Daily streak logic
  const yesterday = getYesterday(today);
  const yesterdayCompleted = wasQuotaCompleted(task, logs, yesterday);

  // Case 1: Today is completed
  if (todayCompleted) {
    if (streak.lastCompletedDate === today) {
      // Already counted today, no change
      return streak;
    }

    if (streak.lastCompletedDate === yesterday) {
      // Continuing streak from yesterday
      streak.currentStreak += 1;
    } else if (streak.lastCompletedDate === getDaysAgo(2, today)) {
      // Missed yesterday - try auto-freeze
      if (streak.freezesAvailable > 0) {
        // Auto-apply freeze
        streak.freezesAvailable -= 1;
        streak.freezeUsedDates = [
          ...streak.freezeUsedDates.slice(-4), // Keep last 5 freeze dates
          yesterday,
        ];
        streak.currentStreak += 1; // Continue streak
      } else {
        // No freeze available - streak broken, start new
        streak.currentStreak = 1;
        streak.streakStartDate = today;
      }
    } else {
      // Gap is too large - start fresh
      streak.currentStreak = 1;
      streak.streakStartDate = today;
    }

    streak.lastCompletedDate = today;

    // Update longest streak
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    // Award freeze for every 7-day streak milestone
    const previousMilestone = Math.floor((streak.currentStreak - 1) / DAYS_PER_FREEZE);
    const currentMilestone = Math.floor(streak.currentStreak / DAYS_PER_FREEZE);
    if (currentMilestone > previousMilestone && streak.freezesAvailable < MAX_FREEZES) {
      streak.freezesAvailable += 1;
    }

    return streak;
  }

  // Case 2: Today is not completed
  // Check if we need to evaluate streak continuity
  if (streak.lastCompletedDate === yesterday) {
    // Yesterday was completed, today isn't yet - streak is still intact
    return streak;
  }

  if (streak.lastCompletedDate === getDaysAgo(2, today) && !yesterdayCompleted) {
    // Missed yesterday - should auto-freeze if possible
    if (streak.freezesAvailable > 0 && streak.currentStreak > 0) {
      // Auto-apply freeze for yesterday
      streak.freezesAvailable -= 1;
      streak.freezeUsedDates = [
        ...streak.freezeUsedDates.slice(-4),
        yesterday,
      ];
      // Streak stays intact, waiting for today
      return streak;
    }
  }

  // If gap is 2+ days without freeze, streak is broken
  if (streak.lastCompletedDate && streak.lastCompletedDate < getDaysAgo(1, today)) {
    const daysSinceCompletion = countDaysBetween(streak.lastCompletedDate, today);
    if (daysSinceCompletion > 2 || (daysSinceCompletion === 2 && streak.freezesAvailable === 0)) {
      // Streak is definitively broken
      streak.currentStreak = 0;
      streak.streakStartDate = '';
    }
  }

  return streak;
}

// Weekly streak computation
function computeWeeklyStreak(
  task: Task,
  logs: IncrementLog[],
  streak: StreakData,
  today: string
): StreakData {
  const { start: currentWeekStart } = getISOWeekRange(today);
  const weeklyQuota = task.weekly_quota_minutes || 0;

  // Check current week completion
  const currentWeekLogs = logs.filter(
    (l) => l.task_id === task.id && l.date >= currentWeekStart
  );
  const currentWeekMinutes = currentWeekLogs.reduce((sum, l) => sum + l.minutes, 0);
  const currentWeekComplete = currentWeekMinutes >= weeklyQuota;

  if (currentWeekComplete) {
    if (!streak.lastCompletedDate || streak.lastCompletedDate < currentWeekStart) {
      // First completion this week
      streak.currentStreak += 1;
      streak.lastCompletedDate = today;

      if (streak.currentStreak === 1) {
        streak.streakStartDate = currentWeekStart;
      }

      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
    }
  }

  return streak;
}

// Count days between two dates
function countDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      streaks: {},
      isHydrated: false,

      setHydrated: (value) => set({ isHydrated: value }),

      getStreak: (taskId) => {
        return get().streaks[taskId] || null;
      },

      updateStreak: (taskId, task, logs, today = getToday()) => {
        const existingStreak = get().streaks[taskId] || null;
        const newStreak = computeStreak(task, logs, existingStreak, today);

        set((state) => ({
          streaks: {
            ...state.streaks,
            [taskId]: newStreak,
          },
        }));

        return newStreak;
      },

      resetStreak: (taskId) => {
        set((state) => {
          const { [taskId]: _, ...rest } = state.streaks;
          return { streaks: rest };
        });
      },

      clearAllStreaks: () => {
        set({ streaks: {} });
      },
    }),
    {
      name: 'effort-ledger-streaks',
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
