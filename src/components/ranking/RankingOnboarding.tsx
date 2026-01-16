'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTaskStore } from '@/stores/taskStore';
import { triggerHaptic } from '@/lib/haptics';
import styles from './RankingOnboarding.module.css';

interface RankingOnboardingProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function RankingOnboarding({ isOpen, onComplete }: RankingOnboardingProps) {
  const { settings, updateSettings } = useTaskStore();

  const handleComplete = () => {
    if (settings.vibrationEnabled) {
      triggerHaptic('success');
    }
    updateSettings({ showRankingOnboarding: false });
    onComplete();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={styles.dialog}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Icon */}
            <div className={styles.icon}>
              <ArrowUpDown size={48} strokeWidth={1.5} />
            </div>

            {/* Header */}
            <div className={styles.header}>
              <h2 className={styles.title}>Priority Ranking</h2>
              <p className={styles.subtitle}>
                Focus on what matters most by comparing tasks
              </p>
            </div>

            {/* Content */}
            <div className={styles.content}>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  <Zap size={20} />
                </div>
                <div className={styles.featureContent}>
                  <h3 className={styles.featureTitle}>Quick Comparisons</h3>
                  <p className={styles.featureText}>
                    When you add a task, we&apos;ll ask you to compare it with a few existing tasks.
                    This helps you quickly prioritize what&apos;s most important.
                  </p>
                </div>
              </div>

              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  <ArrowUpDown size={20} />
                </div>
                <div className={styles.featureContent}>
                  <h3 className={styles.featureTitle}>Binary Search</h3>
                  <p className={styles.featureText}>
                    Using an efficient algorithm, you&apos;ll only need 2-4 comparisons to rank a task
                    among 10+ others. It&apos;s fast and painless.
                  </p>
                </div>
              </div>

              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  <X size={20} />
                </div>
                <div className={styles.featureContent}>
                  <h3 className={styles.featureTitle}>Skip Anytime</h3>
                  <p className={styles.featureText}>
                    You can always skip ranking if you&apos;re in a hurry. Ranked tasks appear first,
                    unranked tasks appear after.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <Button onClick={handleComplete} className={styles.primaryButton}>
                Got it, let&apos;s go!
              </Button>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <p className={styles.footerText}>
                You can disable this feature anytime in Settings
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
