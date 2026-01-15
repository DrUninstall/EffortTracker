'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Play, Undo2, Plus, Flame, Snowflake, Wand2, MessageSquare, X } from 'lucide-react';
import { TaskProgress } from '@/types';
import { formatMinutes } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTimerStore } from '@/stores/timerStore';
import { useTaskStore } from '@/stores/taskStore';
import { triggerHaptic } from '@/lib/haptics';
import { playSound } from '@/lib/sounds';
import { RankBadge } from '@/components/ranking/RankBadge';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  taskProgress: TaskProgress;
  onQuickAdd: (amount: number, note?: string) => void;
  onStartTimer: () => void;
  onUndo: () => boolean;
  canUndo: boolean;
  onOpenBreakdown?: () => void;
}

const QUICK_ADD_OPTIONS = [5, 10, 15, 25];
const HABIT_ADD_OPTIONS = [1, 2, 3];

const PRIORITY_LABELS = {
  CORE: 'Core',
  IMPORTANT: 'Important',
  OPTIONAL: 'Optional',
};

const PRIORITY_COLORS = {
  CORE: 'var(--priority-core)',
  IMPORTANT: 'var(--priority-important)',
  OPTIONAL: 'var(--priority-optional)',
};

// Determine streak level for styling
function getStreakLevel(streakDays: number): 'warm' | 'hot' | 'fire' | null {
  if (streakDays < 3) return null;
  if (streakDays < 7) return 'warm';
  if (streakDays < 14) return 'hot';
  return 'fire';
}

