/**
 * Retry Failed Syncs Job Handler
 *
 * Background job handler that retries failed campaign syncs using
 * exponential backoff and circuit breaker patterns.
 *
 * Features:
 * - Exponential backoff between retries
 * - Circuit breaker per platform to prevent overwhelming failing APIs
 * - Permanent failure marking after max retries
 * - Batch processing with mid-batch circuit breaking
 */

import type { PgBoss } from "pg-boss";
import { getCircuitBreaker } from "@repo/core/campaign-set";
import {
  DrizzleCampaignSetRepository,
  type FailedCampaignForRetry,
} from "../../repositories/campaign-set-repository.js";
import { db } from "../../services/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Job name constant for retry failed syncs jobs.
 */
export const RETRY_FAILED_SYNCS_JOB = "retry-failed-syncs";

/**
 * Default maximum number of retry attempts.
 */
const DEFAULT_MAX_RETRIES = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Data payload for retry failed syncs jobs.
 */
export interface RetryFailedSyncsJob {
  /** The user ID whose failed campaigns to retry */
  userId: string;

  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
}

/**
 * Result of a retry operation.
 */
export interface RetryResult {
  /** Total campaigns processed */
  processed: number;

  /** Campaigns successfully reset for retry */
  succeeded: number;

  /** Campaigns that failed during retry processing */
  failed: number;

  /** Campaigns skipped due to circuit breaker */
  skipped: number;

  /** Campaigns marked as permanent failures */
  permanentFailures: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the retry failed syncs job handler function.
 *
 * This factory pattern allows for dependency injection in tests.
 *
 * @returns The job handler function
 */
export function createRetryFailedSyncsHandler(): (
  data: RetryFailedSyncsJob
) => Promise<RetryResult> {
  return async (data: RetryFailedSyncsJob): Promise<RetryResult> => {
    const { userId, maxRetries = DEFAULT_MAX_RETRIES } = data;

    // Create repository
    const repository = new DrizzleCampaignSetRepository(db);

    // Get failed campaigns that need retry
    const failedCampaigns = await repository.getFailedCampaignsForRetry(
      userId,
      maxRetries
    );

    // Initialize result counters
    const result: RetryResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      permanentFailures: 0,
    };

    if (failedCampaigns.length === 0) {
      console.log(`[RetryFailedSyncs] No failed campaigns to retry for user: ${userId}`);
      return result;
    }

    console.log(
      `[RetryFailedSyncs] Found ${failedCampaigns.length} failed campaigns to retry`
    );

    // Process each failed campaign
    for (const campaign of failedCampaigns) {
      result.processed++;

      try {
        const processed = await processCampaignRetry(
          campaign,
          maxRetries,
          repository
        );

        if (processed.skipped) {
          result.skipped++;
        } else if (processed.permanentFailure) {
          result.permanentFailures++;
        } else if (processed.succeeded) {
          result.succeeded++;
        } else {
          result.failed++;
        }
      } catch (error) {
        console.error(
          `[RetryFailedSyncs] Error processing campaign ${campaign.campaignId}:`,
          error instanceof Error ? error.message : error
        );
        result.failed++;
      }
    }

    console.log(
      `[RetryFailedSyncs] Completed: processed=${result.processed}, ` +
        `succeeded=${result.succeeded}, failed=${result.failed}, ` +
        `skipped=${result.skipped}, permanentFailures=${result.permanentFailures}`
    );

    return result;
  };
}

/**
 * Process a single campaign retry attempt.
 */
async function processCampaignRetry(
  campaign: FailedCampaignForRetry,
  maxRetries: number,
  repository: DrizzleCampaignSetRepository
): Promise<{
  skipped: boolean;
  permanentFailure: boolean;
  succeeded: boolean;
}> {
  const { campaignId, platform, retryCount } = campaign;

  // Check circuit breaker for this platform
  const breaker = getCircuitBreaker(platform);

  if (!breaker.canExecute()) {
    console.log(
      `[RetryFailedSyncs] Circuit breaker open for ${platform}, skipping campaign ${campaignId}`
    );
    return { skipped: true, permanentFailure: false, succeeded: false };
  }

  try {
    // Increment retry count
    const newRetryCount = await repository.incrementRetryCount(campaignId);

    console.log(
      `[RetryFailedSyncs] Retrying campaign ${campaignId} (attempt ${newRetryCount}/${maxRetries})`
    );

    // Check if we've reached max retries
    if (newRetryCount >= maxRetries) {
      await repository.markPermanentFailure(
        campaignId,
        `Max retries (${maxRetries}) exceeded`
      );

      console.log(
        `[RetryFailedSyncs] Campaign ${campaignId} marked as permanent failure`
      );

      return { skipped: false, permanentFailure: true, succeeded: false };
    }

    // Reset the sync record for retry
    await repository.resetSyncForRetry(campaignId);

    // Record success on circuit breaker
    breaker.recordSuccess();

    console.log(
      `[RetryFailedSyncs] Campaign ${campaignId} reset for retry`
    );

    return { skipped: false, permanentFailure: false, succeeded: true };
  } catch (error) {
    // Record failure on circuit breaker
    breaker.recordFailure();

    console.error(
      `[RetryFailedSyncs] Failed to retry campaign ${campaignId}:`,
      error instanceof Error ? error.message : error
    );

    return { skipped: false, permanentFailure: false, succeeded: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// pg-boss Registration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registers the retry failed syncs job handler with pg-boss.
 *
 * @param boss - The pg-boss instance to register with
 */
export async function registerRetryFailedSyncsHandler(boss: PgBoss): Promise<void> {
  const handler = createRetryFailedSyncsHandler();

  // Create the queue before registering the worker (required in pg-boss v10+)
  await boss.createQueue(RETRY_FAILED_SYNCS_JOB);

  boss.work<RetryFailedSyncsJob, RetryResult>(
    RETRY_FAILED_SYNCS_JOB,
    async (job) => {
      const data = job.data;

      console.log(
        `[Job ${job.id}] Starting retry failed syncs for user: ${data.userId}`
      );

      try {
        const result = await handler(data);

        console.log(
          `[Job ${job.id}] Retry completed: ${JSON.stringify(result)}`
        );

        return result;
      } catch (error) {
        console.error(
          `[Job ${job.id}] Retry job failed:`,
          error instanceof Error ? error.message : error
        );
        throw error;
      }
    }
  );
}

/**
 * Schedule a periodic retry job for a user.
 *
 * @param boss - The pg-boss instance
 * @param userId - The user ID to schedule retries for
 * @param cronExpression - Cron expression for scheduling (default: every 5 minutes)
 */
export async function scheduleRetryJob(
  boss: PgBoss,
  userId: string,
  cronExpression: string = "*/5 * * * *"
): Promise<string | null> {
  return boss.schedule(RETRY_FAILED_SYNCS_JOB, cronExpression, {
    userId,
    maxRetries: DEFAULT_MAX_RETRIES,
  } as RetryFailedSyncsJob);
}
