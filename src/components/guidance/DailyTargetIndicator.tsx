'use client';

import React from 'react';
import { Target } from 'lucide-react';
import styles from './DailyTargetIndicator.module.css';

interface DailyTargetIndicatorProps {
  target: number;
  isHabit?: boolean;
  unit?: string;
}

export function DailyTargetIndicator({
  target,
  isHabit = false,
  unit,
}: DailyTargetIndicatorProps) {
  if (target <= 0) return null;

  let text: string;
  if (isHabit) {
    const unitText = unit ? ` ${unit}` : '';
    text = `~${target}${unitText} today`;
  } else if (target < 60) {
    text = `~${target}m today`;
  } else {
    const hours = Math.floor(target / 60);
    const minutes = target % 60;
    text = minutes === 0 ? `~${hours}h today` : `~${hours}h ${minutes}m today`;
  }

  return (
    <span className={styles.indicator} title="Suggested daily target to stay on pace">
      <Target size={12} className={styles.icon} aria-hidden="true" />
      <span className={styles.text}>{text}</span>
    </span>
  );
}