export function TaskCard({
  taskProgress,
  onQuickAdd,
  onStartTimer,
  onUndo,
  canUndo,
  onOpenBreakdown,
}: TaskCardProps) {
  const { task, progress, effectiveQuota, remaining, isDone, carryoverApplied, progressUnit, streak } =
    taskProgress;

  // Compute streak display info
  const streakInfo = useMemo(() => {
    if (!streak || streak.currentStreak < 3) return null;

    const level = getStreakLevel(streak.currentStreak);
    const recentlyUsedFreeze = streak.freezeUsedDates.length > 0 &&
      streak.freezeUsedDates[streak.freezeUsedDates.length - 1] >=
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return {
      count: streak.currentStreak,
      level,
      hasFreeze: recentlyUsedFreeze,
      freezesAvailable: streak.freezesAvailable,
    };
  }, [streak]);

  // Get user settings for haptics/sounds
  const { settings } = useTaskStore();

  // Check if this is a habit task
  const isHabit = task.task_type === 'HABIT';

  // Check if there's a paused timer for this task (only relevant for time tasks)
  const { taskId: activeTaskId, pausedElapsed, isRunning } = useTimerStore();
  const hasPausedTimer = !isHabit && activeTaskId === task.id && pausedElapsed > 0 && !isRunning;

  // Notes input state
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');

  // Handle quick-add with haptic and sound feedback
  const handleQuickAdd = (amount: number, withNote = false) => {
    if (withNote) {
      // Show note input first
      setPendingAmount(amount);
      setShowNoteInput(true);
      return;
    }

    // Trigger haptic feedback
    if (settings.vibrationEnabled) {
      triggerHaptic('light');
    }
    // Trigger sound feedback
    if (settings.soundEnabled) {
      playSound('log');
    }
    // Call the actual handler
    onQuickAdd(amount);
  };

  // Submit with note
  const handleSubmitWithNote = () => {
    if (pendingAmount === null) return;

    if (settings.vibrationEnabled) {
      triggerHaptic('light');
    }
    if (settings.soundEnabled) {
      playSound('log');
    }

    onQuickAdd(pendingAmount, noteText.trim() || undefined);

    // Reset state
    setShowNoteInput(false);
    setPendingAmount(null);
    setNoteText('');
  };

  // Cancel note input
  const handleCancelNote = () => {
    setShowNoteInput(false);
    setPendingAmount(null);
    setNoteText('');
  };

  // Handle undo with feedback
  const handleUndo = () => {
    if (settings.vibrationEnabled) {
      triggerHaptic('undo');
    }
    onUndo();
  };

  // Handle start timer with feedback
  const handleStartTimer = () => {
    if (settings.vibrationEnabled) {
      triggerHaptic('medium');
    }
    onStartTimer();
  };

  const progressPercent = Math.min(100, (progress / effectiveQuota) * 100);

  // Build quota label based on task type
  const quotaLabel = isHabit
    ? `${task.habit_quota_count} ${task.habit_unit || 'times'}/${task.quota_type === 'DAILY' ? 'day' : 'week'}`
    : task.quota_type === 'DAILY'
      ? `${task.daily_quota_minutes}m/day`
      : `${task.weekly_quota_minutes}m/week`;

  // Format progress display based on task type
  const formatProgress = (value: number) => {
    return isHabit ? value.toString() : formatMinutes(value);
  };

  return (
    <motion.article
      className={styles.card}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={
        {
          '--card-accent': task.color || PRIORITY_COLORS[task.priority],
        } as React.CSSProperties
      }
      aria-label={`${task.name}: ${formatProgress(progress)} of ${formatProgress(effectiveQuota)} ${isDone ? '(complete)' : `(${formatProgress(remaining)} remaining)`}`}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span
            className={styles.priorityDot}
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
            title={PRIORITY_LABELS[task.priority]}
          />
          <h3 className={styles.name}>{task.name}</h3>

          {/* Rank Badge */}
          {task.priorityRank !== undefined && settings.enablePriorityRanking && (
            <RankBadge rank={task.priorityRank} variant="small" />
          )}

          {/* Break Down Button */}
          {onOpenBreakdown && (
            <button
              className={styles.breakdownBtn}
              onClick={(e) => {
                e.stopPropagation();
                onOpenBreakdown();
              }}
              title="Break down this task"
            >
              <Wand2 size={14} />
            </button>
          )}

          {/* Streak Badge */}
          <AnimatePresence>
            {streakInfo && streakInfo.level && (
              <motion.div
                className={styles.streakBadge}
                data-level={streakInfo.level}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                title={`${streakInfo.count} day streak${streakInfo.freezesAvailable > 0 ? ` (${streakInfo.freezesAvailable} freeze${streakInfo.freezesAvailable > 1 ? 's' : ''} available)` : ''}`}
              >
                <Flame size={12} />
                <span>{streakInfo.count}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Freeze Used Indicator */}
          <AnimatePresence>
            {streakInfo?.hasFreeze && (
              <motion.div
                className={styles.freezeIndicator}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                title="Streak saved by a freeze!"
              >
                <Snowflake size={10} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Done Indicator */}
          <AnimatePresence>
            {isDone && (
              <motion.div
                className={styles.doneIndicator}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Check size={16} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className={styles.quotaInfo}>
          <span className={styles.quotaLabel}>{quotaLabel}</span>
          {carryoverApplied > 0 && (
            <span className={styles.carryover}>
              (−{carryoverApplied}m carryover)
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressSection}>
        <Progress
          value={progressPercent}
          className={styles.progressBar}
          indicatorClassName={isDone ? styles.progressComplete : undefined}
          aria-label={`Progress: ${progress} of ${effectiveQuota} ${isHabit ? 'completions' : 'minutes'}`}
        />
        <div className={styles.progressStats}>
          <span className={styles.progressValue}>{formatProgress(progress)}</span>
          <span className={styles.progressDivider}>/</span>
          <span className={styles.quotaValue}>{formatProgress(effectiveQuota)}</span>
          {isHabit && task.habit_unit && (
            <span className={styles.habitUnit}>{task.habit_unit}</span>
          )}
          {!isDone && remaining > 0 && (
            <span className={styles.remaining}>
              ({formatProgress(remaining)} left)
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {isHabit ? (
          /* Habit Actions - Big +1 button */
          <div className={styles.habitActions}>
            <Button
              variant="default"
              size="lg"
              className={styles.habitAddButton}
              onClick={() => handleQuickAdd(1)}
              aria-label="Add 1 completion"
            >
              <Plus size={28} strokeWidth={2.5} />
            </Button>
            {canUndo && (
              <Button
                variant="ghost"
                size="icon"
                className={styles.undoButton}
                onClick={handleUndo}
                title="Undo last log"
              >
                <Undo2 size={18} />
              </Button>
            )}
          </div>
        ) : (
          /* Time-based Actions - Quick add + Timer */
          <>
            <div className={styles.quickAddButtons}>
              {QUICK_ADD_OPTIONS.map((minutes) => (
                <Button
                  key={minutes}
                  variant="outline"
                  size="sm"
                  className={styles.quickAddButton}
                  onClick={() => handleQuickAdd(minutes)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleQuickAdd(minutes, true);
                  }}
                  title="Click to add, right-click to add with note"
                >
                  +{minutes}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className={styles.noteButton}
                onClick={() => handleQuickAdd(15, true)}
                title="Add time with a note"
              >
                <MessageSquare size={16} />
              </Button>
            </div>
            <div className={styles.mainActions}>
              {canUndo && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={styles.undoButton}
                  onClick={handleUndo}
                  title="Undo last log"
                >
                  <Undo2 size={18} />
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                className={styles.startButton}
                onClick={handleStartTimer}
              >
                <Play size={16} />
                {hasPausedTimer ? 'Resume' : 'Start'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Note Input Overlay */}
      <AnimatePresence>
        {showNoteInput && (
          <motion.div
            className={styles.noteInputOverlay}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className={styles.noteInputHeader}>
              <span className={styles.noteInputLabel}>
                Add {isHabit ? pendingAmount : `${pendingAmount}m`} with note:
              </span>
              <button
                className={styles.noteInputClose}
                onClick={handleCancelNote}
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              className={styles.noteInput}
              placeholder="What did you work on? (optional)"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitWithNote();
                if (e.key === 'Escape') handleCancelNote();
              }}
              autoFocus
            />
            <div className={styles.noteInputActions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelNote}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSubmitWithNote}
              >
                Add {isHabit ? '' : `${pendingAmount}m`}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
