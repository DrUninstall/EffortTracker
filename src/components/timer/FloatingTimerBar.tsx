'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, ChevronUp } from 'lucide-react';
import { useTimerStore } from '@/stores/timerStore';
import { useTaskStore } from '@/stores/taskStore';
import { formatTimer, formatMinutes } from '@/utils/date';
import { toast } from '@/components/ui/Toast';
import styles from './FloatingTimerBar.module.css';

export function FloatingTimerBar() {
  const router = useRouter();
  const {
    taskId,
    taskName,
    mode,
    isRunning,
    getElapsedMs,
    getRemainingMs,
    pomodoroPhase,
    resetTimer,
    isHydrated,
  } = useTimerStore();

  const { addLog, undoLastLog, selectedDate } = useTaskStore();

  const [displayTime, setDisplayTime] = useState(0);
  const rafRef = useRef<number>();

  // Update display time
  useEffect(() => {
    const updateDisplay = () => {
      // For Pomodoro, show remaining time; for stopwatch, show elapsed time
      setDisplayTime(mode === 'POMODORO' ? getRemainingMs() : getElapsedMs());
      rafRef.current = requestAnimationFrame(updateDisplay);
    };

    if (taskId && (isRunning || getElapsedMs() > 0)) {
      rafRef.current = requestAnimationFrame(updateDisplay);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [taskId, isRunning, getElapsedMs, getRemainingMs, mode]);

  // Handle visibility change to recompute time
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && taskId) {
        setDisplayTime(getElapsedMs());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [taskId, getElapsedMs]);

  // Handle stop with auto-log
  const handleStop = useCallback(() => {
    if (!taskId) return;

    const elapsed = getElapsedMs();
    const minutes = Math.round(elapsed / 60000);
    const currentTaskId = taskId;
    const currentTaskName = taskName;

    // For Pomodoro, only log if in FOCUS phase
    const shouldLog = mode === 'STOPWATCH' ||
      (mode === 'POMODORO' && pomodoroPhase === 'FOCUS');

    if (minutes > 0 && shouldLog) {
      // Auto-log the time
      addLog(currentTaskId, minutes, 'TIMER');

      // Show toast with undo action
      toast.success(
        `Logged ${formatMinutes(minutes)} to ${currentTaskName}`,
        {
          label: 'Undo',
          onClick: () => {
            undoLastLog(currentTaskId, selectedDate);
          },
        }
      );
    }

    resetTimer();
  }, [taskId, taskName, selectedDate, getElapsedMs, addLog, undoLastLog, resetTimer, mode, pomodoroPhase]);

  // Expand to full timer page
  const handleExpand = useCallback(() => {
    router.push('/timer');
  }, [router]);

  // Don't show until hydrated to avoid flash
  if (!isHydrated) {
    return null;
  }

  // Don't show if no active timer
  if (!taskId) {
    return null;
  }

  const isActive = isRunning || displayTime > 0;
  if (!isActive) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className={styles.container}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <motion.div
          className={styles.bar}
          onClick={handleExpand}
          whileTap={{ scale: 0.98 }}
        >
          {/* Running indicator */}
          <div className={styles.indicator}>
            <motion.div
              className={styles.dot}
              animate={isRunning ? {
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1],
              } : {}}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>

          {/* Task info */}
          <div className={styles.info}>
            <span className={styles.taskName}>
              {taskName}
              {mode === 'POMODORO' && (
                <span className={styles.phase}>
                  {' · '}{pomodoroPhase === 'FOCUS' ? 'Focus' : pomodoroPhase === 'BREAK' ? 'Break' : 'Long Break'}
                </span>
              )}
            </span>
            <span className={styles.timer}>{formatTimer(displayTime)}</span>
          </div>

          {/* Expand hint */}
          <ChevronUp size={16} className={styles.expandIcon} />

          {/* Stop button */}
          <motion.button
            className={styles.stopButton}
            onClick={(e) => {
              e.stopPropagation();
              handleStop();
            }}
            whileTap={{ scale: 0.9 }}
            aria-label="Stop timer and log time"
          >
            <Square size={16} fill="currentColor" />
            <span>Stop</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
