/**
 * Sync API Data Source Job Handler
 *
 * Background job handler that fetches data from external APIs and
 * ingests it into data sources. Can be triggered manually or by
 * the scheduled sync orchestrator.
 *
 * The handler:
 * 1. Fetches the data source from the database
 * 2. Validates it's an API type with ApiFetchConfig
 * 3. Calls fetchAndIngest to fetch and ingest data
 * 4. The fetchAndIngest function handles updating lastSyncAt and lastSyncStatus
 */

import type { PgBoss } from "pg-boss";
import { eq } from "drizzle-orm";
import type { SyncFrequency, DataSourceConfig, ApiFetchConfig } from "@repo/database/schema";
import { fetchAndIngest, type FetchResult } from "../../services/api-fetch-service.js";
import { db, dataSources } from "../../services/db.js";

/**
 * Job name constant for sync-api-data-source jobs.
 */
export const SYNC_API_DATA_SOURCE_JOB = "sync-api-data-source";

/**
 * Data payload for sync-api-data-source jobs.
 */
export interface SyncApiDataSourceJob {
  /** The data source ID to sync */
  dataSourceId: string;

  /** Optional user ID who triggered the sync */
  userId?: string;

  /** How the sync was triggered */
  triggeredBy: "schedule" | "manual";
}

/**
 * Result of a sync-api-data-source operation.
 */
export interface SyncApiDataSourceResult extends FetchResult {}

/**
 * Sync interval values in milliseconds for each sync frequency.
 */
export const SYNC_INTERVALS: Record<SyncFrequency, number> = {
  manual: Infinity,
  "1h": 3600000, // 1 hour
  "6h": 21600000, // 6 hours
  "24h": 86400000, // 24 hours
  "7d": 604800000, // 7 days
};

/**
 * Checks if a sync is due based on the sync frequency and last sync time.
 *
 * @param frequency - The configured sync frequency
 * @param lastSyncAt - The timestamp of the last sync (null if never synced)
 * @returns True if a sync is due, false otherwise
 */
export function isSyncDue(frequency: SyncFrequency, lastSyncAt: Date | null): boolean {
  // Manual syncs are never automatically due
  if (frequency === "manual") {
    return false;
  }

  // If never synced, it's due
  if (!lastSyncAt) {
    return true;
  }

  // Check if enough time has passed since last sync
  const interval = SYNC_INTERVALS[frequency];
  const elapsed = Date.now() - lastSyncAt.getTime();
  return elapsed >= interval;
}

/**
 * Creates the sync-api-data-source job handler function.
 *
 * This factory pattern allows for dependency injection in tests.
 *
 * @returns The job handler function
 */
export function createSyncApiDataSourceHandler(): (
  data: SyncApiDataSourceJob
) => Promise<SyncApiDataSourceResult> {
  return async (data: SyncApiDataSourceJob): Promise<SyncApiDataSourceResult> => {
    const { dataSourceId, triggeredBy } = data;

    console.log(
      `[sync-api-data-source] Starting sync for data source: ${dataSourceId}, triggered by: ${triggeredBy}`
    );

    // Fetch the data source from database
    const [dataSource] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, dataSourceId))
      .limit(1);

    if (!dataSource) {
      throw new Error(`Data source not found: ${dataSourceId}`);
    }

    // Validate it's an API type data source
    if (dataSource.type !== "api") {
      throw new Error(
        `Data source is not an API type: ${dataSourceId} (type: ${dataSource.type})`
      );
    }

    // Validate it has apiFetch configuration
    const config = dataSource.config as DataSourceConfig | null;
    const apiFetchConfig = config?.apiFetch;

    if (!apiFetchConfig) {
      throw new Error(
        `Data source has no API fetch configuration: ${dataSourceId}`
      );
    }

    // Call fetchAndIngest to fetch and ingest data
    // This function handles updating lastSyncAt and lastSyncStatus
    const result = await fetchAndIngest(dataSourceId, apiFetchConfig);

    console.log(
      `[sync-api-data-source] Completed sync for data source: ${dataSourceId}, ` +
        `success: ${result.success}, rows: ${result.rowCount}, duration: ${result.duration}ms`
    );

    if (!result.success) {
      console.error(
        `[sync-api-data-source] Sync failed for data source: ${dataSourceId}, error: ${result.error}`
      );
    }

    return result;
  };
}

/**
 * Registers the sync-api-data-source job handler with pg-boss.
 *
 * @param boss - The pg-boss instance to register with
 */
export async function registerSyncApiDataSourceHandler(boss: PgBoss): Promise<void> {
  const handler = createSyncApiDataSourceHandler();

  // Create the queue before registering the worker (required in pg-boss v10+)
  await boss.createQueue(SYNC_API_DATA_SOURCE_JOB);

  boss.work<SyncApiDataSourceJob, SyncApiDataSourceResult>(
    SYNC_API_DATA_SOURCE_JOB,
    async (job) => {
      const data = job.data;

      console.log(
        `[Job ${job.id}] Starting sync-api-data-source for: ${data.dataSourceId}`
      );

      try {
        const result = await handler(data);

        console.log(
          `[Job ${job.id}] Sync completed: success=${result.success}, rows=${result.rowCount}, duration=${result.duration}ms`
        );

        return result;
      } catch (error) {
        console.error(
          `[Job ${job.id}] Sync failed:`,
          error instanceof Error ? error.message : error
        );
        throw error;
      }
    }
  );
}
