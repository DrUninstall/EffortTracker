'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '@/stores/taskStore';
import { getToday, getDaysAgo } from '@/utils/date';
import styles from './CalendarHeatMap.module.css';

// Number of weeks to display
const WEEKS_TO_SHOW = 12;
const DAYS_TO_SHOW = WEEKS_TO_SHOW * 7;

interface DayCell {
  date: string;
  intensity: 0 | 1 | 2 | 3 | 4; // 0 = no data, 1-4 = intensity levels
  completionPercent: number;
  tasksCompleted: number;
  totalTasks: number;
}

// Format date for tooltip
function formatDateForTooltip(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function CalendarHeatMap() {
  const { getAllTaskProgress, logs, isHydrated } = useTaskStore();
  const [hoveredDay, setHoveredDay] = useState<DayCell | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Generate heat map data
  const heatMapData = useMemo((): DayCell[][] => {
    if (!isHydrated) return [];

    const today = getToday();
    const cells: DayCell[] = [];

    // Generate cells for the last N days
    for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
      const date = getDaysAgo(i, today);
      const dayProgress = getAllTaskProgress(date);

      if (dayProgress.length === 0) {
        cells.push({
          date,
          intensity: 0,
          completionPercent: 0,
          tasksCompleted: 0,
          totalTasks: 0,
        });
      } else {
        const completedCount = dayProgress.filter((p) => p.isDone).length;
        const totalCount = dayProgress.length;
        const completionPercent = Math.round((completedCount / totalCount) * 100);

        // Map completion to intensity level
        let intensity: 0 | 1 | 2 | 3 | 4;
        if (completionPercent === 0) {
          intensity = 0;
        } else if (completionPercent <= 25) {
          intensity = 1;
        } else if (completionPercent <= 50) {
          intensity = 2;
        } else if (completionPercent < 100) {
          intensity = 3;
        } else {
          intensity = 4;
        }

        cells.push({
          date,
          intensity,
          completionPercent,
          tasksCompleted: completedCount,
          totalTasks: totalCount,
        });
      }
    }

    // Group into weeks (columns)
    const weeks: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    return weeks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllTaskProgress, isHydrated, logs]);

  const handleMouseEnter = (day: DayCell, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
    setHoveredDay(day);
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  if (!isHydrated || heatMapData.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Activity</h3>

      <div className={styles.heatMapWrapper}>
        <div className={styles.heatMap}>
          {heatMapData.map((week, weekIndex) => (
            <div key={weekIndex} className={styles.week}>
              {week.map((day, dayIndex) => (
                <motion.div
                  key={day.date}
                  className={styles.day}
                  data-intensity={day.intensity}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                    delay: (weekIndex * 7 + dayIndex) * 0.005,
                  }}
                  onMouseEnter={(e) => handleMouseEnter(day, e)}
                  onMouseLeave={handleMouseLeave}
                  aria-label={`${formatDateForTooltip(day.date)}: ${day.completionPercent}% complete`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <span className={styles.legendLabel}>Less</span>
          <div className={styles.legendCells}>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={styles.legendCell}
                data-intensity={level}
              />
            ))}
          </div>
          <span className={styles.legendLabel}>More</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className={styles.tooltip}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          <span className={styles.tooltipDate}>
            {formatDateForTooltip(hoveredDay.date)}
          </span>
          {hoveredDay.totalTasks > 0 ? (
            <span className={styles.tooltipStats}>
              {hoveredDay.tasksCompleted}/{hoveredDay.totalTasks} tasks ({hoveredDay.completionPercent}%)
            </span>
          ) : (
            <span className={styles.tooltipStats}>No activity</span>
          )}
        </div>
      )}
    </div>
  );
}
