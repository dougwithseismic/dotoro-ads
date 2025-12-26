/**
 * Platform Poller Interface
 *
 * Defines the interface for polling campaign status from ad platforms.
 * Used for bidirectional sync to detect changes made directly on platforms.
 *
 * This enables:
 * - Detecting when campaigns are paused/activated on the platform
 * - Detecting budget changes made on the platform
 * - Detecting deleted campaigns
 * - Conflict detection when local and platform states diverge
 */

// ─────────────────────────────────────────────────────────────────────────────
// Status Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalized campaign status from any platform
 *
 * Maps platform-specific statuses to a common set:
 * - active: Campaign is running
 * - paused: Campaign is temporarily stopped
 * - completed: Campaign has finished (end date passed)
 * - deleted: Campaign has been removed from the platform
 * - error: Campaign is in an error state
 */
export type PlatformStatusValue = "active" | "paused" | "completed" | "deleted" | "error";

/**
 * Campaign status as reported by the platform
 *
 * This is the normalized representation of a campaign's status
 * from any ad platform. Implementations should transform platform-specific
 * statuses to these common values.
 */
export interface PlatformCampaignStatus {
  /** The campaign ID on the platform */
  platformId: string;

  /** Normalized status value */
  status: PlatformStatusValue;

  /** Budget information if available */
  budget?: {
    type: "daily" | "lifetime";
    amount: number;
  };

  /** When the campaign was last modified on the platform */
  lastModified?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conflict Detection Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type of conflict field
 */
export type ConflictField = "status" | "budget" | "other";

/**
 * Details about a detected conflict between local and platform state
 *
 * A conflict occurs when:
 * 1. Local status differs from platform status
 * 2. Local was modified after the last sync
 *
 * If local was not modified after last sync, platform wins (no conflict).
 */
export interface ConflictDetails {
  /** When the conflict was detected */
  detectedAt: Date;

  /** The local value (as string for comparison) */
  localStatus: string;

  /** The platform value (as string for comparison) */
  platformStatus: string;

  /** Which field has the conflict */
  field: ConflictField;
}

// ─────────────────────────────────────────────────────────────────────────────
// Poller Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Platform Poller Interface
 *
 * Implementations fetch campaign status from a specific ad platform.
 * Each platform (Reddit, Google, Facebook) will have its own implementation
 * that transforms platform-specific API responses to the common format.
 *
 * @example
 * ```typescript
 * const poller = new RedditPoller(client, accountId);
 *
 * // Get single campaign status
 * const status = await poller.getCampaignStatus("campaign-123");
 * if (status) {
 *   console.log(`Campaign is ${status.status}`);
 * }
 *
 * // Get all campaign statuses for an account
 * const statuses = await poller.listCampaignStatuses(accountId);
 * for (const status of statuses) {
 *   console.log(`${status.platformId}: ${status.status}`);
 * }
 * ```
 */
export interface PlatformPoller {
  /** The platform this poller is for */
  readonly platform: string;

  /**
   * Fetch status for a single campaign
   *
   * @param platformCampaignId - The campaign ID on the platform
   * @returns The campaign status, or null if not found (deleted)
   */
  getCampaignStatus(platformCampaignId: string): Promise<PlatformCampaignStatus | null>;

  /**
   * Fetch all campaign statuses for an account
   *
   * @param accountId - The ad account ID on the platform
   * @returns Array of campaign statuses
   */
  listCampaignStatuses(accountId: string): Promise<PlatformCampaignStatus[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync-Back Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Synced campaign with local and platform IDs
 *
 * Represents a campaign that has been synced to a platform
 * and can be checked for status changes.
 */
export interface SyncedCampaign {
  /** Local campaign ID */
  id: string;

  /** Platform campaign ID */
  platformCampaignId: string;

  /** Current local status */
  localStatus: string;

  /** Last sync timestamp */
  lastSyncedAt: Date;

  /** Last local modification timestamp */
  localUpdatedAt: Date;

  /** The platform this campaign is synced to */
  platform: string;
}

/**
 * Result of a sync-back operation for a single campaign
 */
export interface SyncBackResult {
  /** The local campaign ID */
  campaignId: string;

  /** The platform campaign ID */
  platformCampaignId: string;

  /** What action was taken */
  action: "updated" | "conflict" | "unchanged" | "deleted";

  /** Conflict details if action is "conflict" */
  conflictDetails?: ConflictDetails;

  /** The new status if updated */
  newStatus?: PlatformStatusValue;
}

/**
 * Summary of a sync-back job run
 */
export interface SyncBackSummary {
  /** When the sync-back started */
  startedAt: Date;

  /** When the sync-back completed */
  completedAt: Date;

  /** Number of campaigns updated from platform */
  updated: number;

  /** Number of conflicts detected */
  conflicts: number;

  /** Number of campaigns unchanged */
  unchanged: number;

  /** Number of deleted campaigns detected */
  deleted: number;

  /** Number of errors encountered */
  errors: number;

  /** Individual results */
  results: SyncBackResult[];

  /** Error messages if any */
  errorMessages: Array<{
    campaignId: string;
    message: string;
  }>;
}
