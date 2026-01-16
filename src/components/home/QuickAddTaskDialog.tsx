'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  BookOpen,
  Dumbbell,
  Brain,
  Briefcase,
  Music,
  Heart,
  Plus,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTaskStore } from '@/stores/taskStore';
import { triggerHaptic } from '@/lib/haptics';
import { Priority, QuotaType, Task } from '@/types';
import { ComparisonDialog } from '@/components/ranking/ComparisonDialog';
import { RankingOnboarding } from '@/components/ranking/RankingOnboarding';
import styles from './QuickAddTaskDialog.module.css';

interface QuickAddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Preset task templates
const PRESETS = [
  { name: 'Reading', icon: BookOpen, quota: 30, quotaType: 'DAILY' as QuotaType, priority: 'IMPORTANT' as Priority },
  { name: 'Exercise', icon: Dumbbell, quota: 45, quotaType: 'DAILY' as QuotaType, priority: 'CORE' as Priority },
  { name: 'Study', icon: Brain, quota: 120, quotaType: 'DAILY' as QuotaType, priority: 'CORE' as Priority },
  { name: 'Work', icon: Briefcase, quota: 240, quotaType: 'DAILY' as QuotaType, priority: 'CORE' as Priority },
  { name: 'Practice', icon: Music, quota: 60, quotaType: 'DAILY' as QuotaType, priority: 'IMPORTANT' as Priority },
  { name: 'Self-Care', icon: Heart, quota: 30, quotaType: 'DAILY' as QuotaType, priority: 'IMPORTANT' as Priority },
];

const DEFAULT_POMODORO = {
  focus_minutes: 25,
  break_minutes: 5,
  long_break_minutes: 15,
  cycles_before_long_break: 4,
};

