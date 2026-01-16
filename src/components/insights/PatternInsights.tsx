'use client';

import React from 'react';
import type { PatternAnalysis } from '@/types';
import styles from './PatternInsights.module.css';

interface PatternInsightsProps {
  pattern: PatternAnalysis;
  taskName: string;
}

export function PatternInsights({ pattern, taskName }: PatternInsightsProps) {
  const { patterns, confidence, recommendation, best_sessions } = pattern;

  if (confidence < 50) {
    return null; // Don't show if confidence is too low
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.taskName}>{taskName}</h3>
          <p className={styles.subtitle}>
            Pattern detected from {best_sessions.length} top sessions
          </p>
        </div>
        <div className={styles.confidence} data-high={confidence >= 75}>
          {confidence}% confident
        </div>
      </div>

      <div className={styles.patterns}>
        {patterns.time_of_day && (
          <div className={styles.pattern}>
            <span className={styles.patternIcon}>🕐</span>
            <div>
              <div className={styles.patternLabel}>Best time</div>
              <div className={styles.patternValue}>{patterns.time_of_day}</div>
            </div>
          </div>
        )}

        {patterns.day_of_week && (
          <div className={styles.pattern}>
            <span className={styles.patternIcon}>📅</span>
            <div>
              <div className={styles.patternLabel}>Best day</div>
              <div className={styles.patternValue}>{patterns.day_of_week}s</div>
            </div>
          </div>
        )}

        {patterns.avg_duration && (
          <div className={styles.pattern}>
            <span className={styles.patternIcon}>⏱️</span>
            <div>
              <div className={styles.patternLabel}>Sweet spot</div>
              <div className={styles.patternValue}>{patterns.avg_duration} minutes</div>
            </div>
          </div>
        )}

        {patterns.energy_correlation && (
          <div className={styles.pattern}>
            <span className={styles.patternIcon}>⚡</span>
            <div>
              <div className={styles.patternLabel}>Energy level</div>
              <div className={styles.patternValue}>
                {patterns.energy_correlation === 'high' && 'High energy'}
                {patterns.energy_correlation === 'medium' && 'Medium energy'}
                {patterns.energy_correlation === 'low' && 'Low energy'}
              </div>
            </div>
          </div>
        )}

        {patterns.common_tags && patterns.common_tags.length > 0 && (
          <div className={styles.pattern}>
            <span className={styles.patternIcon}>🏷️</span>
            <div>
              <div className={styles.patternLabel}>Common context</div>
              <div className={styles.patternValue}>
                {patterns.common_tags.join(', ')}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.recommendation}>
        <strong>💡 Insight:</strong> {recommendation}
      </div>
    </div>
  );
}
