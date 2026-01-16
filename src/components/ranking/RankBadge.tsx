'use client';

import React from 'react';
import styles from './RankBadge.module.css';

interface RankBadgeProps {
  rank: number;
  variant?: 'default' | 'small';
}

export function RankBadge({ rank, variant = 'default' }: RankBadgeProps) {
  const displayRank = Math.floor(rank / 100); // Convert internal rank to display rank (100 -> 1, 200 -> 2, etc.)

  return (
    <span
      className={`${styles.badge} ${variant === 'small' ? styles.badgeSmall : ''}`}
      aria-label={`Rank ${displayRank}`}
    >
      #{displayRank}
    </span>
  );
}
