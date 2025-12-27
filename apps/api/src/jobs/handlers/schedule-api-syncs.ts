/**
 * Schedule API Syncs Job Handler
 *
 * Scheduled job orchestrator that periodically checks API data sources
 * and enqueues sync jobs for those that are due. Runs every 15 minutes
 * to ensure syncs happen at their configured intervals.
 *
 * The handler:
 * 1. Queries all API data sources with non-manual sync frequency
 * 2. Checks if sync is due based on lastSyncAt and syncFrequency
 * 3. Enqueues sync-api-data-source jobs for due sources
 * 4. Uses singularKey to avoid duplicate jobs
 * 5. Staggers job start times to avoid thundering herd
 */

import type { PgBoss } from "pg-boss";
import { eq } from "drizzle-orm";
import type { DataSourceConfig, ApiFetchConfig, SyncFrequency } from "@repo/database/schema";
import { db, dataSources } from "../../services/db.js";
import { SYNC_API_DATA_SOURCE_JOB, isSyncDue, type SyncApiDataSourceJob } from "./sync-api-data-source.js";

/**
 * Job name constant for schedule-api-syncs jobs.
 */
export const SCHEDULE_API_SYNCS_JOB = "schedule-api-syncs";

/**
 * Cron expression for the scheduler: runs every 15 minutes.
 */
export const SCHEDULE_API_SYNCS_CRON = "*/15 * * * *";

/**
 * Stagger interval between jobs in milliseconds.
 * Jobs are staggered by 5 seconds each to avoid overwhelming external APIs.
 */
const STAGGER_INTERVAL_MS = 5000;

/**
 * Result of a schedule-api-syncs operation.
 */
export interface ScheduleApiSyncsResult {
  /** Number of data sources checked */
  checked: number;

  /** Number of sync jobs enqueued */
  enqueued: number;

  /** Number of data sources skipped (not due or already queued) */
  skipped: number;

  /** Number of errors encountered while enqueuing */
  errors: number;
}

/**
 * Creates the schedule-api-syncs job handler function.
 *
 * @param boss - The pg-boss instance for enqueuing jobs
 * @returns The job handler function
 */
export function createScheduleApiSyncsHandler(
  boss: PgBoss
): () => Promise<ScheduleApiSyncsResult> {
  return async (): Promise<ScheduleApiSyncsResult> => {
    console.log(`[schedule-api-syncs] Starting scheduled sync check`);

    const result: ScheduleApiSyncsResult = {
      checked: 0,
      enqueued: 0,
      skipped: 0,
      errors: 0,
    };

    // Query all API type data sources
    const apiDataSources = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.type, "api"));

    console.log(
      `[schedule-api-syncs] Found ${apiDataSources.length} API data sources to check`
    );

    // Filter to those with non-manual sync frequency and valid config
    const eligibleSources = apiDataSources.filter((ds) => {
      const config = ds.config as DataSourceConfig | null;
      const apiFetch = config?.apiFetch;

      if (!apiFetch) {
        return false;
      }

      // Skip manual sync frequency
      if (apiFetch.syncFrequency === "manual") {
        return false;
      }

      return true;
    });

    result.checked = eligibleSources.length;

    // Process each eligible source
    for (let i = 0; i < eligibleSources.length; i++) {
      const ds = eligibleSources[i]!;
      const config = ds.config as DataSourceConfig;
      const apiFetch = config.apiFetch as ApiFetchConfig;

      try {
        // Check if sync is due
        const lastSyncAt = apiFetch.lastSyncAt
          ? new Date(apiFetch.lastSyncAt)
          : null;

        if (!isSyncDue(apiFetch.syncFrequency as SyncFrequency, lastSyncAt)) {
          result.skipped++;
          continue;
        }

        // Calculate staggered start time
        const startAfter = new Date(Date.now() + i * STAGGER_INTERVAL_MS);

        // Enqueue the sync job with singularKey to prevent duplicates
        const jobData: SyncApiDataSourceJob = {
          dataSourceId: ds.id,
          triggeredBy: "schedule",
        };

        const jobId = await boss.send(
          SYNC_API_DATA_SOURCE_JOB,
          jobData,
          {
            singletonKey: `sync-api-${ds.id}`,
            startAfter: startAfter.toISOString(),
          }
        );

        if (jobId) {
          result.enqueued++;
          console.log(
            `[schedule-api-syncs] Enqueued sync job for ${ds.id} (job: ${jobId})`
          );
        } else {
          // Job already exists (singularKey dedup)
          result.skipped++;
          console.log(
            `[schedule-api-syncs] Skipped ${ds.id} - job already pending`
          );
        }
      } catch (error) {
        result.errors++;
        console.error(
          `[schedule-api-syncs] Error enqueuing job for ${ds.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(
      `[schedule-api-syncs] Completed: checked=${result.checked}, enqueued=${result.enqueued}, skipped=${result.skipped}, errors=${result.errors}`
    );

    return result;
  };
}

/**
 * Registers the schedule-api-syncs job handler with pg-boss.
 *
 * This sets up both the worker to handle the job and a cron schedule
 * to run the job every 15 minutes.
 *
 * @param boss - The pg-boss instance to register with
 */
export async function registerScheduleApiSyncsHandler(boss: PgBoss): Promise<void> {
  const handler = createScheduleApiSyncsHandler(boss);

  // Create the queue before registering the worker (required in pg-boss v10+)
  await boss.createQueue(SCHEDULE_API_SYNCS_JOB);

  // pg-boss v10+ passes an array of jobs to the handler (batch processing)
  // We process jobs sequentially and return results for each
  await boss.work<Record<string, never>, ScheduleApiSyncsResult[]>(
    SCHEDULE_API_SYNCS_JOB,
    async (jobs) => {
      const results: ScheduleApiSyncsResult[] = [];

      for (const job of jobs) {
        console.log(`[Job ${job.id}] Running schedule-api-syncs`);

        try {
          const result = await handler();

          console.log(
            `[Job ${job.id}] Schedule-api-syncs completed: enqueued=${result.enqueued}, skipped=${result.skipped}`
          );

          results.push(result);
        } catch (error) {
          console.error(
            `[Job ${job.id}] Schedule-api-syncs failed:`,
            error instanceof Error ? error.message : error
          );
          throw error;
        }
      }

      return results;
    }
  );

  // Schedule the cron job to run every 15 minutes
  await boss.schedule(
    SCHEDULE_API_SYNCS_JOB,
    SCHEDULE_API_SYNCS_CRON,
    {},
    {
      tz: "UTC",
    }
  );

  console.log(
    `[schedule-api-syncs] Registered handler and scheduled cron: ${SCHEDULE_API_SYNCS_CRON}`
  );
}
