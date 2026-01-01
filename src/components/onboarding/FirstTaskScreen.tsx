'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  GraduationCap,
  Dumbbell,
  Leaf,
  Focus,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TASK_PRESETS } from '@/data/taskPresets';
import { TaskPreset } from '@/types';
import styles from './onboarding.module.css';

const ICON_MAP: Record<string, React.ComponentType<{ size?: string | number }>> = {
  BookOpen,
  GraduationCap,
  Dumbbell,
  Leaf,
  Focus,
  Languages,
};

interface FirstTaskScreenProps {
  onCreateTask: (preset: TaskPreset | { name: string; quota: number }) => void;
}

export function FirstTaskScreen({ onCreateTask }: FirstTaskScreenProps) {
  const [customName, setCustomName] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetClick = (preset: TaskPreset) => {
    onCreateTask(preset);
  };

  const handleCustomSubmit = () => {
    if (customName.trim()) {
      onCreateTask({ name: customName.trim(), quota: 30 });
    }
  };

  return (
    <motion.div
      className={styles.screenContainer}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={styles.screenContent}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <h1 className={styles.screenTitle}>What do you want to track?</h1>
        <p className={styles.screenSubtitle}>
          Pick a preset or create your own
        </p>

        <div className={styles.presetsGrid}>
          {TASK_PRESETS.map((preset, index) => {
            const Icon = ICON_MAP[preset.icon] || BookOpen;
            return (
              <motion.button
                key={preset.name}
                className={styles.presetButton}
                onClick={() => handlePresetClick(preset)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.05 }}
                whileTap={{ scale: 0.97 }}
              >
                <Icon size={20} />
                <span className={styles.presetName}>{preset.name}</span>
                <span className={styles.presetQuota}>{preset.quota}m</span>
              </motion.button>
            );
          })}
        </div>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        {!showCustom ? (
          <Button
            variant="outline"
            className={styles.customButton}
            onClick={() => setShowCustom(true)}
          >
            Create custom task
          </Button>
        ) : (
          <motion.div
            className={styles.customForm}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Task name (e.g., Piano practice)"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
            />
            <Button
              onClick={handleCustomSubmit}
              disabled={!customName.trim()}
            >
              Create Task
            </Button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
