'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '@/stores/taskStore';
import { getToday, getDaysAgo, getISOWeekRange, formatMinutes } from '@/utils/date';
import styles from './EffortChart.module.css';

type ViewMode = 'daily' | 'weekly';

interface ChartData {
  label: string;
  value: number;
  date: string;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function EffortChart() {
  const { logs, tasks, isHydrated } = useTaskStore();
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [hoveredBar, setHoveredBar] = useState<ChartData | null>(null);

  // Get time-based tasks
  const timeTasks = useMemo(() => {
    return new Set(tasks.filter((t) => t.task_type === 'TIME').map((t) => t.id));
  }, [tasks]);

  // Generate chart data
  const chartData = useMemo((): ChartData[] => {
    if (!isHydrated) return [];

    const today = getToday();
    const data: ChartData[] = [];

    if (viewMode === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = getDaysAgo(i, today);
        const dayLogs = logs.filter(
          (l) => l.date === date && timeTasks.has(l.task_id)
        );
        const minutes = dayLogs.reduce((sum, l) => sum + l.minutes, 0);
        const dayOfWeek = new Date(date).getDay();
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0

        data.push({
          label: DAY_LABELS[adjustedDay],
          value: minutes,
          date,
        });
      }
    } else {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekDate = getDaysAgo(i * 7, today);
        const { start, end } = getISOWeekRange(weekDate);
        const weekLogs = logs.filter(
          (l) => l.date >= start && l.date <= end && timeTasks.has(l.task_id)
        );
        const minutes = weekLogs.reduce((sum, l) => sum + l.minutes, 0);

        data.push({
          label: `W${4 - i}`,
          value: minutes,
          date: start,
        });
      }
    }

    return data;
  }, [logs, timeTasks, isHydrated, viewMode]);

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.value), 1);
    // Round up to nice number
    if (max <= 60) return 60;
    if (max <= 120) return 120;
    if (max <= 240) return 240;
    if (max <= 480) return 480;
    return Math.ceil(max / 60) * 60;
  }, [chartData]);

  if (!isHydrated || chartData.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Effort Trend</h3>
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleButton} ${viewMode === 'daily' ? styles.active : ''}`}
            onClick={() => setViewMode('daily')}
          >
            Daily
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === 'weekly' ? styles.active : ''}`}
            onClick={() => setViewMode('weekly')}
          >
            Weekly
          </button>
        </div>
      </div>

      <div className={styles.chartWrapper}>
        {/* Y-axis labels */}
        <div className={styles.yAxis}>
          <span>{formatMinutes(maxValue)}</span>
          <span>{formatMinutes(maxValue / 2)}</span>
          <span>0</span>
        </div>

        {/* Bars */}
        <div className={styles.chart}>
          {chartData.map((data, index) => {
            const heightPercent = (data.value / maxValue) * 100;

            return (
              <div
                key={data.date}
                className={styles.barContainer}
                onMouseEnter={() => setHoveredBar(data)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                <div className={styles.barWrapper}>
                  <motion.div
                    className={styles.bar}
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.05,
                      ease: [0.34, 1.56, 0.64, 1], // Spring-like
                    }}
                  />
                </div>
                <span className={styles.barLabel}>{data.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredBar && (
        <div className={styles.tooltip}>
          <span className={styles.tooltipValue}>{formatMinutes(hoveredBar.value)}</span>
          <span className={styles.tooltipDate}>
            {new Date(hoveredBar.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      )}
    </div>
  );
}
