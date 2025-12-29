/**
 * Sync Campaign Set Job Handler
 *
 * Background job handler that syncs a campaign set to the target platform.
 * Extracted from the sync endpoint to enable async processing.
 *
 * Features:
 * - Circuit breaker integration to prevent overwhelming failing APIs
 * - Automatic failure recording for retry logic
 */
import { PgBoss } from "pg-boss";
import { eq, and } from "drizzle-orm";
import type { SyncCampaignSetJob, SyncResult } from "../types.js";
import { emitSyncProgress } from "../events.js";
import { db, adAccounts } from "../../services/db.js";
import { getRedditOAuthService } from "../../services/reddit/oauth.js";
import { RedditApiClient } from "@repo/reddit-ads";
import {
  DefaultCampaignSetSyncService,
  RedditAdsAdapter,
  getCircuitBreaker,
  type CampaignSetPlatformAdapter,
} from "@repo/core/campaign-set";
import { DrizzleCampaignSetRepository } from "../../repositories/campaign-set-repository.js";

/**
 * Job name constant for sync campaign set jobs.
 */
export const SYNC_CAMPAIGN_SET_JOB = "sync-campaign-set";

/**
 * Creates the sync campaign set job handler function.
 *
 * This factory pattern allows for dependency injection in tests.
 *
 * @returns The job handler function
 */
export function createSyncCampaignSetHandler(): (
  data: SyncCampaignSetJob
) => Promise<SyncResult> {
  return async (data: SyncCampaignSetJob): Promise<SyncResult> => {
    const { campaignSetId, userId, adAccountId, fundingInstrumentId, platform } =
      data;

    // Validate platform support
    if (platform !== "reddit") {
      throw new Error(
        `Unsupported platform: ${platform}. Currently only Reddit is supported.`
      );
    }

    // Check circuit breaker before attempting sync
    const breaker = getCircuitBreaker(platform);
    if (!breaker.canExecute()) {
      console.log(
        `[SyncCampaignSet] Circuit breaker open for ${platform}, skipping sync for campaign set: ${campaignSetId}`
      );
      throw new Error(
        `Circuit breaker open for ${platform}. Service is temporarily unavailable. Sync will be retried automatically.`
      );
    }

    // Validate ad account belongs to user
    const [adAccount] = await db
      .select()
      .from(adAccounts)
      .where(and(eq(adAccounts.id, adAccountId), eq(adAccounts.userId, userId)))
      .limit(1);

    if (!adAccount) {
      throw new Error("Invalid or unauthorized ad account");
    }

    // Get OAuth tokens
    const oauthService = getRedditOAuthService();
    const tokens = await oauthService.getValidTokens(adAccountId);

    if (!tokens) {
      throw new Error(
        "OAuth tokens not available or expired. Please re-authenticate with Reddit."
      );
    }

    // Create Reddit API client and adapter
    const redditClient = new RedditApiClient({
      accessToken: tokens.accessToken,
    });

    const redditAdapter = new RedditAdsAdapter({
      client: redditClient,
      accountId: adAccount.accountId,  // Use Reddit's actual account_id, not our internal UUID
      fundingInstrumentId,
    });

    // Create adapters map
    const adapters = new Map<string, CampaignSetPlatformAdapter>();
    adapters.set("reddit", redditAdapter);

    // Create repository and sync service
    const repository = new DrizzleCampaignSetRepository(db);
    const syncService = new DefaultCampaignSetSyncService(adapters, repository);

    try {
      // Execute sync
      const result = await syncService.syncCampaignSet(campaignSetId);

      // Record success or failure on circuit breaker based on result
      if (result.failed > 0 && result.synced === 0) {
        // All campaigns failed - record as failure
        breaker.recordFailure();
        console.log(
          `[SyncCampaignSet] All campaigns failed for ${campaignSetId}, recording circuit breaker failure`
        );
      } else if (result.synced > 0) {
        // At least some campaigns succeeded - record as success
        breaker.recordSuccess();
      }

      // Transform result to match expected format
      return {
        synced: result.synced,
        failed: result.failed,
        skipped: result.skipped,
        errors: result.errors.map((error) => ({
          campaignId: error.campaignId,
          message: error.message,
        })),
      };
    } catch (error) {
      // Record failure on circuit breaker for unhandled errors
      breaker.recordFailure();
      console.log(
        `[SyncCampaignSet] Sync failed for ${campaignSetId}, recording circuit breaker failure`
      );
      throw error;
    }
  };
}

/**
 * Extended handler function type that includes job ID for event emission.
 */
export type SyncCampaignSetHandlerWithEvents = (
  data: SyncCampaignSetJob,
  jobId: string
) => Promise<SyncResult>;

/**
 * Creates the sync campaign set job handler function with event emission.
 *
 * This version emits progress events for SSE streaming.
 *
 * @returns The job handler function that emits events
 */
export function createSyncCampaignSetHandlerWithEvents(): SyncCampaignSetHandlerWithEvents {
  const baseHandler = createSyncCampaignSetHandler();

  return async (
    data: SyncCampaignSetJob,
    jobId: string
  ): Promise<SyncResult> => {
    const { campaignSetId } = data;

    // Emit starting event
    emitSyncProgress({
      jobId,
      campaignSetId,
      type: "progress",
      data: { synced: 0, failed: 0, total: 0 },
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await baseHandler(data);

      // Emit individual campaign results
      // Note: The current sync service doesn't expose per-campaign progress
      // So we emit the final counts. For true real-time updates, the sync
      // service would need to accept a progress callback.

      // Emit completion event
      emitSyncProgress({
        jobId,
        campaignSetId,
        type: "completed",
        data: {
          synced: result.synced,
          failed: result.failed,
          total: result.synced + result.failed + result.skipped,
        },
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      // Emit error event
      emitSyncProgress({
        jobId,
        campaignSetId,
        type: "error",
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  };
}

/**
 * Registers the sync campaign set job handler with pg-boss.
 *
 * @param boss - The pg-boss instance to register with
 */
export async function registerSyncCampaignSetHandler(boss: PgBoss): Promise<void> {
  const handler = createSyncCampaignSetHandlerWithEvents();

  // Create the queue before registering the worker (required in pg-boss v10+)
  await boss.createQueue(SYNC_CAMPAIGN_SET_JOB);

  // pg-boss v10+ passes an array of jobs to the handler (batch processing)
  // We process jobs sequentially and return results for each
  await boss.work<SyncCampaignSetJob, SyncResult[]>(
    SYNC_CAMPAIGN_SET_JOB,
    async (jobs) => {
      const results: SyncResult[] = [];

      for (const job of jobs) {
        const data = job.data;

        console.log(
          `[Job ${job.id}] Starting sync for campaign set: ${data.campaignSetId}`
        );

        try {
          const result = await handler(data, job.id);

          console.log(
            `[Job ${job.id}] Sync completed: synced=${result.synced}, failed=${result.failed}, skipped=${result.skipped}`
          );

          results.push(result);
        } catch (error) {
          console.error(
            `[Job ${job.id}] Sync failed:`,
            error instanceof Error ? error.message : error
          );
          throw error;
        }
      }

      return results;
    }
  );
}
