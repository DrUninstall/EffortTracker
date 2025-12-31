// Date utility functions for Effort Ledger

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
export function getToday(): string {
  return formatDate(new Date());
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date object (local timezone, midnight)
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
export function getYesterday(date: string = getToday()): string {
  const d = parseDate(date);
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

/**
 * Get the start and end dates of the ISO week containing the given date
 * ISO week starts on Monday
 */
export function getISOWeekRange(date: string): { start: string; end: string } {
  const d = parseDate(date);
  const dayOfWeek = d.getDay();
  // Convert Sunday (0) to 7 for ISO week calculation
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;

  // Get Monday (start of week)
  const monday = new Date(d);
  monday.setDate(d.getDate() - isoDay + 1);

  // Get Sunday (end of week)
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: formatDate(monday),
    end: formatDate(sunday),
  };
}

/**
 * Check if two dates are in the same ISO week
 */
export function isSameISOWeek(date1: string, date2: string): boolean {
  const week1 = getISOWeekRange(date1);
  const week2 = getISOWeekRange(date2);
  return week1.start === week2.start;
}

/**
 * Get all dates between start and end (inclusive)
 */
export function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Get date N days ago from today (or from a given date)
 */
export function getDaysAgo(days: number, from: string = getToday()): string {
  const d = parseDate(from);
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

/**
 * Get date N days from now (or from a given date)
 */
export function getDaysFromNow(days: number, from: string = getToday()): string {
  const d = parseDate(from);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/**
 * Format date for display (e.g., "Mon, Jan 15")
 */
export function formatDateDisplay(date: string): string {
  const d = parseDate(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date for display with year (e.g., "Jan 15, 2024")
 */
export function formatDateDisplayFull(date: string): string {
  const d = parseDate(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Check if a date is today
 */
export function isToday(date: string): boolean {
  return date === getToday();
}

/**
 * Check if a date is in the past
 */
export function isPast(date: string): boolean {
  return date < getToday();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: string): boolean {
  return date > getToday();
}

/**
 * Get all ISO weeks between start and end dates
 * Returns array of { start, end } for each week
 */
export function getISOWeeksInRange(startDate: string, endDate: string): Array<{ start: string; end: string }> {
  const weeks: Array<{ start: string; end: string }> = [];
  let current = getISOWeekRange(startDate);
  const endWeek = getISOWeekRange(endDate);

  while (current.start <= endWeek.start) {
    weeks.push({ ...current });
    const nextMonday = parseDate(current.start);
    nextMonday.setDate(nextMonday.getDate() + 7);
    current = {
      start: formatDate(nextMonday),
      end: formatDate(new Date(nextMonday.getTime() + 6 * 24 * 60 * 60 * 1000)),
    };
  }

  return weeks;
}

/**
 * Format minutes as hours and minutes (e.g., "2h 30m")
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Format milliseconds as MM:SS or HH:MM:SS
 */
export function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
