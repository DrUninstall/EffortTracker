// Core data types for Effort Ledger

export type Priority = 'CORE' | 'IMPORTANT' | 'OPTIONAL';
export type QuotaType = 'DAILY' | 'WEEKLY';
export type LogSource = 'QUICK_ADD' | 'TIMER' | 'POMODORO' | 'MANUAL';

export interface PomodoroDefaults {
  focus_minutes: number;
  break_minutes: number;
  long_break_minutes: number;
  cycles_before_long_break: number;
}

export interface Task {
  id: string;
  name: string;
  priority: Priority;
  color?: string; // optional subtle color (must meet contrast accessibility)
  quota_type: QuotaType;
  daily_quota_minutes?: number; // required if DAILY
  weekly_quota_minutes?: number; // required if WEEKLY
  weekly_days_target?: number; // optional 1-7, informational only
  allow_carryover: boolean;
  pomodoro_defaults: PomodoroDefaults;
  is_archived: boolean;
  created_at: number; // timestamp
}

export interface IncrementLog {
  id: string;
  task_id: string;
  date: string; // YYYY-MM-DD (user local date at log time)
  minutes: number; // positive only, never floats
  source: LogSource;
  created_at: number; // timestamp
}

// Computed types for UI
export interface TaskProgress {
  task: Task;
  progress: number; // minutes logged today or this week
  effectiveQuota: number; // quota minus any carryover
  remaining: number; // max(0, effectiveQuota - progress)
  isDone: boolean;
  carryoverApplied: number; // how much carryover was applied (0 if none)
  streak?: number; // optional streak count for informational display
}

// History analytics types
export interface TaskHistoryStats {
  taskId: string;
  totalMinutes: number;
  avgMinutesPerDay: number;
  quotaHitRate: number; // percentage 0-100
  avgOverflow: number; // average overflow beyond quota
  longestStreak: number; // consecutive days/weeks hitting quota
  daysInRange: number;
  daysWithLogs: number;
}

// App state types
export interface AppSettings {
  weekStartDay: number; // 0 = Sunday, 1 = Monday, etc. (default 1 for Mon-Sun ISO week)
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

// Export/Import types
export interface ExportData {
  version: string;
  exportedAt: number;
  tasks: Task[];
  logs: IncrementLog[];
  settings: AppSettings;
}

// Timer state types
export type TimerMode = 'STOPWATCH' | 'POMODORO';
export type PomodoroPhase = 'FOCUS' | 'BREAK' | 'LONG_BREAK';

export interface TimerState {
  mode: TimerMode;
  taskId: string | null;
  isRunning: boolean;
  startTime: number | null; // timestamp when started
  elapsed: number; // milliseconds elapsed
  pomodoroPhase: PomodoroPhase;
  pomodorosCycle: number; // current cycle count
  pomodoroCyclesCompleted: number; // total cycles completed
}

// Date range for history
export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}
