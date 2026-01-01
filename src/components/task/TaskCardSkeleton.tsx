'use client';

import React from 'react';
import styles from './TaskCardSkeleton.module.css';

export function TaskCardSkeleton() {
  return (
    <div className={styles.card}>
      {/* Header skeleton */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.priorityDot} />
          <div className={styles.name} />
          <div className={styles.badge} />
        </div>
        <div className={styles.quota} />
      </div>

      {/* Progress bar skeleton */}
      <div className={styles.progressSection}>
        <div className={styles.progressBar} />
        <div className={styles.progressStats} />
      </div>

      {/* Actions skeleton */}
      <div className={styles.actions}>
        <div className={styles.buttonGroup}>
          <div className={styles.button} />
          <div className={styles.button} />
          <div className={styles.button} />
          <div className={styles.button} />
        </div>
        <div className={styles.mainButton} />
      </div>
    </div>
  );
}

export function TaskCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </>
  );
}
