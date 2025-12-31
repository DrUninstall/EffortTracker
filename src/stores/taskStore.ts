import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Task,
  IncrementLog,
  AppSettings,
  TaskProgress,
  LogSource,
  Priority,
  ExportData,
} from '@/types';
import { zustandStorage } from '@/lib/storage';
import { generateUUID } from '@/utils/uuid';
import {
  getToday,
  getYesterday,
  getISOWeekRange,
  getDateRange,
} from '@/utils/date';

// Default Pomodoro settings
const DEFAULT_POMODORO = {
  focus_minutes: 25,
  break_minutes: 5,
  long_break_minutes: 15,
  cycles_before_long_break: 4,
};

// Default app settings
const DEFAULT_SETTINGS: AppSettings = {
  weekStartDay: 1, // Monday
  theme: 'system',
  soundEnabled: false,
  vibrationEnabled: false,
};

// Demo tasks for first run
const DEMO_TASKS: Omit<Task, 'id' | 'created_at'>[] = [
  {
    name: 'EA Study',
    priority: 'CORE',
    quota_type: 'DAILY',
    daily_quota_minutes: 240,
    allow_carryover: false,
    pomodoro_defaults: DEFAULT_POMODORO,
    is_archived: false,
  },
  {
    name: 'Reading',
    priority: 'IMPORTANT',
    quota_type: 'DAILY',
    daily_quota_minutes: 10,
    allow_carryover: false,
    pomodoro_defaults: DEFAULT_POMODORO,
    is_archived: false,
  },
  {
    name: 'Workout',
    priority: 'IMPORTANT',
    quota_type: 'DAILY',
    daily_quota_minutes: 60,
    allow_carryover: false,
    pomodoro_defaults: DEFAULT_POMODORO,
    is_archived: false,
  },
];

interface TaskState {
  tasks: Task[];
  logs: IncrementLog[];
  settings: AppSettings;
  selectedDate: string;
  isHydrated: boolean;

  // Task CRUD
  addTask: (task: Omit<Task, 'id' | 'created_at'>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  archiveTask: (id: string) => void;
  unarchiveTask: (id: string) => void;

  // Logging
  addLog: (taskId: string, minutes: number, source: LogSource, date?: string) => string;
  undoLastLog: (taskId: string, date: string) => boolean;

  // Date selection
  setSelectedDate: (date: string) => void;

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Computed values
  getTaskProgress: (taskId: string, date?: string) => TaskProgress | null;
  getAllTaskProgress: (date?: string) => TaskProgress[];
  getLogsForTask: (taskId: string, startDate: string, endDate: string) => IncrementLog[];
  getLogsForDate: (date: string) => IncrementLog[];

  // Export/Import
  exportData: () => ExportData;
  importData: (data: ExportData) => void;
  clearAllData: () => void;

  // Hydration
  setHydrated: (value: boolean) => void;
}

// Priority order for sorting
const PRIORITY_ORDER: Record<Priority, number> = {
  CORE: 0,
  IMPORTANT: 1,
  OPTIONAL: 2,
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      logs: [],
      settings: DEFAULT_SETTINGS,
      selectedDate: getToday(),
      isHydrated: false,

      setHydrated: (value) => set({ isHydrated: value }),

      addTask: (taskData) => {
        const id = generateUUID();
        const task: Task = {
          ...taskData,
          id,
          created_at: Date.now(),
        };
        set((state) => ({ tasks: [...state.tasks, task] }));
        return id;
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          logs: state.logs.filter((l) => l.task_id !== id),
        }));
      },

      archiveTask: (id) => {
        get().updateTask(id, { is_archived: true });
      },

      unarchiveTask: (id) => {
        get().updateTask(id, { is_archived: false });
      },

      addLog: (taskId, minutes, source, date) => {
        const id = generateUUID();
        const log: IncrementLog = {
          id,
          task_id: taskId,
          date: date || get().selectedDate,
          minutes: Math.round(Math.max(0, minutes)), // Ensure positive integer
          source,
          created_at: Date.now(),
        };
        set((state) => ({ logs: [...state.logs, log] }));
        return id;
      },

      undoLastLog: (taskId, date) => {
        const { logs } = get();
        const now = Date.now();
        const TEN_MINUTES = 10 * 60 * 1000;

        // Find logs for this task on this date, sorted by creation time descending
        const taskLogs = logs
          .filter((l) => l.task_id === taskId && l.date === date)
          .sort((a, b) => b.created_at - a.created_at);

        if (taskLogs.length === 0) return false;

        const lastLog = taskLogs[0];

        // Only allow undo if created within last 10 minutes
        if (now - lastLog.created_at > TEN_MINUTES) return false;

        set((state) => ({
          logs: state.logs.filter((l) => l.id !== lastLog.id),
        }));

        return true;
      },

      setSelectedDate: (date) => {
        set({ selectedDate: date });
      },

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      getTaskProgress: (taskId, date) => {
        const { tasks, logs } = get();
        const targetDate = date || get().selectedDate;
        const task = tasks.find((t) => t.id === taskId);

        if (!task) return null;

        if (task.quota_type === 'DAILY') {
          return computeDailyProgress(task, logs, targetDate);
        } else {
          return computeWeeklyProgress(task, logs, targetDate);
        }
      },

      getAllTaskProgress: (date) => {
        const { tasks } = get();
        const targetDate = date || get().selectedDate;

        return tasks
          .filter((t) => !t.is_archived)
          .map((t) => get().getTaskProgress(t.id, targetDate)!)
          .filter(Boolean)
          .sort((a, b) => {
            // Sort by priority first
            const priorityDiff =
              PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority];
            if (priorityDiff !== 0) return priorityDiff;
            // Then by name
            return a.task.name.localeCompare(b.task.name);
          });
      },

      getLogsForTask: (taskId, startDate, endDate) => {
        const { logs } = get();
        return logs.filter(
          (l) =>
            l.task_id === taskId && l.date >= startDate && l.date <= endDate
        );
      },

      getLogsForDate: (date) => {
        const { logs } = get();
        return logs.filter((l) => l.date === date);
      },

      exportData: () => {
        const { tasks, logs, settings } = get();
        return {
          version: '1.0.0',
          exportedAt: Date.now(),
          tasks,
          logs,
          settings,
        };
      },

      importData: (data) => {
        if (data.version !== '1.0.0') {
          console.warn('Unknown export version:', data.version);
        }
        set({
          tasks: data.tasks,
          logs: data.logs,
          settings: { ...DEFAULT_SETTINGS, ...data.settings },
        });
      },

      clearAllData: () => {
        set({
          tasks: [],
          logs: [],
          settings: DEFAULT_SETTINGS,
          selectedDate: getToday(),
        });
      },
    }),
    {
      name: 'effort-ledger-store',
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
          // Seed demo tasks if no tasks exist
          if (state.tasks.length === 0) {
            DEMO_TASKS.forEach((taskData) => {
              state.addTask(taskData);
            });
          }
          // Update selected date to today on rehydration
          state.setSelectedDate(getToday());
        }
      },
    }
  )
);

