'use client';

import { useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useTaskStore } from '@/stores/taskStore';
import { TaskPreset } from '@/types';
import { WelcomeSplash } from './WelcomeSplash';
import { FirstTaskScreen } from './FirstTaskScreen';
import { FirstLogPrompt } from './FirstLogPrompt';
import { SuccessCelebration } from './SuccessCelebration';

interface OnboardingContainerProps {
  children: React.ReactNode;
}

export function OnboardingContainer({ children }: OnboardingContainerProps) {
  const {
    hasCompleted,
    currentStep,
    createdTaskId,
    isHydrated: onboardingHydrated,
    setStep,
    setCreatedTaskId,
    completeOnboarding,
  } = useOnboardingStore();

  const {
    tasks,
    logs,
    addTask,
    isHydrated: taskHydrated,
  } = useTaskStore();

  // Check if we should show onboarding
  const isHydrated = onboardingHydrated && taskHydrated;
  const shouldShowOnboarding = isHydrated && !hasCompleted && tasks.length === 0;
  const isInOnboarding = isHydrated && !hasCompleted && currentStep !== 'complete';

  // Handle welcome completion
  const handleWelcomeComplete = useCallback(() => {
    setStep('task_creation');
  }, [setStep]);

  // Handle task creation from preset
  const handleCreateTask = useCallback(
    (preset: TaskPreset | { name: string; quota: number }) => {
      const taskData = {
        name: preset.name,
        priority: 'IMPORTANT' as const,
        quota_type: 'quotaType' in preset ? preset.quotaType : ('DAILY' as const),
        task_type: 'TIME' as const,
        daily_quota_minutes: preset.quota,
        allow_carryover: false,
        pomodoro_defaults: {
          focus_minutes: 25,
          break_minutes: 5,
          long_break_minutes: 15,
          cycles_before_long_break: 4,
        },
        is_archived: false,
      };

      const taskId = addTask(taskData);
      if (taskId) {
        setCreatedTaskId(taskId);
        setStep('first_log');
      }
    },
    [addTask, setCreatedTaskId, setStep]
  );

  // Monitor for first log
  useEffect(() => {
    if (currentStep === 'first_log' && createdTaskId && logs.length > 0) {
      const hasLogForTask = logs.some((log) => log.task_id === createdTaskId);
      if (hasLogForTask) {
        setStep('success');
      }
    }
  }, [currentStep, createdTaskId, logs, setStep]);

  // Handle success completion
  const handleSuccessComplete = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  // Get created task name for prompt
  const createdTask = tasks.find((t) => t.id === createdTaskId);

  // If not hydrated yet, just render children
  if (!isHydrated) {
    return <>{children}</>;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {shouldShowOnboarding && currentStep === 'welcome' && (
          <WelcomeSplash key="welcome" onComplete={handleWelcomeComplete} />
        )}

        {isInOnboarding && currentStep === 'task_creation' && (
          <FirstTaskScreen key="task" onCreateTask={handleCreateTask} />
        )}

        {isInOnboarding && currentStep === 'success' && (
          <SuccessCelebration key="success" onComplete={handleSuccessComplete} />
        )}
      </AnimatePresence>

      {/* Show first log prompt overlay when on that step */}
      <AnimatePresence>
        {isInOnboarding && currentStep === 'first_log' && createdTask && (
          <FirstLogPrompt key="prompt" taskName={createdTask.name} />
        )}
      </AnimatePresence>

      {/* Always render children (main app) */}
      {children}
    </>
  );
}
