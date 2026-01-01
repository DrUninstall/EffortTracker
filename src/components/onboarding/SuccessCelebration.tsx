'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import styles from './onboarding.module.css';

interface SuccessCelebrationProps {
  onComplete: () => void;
}

export function SuccessCelebration({ onComplete }: SuccessCelebrationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className={styles.successContainer}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onComplete}
    >
      <motion.div
        className={styles.successContent}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <motion.div
          className={styles.successIcon}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 12 }}
        >
          <Check size={40} strokeWidth={3} />
        </motion.div>

        <motion.h1
          className={styles.successTitle}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          You&apos;re all set!
        </motion.h1>

        <motion.p
          className={styles.successSubtitle}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          Your first effort has been logged.
          <br />
          Keep tracking to build momentum.
        </motion.p>
      </motion.div>

      {/* Confetti particles */}
      <div className={styles.confettiContainer}>
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className={styles.confetti}
            initial={{
              opacity: 0,
              y: 0,
              x: 0,
              scale: 0,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [0, -100 - Math.random() * 50],
              x: [(Math.random() - 0.5) * 200],
              scale: [0, 1, 1, 0.5],
              rotate: [0, 360 + Math.random() * 360],
            }}
            transition={{
              duration: 1.5,
              delay: 0.3 + i * 0.05,
              ease: [0.23, 1, 0.32, 1],
            }}
            style={{
              backgroundColor: [
                'var(--primary)',
                'var(--success)',
                'var(--warning)',
              ][i % 3],
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
