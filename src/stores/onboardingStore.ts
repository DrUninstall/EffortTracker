import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import { OnboardingStep } from '@/types';

interface OnboardingState {
  // State
  hasCompleted: boolean;
  currentStep: OnboardingStep;
  createdTaskId: string | null;
  isHydrated: boolean;

  // Actions
  setStep: (step: OnboardingStep) => void;
  setCreatedTaskId: (id: string) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setHydrated: (value: boolean) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      // Initial state
      hasCompleted: false,
      currentStep: 'welcome',
      createdTaskId: null,
      isHydrated: false,

      // Actions
      setStep: (step) => set({ currentStep: step }),

      setCreatedTaskId: (id) => set({ createdTaskId: id }),

      completeOnboarding: () =>
        set({
          hasCompleted: true,
          currentStep: 'complete',
        }),

      resetOnboarding: () =>
        set({
          hasCompleted: false,
          currentStep: 'welcome',
          createdTaskId: null,
        }),

      setHydrated: (value) => set({ isHydrated: value }),
    }),
    {
      name: 'effort-ledger-onboarding',
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
