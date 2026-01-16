// Core data types for Effort Ledger

export type Priority = 'CORE' | 'IMPORTANT' | 'OPTIONAL';
export type QuotaType = 'DAILY' | 'WEEKLY' | 'DAYS_PER_WEEK';
export type TaskType = 'TIME' | 'HABIT';
export type LogSource = 'QUICK_ADD' | 'TIMER' | 'POMODORO' | 'MANUAL';
export type SophisticationLevel = 'basic' | 'intermediate' | 'advanced';
export type EffortPhilosophy = 'work_to_live' | 'live_to_work' | 'balanced';

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
  task_type: TaskType; // TIME for time-based, HABIT for counter-based
  daily_quota_minutes?: number; // required if DAILY + TIME
  weekly_quota_minutes?: number; // required if WEEKLY + TIME
  weekly_days_target?: number; // optional 1-7, informational only
  habit_quota_count?: number; // required if HABIT (e.g., 8 glasses of water)
  habit_unit?: string; // optional unit label (e.g., "glasses", "reps")
  allow_carryover: boolean;
  pomodoro_defaults: PomodoroDefaults;
  is_archived: boolean;
  created_at: number; // timestamp

  // Volume/Outcome tracking (Hormozi: track reps, not just time)
  track_outcomes?: boolean; // Whether to track outcome count
  outcome_label?: string; // e.g., "reps", "pages", "calls", "modules"
  outcome_target?: number; // Weekly outcome target (optional)

  // Priority ranking
  priorityRank?: number; // Rank within priority level (lower = higher priority)
  comparisonCount?: number; // How many comparisons were made during ranking
}

export interface IncrementLog {
  id: string;
  task_id: string;
  date: string; // YYYY-MM-DD (user local date at log time)
  minutes: number; // positive only, never floats (for TIME tasks)
  count?: number; // completion count (for HABIT tasks, typically 1)
  source: LogSource;
  created_at: number; // timestamp

  // Hormozi enhancements: Track outcomes, not just time
  outcome_count?: number; // e.g., "5 modules completed", "12 reps"
  outcome_unit?: string; // e.g., "modules", "reps", "calls" (from Task.outcome_label)

  // Post-session reflection (immediate feedback loop)
  quality_rating?: 1 | 2 | 3 | 4 | 5; // Session quality (1=poor, 5=excellent)
  energy_level?: 1 | 2 | 3 | 4 | 5; // Energy after session (1=drained, 5=energized)

  // Context for pattern detection
  context_tags?: string[]; // e.g., ["morning", "caffeinated", "deep-work", "after-gym"]
  notes?: string; // Optional 1-2 word note

  // Simple context note (also support this field name for compatibility)
  note?: string; // optional context note for understanding patterns
}

// Streak data for forgiving streak system
export interface StreakData {
  currentStreak: number;        // Consecutive days/weeks hitting quota
  longestStreak: number;        // Personal record
  lastCompletedDate: string;    // YYYY-MM-DD of last quota completion
  freezesAvailable: number;     // Max 2, earn 1 per 7-day streak
  freezeUsedDates: string[];    // Dates when freezes were auto-applied
  streakStartDate: string;      // When current streak began
  // Habit strength (Loop-style exponential smoothing)
  habitStrength: number;        // 0-100, gradual decay instead of binary reset
  lastStrengthUpdate: string;   // YYYY-MM-DD of last strength calculation
}

// Computed types for UI
export interface TaskProgress {
  task: Task;
  progress: number; // minutes or count depending on task_type
  effectiveQuota: number; // quota minus any carryover
  remaining: number; // max(0, effectiveQuota - progress)
  isDone: boolean;
  carryoverApplied: number; // how much carryover was applied (0 if none)
  streak?: StreakData; // Full streak data for display
  progressUnit: 'minutes' | 'count'; // for UI display logic
  // Days per week tracking (when quota_type === 'DAYS_PER_WEEK')
  daysCompletedThisWeek?: number; // How many days hit quota this week
  daysRemainingInWeek?: number; // Days left in the week to hit target
  weeklyDaysTarget?: number; // Target days (e.g., 3 times per week)
}

// History analytics types
export interface TaskHistoryStats {
  taskId: string;
  totalMinutes: number; // for TIME tasks
  totalCount?: number; // for HABIT tasks
  avgMinutesPerDay: number; // for TIME tasks
  avgCountPerDay?: number; // for HABIT tasks
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

  // Hormozi feature toggles
  show_volume_metrics?: boolean; // Show outcome/rep tracking
  show_focus_score?: boolean; // Show daily focus score
  enable_pattern_detection?: boolean; // Enable pattern insights
  enable_post_session_reflection?: boolean; // Ask for quality/energy after sessions
  effort_philosophy?: EffortPhilosophy; // User's work philosophy
  show_sophistication_level?: boolean; // Show sophistication progression

