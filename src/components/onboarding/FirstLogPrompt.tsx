'use client';

import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import styles from './onboarding.module.css';

interface FirstLogPromptProps {
  taskName: string;
}

export function FirstLogPrompt({ taskName }: FirstLogPromptProps) {
  return (
    <motion.div
      className={styles.promptOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={styles.promptBubble}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <p className={styles.promptText}>
          Tap <strong>+10</strong> to log your first effort for {taskName}
        </p>
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <ArrowDown size={20} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
