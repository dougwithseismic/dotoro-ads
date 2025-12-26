/**
 * Job Queue Module
 *
 * Provides a singleton pg-boss instance for background job processing.
 * Uses PostgreSQL as the backing store (no Redis required).
 *
 * Uses promise-based singleton pattern to prevent race conditions
 * when multiple concurrent calls to getJobQueue() are made.
 */
import { PgBoss } from "pg-boss";

// Singleton state using promise-based pattern to prevent race conditions
let initPromise: Promise<PgBoss> | null = null;
let boss: PgBoss | null = null;

/**
 * Default job queue configuration.
 */
const DEFAULT_CONFIG = {
  // Retry configuration
  retryLimit: 3,
  retryDelay: 30, // 30 seconds between retries

  // Job expiration
  expireInHours: 24, // Jobs expire after 24 hours

  // Archive completed jobs for 7 days
  archiveCompletedAfterSeconds: 60 * 60 * 24 * 7,

  // Monitor interval for maintenance
  monitorStateIntervalSeconds: 30,
};

/**
 * Internal function to initialize the job queue.
 * Called only once, protected by the promise-based singleton.
 */
async function initializeQueue(): Promise<PgBoss> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is required for job queue"
    );
  }

  boss = new PgBoss({
    connectionString,
    ...DEFAULT_CONFIG,
  });

  await boss.start();
  return boss;
}

/**
 * Gets the job queue singleton instance.
 * Creates and starts the instance on first call.
 *
 * Uses promise-based singleton pattern to prevent race conditions
 * when multiple concurrent calls are made before initialization completes.
 *
 * @returns Promise resolving to the PgBoss instance
 */
export function getJobQueue(): Promise<PgBoss> {
  if (!initPromise) {
    initPromise = initializeQueue();
  }
  return initPromise;
}

/**
 * Stops the job queue gracefully.
 * Safe to call even if no instance exists.
 */
export async function stopJobQueue(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
    initPromise = null;
  }
}

/**
 * Resets the job queue singleton state.
 * Primarily for testing purposes.
 */
export function resetJobQueue(): void {
  boss = null;
  initPromise = null;
}
