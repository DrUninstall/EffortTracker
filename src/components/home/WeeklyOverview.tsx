'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '@/stores/taskStore';
import { getISOWeekRange, isToday, getToday } from '@/utils/date';
import styles from './WeeklyOverview.module.css';

interface DayData {
  date: string;
  dayLabel: string;
  isToday: boolean;
  completionPercent: number; // 0-100
  status: 'empty' | 'partial' | 'complete';
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyOverview() {
  const { getAllTaskProgress, setSelectedDate, selectedDate, logs, isHydrated } = useTaskStore();

  // Compute week data
  const weekData = useMemo((): DayData[] => {
    if (!isHydrated) return [];

    const today = getToday();
    const { start } = getISOWeekRange(today);

    // Generate dates for the week
    const weekDates: string[] = [];
    const startDate = new Date(start);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      weekDates.push(date.toISOString().split('T')[0]);
    }

    // Calculate completion for each day
    return weekDates.map((date, index) => {
      const dayProgress = getAllTaskProgress(date);

      if (dayProgress.length === 0) {
        return {
          date,
          dayLabel: DAY_LABELS[index],
          isToday: isToday(date),
          completionPercent: 0,
          status: 'empty' as const,
        };
      }

      // Calculate overall completion percentage
      const completedCount = dayProgress.filter((p) => p.isDone).length;
      const totalCount = dayProgress.length;
      const completionPercent = Math.round((completedCount / totalCount) * 100);

      let status: 'empty' | 'partial' | 'complete';
      if (completionPercent === 0) {
        status = 'empty';
      } else if (completionPercent === 100) {
        status = 'complete';
      } else {
        status = 'partial';
      }

      return {
        date,
        dayLabel: DAY_LABELS[index],
        isToday: isToday(date),
        completionPercent,
        status,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllTaskProgress, isHydrated, logs]);

  if (!isHydrated || weekData.length === 0) {
    return null;
  }

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };

  return (
    <div className={styles.container}>
      <div className={styles.weekRow}>
        {weekData.map((day, index) => (
          <motion.button
            key={day.date}
            className={`${styles.dayButton} ${day.isToday ? styles.today : ''}`}
            onClick={() => handleDayClick(day.date)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 20,
              delay: index * 0.05,
            }}
            aria-label={`${day.dayLabel}, ${day.completionPercent}% complete`}
            aria-current={day.isToday ? 'date' : undefined}
          >
            <span className={styles.dayLabel}>{day.dayLabel}</span>
            <div className={styles.dayCircleWrapper}>
              <div
                className={`${styles.dayCircle} ${styles[day.status]}`}
                style={
                  day.status === 'partial'
                    ? {
                        background: `conic-gradient(var(--primary) ${day.completionPercent * 3.6}deg, rgba(var(--grey-light-100)) ${day.completionPercent * 3.6}deg)`,
                      }
                    : undefined
                }
              >
                {day.status === 'complete' && (
                  <motion.div
                    className={styles.checkmark}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                )}
              </div>
              {day.isToday && <div className={styles.todayRing} />}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
