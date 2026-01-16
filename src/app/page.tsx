'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTaskStore } from '@/stores/taskStore';
import { useTimerStore } from '@/stores/timerStore';
import { TaskCard } from '@/components/task/TaskCard';
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
import styles from './page.module.css';

export default function TodayPage() {
  const router = useRouter();
  const {
    selectedDate,
    setSelectedDate,
    getAllTaskProgress,
    addLog,
    undoLastLog,
    logs,
    tasks,
    settings,
    isHydrated,
  } = useTaskStore();

  const { startTimer } = useTimerStore();

  // Get task progress for selected date
  const taskProgress = useMemo(() => {
    return getAllTaskProgress(selectedDate);
  }, [getAllTaskProgress, selectedDate]);

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
  const handleQuickAdd = (taskId: string, minutes: number) => {
    addLog(taskId, minutes, 'QUICK_ADD', selectedDate);
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

  // Show loading state while hydrating
  if (!isHydrated) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  const isTodaySelected = isToday(selectedDate);

  return (
    <div className={styles.container}>
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
          onClick={() => router.push('/settings?new=true')}
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

      {/* Task List */}
      <div className={styles.taskList}>
        {taskProgress.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No active tasks</p>
            <Button variant="outline" onClick={() => router.push('/settings')}>
              Create your first task
            </Button>
          </div>
        ) : (
          taskProgress.map((tp) => (
            <TaskCard
              key={tp.task.id}
              taskProgress={tp}
              onQuickAdd={(minutes) => handleQuickAdd(tp.task.id, minutes)}
              onStartTimer={() =>
                handleStartTimer(
                  tp.task.id,
                  tp.task.name,
                  tp.task.pomodoro_defaults
                )
              }
              onUndo={() => handleUndo(tp.task.id)}
              canUndo={canUndoTask(tp.task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
