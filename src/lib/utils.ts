import { clsx, type ClassValue } from 'clsx';

/**
 * Utility function for merging class names
 * Used by shadcn/ui components
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
