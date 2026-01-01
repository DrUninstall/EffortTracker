import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TimerMode, PomodoroPhase, PomodoroDefaults } from '@/types';
import { zustandStorage } from '@/lib/storage';

interface TimerState {
  mode: TimerMode;
  taskId: string | null;
  taskName: string;
  isRunning: boolean;
  startTime: number | null; // timestamp when started
  pausedElapsed: number; // elapsed time when paused (ms)
  pomodoroPhase: PomodoroPhase;
  pomodoroCycle: number; // current cycle (1-based)
  pomodoroDefaults: PomodoroDefaults | null;
  isHydrated: boolean;

  // Actions
  startTimer: (
    taskId: string,
    taskName: string,
    mode: TimerMode,
    pomodoroDefaults?: PomodoroDefaults
  ) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;

  // Pomodoro specific
  nextPhase: () => void;
  skipBreak: () => void;

  // Computed
  getElapsedMs: () => number;
  getRemainingMs: () => number; // For Pomodoro countdown
  getPhaseMinutes: () => number;
}

const DEFAULT_POMODORO: PomodoroDefaults = {
  focus_minutes: 25,
  break_minutes: 5,
  long_break_minutes: 15,
  cycles_before_long_break: 4,
};

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      mode: 'STOPWATCH',
      taskId: null,
      taskName: '',
      isRunning: false,
      startTime: null,
      pausedElapsed: 0,
      pomodoroPhase: 'FOCUS',
      pomodoroCycle: 1,
      pomodoroDefaults: null,
      isHydrated: false,

      startTimer: (taskId, taskName, mode, pomodoroDefaults) => {
    set({
      taskId,
      taskName,
      mode,
      isRunning: true,
      startTime: Date.now(),
      pausedElapsed: 0,
      pomodoroPhase: 'FOCUS',
      pomodoroCycle: 1,
      pomodoroDefaults: pomodoroDefaults || DEFAULT_POMODORO,
    });
  },

  pauseTimer: () => {
    const { startTime, pausedElapsed } = get();
    if (startTime) {
      const elapsed = Date.now() - startTime + pausedElapsed;
      set({
        isRunning: false,
        startTime: null,
        pausedElapsed: elapsed,
      });
    }
  },

  resumeTimer: () => {
    set({
      isRunning: true,
      startTime: Date.now(),
    });
  },

  stopTimer: () => {
    set({
      isRunning: false,
      startTime: null,
    });
  },

  resetTimer: () => {
    set({
      mode: 'STOPWATCH',
      taskId: null,
      taskName: '',
      isRunning: false,
      startTime: null,
      pausedElapsed: 0,
      pomodoroPhase: 'FOCUS',
      pomodoroCycle: 1,
      pomodoroDefaults: null,
    });
  },

  nextPhase: () => {
    const { pomodoroPhase, pomodoroCycle, pomodoroDefaults } = get();
    const cyclesBeforeLongBreak =
      pomodoroDefaults?.cycles_before_long_break || 4;

    if (pomodoroPhase === 'FOCUS') {
      // After focus, determine break type
      if (pomodoroCycle >= cyclesBeforeLongBreak) {
        set({
          pomodoroPhase: 'LONG_BREAK',
          pausedElapsed: 0,
          startTime: Date.now(),
        });
      } else {
        set({
          pomodoroPhase: 'BREAK',
          pausedElapsed: 0,
          startTime: Date.now(),
        });
      }
    } else {
      // After any break, back to focus
      const newCycle =
        pomodoroPhase === 'LONG_BREAK' ? 1 : pomodoroCycle + 1;
      set({
        pomodoroPhase: 'FOCUS',
        pomodoroCycle: newCycle,
        pausedElapsed: 0,
        startTime: Date.now(),
      });
    }
  },

  skipBreak: () => {
    const { pomodoroPhase, pomodoroCycle } = get();
    if (pomodoroPhase === 'BREAK' || pomodoroPhase === 'LONG_BREAK') {
      const newCycle =
        pomodoroPhase === 'LONG_BREAK' ? 1 : pomodoroCycle + 1;
      set({
        pomodoroPhase: 'FOCUS',
        pomodoroCycle: newCycle,
        pausedElapsed: 0,
        startTime: Date.now(),
      });
    }
  },

  getElapsedMs: () => {
    const { startTime, pausedElapsed, isRunning } = get();
    if (!isRunning || !startTime) {
      return pausedElapsed;
    }
    return Date.now() - startTime + pausedElapsed;
  },

  getRemainingMs: () => {
    const { mode } = get();
    if (mode !== 'POMODORO') return 0;

    const phaseMinutes = get().getPhaseMinutes();
    const elapsedMs = get().getElapsedMs();
    const targetMs = phaseMinutes * 60 * 1000;
    return Math.max(0, targetMs - elapsedMs);
  },

  getPhaseMinutes: () => {
    const { pomodoroPhase, pomodoroDefaults } = get();
    const defaults = pomodoroDefaults || DEFAULT_POMODORO;

    switch (pomodoroPhase) {
      case 'FOCUS':
        return defaults.focus_minutes;
      case 'BREAK':
        return defaults.break_minutes;
      case 'LONG_BREAK':
        return defaults.long_break_minutes;
    }
  },
    }),
    {
      name: 'effort-ledger-timer',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        // Only persist essential timer state, not functions
        mode: state.mode,
        taskId: state.taskId,
        taskName: state.taskName,
        isRunning: state.isRunning,
        startTime: state.startTime,
        pausedElapsed: state.pausedElapsed,
        pomodoroPhase: state.pomodoroPhase,
        pomodoroCycle: state.pomodoroCycle,
        pomodoroDefaults: state.pomodoroDefaults,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);
