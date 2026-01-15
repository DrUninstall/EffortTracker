'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import { Task, Priority } from '@/types';
import { Button } from '@/components/ui/button';
import { TaskComparisonCard } from './TaskComparisonCard';
import { findInsertionPoint, ComparisonCallback } from '@/utils/priorityRanking';
import { triggerHaptic } from '@/lib/haptics';
import { useTaskStore } from '@/stores/taskStore';
import styles from './ComparisonDialog.module.css';

interface BulkRankingDialogProps {
  isOpen: boolean;
  priority: Priority;
  onComplete: () => void;
  onClose: () => void;
}

const PRIORITY_LABELS = {
  CORE: 'CORE',
  IMPORTANT: 'IMPORTANT',
  OPTIONAL: 'OPTIONAL',
};

export function BulkRankingDialog({
  isOpen,
  priority,
  onComplete,
  onClose,
}: BulkRankingDialogProps) {
  const { settings, getTasksForComparison, rankTask } = useTaskStore();
  const [tasksToRank, setTasksToRank] = useState<Task[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [rankedTasks, setRankedTasks] = useState<Task[]>([]);
  const [currentComparison, setCurrentComparison] = useState<Task | null>(null);
  const [comparisonResolver, setComparisonResolver] = useState<((value: 1 | -1) => void) | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize tasks to rank
  useEffect(() => {
    if (isOpen) {
      const tasks = getTasksForComparison(priority);
      const unrankedTasks = tasks.filter((t) => t.priorityRank === undefined);
      setTasksToRank(unrankedTasks);
      setRankedTasks(tasks.filter((t) => t.priorityRank !== undefined));
      setCurrentTaskIndex(0);
    }
  }, [isOpen, priority, getTasksForComparison]);

  // Start ranking when dialog opens
  useEffect(() => {
    if (isOpen && tasksToRank.length > 0 && currentTaskIndex < tasksToRank.length) {
      rankNextTask();
    } else if (isOpen && currentTaskIndex >= tasksToRank.length && tasksToRank.length > 0) {
      // All tasks ranked
      handleComplete();
    }
  }, [isOpen, tasksToRank, currentTaskIndex]);

  const rankNextTask = async () => {
    if (currentTaskIndex >= tasksToRank.length) return;

    const taskToRank = tasksToRank[currentTaskIndex];
    setIsProcessing(true);

    if (rankedTasks.length === 0) {
      // First task, assign default rank
      rankTask(taskToRank.id, 100);
      setRankedTasks([{ ...taskToRank, priorityRank: 100 }]);
      setCurrentTaskIndex((prev) => prev + 1);
      setIsProcessing(false);
      return;
    }

    const comparisonCallback: ComparisonCallback = (taskA, taskB) => {
      return new Promise<1 | -1>((resolve) => {
        setCurrentComparison(taskB);
        setComparisonResolver(() => resolve);
      });
    };

    try {
      const result = await findInsertionPoint(taskToRank, rankedTasks, comparisonCallback);
      rankTask(taskToRank.id, result.insertionRank);

      // Update ranked tasks list
      const updatedRanked = [...rankedTasks, { ...taskToRank, priorityRank: result.insertionRank }]
        .sort((a, b) => (a.priorityRank ?? Infinity) - (b.priorityRank ?? Infinity));
      setRankedTasks(updatedRanked);

      setCurrentTaskIndex((prev) => prev + 1);
      setIsProcessing(false);
      setCurrentComparison(null);
    } catch (error) {
      console.error('Ranking error:', error);
      setIsProcessing(false);
    }
  };

  const handleChoice = (choice: 1 | -1) => {
    if (settings.vibrationEnabled) {
      triggerHaptic('light');
    }

    if (comparisonResolver) {
      comparisonResolver(choice);
      setComparisonResolver(null);
    }
  };

  const handleComplete = () => {
    if (settings.vibrationEnabled) {
      triggerHaptic('success');
    }
    onComplete();
  };

  if (!isOpen || tasksToRank.length === 0) {
    return null;
  }

  const currentTask = tasksToRank[currentTaskIndex];
  const progress = Math.min(currentTaskIndex / tasksToRank.length, 1);

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
              <h2 className={styles.title}>Rank All {PRIORITY_LABELS[priority]} Tasks</h2>
              <Button
                variant="ghost"
                size="icon"
                className={styles.closeButton}
                onClick={onClose}
              >
                <X size={20} />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className={styles.progress}>
              <div
                className={styles.progressBar}
                style={{ width: `${progress * 100}%` }}
              />
              <span className={styles.progressText}>
                {currentTaskIndex} of {tasksToRank.length} tasks ranked
              </span>
            </div>

            {currentTask && (
              <>
                {/* Question */}
                <div className={styles.question}>
                  <p className={styles.questionText}>
                    Where does <strong>&quot;{currentTask.name}&quot;</strong> fit?
                  </p>
                </div>

                {/* Current Task Card */}
                <div className={styles.taskSection}>
                  <TaskComparisonCard task={currentTask} />
                </div>

                {/* Comparison Prompt */}
                {currentComparison && (
                  <>
                    <div className={styles.comparisonPrompt}>
                      <p>Is this more important than...</p>
                    </div>

                    {/* Comparison Task Card */}
                    <div className={styles.taskSection}>
                      <TaskComparisonCard task={currentComparison} showRank />
                    </div>

                    {/* Choice Buttons */}
                    <div className={styles.actions}>
                      <Button
                        className={styles.choiceButton}
                        variant="default"
                        onClick={() => handleChoice(1)}
                        disabled={isProcessing}
                      >
                        <ArrowUp size={20} />
                        More Important
                      </Button>
                      <Button
                        className={styles.choiceButton}
                        variant="outline"
                        onClick={() => handleChoice(-1)}
                        disabled={isProcessing}
                      >
                        <ArrowDown size={20} />
                        Less Important
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
