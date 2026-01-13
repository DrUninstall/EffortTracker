import { Task, Priority } from '@/types';

/**
 * Result from a binary search insertion algorithm
 */
export interface InsertionResult {
  insertionRank: number; // The rank to assign to the new task
  comparisons: number; // Number of comparisons made
}

/**
 * Comparison callback type: returns 1 if taskA > taskB (A is more important), -1 otherwise
 */
export type ComparisonCallback = (taskA: Task, taskB: Task) => Promise<1 | -1>;

/**
 * Find the correct rank for a new task using binary search comparisons
 * @param newTask The task being ranked
 * @param existingTasks Tasks in the same priority level, sorted by rank
 * @param compareCallback Function that asks user to compare two tasks
 * @returns The rank to assign and number of comparisons made
 */
export async function findInsertionPoint(
  newTask: Omit<Task, 'id' | 'created_at'>,
  existingTasks: Task[],
  compareCallback: ComparisonCallback
): Promise<InsertionResult> {
  // No existing tasks: assign default rank
  if (existingTasks.length === 0) {
    return { insertionRank: 100, comparisons: 0 };
  }

  // Single task: one comparison needed
  if (existingTasks.length === 1) {
    const comparison = await compareCallback(newTask as Task, existingTasks[0]);
    const insertionRank = comparison === 1 ? 50 : 150; // More important: 50, Less: 150
    return { insertionRank, comparisons: 1 };
  }

  // Binary search for insertion point
  let left = 0;
  let right = existingTasks.length - 1;
  let comparisons = 0;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    comparisons++;

    const comparison = await compareCallback(newTask as Task, existingTasks[mid]);

    if (comparison === 1) {
      // New task is more important, search left half
      right = mid - 1;
    } else {
      // New task is less important, search right half
      left = mid + 1;
    }
  }

  // left is now the insertion index
  // Determine rank based on surrounding tasks
  let insertionRank: number;

  if (left === 0) {
    // Insert at the beginning (most important)
    const firstRank = existingTasks[0].priorityRank ?? 100;
    insertionRank = Math.max(1, firstRank - 10);
  } else if (left >= existingTasks.length) {
    // Insert at the end (least important)
    const lastRank = existingTasks[existingTasks.length - 1].priorityRank ?? 100;
    insertionRank = lastRank + 10;
  } else {
    // Insert between two tasks
    const prevRank = existingTasks[left - 1].priorityRank ?? 100;
    const nextRank = existingTasks[left].priorityRank ?? 100;
    insertionRank = Math.floor((prevRank + nextRank) / 2);

    // If no space between ranks, trigger rebalancing
    if (insertionRank === prevRank || insertionRank === nextRank) {
      insertionRank = prevRank + 1;
    }
  }

  return { insertionRank, comparisons };
}

/**
 * Get tasks sorted by rank within a priority level
 * @param tasks All tasks
 * @param priority Priority level to filter by
 * @returns Tasks in the priority level, sorted by rank (unranked tasks last)
 */
export function getSortedTasksForPriority(
  tasks: Task[],
  priority: Priority
): Task[] {
  return tasks
    .filter((t) => t.priority === priority && !t.is_archived)
    .sort((a, b) => {
      const aRank = a.priorityRank ?? Infinity;
      const bRank = b.priorityRank ?? Infinity;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name); // Fallback to name
    });
}

/**
 * Rebalance ranks to prevent overflow and maintain gaps
 * Assigns new ranks with spacing of 100 (1, 101, 201, etc.)
 * @param tasks Tasks to rebalance (should be in desired order)
 * @returns Tasks with updated ranks
 */
export function rebalanceRanks(tasks: Task[]): Task[] {
  return tasks.map((task, index) => ({
    ...task,
    priorityRank: (index + 1) * 100,
  }));
}

/**
 * Check if tasks need rebalancing (minimum gap is too small)
 * @param tasks Tasks sorted by rank
 * @returns true if rebalancing is needed
 */
export function needsRebalancing(tasks: Task[]): boolean {
  const rankedTasks = tasks.filter((t) => t.priorityRank !== undefined);

  for (let i = 0; i < rankedTasks.length - 1; i++) {
    const currentRank = rankedTasks[i].priorityRank ?? 0;
    const nextRank = rankedTasks[i + 1].priorityRank ?? 0;

    if (nextRank - currentRank < 10) {
      return true;
    }
  }

  return false;
}

/**
 * Get the next available rank for a task (without comparisons)
 * Useful for skipping the ranking process
 * @param existingTasks Tasks in the same priority level
 * @returns A rank that places the task at the end
 */
export function getNextAvailableRank(existingTasks: Task[]): number {
  const rankedTasks = existingTasks.filter((t) => t.priorityRank !== undefined);

  if (rankedTasks.length === 0) {
    return 100;
  }

  const maxRank = Math.max(...rankedTasks.map((t) => t.priorityRank ?? 0));
  return maxRank + 100;
}

/**
 * Shift ranks of tasks to make room for insertion
 * @param tasks All tasks in the store
 * @param priority Priority level being modified
 * @param insertionRank The rank being inserted
 * @param excludeTaskId Task ID to exclude from shifting (the new task)
 * @returns Updated tasks with shifted ranks
 */
export function shiftRanksForInsertion(
  tasks: Task[],
  priority: Priority,
  insertionRank: number,
  excludeTaskId?: string
): Task[] {
  return tasks.map((task) => {
    // Skip if different priority or is the excluded task
    if (task.priority !== priority || task.id === excludeTaskId) {
      return task;
    }

    // Skip if task is unranked
    if (task.priorityRank === undefined) {
      return task;
    }

    // Shift tasks with rank >= insertionRank
    if (task.priorityRank >= insertionRank) {
      return {
        ...task,
        priorityRank: task.priorityRank + 1,
      };
    }

    return task;
  });
}
