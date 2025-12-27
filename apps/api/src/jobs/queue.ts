/**
 * Job Queue Module
 *
 * Provides a singleton pg-boss instance for background job processing.
 * Uses PostgreSQL as the backing store (no Redis required).
 *
 * Uses promise-based singleton pattern to prevent race conditions
 * when multiple concurrent calls to getJobQueue() are made.
 *
 * IMPORTANT: Handlers must be registered via initJobQueue() in index.ts
 * before any jobs can be processed. The queue uses a two-phase init:
 * 1. getJobQueue() - creates/starts the pg-boss instance
 * 2. Handler registration - creates queues and registers workers
 *
 * Jobs sent to non-existent queues will silently fail in pg-boss v10+.
 */
import { PgBoss } from "pg-boss";

// Singleton state using promise-based pattern to prevent race conditions
let initPromise: Promise<PgBoss> | null = null;
let boss: PgBoss | null = null;

// Track whether handlers have been registered (queues created)
let handlersRegistered = false;
let handlersRegistrationPromise: Promise<void> | null = null;

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

  // Register error handler to prevent silent failures
  boss.on("error", (error) => {
    console.error("[pg-boss] Error:", error);
  });

  // Log when workers are started/stopped for debugging
  boss.on("wip", (data) => {
    if (data.length > 0) {
      console.log(`[pg-boss] Work in progress: ${data.length} active jobs`);
    }
  });

  await boss.start();
  console.log("[pg-boss] Job queue started");
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
 * Gets the job queue, ensuring handlers are registered (queues exist).
 *
 * This should be used by routes that send jobs, as it waits for handler
 * registration to complete. In pg-boss v10+, queues must exist before
 * jobs can be sent to them.
 *
 * @returns Promise resolving to the PgBoss instance with queues ready
 * @throws Error if handlers are not being registered (call setHandlersRegistrationPromise first)
 */
export async function getJobQueueReady(): Promise<PgBoss> {
  const queue = await getJobQueue();

  // If handlers are already registered, return immediately
  if (handlersRegistered) {
    return queue;
  }

  // Wait for handler registration to complete
  if (handlersRegistrationPromise) {
    await handlersRegistrationPromise;
    return queue;
  }

  // If no registration promise exists, log a warning but continue
  // This can happen in edge cases or during testing
  console.warn(
    "[pg-boss] getJobQueueReady called before setHandlersRegistrationPromise. " +
      "Jobs may fail if queues don't exist."
  );
  return queue;
}

/**
 * Sets the promise that tracks handler registration.
 * Called from index.ts when initJobQueue starts.
 *
 * @param promise - Promise that resolves when all handlers are registered
 */
export function setHandlersRegistrationPromise(promise: Promise<void>): void {
  handlersRegistrationPromise = promise.then(() => {
    handlersRegistered = true;
    console.log("[pg-boss] All job handlers registered");
  });
}

/**
 * Checks if handlers have been registered.
 * Useful for debugging and health checks.
 */
export function areHandlersRegistered(): boolean {
  return handlersRegistered;
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
    handlersRegistered = false;
    handlersRegistrationPromise = null;
  }
}

/**
 * Resets the job queue singleton state.
 * Primarily for testing purposes.
 */
export function resetJobQueue(): void {
  boss = null;
  initPromise = null;
  handlersRegistered = false;
  handlersRegistrationPromise = null;
}
