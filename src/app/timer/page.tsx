'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Coffee,
  Zap,
  SkipForward,
  X,
  Check,
} from 'lucide-react';
import { useTimerStore } from '@/stores/timerStore';
import { useTaskStore } from '@/stores/taskStore';
import { Button } from '@/components/ui/button';
import { formatTimer } from '@/utils/date';
import styles from './page.module.css';

export default function TimerPage() {
  const router = useRouter();
  const {
    mode,
    taskId,
    taskName,
    isRunning,
    pomodoroPhase,
    pomodoroCycle,
    pomodoroDefaults,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    nextPhase,
    skipBreak,
    getElapsedMs,
    getRemainingMs,
    getPhaseMinutes,
  } = useTimerStore();

  const { addLog, tasks, isHydrated } = useTaskStore();

  // Local state for display
  const [displayTime, setDisplayTime] = useState(0);
  const [showLogPrompt, setShowLogPrompt] = useState(false);
  const [logMinutes, setLogMinutes] = useState(0);
  const rafRef = useRef<number>();

  // Hormozi: Post-session reflection state
  const [qualityRating, setQualityRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [outcomeCount, setOutcomeCount] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update display time using requestAnimationFrame for smooth updates
  useEffect(() => {
    const updateDisplay = () => {
      if (mode === 'POMODORO') {
        setDisplayTime(getRemainingMs());
      } else {
        setDisplayTime(getElapsedMs());
      }
      rafRef.current = requestAnimationFrame(updateDisplay);
    };

    if (isRunning) {
      rafRef.current = requestAnimationFrame(updateDisplay);
    } else {
      // Update once when paused
      if (mode === 'POMODORO') {
        setDisplayTime(getRemainingMs());
      } else {
        setDisplayTime(getElapsedMs());
      }
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isRunning, mode, getElapsedMs, getRemainingMs]);

  // Handle visibility change to recompute time from timestamps
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        // Force update display
        if (mode === 'POMODORO') {
          setDisplayTime(getRemainingMs());
        } else {
          setDisplayTime(getElapsedMs());
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning, mode, getElapsedMs, getRemainingMs]);

  // Check for Pomodoro phase completion
  useEffect(() => {
    if (mode === 'POMODORO' && isRunning) {
      const remaining = getRemainingMs();
      if (remaining <= 0) {
        // Phase complete
        if (pomodoroPhase === 'FOCUS' && taskId) {
          // Log the focus time
          const focusMinutes = pomodoroDefaults?.focus_minutes || 25;
          addLog(taskId, focusMinutes, 'POMODORO');
        }
        nextPhase();
      }
    }
  }, [
    displayTime,
    mode,
    isRunning,
    pomodoroPhase,
    taskId,
    pomodoroDefaults,
    addLog,
    nextPhase,
    getRemainingMs,
  ]);

  // Handle stop timer
  const handleStop = useCallback(() => {
    if (mode === 'STOPWATCH') {
      const elapsed = getElapsedMs();
      const minutes = Math.round(elapsed / 60000);
      if (minutes > 0) {
        setLogMinutes(minutes);
        setShowLogPrompt(true);
      }
      pauseTimer();
    } else {
      stopTimer();
      resetTimer();
      router.push('/');
    }
  }, [mode, getElapsedMs, pauseTimer, stopTimer, resetTimer, router]);

  // Handle logging after stopwatch
  const handleLogConfirm = () => {
    if (taskId && logMinutes > 0) {
      const task = tasks.find((t) => t.id === taskId);
      const settings = useTaskStore.getState().settings;

      // Build metadata object
      const metadata: {
        quality_rating?: 1 | 2 | 3 | 4 | 5;
        energy_level?: 1 | 2 | 3 | 4 | 5;
        outcome_count?: number;
      } = {};

      // Only include if user provided values or if enabled in settings
      if (qualityRating) metadata.quality_rating = qualityRating;
      if (energyLevel) metadata.energy_level = energyLevel;
      if (outcomeCount && task?.track_outcomes) {
        const count = parseInt(outcomeCount);
        if (!isNaN(count) && count > 0) {
          metadata.outcome_count = count;
        }
      }

      addLog(taskId, logMinutes, 'TIMER', undefined, metadata);
    }

    // Reset reflection state
    setQualityRating(null);
    setEnergyLevel(null);
    setOutcomeCount('');
    setShowAdvanced(false);
    setShowLogPrompt(false);
    resetTimer();
    router.push('/');
  };

  const handleLogDiscard = () => {
    setShowLogPrompt(false);
    resetTimer();
    router.push('/');
  };

  // Handle cancel/back
  const handleCancel = () => {
    if (isRunning) {
      stopTimer();
    }
    resetTimer();
    router.push('/');
  };

  // No task selected - show task selector
  if (!taskId || !isHydrated) {
    const activeTasks = tasks.filter((t) => !t.is_archived);

    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Start Timer</h1>
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <X size={20} />
          </Button>
        </header>

        <div className={styles.taskSelector}>
          <p className={styles.selectorLabel}>Select a task:</p>
          {activeTasks.length === 0 ? (
            <p className={styles.noTasks}>
              No tasks available. Create one first.
            </p>
          ) : (
            <div className={styles.taskList}>
              {activeTasks.map((task) => (
                <button
                  key={task.id}
                  className={styles.taskOption}
                  onClick={() =>
                    startTimer(
                      task.id,
                      task.name,
                      'STOPWATCH',
                      task.pomodoro_defaults
                    )
                  }
                >
                  {task.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.modeSelector}>
          <p className={styles.selectorLabel}>Or start with mode:</p>
          <div className={styles.modeButtons}>
            <Button
              variant="outline"
              onClick={() => {
                if (activeTasks.length > 0) {
                  const task = activeTasks[0];
                  startTimer(
                    task.id,
                    task.name,
                    'STOPWATCH',
                    task.pomodoro_defaults
                  );
                }
              }}
              disabled={activeTasks.length === 0}
            >
              <Zap size={18} />
              Stopwatch
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (activeTasks.length > 0) {
                  const task = activeTasks[0];
                  startTimer(
                    task.id,
                    task.name,
                    'POMODORO',
                    task.pomodoro_defaults
                  );
                }
              }}
              disabled={activeTasks.length === 0}
            >
              <Coffee size={18} />
              Pomodoro
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const phaseMinutes = getPhaseMinutes();
  const phaseLabel =
    pomodoroPhase === 'FOCUS'
      ? 'Focus'
      : pomodoroPhase === 'BREAK'
      ? 'Break'
      : 'Long Break';

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.taskInfo}>
          <h1 className={styles.taskName}>{taskName}</h1>
          <span className={styles.modeLabel}>
            {mode === 'POMODORO' ? `${phaseLabel} (${phaseMinutes}m)` : 'Stopwatch'}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <X size={20} />
        </Button>
      </header>

      {/* Timer Display */}
      <div className={styles.timerDisplay}>
        <motion.div
          className={styles.timerCircle}
          animate={{
            scale: isRunning ? [1, 1.02, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: isRunning ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          <span className={styles.timerValue}>{formatTimer(displayTime)}</span>
          {mode === 'POMODORO' && (
            <span className={styles.cycleCount}>
              Cycle {pomodoroCycle}/{pomodoroDefaults?.cycles_before_long_break || 4}
            </span>
          )}
        </motion.div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {!isRunning ? (
          <Button
            variant="default"
            size="lg"
            className={styles.primaryButton}
            onClick={resumeTimer}
          >
            <Play size={24} />
            {displayTime > 0 ? 'Resume' : 'Start'}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            className={styles.primaryButton}
            onClick={pauseTimer}
          >
            <Pause size={24} />
            Pause
          </Button>
        )}

        <div className={styles.secondaryControls}>
          <Button variant="outline" size="icon" onClick={handleStop}>
            <Square size={20} />
          </Button>
          {mode === 'POMODORO' &&
            (pomodoroPhase === 'BREAK' || pomodoroPhase === 'LONG_BREAK') && (
              <Button variant="outline" size="icon" onClick={skipBreak}>
                <SkipForward size={20} />
              </Button>
            )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              resetTimer();
              startTimer(taskId, taskName, mode, pomodoroDefaults || undefined);
            }}
          >
            <RotateCcw size={20} />
          </Button>
        </div>
      </div>

      {/* Mode Switch */}
      <div className={styles.modeSwitch}>
        <Button
          variant={mode === 'STOPWATCH' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => {
            if (mode !== 'STOPWATCH') {
              resetTimer();
              startTimer(taskId, taskName, 'STOPWATCH', pomodoroDefaults || undefined);
            }
          }}
        >
          <Zap size={16} />
          Stopwatch
        </Button>
        <Button
          variant={mode === 'POMODORO' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => {
            if (mode !== 'POMODORO') {
              resetTimer();
              startTimer(taskId, taskName, 'POMODORO', pomodoroDefaults || undefined);
            }
          }}
        >
          <Coffee size={16} />
          Pomodoro
        </Button>
      </div>

      {/* Log Prompt Modal - Enhanced with Hormozi reflection */}
      <AnimatePresence>
        {showLogPrompt && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h2 className={styles.modalTitle}>Log Session</h2>
              <p className={styles.modalText}>
                You spent <strong>{logMinutes} minutes</strong> on {taskName}.
              </p>

              {/* Quality Rating (always shown) */}
              <div className={styles.reflectionSection}>
                <label className={styles.reflectionLabel}>
                  How was this session?
                </label>
                <div className={styles.starRating}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      className={styles.starButton}
                      data-active={qualityRating && rating <= qualityRating}
                      onClick={() => setQualityRating(rating as 1 | 2 | 3 | 4 | 5)}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy Level (always shown) */}
              <div className={styles.reflectionSection}>
                <label className={styles.reflectionLabel}>
                  Energy after session?
                </label>
                <div className={styles.energySlider}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={styles.energyButton}
                      data-active={energyLevel === level}
                      onClick={() => setEnergyLevel(level as 1 | 2 | 3 | 4 | 5)}
                    >
                      {level === 1 && '😴'}
                      {level === 2 && '😐'}
                      {level === 3 && '🙂'}
                      {level === 4 && '😊'}
                      {level === 5 && '⚡'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Outcome Count (if task tracks outcomes) */}
              {tasks.find((t) => t.id === taskId)?.track_outcomes && (
                <div className={styles.reflectionSection}>
                  <label className={styles.reflectionLabel}>
                    {tasks.find((t) => t.id === taskId)?.outcome_label || 'Outcomes'} completed?
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={styles.outcomeInput}
                    value={outcomeCount}
                    onChange={(e) => setOutcomeCount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}

              <div className={styles.modalActions}>
                <Button variant="outline" onClick={handleLogDiscard}>
                  Discard
                </Button>
                <Button variant="default" onClick={handleLogConfirm}>
                  <Check size={18} />
                  Log {logMinutes}m
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
