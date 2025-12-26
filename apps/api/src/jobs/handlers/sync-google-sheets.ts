/**
 * Sync Google Sheets Job Handler
 *
 * Background job handler that fetches data from Google Sheets and
 * ingests it into data sources. Can be triggered manually or by
 * the scheduled sync orchestrator.
 *
 * The handler:
 * 1. Fetches the data source from the database
 * 2. Validates it's a google-sheets type with GoogleSheetsConfig
 * 3. Retrieves OAuth credentials for the user
 * 4. Calls fetchAndIngestGoogleSheets to fetch and ingest data
 * 5. The fetch function handles updating lastSyncAt and lastSyncStatus
 */

import type { PgBoss } from "pg-boss";
import { eq } from "drizzle-orm";
import type { SyncFrequency, DataSourceConfig, GoogleSheetsConfig } from "@repo/database/schema";
import { fetchAndIngestGoogleSheets, type FetchResult } from "../../services/google-sheets-service.js";
import { getGoogleCredentials } from "../../services/oauth-tokens.js";
import { db, dataSources } from "../../services/db.js";

/**
 * Job name constant for sync-google-sheets jobs.
 */
export const SYNC_GOOGLE_SHEETS_JOB = "sync-google-sheets";

/**
 * Data payload for sync-google-sheets jobs.
 */
export interface SyncGoogleSheetsJob {
  /** The data source ID to sync */
  dataSourceId: string;

  /** The user ID who owns the data source (required for OAuth) */
  userId: string;

  /** How the sync was triggered */
  triggeredBy: "schedule" | "manual";
}

/**
 * Result of a sync-google-sheets operation.
 */
export interface SyncGoogleSheetsResult extends FetchResult {}

/**
 * Sync interval values in milliseconds for each sync frequency.
 * Reused from sync-api-data-source for consistency.
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
 * Creates the sync-google-sheets job handler function.
 *
 * This factory pattern allows for dependency injection in tests.
 *
 * @returns The job handler function
 */
export function createSyncGoogleSheetsHandler(): (
  data: SyncGoogleSheetsJob
) => Promise<SyncGoogleSheetsResult> {
  return async (data: SyncGoogleSheetsJob): Promise<SyncGoogleSheetsResult> => {
    const { dataSourceId, userId, triggeredBy } = data;

    console.log(
      `[sync-google-sheets] Starting sync for data source: ${dataSourceId}, triggered by: ${triggeredBy}`
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

    // Validate it's a google-sheets type data source
    if (dataSource.type !== "google-sheets") {
      throw new Error(
        `Data source is not a google-sheets type: ${dataSourceId} (type: ${dataSource.type})`
      );
    }

    // Validate it has googleSheets configuration
    const config = dataSource.config as DataSourceConfig | null;
    const googleSheetsConfig = config?.googleSheets;

    if (!googleSheetsConfig) {
      throw new Error(
        `Data source has no Google Sheets configuration: ${dataSourceId}`
      );
    }

    // Get OAuth credentials for the user
    const credentials = await getGoogleCredentials(userId);

    if (!credentials) {
      throw new Error(
        `No Google credentials found for user: ${userId}. User must connect their Google account.`
      );
    }

    // Call fetchAndIngestGoogleSheets to fetch and ingest data
    // This function handles updating lastSyncAt and lastSyncStatus
    const result = await fetchAndIngestGoogleSheets(
      dataSourceId,
      googleSheetsConfig,
      credentials
    );

    console.log(
      `[sync-google-sheets] Completed sync for data source: ${dataSourceId}, ` +
        `success: ${result.success}, rows: ${result.rowCount}, duration: ${result.duration}ms`
    );

    if (!result.success) {
      console.error(
        `[sync-google-sheets] Sync failed for data source: ${dataSourceId}, error: ${result.error}`
      );
    }

    return result;
  };
}

/**
 * Registers the sync-google-sheets job handler with pg-boss.
 *
 * @param boss - The pg-boss instance to register with
 */
export async function registerSyncGoogleSheetsHandler(boss: PgBoss): Promise<void> {
  const handler = createSyncGoogleSheetsHandler();

  // Create the queue before registering the worker (required in pg-boss v10+)
  await boss.createQueue(SYNC_GOOGLE_SHEETS_JOB);

  boss.work<SyncGoogleSheetsJob, SyncGoogleSheetsResult>(
    SYNC_GOOGLE_SHEETS_JOB,
    async (job) => {
      const data = job.data;

      console.log(
        `[Job ${job.id}] Starting sync-google-sheets for: ${data.dataSourceId}`
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
