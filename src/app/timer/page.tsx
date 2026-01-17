'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Target,
  Sparkles,
} from 'lucide-react';
import { useTimerStore } from '@/stores/timerStore';
import { useTaskStore } from '@/stores/taskStore';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/Toast';
import { formatTimer, formatMinutes } from '@/utils/date';
import { triggerHaptic } from '@/lib/haptics';
import { playSound } from '@/lib/sounds';
import { FocusCompanion } from '@/components/FocusCompanion';
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

  const { addLog, undoLastLog, selectedDate, tasks, isHydrated, getTaskProgress } = useTaskStore();

  // Local state for display
  const [displayTime, setDisplayTime] = useState(0);
  const rafRef = useRef<number>();

  // Hormozi: Post-session reflection state
  const [qualityRating, setQualityRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [outcomeCount, setOutcomeCount] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get task progress for quota context
  const taskProgress = useMemo(() => {
    if (!taskId || !isHydrated) return null;
    return getTaskProgress(taskId, selectedDate);
  }, [taskId, isHydrated, selectedDate, getTaskProgress]);

  // Calculate projected progress (current + timer elapsed)
  const projectedProgress = useMemo(() => {
    if (!taskProgress) return null;
    const elapsedMinutes = Math.round(displayTime / 60000);
    const projected = taskProgress.progress + elapsedMinutes;
    const projectedRemaining = Math.max(0, taskProgress.effectiveQuota - projected);
    const willComplete = projected >= taskProgress.effectiveQuota;
    return {
      current: taskProgress.progress,
      projected,
      remaining: taskProgress.remaining,
      projectedRemaining,
      effectiveQuota: taskProgress.effectiveQuota,
      willComplete,
      percentComplete: Math.min(100, (taskProgress.progress / taskProgress.effectiveQuota) * 100),
      projectedPercentComplete: Math.min(100, (projected / taskProgress.effectiveQuota) * 100),
      elapsedMinutes,
      isDone: taskProgress.isDone,
      quotaType: taskProgress.task.quota_type,
    };
  }, [taskProgress, displayTime]);

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

  // Update document title with timer status (for browser tab visibility)
  useEffect(() => {
    const originalTitle = 'Effort Ledger';

    if (!taskId) {
      document.title = originalTitle;
      return;
    }

    const updateTitle = () => {
      const timeDisplay = formatTimer(displayTime);
      const statusEmoji = isRunning ? '▶️' : '⏸️';
      const phaseLabel = mode === 'POMODORO'
        ? pomodoroPhase === 'FOCUS' ? '🎯' : '☕'
        : '';

      document.title = `${statusEmoji} ${timeDisplay} ${phaseLabel} ${taskName} | Effort Ledger`;
    };

    updateTitle();

    return () => {
      document.title = originalTitle;
    };
  }, [displayTime, isRunning, taskId, taskName, mode, pomodoroPhase]);

  // Wake Lock API to prevent screen sleep during active timer
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator)) return;

      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          // Wake lock was released (e.g., tab became hidden)
        });
      } catch {
        // Wake lock request failed (e.g., low battery, permission denied)
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLock) {
        try {
          await wakeLock.release();
          wakeLock = null;
        } catch {
          // Ignore release errors
        }
      }
    };

    // Request wake lock when timer is running
    if (isRunning && taskId) {
      requestWakeLock();
    }

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning && taskId) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isRunning, taskId]);

  // Get user settings for haptics/sounds
  const { settings } = useTaskStore();

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

  // Handle stop timer - auto-logs with toast feedback
  const handleStop = useCallback(() => {
    const elapsed = getElapsedMs();
    const minutes = Math.round(elapsed / 60000);
    const currentTaskId = taskId;
    const currentTaskName = taskName;

    // For Pomodoro, only log if in FOCUS phase
    const shouldLog = mode === 'STOPWATCH' ||
      (mode === 'POMODORO' && pomodoroPhase === 'FOCUS');

    if (minutes > 0 && currentTaskId && shouldLog) {
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
    router.push('/');
  }, [mode, taskId, taskName, selectedDate, getElapsedMs, addLog, undoLastLog, resetTimer, router, pomodoroPhase]);

  // Smart checkpoint system - show gentle prompts at focus intervals in stopwatch mode
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [checkpointCount, setCheckpointCount] = useState(0);
  const lastCheckpointRef = useRef(0);

  // Get focus interval from task's pomodoro defaults
  const focusInterval = pomodoroDefaults?.focus_minutes || 25;

  useEffect(() => {
    if (mode !== 'STOPWATCH' || !isRunning) return;

    const elapsedMinutes = Math.floor(displayTime / 60000);
    const checkpointsReached = Math.floor(elapsedMinutes / focusInterval);

    // Show checkpoint prompt when we cross a focus interval threshold
    if (checkpointsReached > lastCheckpointRef.current && checkpointsReached > checkpointCount) {
      lastCheckpointRef.current = checkpointsReached;
      setCheckpointCount(checkpointsReached);
      setShowCheckpoint(true);
      if (settings.vibrationEnabled) {
        triggerHaptic('checkpoint');
      }
      if (settings.soundEnabled) {
        playSound('timerEnd');
      }
    }
  }, [displayTime, mode, isRunning, focusInterval, checkpointCount, settings]);

  // Handle checkpoint actions
  const handleCheckpointContinue = useCallback(() => {
    setShowCheckpoint(false);
  }, []);

  const handleCheckpointBreak = useCallback(() => {
    // Pause current timer, log the time, then start a break
    const elapsedMinutes = Math.round(displayTime / 60000);
    if (elapsedMinutes > 0 && taskId) {
      addLog(taskId, elapsedMinutes, 'TIMER');
      toast.success(`Logged ${formatMinutes(elapsedMinutes)} - enjoy your break!`);
    }

    // Start break mode
    pauseTimer();
    setShowCheckpoint(false);

    // Reset for next session
    lastCheckpointRef.current = 0;
    setCheckpointCount(0);
  }, [displayTime, taskId, addLog, pauseTimer]);

  const handleCheckpointStop = useCallback(() => {
    setShowCheckpoint(false);
    handleStop();
  }, [handleStop]);

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
              {activeTasks.map((task) => {
                const progress = getTaskProgress(task.id, selectedDate);
                const percentComplete = progress
                  ? Math.min(100, (progress.progress / progress.effectiveQuota) * 100)
                  : 0;

                return (
                  <button
                    key={task.id}
                    className={`${styles.taskOption} ${progress?.isDone ? styles.taskOptionDone : ''}`}
                    onClick={() =>
                      startTimer(
                        task.id,
                        task.name,
                        'STOPWATCH',
                        task.pomodoro_defaults
                      )
                    }
                  >
                    <span className={styles.taskOptionName}>{task.name}</span>
                    <div className={styles.taskOptionProgress}>
                      <div className={styles.taskOptionProgressBar}>
                        <div
                          className={styles.taskOptionProgressFill}
                          style={{ width: `${percentComplete}%` }}
                        />
                      </div>
                      <span className={styles.taskOptionProgressLabel}>
                        {progress?.isDone
                          ? 'Done'
                          : `${formatMinutes(progress?.progress || 0)}/${formatMinutes(progress?.effectiveQuota || 0)}`
                        }
                      </span>
                    </div>
                  </button>
                );
              })}
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

      {/* Quota Progress Context */}
      {projectedProgress && !projectedProgress.isDone && (
        <div className={styles.quotaContext}>
          <div className={styles.quotaProgress}>
            <div className={styles.quotaBar}>
              {/* Base progress (already logged) */}
              <div
                className={styles.quotaBarFilled}
                style={{ width: `${projectedProgress.percentComplete}%` }}
              />
              {/* Projected progress (from current timer) */}
              {projectedProgress.elapsedMinutes > 0 && (
                <div
                  className={`${styles.quotaBarProjected} ${projectedProgress.willComplete ? styles.quotaBarComplete : ''}`}
                  style={{
                    left: `${projectedProgress.percentComplete}%`,
                    width: `${Math.min(100 - projectedProgress.percentComplete, projectedProgress.projectedPercentComplete - projectedProgress.percentComplete)}%`
                  }}
                />
              )}
            </div>
            <div className={styles.quotaLabels}>
              <span className={styles.quotaLogged}>
                {formatMinutes(projectedProgress.current)} logged
              </span>
              {projectedProgress.elapsedMinutes > 0 && (
                <span className={styles.quotaProjected}>
                  +{formatMinutes(projectedProgress.elapsedMinutes)} session
                </span>
              )}
              <span className={styles.quotaTarget}>
                {formatMinutes(projectedProgress.effectiveQuota)} {projectedProgress.quotaType === 'DAILY' ? 'today' : 'this week'}
              </span>
            </div>
          </div>

          {/* Completion indicator */}
          <AnimatePresence>
            {projectedProgress.willComplete && projectedProgress.elapsedMinutes > 0 && (
              <motion.div
                className={styles.completionIndicator}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Sparkles size={16} />
                <span>Quota complete when you stop!</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Remaining indicator */}
          {!projectedProgress.willComplete && projectedProgress.projectedRemaining > 0 && (
            <div className={styles.remainingIndicator}>
              <Target size={14} />
              <span>
                {formatMinutes(projectedProgress.projectedRemaining)} more to hit quota
              </span>
            </div>
          )}
        </div>
      )}

      {/* Focus Companion - Visual encouragement */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-4) 0' }}>
        <FocusCompanion
          isTimerRunning={isRunning}
          elapsedMinutes={projectedProgress?.elapsedMinutes || Math.round(displayTime / 60000)}
        />
      </div>

      {/* Already done indicator */}
      {projectedProgress?.isDone && (
        <div className={styles.quotaDoneContext}>
          <Sparkles size={18} />
          <span>Quota already complete! Extra credit time.</span>
        </div>
      )}

      {/* Timer Display */}
      <div className={styles.timerDisplay}>
        <motion.div
          className={`${styles.timerCircle} ${projectedProgress?.willComplete ? styles.timerCircleComplete : ''}`}
          animate={{
            scale: isRunning ? [1, 1.02, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: isRunning ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          {/* SVG Progress Ring */}
          {projectedProgress && (
            <svg className={styles.progressRing} viewBox="0 0 100 100">
              {/* Background ring */}
              <circle
                className={styles.progressRingBg}
                cx="50"
                cy="50"
                r="46"
                strokeWidth="4"
                fill="none"
              />
              {/* Current progress */}
              <circle
                className={styles.progressRingFilled}
                cx="50"
                cy="50"
                r="46"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${projectedProgress.percentComplete * 2.89} 289`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
              {/* Projected progress */}
              {projectedProgress.elapsedMinutes > 0 && (
                <circle
                  className={`${styles.progressRingProjected} ${projectedProgress.willComplete ? styles.progressRingComplete : ''}`}
                  cx="50"
                  cy="50"
                  r="46"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${(projectedProgress.projectedPercentComplete - projectedProgress.percentComplete) * 2.89} 289`}
                  strokeDashoffset={`${-projectedProgress.percentComplete * 2.89}`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              )}
            </svg>
          )}
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
            onClick={() => {
              if (settings.vibrationEnabled) triggerHaptic('medium');
              resumeTimer();
            }}
          >
            <Play size={24} />
            {displayTime > 0 ? 'Resume' : 'Start'}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            className={styles.primaryButton}
            onClick={() => {
              if (settings.vibrationEnabled) triggerHaptic('light');
              pauseTimer();
            }}
          >
            <Pause size={24} />
            Pause
          </Button>
        )}

        <div className={styles.secondaryControls}>
          <Button
            variant="outline"
            size="icon"
            className={styles.controlButton}
            onClick={() => {
              if (settings.vibrationEnabled) triggerHaptic('heavy');
              handleStop();
            }}
            aria-label="Stop timer and log time"
          >
            <Square size={22} />
          </Button>
          {mode === 'POMODORO' &&
            (pomodoroPhase === 'BREAK' || pomodoroPhase === 'LONG_BREAK') && (
              <Button
                variant="outline"
                size="icon"
                className={styles.controlButton}
                onClick={() => {
                  if (settings.vibrationEnabled) triggerHaptic('light');
                  skipBreak();
                }}
                aria-label="Skip break"
              >
                <SkipForward size={22} />
              </Button>
            )}
          <Button
            variant="outline"
            size="icon"
            className={styles.controlButton}
            onClick={() => {
              if (settings.vibrationEnabled) triggerHaptic('light');
              resetTimer();
              startTimer(taskId, taskName, mode, pomodoroDefaults || undefined);
            }}
            aria-label="Reset timer"
          >
            <RotateCcw size={22} />
          </Button>
        </div>
      </div>

      {/* Mode Switch */}
      <div className={styles.modeSwitch}>
        <Button
          variant={mode === 'STOPWATCH' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => {
            if (settings.vibrationEnabled) triggerHaptic('light');
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
            if (settings.vibrationEnabled) triggerHaptic('light');
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

      {/* Smart Checkpoint Prompt */}
      <AnimatePresence>
        {showCheckpoint && mode === 'STOPWATCH' && (
          <motion.div
            className={styles.checkpointOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.checkpointPrompt}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
            >
              <div className={styles.checkpointHeader}>
                <Sparkles size={20} />
                <span>{focusInterval} minutes complete!</span>
              </div>
              <p className={styles.checkpointText}>
                Great focus session. What would you like to do?
              </p>
              <div className={styles.checkpointActions}>
                <Button
                  variant="default"
                  size="sm"
                  className={styles.checkpointButton}
                  onClick={handleCheckpointContinue}
                >
                  <Zap size={16} />
                  Keep going
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className={styles.checkpointButton}
                  onClick={handleCheckpointBreak}
                >
                  <Coffee size={16} />
                  Take a break
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={styles.checkpointButton}
                  onClick={handleCheckpointStop}
                >
                  <Square size={16} />
                  Stop & log
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