// Helper function to compute daily task progress
function computeDailyProgress(
  task: Task,
  logs: IncrementLog[],
  date: string
): TaskProgress {
  const dailyQuota = task.daily_quota_minutes || 0;

  // Get today's progress
  const todayLogs = logs.filter(
    (l) => l.task_id === task.id && l.date === date
  );
  const progress = todayLogs.reduce((sum, l) => sum + l.minutes, 0);

  // Calculate carryover if enabled
  let carryoverApplied = 0;
  let effectiveQuota = dailyQuota;

  if (task.allow_carryover) {
    const yesterday = getYesterday(date);
    const yesterdayLogs = logs.filter(
      (l) => l.task_id === task.id && l.date === yesterday
    );
    const yesterdayProgress = yesterdayLogs.reduce((sum, l) => sum + l.minutes, 0);
    const yesterdayOverflow = Math.max(0, yesterdayProgress - dailyQuota);
    carryoverApplied = Math.min(yesterdayOverflow, dailyQuota); // Cap at quota
    effectiveQuota = Math.max(0, dailyQuota - carryoverApplied);
  }

  const remaining = Math.max(0, effectiveQuota - progress);
  const isDone = progress >= effectiveQuota;

  return {
    task,
    progress,
    effectiveQuota,
    remaining,
    isDone,
    carryoverApplied,
  };
}

// Helper function to compute weekly task progress
function computeWeeklyProgress(
  task: Task,
  logs: IncrementLog[],
  date: string
): TaskProgress {
  const weeklyQuota = task.weekly_quota_minutes || 0;
  const { start, end } = getISOWeekRange(date);

  // Get all logs in this week
  const weekLogs = logs.filter(
    (l) =>
      l.task_id === task.id && l.date >= start && l.date <= end
  );
  const progress = weekLogs.reduce((sum, l) => sum + l.minutes, 0);

  const remaining = Math.max(0, weeklyQuota - progress);
  const isDone = progress >= weeklyQuota;

  return {
    task,
    progress,
    effectiveQuota: weeklyQuota,
    remaining,
    isDone,
    carryoverApplied: 0, // No carryover for weekly tasks
  };
}

// Selector for active tasks only
export const selectActiveTasks = (state: TaskState) =>
  state.tasks.filter((t) => !t.is_archived);

// Selector for archived tasks
export const selectArchivedTasks = (state: TaskState) =>
  state.tasks.filter((t) => t.is_archived);
