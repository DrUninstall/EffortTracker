'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Timer,
  History,
  Settings,
  Clock,
  Target,
  Zap,
  Coffee,
  X,
} from 'lucide-react';
import { useTaskStore } from '@/stores/taskStore';
import { useTimerStore } from '@/stores/timerStore';
import { triggerHaptic } from '@/lib/haptics';
import { parseTimeToMinutes } from '@/utils/timeParser';
import styles from './CommandPalette.module.css';

type CommandType = 'navigation' | 'task' | 'quick-add' | 'timer';

interface Command {
  id: string;
  type: CommandType;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { tasks, addLog, selectedDate, settings } = useTaskStore();
  const { startTimer } = useTimerStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Get active tasks
  const activeTasks = useMemo(() => tasks.filter(t => !t.is_archived), [tasks]);

  // Build command list
  const commands = useMemo((): Command[] => {
    const cmds: Command[] = [];

    // Navigation commands
    cmds.push({
      id: 'nav-home',
      type: 'navigation',
      title: 'Go to Today',
      subtitle: 'View today\'s tasks',
      icon: <Target size={18} />,
      action: () => router.push('/'),
      keywords: ['home', 'today', 'tasks'],
    });

    cmds.push({
      id: 'nav-timer',
      type: 'navigation',
      title: 'Go to Timer',
      subtitle: 'Start a focus session',
      icon: <Timer size={18} />,
      action: () => router.push('/timer'),
      keywords: ['timer', 'focus', 'pomodoro'],
    });

    cmds.push({
      id: 'nav-history',
      type: 'navigation',
      title: 'Go to History',
      subtitle: 'View your progress stats',
      icon: <History size={18} />,
      action: () => router.push('/history'),
      keywords: ['history', 'stats', 'analytics'],
    });

    cmds.push({
      id: 'nav-settings',
      type: 'navigation',
      title: 'Go to Settings',
      subtitle: 'Manage tasks and preferences',
      icon: <Settings size={18} />,
      action: () => router.push('/settings'),
      keywords: ['settings', 'preferences', 'config'],
    });

    // Task-specific commands
    activeTasks.forEach(task => {
      const isHabit = task.task_type === 'HABIT';

      // Quick add commands
      if (isHabit) {
        cmds.push({
          id: `add-${task.id}`,
          type: 'quick-add',
          title: `Add to ${task.name}`,
          subtitle: `+1 ${task.habit_unit || 'completion'}`,
          icon: <Plus size={18} />,
          action: () => {
            addLog(task.id, 0, 'QUICK_ADD', selectedDate, 1);
            if (settings.vibrationEnabled) triggerHaptic('light');
          },
          keywords: [task.name.toLowerCase(), 'add', 'habit'],
        });
      } else {
        // Time-based quick adds
        [5, 10, 15, 25].forEach(mins => {
          cmds.push({
            id: `add-${task.id}-${mins}`,
            type: 'quick-add',
            title: `Add ${mins}m to ${task.name}`,
            subtitle: `Quick add time`,
            icon: <Clock size={18} />,
            action: () => {
              addLog(task.id, mins, 'QUICK_ADD', selectedDate);
              if (settings.vibrationEnabled) triggerHaptic('light');
            },
            keywords: [task.name.toLowerCase(), 'add', `${mins}`],
          });
        });
      }

      // Start timer commands (only for time tasks)
      if (!isHabit) {
        cmds.push({
          id: `timer-stopwatch-${task.id}`,
          type: 'timer',
          title: `Start Stopwatch: ${task.name}`,
          subtitle: 'Track time freely',
          icon: <Zap size={18} />,
          action: () => {
            startTimer(task.id, task.name, 'STOPWATCH', task.pomodoro_defaults);
            router.push('/timer');
          },
          keywords: [task.name.toLowerCase(), 'timer', 'stopwatch', 'start'],
        });

        cmds.push({
          id: `timer-pomodoro-${task.id}`,
          type: 'timer',
          title: `Start Pomodoro: ${task.name}`,
          subtitle: `${task.pomodoro_defaults.focus_minutes}min focus`,
          icon: <Coffee size={18} />,
          action: () => {
            startTimer(task.id, task.name, 'POMODORO', task.pomodoro_defaults);
            router.push('/timer');
          },
          keywords: [task.name.toLowerCase(), 'timer', 'pomodoro', 'focus'],
        });
      }
    });

    return cmds;
  }, [activeTasks, router, addLog, selectedDate, settings, startTimer]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show navigation + first task quick adds
      return commands.filter(
        cmd => cmd.type === 'navigation' ||
        (cmd.type === 'quick-add' && cmd.id.includes('-15'))
      ).slice(0, 8);
    }

    const q = query.toLowerCase();

    // Check if query looks like a time expression for quick add
    const parsedTime = parseTimeToMinutes(query);
    if (parsedTime !== null && activeTasks.length > 0) {
      // Inject dynamic quick-add commands for parsed time
      const timeCommands: Command[] = activeTasks
        .filter(t => t.task_type === 'TIME')
        .map(task => ({
          id: `custom-add-${task.id}-${parsedTime}`,
          type: 'quick-add' as CommandType,
          title: `Add ${parsedTime}m to ${task.name}`,
          subtitle: 'Custom time entry',
          icon: <Clock size={18} />,
          action: () => {
            addLog(task.id, parsedTime, 'QUICK_ADD', selectedDate);
            if (settings.vibrationEnabled) triggerHaptic('light');
          },
          keywords: [],
        }));

      return [...timeCommands, ...commands.filter(cmd =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.keywords?.some(k => k.includes(q))
      )].slice(0, 8);
    }

    // Regular filtering
    return commands.filter(cmd =>
      cmd.title.toLowerCase().includes(q) ||
      cmd.subtitle?.toLowerCase().includes(q) ||
      cmd.keywords?.some(k => k.includes(q))
    ).slice(0, 8);
  }, [commands, query, activeTasks, addLog, selectedDate, settings]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.palette}
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className={styles.inputWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              className={styles.input}
              placeholder="Search commands, tasks, or enter time (e.g., '25m')..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className={styles.closeButton} onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          {/* Command List */}
          <div className={styles.list} ref={listRef}>
            {filteredCommands.length === 0 ? (
              <div className={styles.empty}>No matching commands</div>
            ) : (
              filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.id}
                  className={`${styles.item} ${index === selectedIndex ? styles.selected : ''}`}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className={styles.itemIcon}>{cmd.icon}</span>
                  <div className={styles.itemContent}>
                    <span className={styles.itemTitle}>{cmd.title}</span>
                    {cmd.subtitle && (
                      <span className={styles.itemSubtitle}>{cmd.subtitle}</span>
                    )}
                  </div>
                  <span className={styles.itemType}>{cmd.type}</span>
                </button>
              ))
            )}
          </div>

          {/* Keyboard Hints */}
          <div className={styles.hints}>
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>Enter</kbd> select</span>
            <span><kbd>Esc</kbd> close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
