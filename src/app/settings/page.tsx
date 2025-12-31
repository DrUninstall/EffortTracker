'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Download,
  Upload,
  ChevronRight,
} from 'lucide-react';
import { useTaskStore, selectActiveTasks, selectArchivedTasks } from '@/stores/taskStore';
import { Task, Priority, QuotaType, PomodoroDefaults } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import styles from './page.module.css';

const DEFAULT_POMODORO: PomodoroDefaults = {
  focus_minutes: 25,
  break_minutes: 5,
  long_break_minutes: 15,
  cycles_before_long_break: 4,
};

const PRIORITY_LABELS: Record<Priority, string> = {
  CORE: 'Core',
  IMPORTANT: 'Important',
  OPTIONAL: 'Optional',
};

const TASK_COLORS = [
  { value: '', label: 'Default' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    archiveTask,
    unarchiveTask,
    exportData,
    importData,
    isHydrated,
  } = useTaskStore();

  const activeTasks = useTaskStore(selectActiveTasks);
  const archivedTasks = useTaskStore(selectArchivedTasks);

  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Task form state
  const [formName, setFormName] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>('IMPORTANT');
  const [formQuotaType, setFormQuotaType] = useState<QuotaType>('DAILY');
  const [formDailyQuota, setFormDailyQuota] = useState(30);
  const [formWeeklyQuota, setFormWeeklyQuota] = useState(120);
  const [formWeeklyDaysTarget, setFormWeeklyDaysTarget] = useState<number | undefined>();
  const [formAllowCarryover, setFormAllowCarryover] = useState(false);
  const [formColor, setFormColor] = useState('');
  const [formPomodoro, setFormPomodoro] = useState<PomodoroDefaults>(DEFAULT_POMODORO);

  // Open dialog if ?new=true in URL
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      handleAddTask();
      // Remove the query param
      router.replace('/settings');
    }
  }, [searchParams, router]);

  const resetForm = () => {
    setFormName('');
    setFormPriority('IMPORTANT');
    setFormQuotaType('DAILY');
    setFormDailyQuota(30);
    setFormWeeklyQuota(120);
    setFormWeeklyDaysTarget(undefined);
    setFormAllowCarryover(false);
    setFormColor('');
    setFormPomodoro(DEFAULT_POMODORO);
    setEditingTask(null);
  };

  const handleAddTask = () => {
    resetForm();
    setShowTaskDialog(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormName(task.name);
    setFormPriority(task.priority);
    setFormQuotaType(task.quota_type);
    setFormDailyQuota(task.daily_quota_minutes || 30);
    setFormWeeklyQuota(task.weekly_quota_minutes || 120);
    setFormWeeklyDaysTarget(task.weekly_days_target);
    setFormAllowCarryover(task.allow_carryover);
    setFormColor(task.color || '');
    setFormPomodoro(task.pomodoro_defaults || DEFAULT_POMODORO);
    setShowTaskDialog(true);
  };

  const handleSaveTask = () => {
    if (!formName.trim()) return;

    const taskData = {
      name: formName.trim(),
      priority: formPriority,
      quota_type: formQuotaType,
      daily_quota_minutes: formQuotaType === 'DAILY' ? formDailyQuota : undefined,
      weekly_quota_minutes: formQuotaType === 'WEEKLY' ? formWeeklyQuota : undefined,
      weekly_days_target: formQuotaType === 'WEEKLY' ? formWeeklyDaysTarget : undefined,
      allow_carryover: formQuotaType === 'DAILY' ? formAllowCarryover : false,
      color: formColor || undefined,
      pomodoro_defaults: formPomodoro,
      is_archived: editingTask?.is_archived || false,
    };

    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      addTask(taskData);
    }

    setShowTaskDialog(false);
    resetForm();
  };

  const handleDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete.id);
      setTaskToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  // Export data
  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `effort-ledger-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import data
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.version && data.tasks && data.logs) {
          importData(data);
          alert('Data imported successfully!');
        } else {
          alert('Invalid backup file format');
        }
      } catch {
        alert('Failed to import data. Please check the file format.');
      }
    };
    input.click();
  };

  if (!isHydrated) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <Button variant="default" size="sm" onClick={handleAddTask}>
          <Plus size={18} />
          Add Task
        </Button>
      </header>

      {/* Tasks Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tasks</h2>

        {activeTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No tasks yet. Create your first task to get started.</p>
          </div>
        ) : (
          <div className={styles.taskList}>
            {activeTasks.map((task) => (
              <motion.div
                key={task.id}
                className={styles.taskItem}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                layout
              >
                <div className={styles.taskInfo}>
                  <div className={styles.taskHeader}>
                    <span
                      className={styles.priorityDot}
                      style={{
                        backgroundColor:
                          task.color ||
                          (task.priority === 'CORE'
                            ? 'var(--priority-core)'
                            : task.priority === 'IMPORTANT'
                            ? 'var(--priority-important)'
                            : 'var(--priority-optional)'),
                      }}
                    />
                    <span className={styles.taskName}>{task.name}</span>
                    <span className={styles.priorityBadge}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                  <div className={styles.taskMeta}>
                    {task.quota_type === 'DAILY'
                      ? `${task.daily_quota_minutes}m/day`
                      : `${task.weekly_quota_minutes}m/week`}
                    {task.allow_carryover && ' • Carryover'}
                  </div>
                </div>
                <div className={styles.taskActions}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditTask(task)}
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => archiveTask(task.id)}
                    title="Archive"
                  >
                    <Archive size={16} />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Archived Tasks */}
        {archivedTasks.length > 0 && (
          <div className={styles.archivedSection}>
            <button
              className={styles.archivedToggle}
              onClick={() => setShowArchived(!showArchived)}
            >
              <span>Archived tasks ({archivedTasks.length})</span>
              <ChevronRight
                size={16}
                style={{
                  transform: showArchived ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              />
            </button>

            <AnimatePresence>
              {showArchived && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={styles.archivedList}
                >
                  {archivedTasks.map((task) => (
                    <div key={task.id} className={styles.taskItem}>
                      <div className={styles.taskInfo}>
                        <span className={styles.taskName}>{task.name}</span>
                      </div>
                      <div className={styles.taskActions}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => unarchiveTask(task.id)}
                          title="Unarchive"
                        >
                          <ArchiveRestore size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTask(task)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Data Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data</h2>
        <div className={styles.dataActions}>
          <Button variant="outline" onClick={handleExport}>
            <Download size={18} />
            Export Backup
          </Button>
          <Button variant="outline" onClick={handleImport}>
            <Upload size={18} />
            Import Backup
          </Button>
        </div>
      </section>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className={styles.dialogContent}>
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Edit Task' : 'New Task'}
            </DialogTitle>
            <DialogDescription>
              {editingTask
                ? 'Update your task settings below.'
                : 'Create a new task to track your effort.'}
            </DialogDescription>
          </DialogHeader>

          <div className={styles.form}>
            <div className={styles.formField}>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Task name"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formField}>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as Priority)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CORE">Core</SelectItem>
                    <SelectItem value="IMPORTANT">Important</SelectItem>
                    <SelectItem value="OPTIONAL">Optional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={styles.formField}>
                <Label htmlFor="color">Color</Label>
                <Select value={formColor} onValueChange={setFormColor}>
                  <SelectTrigger id="color">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <span className={styles.colorOption}>
                          {color.value && (
                            <span
                              className={styles.colorDot}
                              style={{ backgroundColor: color.value }}
                            />
                          )}
                          {color.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={styles.formField}>
              <Label htmlFor="quotaType">Quota Type</Label>
              <Select value={formQuotaType} onValueChange={(v) => setFormQuotaType(v as QuotaType)}>
                <SelectTrigger id="quotaType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formQuotaType === 'DAILY' ? (
              <>
                <div className={styles.formField}>
                  <Label htmlFor="dailyQuota">Daily Quota (minutes)</Label>
                  <Input
                    id="dailyQuota"
                    type="number"
                    min={1}
                    value={formDailyQuota}
                    onChange={(e) => setFormDailyQuota(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className={styles.formFieldRow}>
                  <Label htmlFor="carryover">Allow Carryover</Label>
                  <Switch
                    id="carryover"
                    checked={formAllowCarryover}
                    onCheckedChange={setFormAllowCarryover}
                  />
                </div>
              </>
            ) : (
              <>
                <div className={styles.formField}>
                  <Label htmlFor="weeklyQuota">Weekly Quota (minutes)</Label>
                  <Input
                    id="weeklyQuota"
                    type="number"
                    min={1}
                    value={formWeeklyQuota}
                    onChange={(e) => setFormWeeklyQuota(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className={styles.formField}>
                  <Label htmlFor="weeklyDays">Target Days/Week (optional)</Label>
                  <Input
                    id="weeklyDays"
                    type="number"
                    min={1}
                    max={7}
                    value={formWeeklyDaysTarget || ''}
                    onChange={(e) =>
                      setFormWeeklyDaysTarget(
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g., 5"
                  />
                </div>
              </>
            )}

            {/* Pomodoro Settings */}
            <details className={styles.pomodoroSection}>
              <summary className={styles.pomodoroToggle}>
                Pomodoro Settings
              </summary>
              <div className={styles.pomodoroFields}>
                <div className={styles.formField}>
                  <Label htmlFor="focusMinutes">Focus (min)</Label>
                  <Input
                    id="focusMinutes"
                    type="number"
                    min={1}
                    value={formPomodoro.focus_minutes}
                    onChange={(e) =>
                      setFormPomodoro({
                        ...formPomodoro,
                        focus_minutes: parseInt(e.target.value) || 25,
                      })
                    }
                  />
                </div>
                <div className={styles.formField}>
                  <Label htmlFor="breakMinutes">Break (min)</Label>
                  <Input
                    id="breakMinutes"
                    type="number"
                    min={1}
                    value={formPomodoro.break_minutes}
                    onChange={(e) =>
                      setFormPomodoro({
                        ...formPomodoro,
                        break_minutes: parseInt(e.target.value) || 5,
                      })
                    }
                  />
                </div>
                <div className={styles.formField}>
                  <Label htmlFor="longBreak">Long Break (min)</Label>
                  <Input
                    id="longBreak"
                    type="number"
                    min={1}
                    value={formPomodoro.long_break_minutes}
                    onChange={(e) =>
                      setFormPomodoro({
                        ...formPomodoro,
                        long_break_minutes: parseInt(e.target.value) || 15,
                      })
                    }
                  />
                </div>
                <div className={styles.formField}>
                  <Label htmlFor="cycles">Cycles Before Long Break</Label>
                  <Input
                    id="cycles"
                    type="number"
                    min={1}
                    value={formPomodoro.cycles_before_long_break}
                    onChange={(e) =>
                      setFormPomodoro({
                        ...formPomodoro,
                        cycles_before_long_break: parseInt(e.target.value) || 4,
                      })
                    }
                  />
                </div>
              </div>
            </details>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTask} disabled={!formName.trim()}>
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{taskToDelete?.name}&quot;? This will also
              delete all associated logs. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
