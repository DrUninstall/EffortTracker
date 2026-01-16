'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '@/stores/taskStore';
import { getToday, getDaysAgo, getISOWeekRange, formatMinutes } from '@/utils/date';
import styles from './EffortChart.module.css';

interface ChartData {
  label: string;
  value: number;
  date: string;
  intensity: number; // 0-1 for color intensity
}

interface EffortChartProps {
  periodDays?: number; // 7, 30, or 365
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function EffortChart({ periodDays = 7 }: EffortChartProps) {
  const { logs, tasks, isHydrated } = useTaskStore();
  const [hoveredBar, setHoveredBar] = useState<ChartData | null>(null);

  // Get time-based tasks
  const timeTasks = useMemo(() => {
    return new Set(tasks.filter((t) => t.task_type === 'TIME' && !t.is_archived).map((t) => t.id));
  }, [tasks]);

  // Determine view mode based on period
  const viewMode = useMemo(() => {
    if (periodDays <= 14) return 'daily';
    if (periodDays <= 60) return 'daily-grouped'; // Show daily but fewer labels
    return 'weekly'; // For year view
  }, [periodDays]);

  // Generate chart data based on period
  const chartData = useMemo((): ChartData[] => {
    if (!isHydrated) return [];

    const today = getToday();
    const data: ChartData[] = [];

    if (viewMode === 'weekly') {
      // Weekly bars for longer periods (365 days = ~52 weeks)
      const numWeeks = Math.ceil(periodDays / 7);
      for (let i = numWeeks - 1; i >= 0; i--) {
        const weekDate = getDaysAgo(i * 7, today);
        const { start, end } = getISOWeekRange(weekDate);
        const weekLogs = logs.filter(
          (l) => l.date >= start && l.date <= end && timeTasks.has(l.task_id)
        );
        const minutes = weekLogs.reduce((sum, l) => sum + l.minutes, 0);

        // Create label - show month for first week of each month
        const startDate = new Date(start);
        const label = startDate.getDate() <= 7 ? MONTH_LABELS[startDate.getMonth()] : '';

        data.push({
          label,
          value: minutes,
          date: start,
          intensity: 0, // Will calculate after
        });
      }
    } else {
      // Daily bars
      for (let i = periodDays - 1; i >= 0; i--) {
        const date = getDaysAgo(i, today);
        const dayLogs = logs.filter(
          (l) => l.date === date && timeTasks.has(l.task_id)
        );
        const minutes = dayLogs.reduce((sum, l) => sum + l.minutes, 0);
        const dayOfWeek = new Date(date).getDay();
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        // For grouped view, only show labels for Mondays or start of month
        let label = DAY_LABELS[adjustedDay];
        if (viewMode === 'daily-grouped') {
          const dateObj = new Date(date);
          if (dateObj.getDate() === 1) {
            label = MONTH_LABELS[dateObj.getMonth()];
          } else if (adjustedDay !== 0) {
            label = ''; // Only show Monday labels in grouped view
          }
        }

        data.push({
          label,
          value: minutes,
          date,
          intensity: 0,
        });
      }
    }

    // Calculate intensity based on max value
    const maxVal = Math.max(...data.map((d) => d.value), 1);
    return data.map((d) => ({
      ...d,
      intensity: d.value / maxVal,
    }));
  }, [logs, timeTasks, isHydrated, viewMode, periodDays]);

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

  // Total for the period
  const totalMinutes = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.value, 0);
  }, [chartData]);

  if (!isHydrated || chartData.length === 0) {
    return null;
  }

  // Determine bar width based on number of bars
  const barCount = chartData.length;
  const isCompact = barCount > 14;
  const isVeryCompact = barCount > 60;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Effort Trend</h3>
        <span className={styles.total}>{formatMinutes(totalMinutes)} total</span>
      </div>

      <motion.div
        className={styles.chartWrapper}
        key={periodDays} // Re-mount on period change for fresh animation
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Y-axis labels */}
        <div className={styles.yAxis}>
          <span>{formatMinutes(maxValue)}</span>
          <span>{formatMinutes(maxValue / 2)}</span>
          <span>0</span>
        </div>

        {/* Bars */}
        <div className={`${styles.chart} ${isCompact ? styles.compact : ''} ${isVeryCompact ? styles.veryCompact : ''}`}>
          {chartData.map((data, index) => {
            const heightPercent = (data.value / maxValue) * 100;
            // Stagger animation based on position
            const delay = Math.min(index * (isVeryCompact ? 0.008 : isCompact ? 0.015 : 0.04), 0.8);

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
                    data-intensity={
                      data.intensity >= 0.8 ? 'high' :
                      data.intensity >= 0.5 ? 'medium' :
                      data.intensity >= 0.2 ? 'low' : 'minimal'
                    }
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: `${heightPercent}%`, opacity: 1 }}
                    transition={{
                      height: {
                        duration: 0.5,
                        delay,
                        ease: [0.34, 1.56, 0.64, 1], // Springy overshoot
                      },
                      opacity: {
                        duration: 0.2,
                        delay,
                      },
                    }}
                  />
                </div>
                {data.label && <span className={styles.barLabel}>{data.label}</span>}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Tooltip */}
      {hoveredBar && (
        <motion.div
          className={styles.tooltip}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <span className={styles.tooltipValue}>{formatMinutes(hoveredBar.value)}</span>
          <span className={styles.tooltipDate}>
            {new Date(hoveredBar.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </motion.div>
      )}
    </div>
  );
}