export function QuickAddTaskDialog({ isOpen, onClose }: QuickAddTaskDialogProps) {
  const router = useRouter();
  const { addTask, settings, getTasksForComparison } = useTaskStore();
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Custom form state
  const [customName, setCustomName] = useState('');
  const [customQuota, setCustomQuota] = useState('30');
  const [customQuotaType, setCustomQuotaType] = useState<QuotaType>('DAILY');
  const [customPriority, setCustomPriority] = useState<Priority>('IMPORTANT');

  // Comparison dialog state
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [pendingTask, setPendingTask] = useState<Omit<Task, 'id' | 'created_at'> | null>(null);

  // Onboarding state
  const [showRankingOnboarding, setShowRankingOnboarding] = useState(false);

  // Create task from preset
  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    if (settings.vibrationEnabled) {
      triggerHaptic('success');
    }

    const taskData: Omit<Task, 'id' | 'created_at'> = {
      name: preset.name,
      priority: preset.priority,
      quota_type: preset.quotaType,
      task_type: 'TIME',
      daily_quota_minutes: preset.quotaType === 'DAILY' ? preset.quota : undefined,
      weekly_quota_minutes: preset.quotaType === 'WEEKLY' ? preset.quota : undefined,
      allow_carryover: false,
      pomodoro_defaults: DEFAULT_POMODORO,
      is_archived: false,
    };

    // Check if ranking is enabled
    if (settings.enablePriorityRanking) {
      const existingTasks = getTasksForComparison(preset.priority);
      if (existingTasks.length > 0) {
        // Show onboarding first if needed
        if (settings.showRankingOnboarding) {
          setPendingTask(taskData);
          setShowRankingOnboarding(true);
          return;
        }
        // Show comparison dialog
        setPendingTask(taskData);
        setShowComparisonDialog(true);
        return;
      }
    }

    // No ranking needed, create task directly
    addTask(taskData);
    onClose();
  };

  // Create custom task
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customName.trim()) return;

    if (settings.vibrationEnabled) {
      triggerHaptic('success');
    }

    const quotaMinutes = parseInt(customQuota) || 30;

    const taskData: Omit<Task, 'id' | 'created_at'> = {
      name: customName.trim(),
      priority: customPriority,
      quota_type: customQuotaType,
      task_type: 'TIME',
      daily_quota_minutes: customQuotaType === 'DAILY' ? quotaMinutes : undefined,
      weekly_quota_minutes: customQuotaType === 'WEEKLY' ? quotaMinutes : undefined,
      allow_carryover: false,
      pomodoro_defaults: DEFAULT_POMODORO,
      is_archived: false,
    };

    // Check if ranking is enabled
    if (settings.enablePriorityRanking) {
      const existingTasks = getTasksForComparison(customPriority);
      if (existingTasks.length > 0) {
        // Show onboarding first if needed
        if (settings.showRankingOnboarding) {
          setPendingTask(taskData);
          setShowRankingOnboarding(true);
          return;
        }
        // Show comparison dialog
        setPendingTask(taskData);
        setShowComparisonDialog(true);
        return;
      }
    }

    // No ranking needed, create task directly
    addTask(taskData);

    // Reset form
    setCustomName('');
    setCustomQuota('30');
    setShowCustomForm(false);
    onClose();
  };

  // Go to full settings
  const handleAdvancedSettings = () => {
    onClose();
    router.push('/settings?new=true');
  };

  // Handle comparison completion
  const handleComparisonComplete = (rank: number, comparisons: number) => {
    if (!pendingTask) return;

    // Create task with the assigned rank
    addTask({
      ...pendingTask,
      priorityRank: rank,
      comparisonCount: comparisons,
    });

    // Reset state
    setPendingTask(null);
    setShowComparisonDialog(false);
    setCustomName('');
    setCustomQuota('30');
    setShowCustomForm(false);
    onClose();
  };

  // Handle skipping ranking
  const handleComparisonSkip = () => {
    if (!pendingTask) return;

    // Create task without rank
    addTask(pendingTask);

    // Reset state
    setPendingTask(null);
    setShowComparisonDialog(false);
    setCustomName('');
    setCustomQuota('30');
    setShowCustomForm(false);
    onClose();
  };

  // Handle comparison dialog close
  const handleComparisonClose = () => {
    setShowComparisonDialog(false);
    setPendingTask(null);
  };

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setShowRankingOnboarding(false);
    // Now show the comparison dialog
    if (pendingTask) {
      setShowComparisonDialog(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.dialog}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.header}>
              <h2 className={styles.title}>Add Task</h2>
              <Button
                variant="ghost"
                size="icon"
                className={styles.closeButton}
                onClick={onClose}
              >
                <X size={20} />
              </Button>
            </div>

            {/* Content */}
            <div className={styles.content}>
              {!showCustomForm ? (
                <>
                  {/* Presets Grid */}
                  <div className={styles.presets}>
                    {PRESETS.map((preset, index) => {
                      const Icon = preset.icon;
                      return (
                        <motion.button
                          key={preset.name}
                          className={styles.presetButton}
                          onClick={() => handlePresetSelect(preset)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Icon size={24} />
                          <span className={styles.presetName}>{preset.name}</span>
                          <span className={styles.presetQuota}>
                            {preset.quota}m/{preset.quotaType === 'DAILY' ? 'day' : 'week'}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Custom Button */}
                  <button
                    className={styles.customToggle}
                    onClick={() => setShowCustomForm(true)}
                  >
                    <Plus size={18} />
                    <span>Create Custom Task</span>
                    <ChevronDown size={16} />
                  </button>
                </>
              ) : (
                /* Custom Form */
                <form className={styles.customForm} onSubmit={handleCustomSubmit}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Task Name</label>
                    <Input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g., Learning Spanish"
                      autoFocus
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Quota</label>
                      <div className={styles.quotaInput}>
                        <Input
                          type="number"
                          value={customQuota}
                          onChange={(e) => setCustomQuota(e.target.value)}
                          min="1"
                          max="480"
                        />
                        <span className={styles.quotaUnit}>min</span>
                      </div>
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Per</label>
                      <Select
                        value={customQuotaType}
                        onValueChange={(v) => setCustomQuotaType(v as QuotaType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY">Day</SelectItem>
                          <SelectItem value="WEEKLY">Week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Priority</label>
                    <Select
                      value={customPriority}
                      onValueChange={(v) => setCustomPriority(v as Priority)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CORE">Core</SelectItem>
                        <SelectItem value="IMPORTANT">Important</SelectItem>
                        <SelectItem value="OPTIONAL">Optional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className={styles.formActions}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowCustomForm(false)}
                    >
                      Back
                    </Button>
                    <Button type="submit" disabled={!customName.trim()}>
                      Create Task
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <button
                className={styles.advancedLink}
                onClick={handleAdvancedSettings}
              >
                <Settings size={14} />
                <span>Advanced Settings</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Comparison Dialog */}
      {pendingTask && (
        <ComparisonDialog
          isOpen={showComparisonDialog}
          newTask={pendingTask}
          existingTasks={getTasksForComparison(pendingTask.priority)}
          priority={pendingTask.priority}
          onComplete={handleComparisonComplete}
          onSkip={handleComparisonSkip}
          onClose={handleComparisonClose}
        />
      )}

      {/* Ranking Onboarding */}
      <RankingOnboarding
        isOpen={showRankingOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </AnimatePresence>
  );
}
