'use client';

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTaskStore } from '@/stores/taskStore';
import { useTimerStore } from '@/stores/timerStore';
import { TaskCard } from '@/components/task/TaskCard';
import { TaskCardSkeletonList } from '@/components/task/TaskCardSkeleton';
import { QuotaConfetti } from '@/components/celebrations/QuotaConfetti';
import { WeeklyOverview } from '@/components/home/WeeklyOverview';
import { DailyProgressRing } from '@/components/home/DailyProgressRing';
import { QuickAddTaskDialog } from '@/components/home/QuickAddTaskDialog';
import { CommandPalette } from '@/components/CommandPalette';
import { TaskBreakdown } from '@/components/TaskBreakdown';
import { PaceWarningBanner } from '@/components/warnings/PaceWarningBanner';
import { TaskGuidanceCard } from '@/components/guidance/TaskGuidanceCard';
import { Button } from '@/components/ui/button';
import { FocusScore } from '@/components/insights/FocusScore';
import { PatternInsights } from '@/components/insights/PatternInsights';
import {
  formatDateDisplay,
  getToday,
  getDaysAgo,
  getDaysFromNow,
  isToday,
} from '@/utils/date';
import { calculateFocusScore } from '@/utils/allocation';
import { detectPatterns, getAllPatterns } from '@/utils/patterns';
import { getGreeting } from '@/utils/greetings';
import { getTaskWarnings, calculateDailyTarget } from '@/utils/paceCalculator';
import { getTaskRecommendation } from '@/utils/taskRecommendation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { toast } from '@/components/ui/Toast';
import styles from './page.module.css';

