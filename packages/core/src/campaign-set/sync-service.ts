/**
 * Campaign Set Sync Service
 *
 * Service for syncing campaign sets to ad platforms. Handles the orchestration
 * of syncing entire campaign sets, individual campaigns, and bulk operations
 * like pausing and resuming.
 */

import type { CampaignSetPlatformAdapter } from "./platform-adapter.js";
import type {
  CampaignSet,
  CampaignSetStatus,
  Campaign,
  AdGroup,
  Ad,
  Keyword,
  CampaignSetSyncStatus,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Result Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Error that occurred during sync
 */
export interface SyncError {
  /** ID of the campaign that had the error */
  campaignId: string;
  /** Platform the error occurred on */
  platform: string;
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
}

/**
 * Result of syncing a single campaign
 */
export interface CampaignSyncResult {
  /** ID of the campaign */
  campaignId: string;
  /** Platform the campaign was synced to */
  platform: string;
  /** Whether the sync was successful */
  success: boolean;
  /** Platform-assigned campaign ID (set on success) */
  platformCampaignId?: string;
  /** Error message (set on failure) */
  error?: string;
}

/**
 * Result of syncing a campaign set
 */
export interface CampaignSetSyncResult {
  /** Whether the overall sync was successful (no failures) */
  success: boolean;
  /** ID of the campaign set */
  setId: string;
  /** Number of campaigns successfully synced */
  synced: number;
  /** Number of campaigns that failed to sync */
  failed: number;
  /** Number of campaigns skipped (e.g., draft status) */
  skipped: number;
  /** List of errors that occurred */
  errors: SyncError[];
  /** Individual campaign sync results */
  campaigns: CampaignSyncResult[];
}

/**
 * Result of pausing a campaign set
 */
export interface PauseResult {
  /** ID of the campaign set */
  setId: string;
  /** Number of campaigns successfully paused */
  paused: number;
  /** Number of campaigns that failed to pause */
  failed: number;
  /** List of errors that occurred */
  errors: SyncError[];
}

/**
 * Result of resuming a campaign set
 */
export interface ResumeResult {
  /** ID of the campaign set */
  setId: string;
  /** Number of campaigns successfully resumed */
  resumed: number;
  /** Number of campaigns that failed to resume */
  failed: number;
  /** List of errors that occurred */
  errors: SyncError[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of getting a campaign by ID, includes the parent set ID
 */
export interface CampaignWithSet {
  /** The campaign */
  campaign: Campaign;
  /** The parent campaign set ID */
  setId: string;
}

/**
 * Repository interface for campaign set data access
 * This allows the service to be database-agnostic
 */
export interface CampaignSetRepository {
  getCampaignSetWithRelations(setId: string): Promise<CampaignSet | null>;
  /**
   * Get a campaign by its ID, including the parent set ID
   * Used for syncing individual campaigns when only the campaign ID is known
   */
  getCampaignById(campaignId: string): Promise<CampaignWithSet | null>;
  updateCampaignSetStatus(
    setId: string,
    status: CampaignSetStatus,
    syncStatus: CampaignSetSyncStatus
  ): Promise<void>;
  updateCampaignSyncStatus(
    campaignId: string,
    syncStatus: CampaignSetSyncStatus,
    error?: string
  ): Promise<void>;
  updateCampaignPlatformId(campaignId: string, platformId: string): Promise<void>;
  updateAdGroupPlatformId(adGroupId: string, platformId: string): Promise<void>;
  updateAdPlatformId(adId: string, platformId: string): Promise<void>;
  updateKeywordPlatformId(keywordId: string, platformId: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Campaign Set Sync Service Interface
 *
 * Defines the contract for syncing campaign sets to ad platforms.
 */
export interface CampaignSetSyncService {
  /**
   * Sync an entire campaign set to all configured platforms
   *
   * @param setId - The campaign set ID to sync
   * @returns Result containing sync statistics and any errors
   */
  syncCampaignSet(setId: string): Promise<CampaignSetSyncResult>;

  /**
   * Sync a single campaign to its platform
   *
   * @param campaignId - The campaign ID to sync
   * @returns Result of the sync operation
   */
  syncCampaign(campaignId: string): Promise<CampaignSyncResult>;

  /**
   * Pause all campaigns in a set across all platforms
   *
   * @param setId - The campaign set ID to pause
   * @returns Result containing pause statistics and any errors
   */
  pauseCampaignSet(setId: string): Promise<PauseResult>;

  /**
   * Resume all campaigns in a set across all platforms
   *
   * @param setId - The campaign set ID to resume
   * @returns Result containing resume statistics and any errors
   */
  resumeCampaignSet(setId: string): Promise<ResumeResult>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default implementation of the Campaign Set Sync Service
 */
export class DefaultCampaignSetSyncService implements CampaignSetSyncService {
  private readonly adapters: Map<string, CampaignSetPlatformAdapter>;
  private readonly repository: CampaignSetRepository;

  constructor(
    adapters: Map<string, CampaignSetPlatformAdapter>,
    repository: CampaignSetRepository
  ) {
    this.adapters = adapters;
    this.repository = repository;
  }

  async syncCampaignSet(setId: string): Promise<CampaignSetSyncResult> {
    // 1. Load campaign set with all relations
    const campaignSet = await this.repository.getCampaignSetWithRelations(setId);

    if (!campaignSet) {
      return {
        success: false,
        setId,
        synced: 0,
        failed: 0,
        skipped: 0,
        errors: [
          {
            campaignId: "",
            platform: "",
            code: "CAMPAIGN_SET_NOT_FOUND",
            message: `Campaign set with ID ${setId} not found`,
          },
        ],
        campaigns: [],
      };
    }

    // 2. Update set status to syncing
    await this.repository.updateCampaignSetStatus(setId, "syncing", "syncing");

    // 3. Process each campaign
    const results: CampaignSyncResult[] = [];
    const errors: SyncError[] = [];
    let synced = 0;
    let failed = 0;
    let skipped = 0;

    for (const campaign of campaignSet.campaigns) {
      // Skip draft campaigns
      if (campaign.status === "draft") {
        skipped++;
        continue;
      }

      // Get adapter for platform
      const adapter = this.adapters.get(campaign.platform);
      if (!adapter) {
        skipped++;
        errors.push({
          campaignId: campaign.id,
          platform: campaign.platform,
          code: "NO_ADAPTER_FOR_PLATFORM",
          message: `No adapter available for platform: ${campaign.platform}`,
        });
        continue;
      }

      try {
        const result = await this.syncSingleCampaign(campaign, adapter);
        results.push(result);

        if (result.success) {
          synced++;
          // Update platform IDs in database.
          // Note: syncSingleCampaign already persists the ID immediately after creation,
          // but we keep this call as a safety net for updates and to ensure consistency.
          if (result.platformCampaignId) {
            await this.repository.updateCampaignPlatformId(
              campaign.id,
              result.platformCampaignId
            );
          }
          await this.repository.updateCampaignSyncStatus(campaign.id, "synced");
        } else {
          failed++;
          errors.push({
            campaignId: campaign.id,
            platform: campaign.platform,
            code: "SYNC_FAILED",
            message: result.error || "Unknown error",
          });
          await this.repository.updateCampaignSyncStatus(
            campaign.id,
            "failed",
            result.error
          );
        }
      } catch (error) {
        failed++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.push({
          campaignId: campaign.id,
          platform: campaign.platform,
          success: false,
          error: errorMessage,
        });
        errors.push({
          campaignId: campaign.id,
          platform: campaign.platform,
          code: "SYNC_EXCEPTION",
          message: errorMessage,
        });
        await this.repository.updateCampaignSyncStatus(
          campaign.id,
          "failed",
          errorMessage
        );
      }
    }

    // 4. Update campaign set status based on results
    const finalSyncStatus: CampaignSetSyncStatus =
      failed === 0 ? "synced" : "failed";
    // Update lifecycle status: if all synced, set to "active"; if failed, set to "error"
    const finalLifecycleStatus: CampaignSetStatus =
      failed === 0 ? "active" : "error";
    await this.repository.updateCampaignSetStatus(setId, finalLifecycleStatus, finalSyncStatus);

    return {
      success: failed === 0,
      setId,
      synced,
      failed,
      skipped,
      errors,
      campaigns: results,
    };
  }

  async syncCampaign(campaignId: string): Promise<CampaignSyncResult> {
    // Get the campaign directly by its ID
    const campaignWithSet = await this.repository.getCampaignById(campaignId);

    if (!campaignWithSet) {
      return {
        campaignId,
        platform: "unknown",
        success: false,
        error: "Campaign not found",
      };
    }

    const { campaign } = campaignWithSet;

    const adapter = this.adapters.get(campaign.platform);
    if (!adapter) {
      return {
        campaignId,
        platform: campaign.platform,
        success: false,
        error: `No adapter available for platform: ${campaign.platform}`,
      };
    }

    try {
      const result = await this.syncSingleCampaign(campaign, adapter);
      if (result.success && result.platformCampaignId) {
        // Note: syncSingleCampaign already persists the ID immediately after creation,
        // but we keep this call as a safety net for updates and to ensure consistency.
        await this.repository.updateCampaignPlatformId(
          campaignId,
          result.platformCampaignId
        );
        await this.repository.updateCampaignSyncStatus(campaignId, "synced");
      } else {
        await this.repository.updateCampaignSyncStatus(
          campaignId,
          "failed",
          result.error
        );
      }
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.repository.updateCampaignSyncStatus(
        campaignId,
        "failed",
        errorMessage
      );
      return {
        campaignId,
        platform: campaign.platform,
        success: false,
        error: errorMessage,
      };
    }
  }

  async pauseCampaignSet(setId: string): Promise<PauseResult> {
    const campaignSet = await this.repository.getCampaignSetWithRelations(setId);

    if (!campaignSet) {
      return {
        setId,
        paused: 0,
        failed: 0,
        errors: [
          {
            campaignId: "",
            platform: "",
            code: "CAMPAIGN_SET_NOT_FOUND",
            message: `Campaign set with ID ${setId} not found`,
          },
        ],
      };
    }

    const errors: SyncError[] = [];
    let paused = 0;
    let failed = 0;

    for (const campaign of campaignSet.campaigns) {
      // Skip campaigns without platform ID (not yet synced)
      if (!campaign.platformCampaignId) {
        continue;
      }

      const adapter = this.adapters.get(campaign.platform);
      if (!adapter) {
        failed++;
        errors.push({
          campaignId: campaign.id,
          platform: campaign.platform,
          code: "NO_ADAPTER_FOR_PLATFORM",
          message: `No adapter available for platform: ${campaign.platform}`,
        });
        continue;
      }

      try {
        await adapter.pauseCampaign(campaign.platformCampaignId);
        paused++;
      } catch (error) {
        failed++;
        errors.push({
          campaignId: campaign.id,
          platform: campaign.platform,
          code: "PAUSE_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { setId, paused, failed, errors };
  }

  async resumeCampaignSet(setId: string): Promise<ResumeResult> {
    const campaignSet = await this.repository.getCampaignSetWithRelations(setId);

    if (!campaignSet) {
      return {
        setId,
        resumed: 0,
        failed: 0,
        errors: [
          {
            campaignId: "",
            platform: "",
            code: "CAMPAIGN_SET_NOT_FOUND",
            message: `Campaign set with ID ${setId} not found`,
          },
        ],
      };
    }

    const errors: SyncError[] = [];
    let resumed = 0;
    let failed = 0;

    for (const campaign of campaignSet.campaigns) {
      // Skip campaigns without platform ID (not yet synced)
      if (!campaign.platformCampaignId) {
        continue;
      }

      const adapter = this.adapters.get(campaign.platform);
      if (!adapter) {
        failed++;
        errors.push({
          campaignId: campaign.id,
          platform: campaign.platform,
          code: "NO_ADAPTER_FOR_PLATFORM",
          message: `No adapter available for platform: ${campaign.platform}`,
        });
        continue;
      }

      try {
        await adapter.resumeCampaign(campaign.platformCampaignId);
        resumed++;
      } catch (error) {
        failed++;
        errors.push({
          campaignId: campaign.id,
          platform: campaign.platform,
          code: "RESUME_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { setId, resumed, failed, errors };
  }

  // ─── Private Helper Methods ────────────────────────────────────────────────

  /**
   * Sync a single campaign with all its child entities
   */
  private async syncSingleCampaign(
    campaign: Campaign,
    adapter: CampaignSetPlatformAdapter
  ): Promise<CampaignSyncResult> {
    // Determine if this is a create or update operation
    const isUpdate = !!campaign.platformCampaignId;
    let platformCampaignId: string | undefined;

    // Sync the campaign itself
    if (isUpdate) {
      const result = await adapter.updateCampaign(
        campaign,
        campaign.platformCampaignId!
      );
      if (!result.success) {
        return {
          campaignId: campaign.id,
          platform: campaign.platform,
          success: false,
          error: result.error,
        };
      }
      platformCampaignId = result.platformCampaignId;
    } else {
      const result = await adapter.createCampaign(campaign);
      if (!result.success) {
        return {
          campaignId: campaign.id,
          platform: campaign.platform,
          success: false,
          error: result.error,
        };
      }
      platformCampaignId = result.platformCampaignId;

      // IMMEDIATELY persist platform ID before syncing children.
      // This ensures the ID is saved even if child entity sync fails,
      // preventing duplicate campaign creation on retry.
      if (platformCampaignId) {
        await this.repository.updateCampaignPlatformId(campaign.id, platformCampaignId);
      }
    }

    // Sync ad groups
    for (const adGroup of campaign.adGroups) {
      const adGroupResult = await this.syncAdGroup(
        adGroup,
        platformCampaignId!,
        adapter
      );
      if (!adGroupResult.success) {
        return {
          campaignId: campaign.id,
          platform: campaign.platform,
          success: false,
          platformCampaignId,
          error: `Failed to sync ad group ${adGroup.id}: ${adGroupResult.error}`,
        };
      }
    }

    return {
      campaignId: campaign.id,
      platform: campaign.platform,
      success: true,
      platformCampaignId,
    };
  }

  /**
   * Sync an ad group with all its child entities
   */
  private async syncAdGroup(
    adGroup: AdGroup,
    platformCampaignId: string,
    adapter: CampaignSetPlatformAdapter
  ): Promise<{ success: boolean; platformAdGroupId?: string; error?: string }> {
    const isUpdate = !!adGroup.platformAdGroupId;
    let platformAdGroupId: string | undefined;

    if (isUpdate) {
      const result = await adapter.updateAdGroup(
        adGroup,
        adGroup.platformAdGroupId!
      );
      if (!result.success) {
        return { success: false, error: result.error };
      }
      platformAdGroupId = result.platformAdGroupId;
      // Update the platform ID in DB if it changed (e.g., platform reassigned ID)
      if (platformAdGroupId && platformAdGroupId !== adGroup.platformAdGroupId) {
        await this.repository.updateAdGroupPlatformId(adGroup.id, platformAdGroupId);
      }
    } else {
      const result = await adapter.createAdGroup(adGroup, platformCampaignId);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      platformAdGroupId = result.platformAdGroupId;
      // Update the platform ID in the database
      await this.repository.updateAdGroupPlatformId(adGroup.id, platformAdGroupId!);
    }

    // Sync ads
    for (const ad of adGroup.ads) {
      const adResult = await this.syncAd(ad, platformAdGroupId!, adapter);
      if (!adResult.success) {
        return {
          success: false,
          platformAdGroupId,
          error: `Failed to sync ad ${ad.id}: ${adResult.error}`,
        };
      }
    }

    // Sync keywords
    for (const keyword of adGroup.keywords) {
      const keywordResult = await this.syncKeyword(
        keyword,
        platformAdGroupId!,
        adapter
      );
      if (!keywordResult.success) {
        return {
          success: false,
          platformAdGroupId,
          error: `Failed to sync keyword ${keyword.id}: ${keywordResult.error}`,
        };
      }
    }

    return { success: true, platformAdGroupId };
  }

  /**
   * Sync an individual ad
   */
  private async syncAd(
    ad: Ad,
    platformAdGroupId: string,
    adapter: CampaignSetPlatformAdapter
  ): Promise<{ success: boolean; platformAdId?: string; error?: string }> {
    const isUpdate = !!ad.platformAdId;

    if (isUpdate) {
      const result = await adapter.updateAd(ad, ad.platformAdId!);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      // Update the platform ID in DB if it changed (e.g., platform reassigned ID)
      if (result.platformAdId && result.platformAdId !== ad.platformAdId) {
        await this.repository.updateAdPlatformId(ad.id, result.platformAdId);
      }
      return { success: true, platformAdId: result.platformAdId };
    } else {
      const result = await adapter.createAd(ad, platformAdGroupId);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      // Update the platform ID in the database
      await this.repository.updateAdPlatformId(ad.id, result.platformAdId!);
      return { success: true, platformAdId: result.platformAdId };
    }
  }

  /**
   * Sync an individual keyword
   */
  private async syncKeyword(
    keyword: Keyword,
    platformAdGroupId: string,
    adapter: CampaignSetPlatformAdapter
  ): Promise<{ success: boolean; platformKeywordId?: string; error?: string }> {
    const isUpdate = !!keyword.platformKeywordId;

    if (isUpdate) {
      const result = await adapter.updateKeyword(
        keyword,
        keyword.platformKeywordId!
      );
      if (!result.success) {
        return { success: false, error: result.error };
      }
      // Update the platform ID in DB if it changed (e.g., platform reassigned ID)
      if (result.platformKeywordId && result.platformKeywordId !== keyword.platformKeywordId) {
        await this.repository.updateKeywordPlatformId(keyword.id, result.platformKeywordId);
      }
      return { success: true, platformKeywordId: result.platformKeywordId };
    } else {
      const result = await adapter.createKeyword(keyword, platformAdGroupId);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      // Update the platform ID in the database
      await this.repository.updateKeywordPlatformId(
        keyword.id,
        result.platformKeywordId!
      );
      return { success: true, platformKeywordId: result.platformKeywordId };
    }
  }
}
