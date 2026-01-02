/**
 * Natural Language Time Parser
 *
 * Parses human-friendly time expressions into minutes.
 * Inspired by Things 3's natural language parsing.
 *
 * Supports:
 * - Plain numbers: "25", "90"
 * - Minutes: "25m", "25 min", "25 mins", "25 minutes"
 * - Hours: "1h", "2 hours", "1.5h"
 * - Combined: "1h30m", "1h 30m", "1 hour 30 minutes"
 * - Fractions: "half hour", "quarter hour"
 * - Relative: "half an hour", "an hour", "a few minutes"
 */

// Regex patterns for parsing
const PATTERNS = {
  // Plain number (assume minutes)
  plainNumber: /^(\d+(?:\.\d+)?)$/,

  // Minutes only: "25m", "25 min", "25mins", "25 minutes"
  minutesOnly: /^(\d+(?:\.\d+)?)\s*(?:m(?:in(?:ute)?s?)?)?$/i,

  // Hours only: "1h", "2 hours", "1.5h", "1.5 hours"
  hoursOnly: /^(\d+(?:\.\d+)?)\s*(?:h(?:(?:ou)?rs?)?)$/i,

  // Combined hours and minutes: "1h30m", "1h 30m", "1 hour 30 minutes"
  combined: /^(\d+(?:\.\d+)?)\s*(?:h(?:(?:ou)?rs?)?)\s*(\d+)\s*(?:m(?:in(?:ute)?s?)?)?$/i,

  // Hour and half: "1.5h", "one and a half hours"
  hourHalf: /^(\d+)(?:\.5|\s+and\s+(?:a\s+)?half)\s*(?:h(?:(?:ou)?rs?)?)?$/i,
};

// Word-to-number mappings
const WORD_NUMBERS: Record<string, number> = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
  'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
  'ten': 10, 'fifteen': 15, 'twenty': 20, 'thirty': 30,
  'forty': 40, 'forty-five': 45, 'fifty': 50, 'sixty': 60,
  'an': 1, 'a': 1,
};

// Special phrases
const SPECIAL_PHRASES: Record<string, number> = {
  'half hour': 30,
  'half an hour': 30,
  'quarter hour': 15,
  'quarter of an hour': 15,
  'an hour': 60,
  'a hour': 60,
  'a few minutes': 5,
  'a couple minutes': 2,
  'a couple of minutes': 2,
};

/**
 * Parse a natural language time string into minutes
 *
 * @param input - The time string to parse
 * @returns The number of minutes, or null if parsing failed
 */
export function parseTimeToMinutes(input: string): number | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Normalize input
  const normalized = input.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  // Check special phrases first
  for (const [phrase, minutes] of Object.entries(SPECIAL_PHRASES)) {
    if (normalized === phrase || normalized === phrase.replace(/\s+/g, ' ')) {
      return minutes;
    }
  }

  // Try plain number (interpret as minutes)
  const plainMatch = normalized.match(PATTERNS.plainNumber);
  if (plainMatch) {
    const value = parseFloat(plainMatch[1]);
    return Math.round(value);
  }

  // Try combined hours and minutes (e.g., "1h30m")
  const combinedMatch = normalized.match(PATTERNS.combined);
  if (combinedMatch) {
    const hours = parseFloat(combinedMatch[1]);
    const minutes = parseFloat(combinedMatch[2]);
    return Math.round(hours * 60 + minutes);
  }

  // Try hours only (e.g., "1h", "2 hours")
  const hoursMatch = normalized.match(PATTERNS.hoursOnly);
  if (hoursMatch) {
    const hours = parseFloat(hoursMatch[1]);
    return Math.round(hours * 60);
  }

  // Try minutes only (e.g., "25m", "25 minutes")
  const minutesMatch = normalized.match(PATTERNS.minutesOnly);
  if (minutesMatch) {
    const minutes = parseFloat(minutesMatch[1]);
    return Math.round(minutes);
  }

  // Try word numbers (e.g., "thirty minutes")
  for (const [word, value] of Object.entries(WORD_NUMBERS)) {
    const wordMinutesPattern = new RegExp(`^${word}\\s*(?:m(?:in(?:ute)?s?)?)?$`, 'i');
    const wordHoursPattern = new RegExp(`^${word}\\s*(?:h(?:(?:ou)?rs?)?)$`, 'i');

    if (wordMinutesPattern.test(normalized)) {
      return value;
    }
    if (wordHoursPattern.test(normalized)) {
      return value * 60;
    }
  }

  // Couldn't parse
  return null;
}

/**
 * Format minutes into a human-readable string
 *
 * @param minutes - The number of minutes
 * @returns A human-readable string (e.g., "1h 30m")
 */
export function formatMinutesNatural(minutes: number): string {
  if (minutes < 0) return '0m';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Validate if input looks like a time expression
 * Used for real-time input validation
 *
 * @param input - The input string to check
 * @returns true if it looks like a valid time expression
 */
export function isValidTimeExpression(input: string): boolean {
  return parseTimeToMinutes(input) !== null;
}

/**
 * Get suggestions for time input based on partial input
 *
 * @param input - The partial input string
 * @returns Array of suggestion strings
 */
export function getTimeSuggestions(input: string): string[] {
  const suggestions: string[] = [];
  const normalized = input.trim().toLowerCase();

  if (!normalized) {
    return ['15m', '30m', '1h', '1h 30m'];
  }

  // If starts with a number, suggest completions
  const numMatch = normalized.match(/^(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num <= 60) {
      suggestions.push(`${num}m`);
    }
    if (num <= 12) {
      suggestions.push(`${num}h`);
    }
    if (num <= 4) {
      suggestions.push(`${num}h 30m`);
    }
  }

  // Common quick options
  const quickOptions = ['5m', '10m', '15m', '25m', '30m', '45m', '1h', '1h 30m', '2h'];
  for (const opt of quickOptions) {
    if (opt.startsWith(normalized) && !suggestions.includes(opt)) {
      suggestions.push(opt);
    }
  }

  return suggestions.slice(0, 4);
}