  // Notifications and reminders
  notificationsEnabled: boolean; // Whether to show reminder notifications
  reminderIntervalMinutes: number; // How often to remind (1, 5, 15, 30, 60)

  // Priority ranking
  enablePriorityRanking: boolean; // Enable comparative priority ranking
  showRankingOnboarding: boolean; // One-time tutorial for ranking feature

  // Pacing and guidance features
  showPaceWarnings: boolean; // Show warnings when behind on weekly quotas
  showTaskGuidance: boolean; // Show "work on next" recommendations
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

// Hormozi: Pattern detection types
export type PatternType = 'time_of_day' | 'day_of_week' | 'context' | 'duration';

export interface SessionPattern {
  task_id: string;
  pattern_type: PatternType;
  pattern_value: string; // e.g., "morning", "Tuesday", "after-workout"
  avg_quality: number; // Average quality rating for sessions with this pattern
  session_count: number; // How many sessions match this pattern
  confidence: number; // 0-100, confidence level in this pattern
}

export interface PatternAnalysis {
  task_id: string;
  best_sessions: IncrementLog[]; // Top 20% by quality
  patterns: {
    time_of_day?: string; // e.g., "morning" (6am-12pm)
    day_of_week?: string; // e.g., "Tuesday"
    avg_duration?: number; // Average duration of best sessions
    common_tags?: string[]; // Tags appearing in >50% of best sessions
    energy_correlation?: 'high' | 'medium' | 'low'; // Energy level in best sessions
  };
  confidence: number; // Overall confidence 0-100
  recommendation: string; // Human-readable recommendation
}

// Hormozi: Focus score
export interface FocusScore {
  date: string;
  core_minutes: number;
  important_minutes: number;
  optional_minutes: number;
  total_minutes: number;
  focus_percentage: number; // (core / total) * 100
  status: 'excellent' | 'good' | 'fair' | 'poor'; // >70%, 50-70%, 30-50%, <30%
}

// Hormozi: 70/20/10 Allocation
export interface AllocationScore {
  period: 'day' | 'week' | 'month';
  date: string; // YYYY-MM-DD or week start
  core_percentage: number; // Should be ~70%
  important_percentage: number; // Should be ~20%
  optional_percentage: number; // Should be ~10%
  is_balanced: boolean; // Whether allocation is within healthy ranges
  warnings: string[]; // e.g., ["Too much time on OPTIONAL tasks"]
}

// Hormozi: Sophistication level
export interface SophisticationScore {
  task_id: string;
  level: SophisticationLevel;
  score: number; // 0-100
  breakdown: {
    outcome_tracking: number; // % of logs with outcomes
    quality_tracking: number; // % of logs with quality ratings
    energy_tracking: number; // % of logs with energy levels
    context_tracking: number; // % of logs with context tags
  };
  next_level_at: number; // Score needed for next level
}

// Hormozi: Weekly review data
export interface WeeklyReviewData {
  week_start: string; // YYYY-MM-DD
  week_end: string;
  total_minutes: number;
  focus_score_avg: number;
  best_sessions: IncrementLog[]; // Top 5 sessions by quality
  patterns_discovered: PatternAnalysis[];
  allocation: AllocationScore;
  volume_achievements: {
    task_id: string;
    task_name: string;
    outcome_count: number;
    outcome_label: string;
  }[];
  stop_start_keep?: {
    stop: string[];
    start: string[];
    keep: string[];
  };
}

// Onboarding types
export type OnboardingStep = 'welcome' | 'task_creation' | 'first_log' | 'success' | 'complete';

export interface TaskPreset {
  name: string;
  quota: number;
  quotaType: QuotaType;
  icon: string;
}

// Warning severity levels for pace tracking
export type WarningSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

// Pace projection for weekly tasks
export interface PaceProjection {
  taskId: string;
  taskName: string;
  currentPace: number; // minutes/day averaged so far
  requiredPace: number; // minutes/day needed to hit quota
  projectedCompletion: string | null; // YYYY-MM-DD or null if won't complete
  deficit: number; // how many minutes behind
  daysElapsed: number;
  daysRemaining: number;
  severity: WarningSeverity;
}

// Task warning data
export interface TaskWarning {
  taskId: string;
  taskName: string;
  warningType: 'behind_pace' | 'at_risk' | 'critical';
  severity: WarningSeverity;
  message: string;
  projection: PaceProjection;
}

// Task recommendation for guidance
export interface TaskRecommendation {
  taskId: string;
  taskName: string;
  reason: string;
  urgencyScore: number; // 0-100
  dailyTarget: number; // suggested minutes/count for today
  priority: Priority;
  isHabit: boolean;
}
