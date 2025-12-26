/**
 * Sync From Platform Job Handler
 *
 * Background job handler that pulls campaign status changes from ad platforms
 * back to the local database. This enables bidirectional sync.
 *
 * The handler:
 * 1. Gets all synced campaigns for the ad account
 * 2. Fetches current status from the platform
 * 3. Compares local vs platform status
 * 4. Either updates local (platform wins) or marks conflict
 */

import type { PgBoss } from "pg-boss";
import { eq, and } from "drizzle-orm";
import type { SyncFromPlatformJob, SyncFromPlatformResult } from "../types.js";
import { db, adAccounts } from "../../services/db.js";
import { getRedditOAuthService } from "../../services/reddit/oauth.js";
import { RedditApiClient } from "@repo/reddit-ads";
import { RedditPoller } from "@repo/core/campaign-set";
import type { PlatformCampaignStatus, SyncedCampaign, ConflictDetails } from "@repo/core/campaign-set";
import { DrizzleCampaignSetRepository } from "../../repositories/campaign-set-repository.js";

/**
 * Job name constant for sync-from-platform jobs.
 */
export const SYNC_FROM_PLATFORM_JOB = "sync-from-platform";

/**
 * Map platform status to local status for comparison
 */
function mapPlatformStatusToLocal(platformStatus: string): string {
  const statusMap: Record<string, string> = {
    active: "active",
    paused: "paused",
    completed: "completed",
    deleted: "error",
    error: "error",
  };
  return statusMap[platformStatus] || "error";
}

/**
 * Check if local was modified after last sync
 *
 * A campaign is considered modified if its updatedAt is after lastSyncedAt.
 * Edge case: If lastSyncedAt is epoch (0), the campaign was never actually synced,
 * so there can be no conflict - platform is authoritative.
 */
function wasLocalModifiedAfterSync(campaign: SyncedCampaign): boolean {
  // If never synced (epoch time), there's no conflict possible - platform wins
  if (campaign.lastSyncedAt.getTime() === 0) {
    return false;
  }
  return campaign.localUpdatedAt > campaign.lastSyncedAt;
}

/**
 * Creates the sync-from-platform job handler function.
 *
 * This factory pattern allows for dependency injection in tests.
 *
 * @returns The job handler function
 */
export function createSyncFromPlatformHandler(): (
  data: SyncFromPlatformJob
) => Promise<SyncFromPlatformResult> {
  return async (data: SyncFromPlatformJob): Promise<SyncFromPlatformResult> => {
    const { adAccountId, userId, platform } = data;

    // Validate platform support
    if (platform !== "reddit") {
      throw new Error(
        `Unsupported platform: ${platform}. Currently only Reddit is supported.`
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

    // Create Reddit API client and poller
    const redditClient = new RedditApiClient({
      accessToken: tokens.accessToken,
    });

    const poller = new RedditPoller(redditClient, adAccountId);

    // Create repository
    const repository = new DrizzleCampaignSetRepository(db);

    // Get all synced campaigns for this account
    const syncedCampaigns = await repository.getSyncedCampaignsForAccount(adAccountId);

    // Initialize result
    const result: SyncFromPlatformResult = {
      updated: 0,
      conflicts: 0,
      unchanged: 0,
      deleted: 0,
      errors: 0,
      errorMessages: [],
    };

    if (syncedCampaigns.length === 0) {
      return result;
    }

    // Fetch all campaign statuses from platform
    const platformStatuses = await poller.listCampaignStatuses(adAccountId);

    // Create a map for quick lookup
    const platformStatusMap = new Map<string, PlatformCampaignStatus>();
    for (const status of platformStatuses) {
      platformStatusMap.set(status.platformId, status);
    }

    // Process each synced campaign
    for (const campaign of syncedCampaigns) {
      try {
        const platformStatus = platformStatusMap.get(campaign.platformCampaignId);

        if (!platformStatus) {
          // Campaign not found on platform - it was deleted
          result.deleted++;
          // Update local state to reflect the deletion
          await repository.markCampaignDeletedOnPlatform(campaign.id);
          continue;
        }

        // Compare statuses in the same format
        // Local status is already in local format (e.g., "active", "paused")
        // Platform status needs to be mapped to local format for comparison
        const localStatus = campaign.localStatus;
        const remoteStatusMapped = mapPlatformStatusToLocal(platformStatus.status);

        if (localStatus === remoteStatusMapped) {
          // No change
          result.unchanged++;
          continue;
        }

        // Status differs - check if local was modified after sync
        if (wasLocalModifiedAfterSync(campaign)) {
          // Conflict: local was modified after sync
          const conflictDetails: ConflictDetails = {
            detectedAt: new Date(),
            localStatus: campaign.localStatus,
            platformStatus: platformStatus.status,
            field: "status",
          };

          await repository.markCampaignConflict(campaign.id, conflictDetails);
          result.conflicts++;
        } else {
          // Platform wins: update local from platform
          await repository.updateCampaignFromPlatform(campaign.id, platformStatus);
          result.updated++;
        }
      } catch (error) {
        result.errors++;
        result.errorMessages.push({
          campaignId: campaign.id,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return result;
  };
}

/**
 * Registers the sync-from-platform job handler with pg-boss.
 *
 * @param boss - The pg-boss instance to register with
 */
export async function registerSyncFromPlatformHandler(boss: PgBoss): Promise<void> {
  const handler = createSyncFromPlatformHandler();

  // Create the queue before registering the worker (required in pg-boss v10+)
  await boss.createQueue(SYNC_FROM_PLATFORM_JOB);

  boss.work<SyncFromPlatformJob, SyncFromPlatformResult>(
    SYNC_FROM_PLATFORM_JOB,
    async (job) => {
      const data = job.data;

      console.log(
        `[Job ${job.id}] Starting sync-from-platform for account: ${data.adAccountId}`
      );

      try {
        const result = await handler(data);

        console.log(
          `[Job ${job.id}] Sync-from-platform completed: updated=${result.updated}, conflicts=${result.conflicts}, unchanged=${result.unchanged}, deleted=${result.deleted}`
        );

        return result;
      } catch (error) {
        console.error(
          `[Job ${job.id}] Sync-from-platform failed:`,
          error instanceof Error ? error.message : error
        );
        throw error;
      }
    }
  );
}