export default function TodayPage() {
  const router = useRouter();
  const {
    tasks,
    selectedDate,
    setSelectedDate,
    getAllTaskProgress,
    getTaskProgress,
    addLog,
    undoLastLog,
    logs,
    settings,
    isHydrated,
  } = useTaskStore();

  const { startTimer } = useTimerStore();

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationTaskName, setCelebrationTaskName] = useState('');

  // Quick-add dialog state
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Command palette state
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Task breakdown state
  const [showTaskBreakdown, setShowTaskBreakdown] = useState(false);
  const [breakdownTaskName, setBreakdownTaskName] = useState('');

  // Warnings and guidance dismissal state
  const [dismissedWarningId, setDismissedWarningId] = useState<string | null>(null);
  const [dismissedGuidance, setDismissedGuidance] = useState(false);

  // Track which tasks have already celebrated (to prevent duplicate celebrations)
  const celebratedTasksRef = useRef<Set<string>>(new Set());

  // Get task progress for selected date
  const taskProgress = useMemo(() => {
    return getAllTaskProgress(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllTaskProgress, selectedDate, logs]);

  // Calculate warnings for weekly tasks (only show on today)
  const isTodaySelected = isToday(selectedDate);
  const warnings = useMemo(() => {
    if (!isTodaySelected || !settings.showPaceWarnings) return [];
    return getTaskWarnings(tasks, logs, selectedDate);
  }, [tasks, logs, selectedDate, isTodaySelected, settings.showPaceWarnings]);

  // Create warning map for easy lookup
  const warningMap = useMemo(() => {
    const map = new Map<string, { severity: typeof warnings[0]['severity']; message: string }>();
    for (const warning of warnings) {
      map.set(warning.taskId, { severity: warning.severity, message: warning.message });
    }
    return map;
  }, [warnings]);

  // Get top warning to display (if not dismissed)
  const topWarning = useMemo(() => {
    const nonDismissedWarnings = warnings.filter(w => w.taskId !== dismissedWarningId);
    return nonDismissedWarnings[0] || null;
  }, [warnings, dismissedWarningId]);

  // Calculate task recommendation (only show on today and if guidance enabled)
  const recommendation = useMemo(() => {
    if (!isTodaySelected || !settings.showTaskGuidance || dismissedGuidance) return null;
    return getTaskRecommendation(taskProgress, warnings, selectedDate);
  }, [taskProgress, warnings, selectedDate, isTodaySelected, settings.showTaskGuidance, dismissedGuidance]);

  // Get greeting based on current progress (must be before any conditional returns)
  const greeting = useMemo(() => {
    if (!isTodaySelected) return null;
    return getGreeting(taskProgress);
  }, [taskProgress, isTodaySelected]);

  // Dismiss celebration callback
  const handleDismissCelebration = useCallback(() => {
    setShowCelebration(false);
  }, []);

  // Calculate focus score for today (if today is selected)
  const focusScore = useMemo(() => {
    if (!isToday(selectedDate)) return null;
    if (!settings.show_focus_score) return null;
    return calculateFocusScore(selectedDate, logs, tasks);
  }, [selectedDate, logs, tasks, settings.show_focus_score]);

  // Get patterns for tasks that have enough data
  const patterns = useMemo(() => {
    if (!settings.enable_pattern_detection) return [];
    return getAllPatterns(logs, tasks);
  }, [logs, tasks, settings.enable_pattern_detection]);

  // Check if a task has recent logs (within 10 minutes) for undo
  const canUndoTask = (taskId: string): boolean => {
    const now = Date.now();
    const TEN_MINUTES = 10 * 60 * 1000;
    const taskLogs = logs.filter(
      (l) => l.task_id === taskId && l.date === selectedDate
    );
    if (taskLogs.length === 0) return false;
    const lastLog = taskLogs.sort((a, b) => b.created_at - a.created_at)[0];
    return now - lastLog.created_at <= TEN_MINUTES;
  };

  // Date navigation
  const goToPreviousDay = () => {
    setSelectedDate(getDaysAgo(1, selectedDate));
  };

  const goToNextDay = () => {
    setSelectedDate(getDaysFromNow(1, selectedDate));
  };

  const goToToday = () => {
    setSelectedDate(getToday());
  };

  // Handlers
  const handleQuickAdd = (taskId: string, amount: number, taskName: string, isHabit: boolean, note?: string) => {
    // Get progress BEFORE adding the log to check if this will complete the quota
    const progressBefore = getTaskProgress(taskId, selectedDate);
    const wasDoneBefore = progressBefore?.isDone ?? false;

    if (isHabit) {
      addLog(taskId, 0, 'QUICK_ADD', selectedDate, amount, note);
      toast.success(`Added ${amount} to ${taskName}`);
    } else {
      addLog(taskId, amount, 'QUICK_ADD', selectedDate, undefined, note);
      toast.success(`Added ${amount}m to ${taskName}`);
    }

    // Check if quota was just completed (wasn't done before, would be done after)
    // We need to get the progress again after the log was added
    const progressAfter = getTaskProgress(taskId, selectedDate);
    const isDoneNow = progressAfter?.isDone ?? false;

    // Trigger celebration if:
    // 1. Task wasn't done before
    // 2. Task is done now
    // 3. We haven't already celebrated this task today
    const celebrationKey = `${taskId}-${selectedDate}`;
    if (!wasDoneBefore && isDoneNow && !celebratedTasksRef.current.has(celebrationKey)) {
      celebratedTasksRef.current.add(celebrationKey);
      setCelebrationTaskName(taskName);
      setShowCelebration(true);
    }
  };

  const handleStartTimer = (
    taskId: string,
    taskName: string,
    pomodoroDefaults: any
  ) => {
    startTimer(taskId, taskName, 'STOPWATCH', pomodoroDefaults);
    router.push('/timer');
  };

  const handleUndo = (taskId: string): boolean => {
    return undoLastLog(taskId, selectedDate);
  };

  // Handle recommendation actions
  const handleRecommendationStartTimer = useCallback(() => {
    if (!recommendation) return;
    const task = tasks.find(t => t.id === recommendation.taskId);
    if (task) {
      startTimer(task.id, task.name, 'STOPWATCH', task.pomodoro_defaults);
      router.push('/timer');
    }
  }, [recommendation, tasks, startTimer, router]);

  const handleRecommendationQuickAdd = useCallback((amount: number) => {
    if (!recommendation) return;
    handleQuickAdd(
      recommendation.taskId,
      amount,
      recommendation.taskName,
      recommendation.isHabit
    );
  }, [recommendation]);

  const handleDismissGuidance = useCallback(() => {
    setDismissedGuidance(true);
  }, []);

  const handleDismissWarning = useCallback(() => {
    if (topWarning) {
      setDismissedWarningId(topWarning.taskId);
    }
  }, [topWarning]);

  // Keyboard shortcuts (after handlers are defined)
  useKeyboardShortcuts({
    onNewTask: () => setShowQuickAdd(true),
    onCommandPalette: () => setShowCommandPalette(true),
    onQuickAddToTask: (taskIndex) => {
      if (taskProgress[taskIndex]) {
        const tp = taskProgress[taskIndex];
        const isHabit = tp.task.task_type === 'HABIT';
        handleQuickAdd(tp.task.id, isHabit ? 1 : 5, tp.task.name, isHabit);
      }
    },
  });

  // Show skeleton state while hydrating
  if (!isHydrated) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.dateNav}>
            <Button variant="ghost" size="icon" disabled>
              <ChevronLeft size={20} />
            </Button>
            <div className={styles.dateButton}>
              <span className={styles.dateText}>Loading...</span>
            </div>
            <Button variant="ghost" size="icon" disabled>
              <ChevronRight size={20} />
            </Button>
          </div>
          <Button variant="default" size="sm" disabled>
            <Plus size={18} />
            Add Task
          </Button>
        </header>
        <div className={styles.taskList}>
          <TaskCardSkeletonList count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Weekly Overview - Fixed at top for visual stability */}
      <WeeklyOverview />

      {/* Greeting */}
      {greeting && (
        <div className={styles.greeting}>
          <p className={styles.greetingText}>{greeting}</p>
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.dateNav}>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousDay}
            aria-label="Previous day"
          >
            <ChevronLeft size={20} />
          </Button>
          <button
            className={styles.dateButton}
            onClick={goToToday}
            disabled={isTodaySelected}
          >
            <span className={styles.dateText}>
              {formatDateDisplay(selectedDate)}
            </span>
            {!isTodaySelected && (
              <span className={styles.todayHint}>Tap to go to today</span>
            )}
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextDay}
            aria-label="Next day"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowQuickAdd(true)}
        >
          <Plus size={18} />
          Add Task
        </Button>
      </header>

      {/* Hormozi: Focus Score (only show for today) */}
      {focusScore && <FocusScore score={focusScore} />}

      {/* Hormozi: Pattern Insights (show top 2 patterns) */}
      {patterns.slice(0, 2).map((pattern) => {
        const task = tasks.find((t) => t.id === pattern.task_id);
        if (!task) return null;
        return (
          <PatternInsights
            key={pattern.task_id}
            pattern={pattern}
            taskName={task.name}
          />
        );
      })}

      {/* Daily Progress Ring */}
      {isTodaySelected && taskProgress.length > 0 && (
        <DailyProgressRing progress={taskProgress} />
      )}

      {/* Pace Warning Banner */}
      {topWarning && (
        <PaceWarningBanner
          warning={topWarning}
          onDismiss={handleDismissWarning}
        />
      )}

      {/* Task Guidance Card */}
      {recommendation && !recommendation.isHabit && (
        <TaskGuidanceCard
          recommendation={recommendation}
          onStartTimer={handleRecommendationStartTimer}
          onQuickAdd={handleRecommendationQuickAdd}
          onDismiss={handleDismissGuidance}
          habitUnit={tasks.find(t => t.id === recommendation.taskId)?.habit_unit}
        />
      )}

      {/* Task List */}
      <div className={styles.taskList}>
        {taskProgress.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No active tasks</h3>
            <p>Create tasks to track your effort and build productive habits.</p>
            <Button variant="default" onClick={() => router.push('/settings?new=true')}>
              Create your first task
            </Button>
          </div>
        ) : (
          taskProgress.map((tp) => {
            const warning = warningMap.get(tp.task.id);
            const isWeeklyTask = tp.task.quota_type === 'WEEKLY';
            const dailyTarget = isWeeklyTask && isTodaySelected && settings.showTaskGuidance
              ? calculateDailyTarget(tp.task, tp, selectedDate)
              : undefined;

            return (
              <TaskCard
                key={tp.task.id}
                taskProgress={tp}
                onQuickAdd={(amount, note) => handleQuickAdd(tp.task.id, amount, tp.task.name, tp.task.task_type === 'HABIT', note)}
                onStartTimer={() =>
                  handleStartTimer(
                    tp.task.id,
                    tp.task.name,
                    tp.task.pomodoro_defaults
                  )
                }
                onUndo={() => handleUndo(tp.task.id)}
                canUndo={canUndoTask(tp.task.id)}
                onOpenBreakdown={() => {
                  setBreakdownTaskName(tp.task.name);
                  setShowTaskBreakdown(true);
                }}
                warningSeverity={warning?.severity}
                warningMessage={warning?.message}
                dailyTarget={dailyTarget}
                showDailyTarget={isWeeklyTask && settings.showTaskGuidance}
              />
            );
          })
        )}
      </div>

      {/* Quota Completion Celebration */}
      <QuotaConfetti
        isVisible={showCelebration}
        taskName={celebrationTaskName}
        onDismiss={handleDismissCelebration}
        soundEnabled={settings.soundEnabled}
        vibrationEnabled={settings.vibrationEnabled}
      />

      {/* Quick Add Task Dialog */}
      <QuickAddTaskDialog
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />

      {/* Task Breakdown Tool */}
      <TaskBreakdown
        isOpen={showTaskBreakdown}
        onClose={() => setShowTaskBreakdown(false)}
        initialTaskName={breakdownTaskName}
      />
    </div>
  );
}
