'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import { Task, Priority } from '@/types';
import { Button } from '@/components/ui/button';
import { TaskComparisonCard } from './TaskComparisonCard';
import { findInsertionPoint, ComparisonCallback } from '@/utils/priorityRanking';
import { triggerHaptic } from '@/lib/haptics';
import { useTaskStore } from '@/stores/taskStore';
import styles from './ComparisonDialog.module.css';

interface ComparisonDialogProps {
  isOpen: boolean;
  newTask: Omit<Task, 'id' | 'created_at'>;
  existingTasks: Task[];
  priority: Priority;
  onComplete: (rank: number, comparisons: number) => void;
  onSkip: () => void;
  onClose: () => void;
}

const PRIORITY_LABELS = {
  CORE: 'CORE',
  IMPORTANT: 'IMPORTANT',
  OPTIONAL: 'OPTIONAL',
};

export function ComparisonDialog({
  isOpen,
  newTask,
  existingTasks,
  priority,
  onComplete,
  onSkip,
  onClose,
}: ComparisonDialogProps) {
  const { settings } = useTaskStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentComparison, setCurrentComparison] = useState<Task | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [comparisonResolver, setComparisonResolver] = useState<((value: 1 | -1) => void) | null>(null);

  const startComparison = useCallback(async () => {
    const comparisonCallback: ComparisonCallback = (taskA, taskB) => {
      return new Promise<1 | -1>((resolve) => {
        setCurrentComparison(taskB);
        setComparisonResolver(() => resolve);
      });
    };

    try {
      const result = await findInsertionPoint(newTask, existingTasks, comparisonCallback);
      setIsProcessing(false);
      onComplete(result.insertionRank, result.comparisons);
    } catch (error) {
      console.error('Comparison error:', error);
      setIsProcessing(false);
      onSkip();
    }
  }, [newTask, existingTasks, onComplete, onSkip]);

  // Start the comparison process when dialog opens
  useEffect(() => {
    if (isOpen && existingTasks.length > 0) {
      setIsProcessing(true);
      setCurrentStep(0);
      setTotalSteps(Math.ceil(Math.log2(existingTasks.length + 1)));
      startComparison();
    }
  }, [isOpen, existingTasks.length, startComparison]);

  const handleChoice = (choice: 1 | -1) => {
    if (settings.vibrationEnabled) {
      triggerHaptic('light');
    }

    if (comparisonResolver) {
      comparisonResolver(choice);
      setComparisonResolver(null);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    if (settings.vibrationEnabled) {
      triggerHaptic('light');
    }
    onSkip();
  };

  // If no comparisons needed, just close
  if (!isOpen || existingTasks.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleSkip}
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
              <h2 className={styles.title}>Set Priority</h2>
              <Button
                variant="ghost"
                size="icon"
                className={styles.closeButton}
                onClick={handleSkip}
              >
                <X size={20} />
              </Button>
            </div>

            {/* Progress Indicator */}
            {totalSteps > 0 && (
              <div className={styles.progress}>
                <div className={styles.progressDots}>
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`${styles.progressDot} ${
                        i < currentStep ? styles.progressDotActive : ''
                      }`}
                    />
                  ))}
                </div>
                <span className={styles.progressText}>
                  {currentStep} of {totalSteps}
                </span>
              </div>
            )}

            {/* Question */}
            <div className={styles.question}>
              <p className={styles.questionText}>
                Where does <strong>&quot;{newTask.name}&quot;</strong> fit in your {PRIORITY_LABELS[priority]} priorities?
              </p>
            </div>

            {/* New Task Card */}
            <div className={styles.taskSection}>
              <TaskComparisonCard task={newTask as Task} />
            </div>

            {/* Comparison Prompt */}
            {currentComparison && (
              <>
                <div className={styles.comparisonPrompt}>
                  <p>Is this more important than...</p>
                </div>

                {/* Existing Task Card */}
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

            {/* Skip Button */}
            <div className={styles.footer}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className={styles.skipButton}
              >
                Skip ranking
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
