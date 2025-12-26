/**
 * Diff Sync Service
 *
 * Service for calculating and applying differences between campaign set
 * configurations. Used when a campaign set's configuration is edited and
 * we need to sync only the changes to the platform.
 */

import type { CampaignSetPlatformAdapter } from "./platform-adapter.js";
import type {
  CampaignSet,
  CampaignSetConfig,
  Campaign,
  AdGroup,
  Ad,
  Keyword,
} from "./types.js";
import type { CampaignSetRepository, SyncError } from "./sync-service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Diff Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update information for a campaign
 */
export interface CampaignUpdate {
  /** The campaign with updated data */
  campaign: Campaign;
  /** List of changed field names */
  changes: string[];
}

/**
 * Ad group with its parent campaign ID
 */
export interface AdGroupWithCampaign {
  /** The ad group */
  adGroup: AdGroup;
  /** Parent campaign ID */
  campaignId: string;
}

/**
 * Ad with its parent ad group ID
 */
export interface AdWithAdGroup {
  /** The ad */
  ad: Ad;
  /** Parent ad group ID */
  adGroupId: string;
}

/**
 * Keyword with its parent ad group ID
 */
export interface KeywordWithAdGroup {
  /** The keyword */
  keyword: Keyword;
  /** Parent ad group ID */
  adGroupId: string;
}

/**
 * Complete diff between current and new campaign set state
 */
export interface CampaignSetDiff {
  /** Campaigns to add (new in new config) */
  campaignsToAdd: Campaign[];
  /** Campaigns to update (exist in both, have changes) */
  campaignsToUpdate: CampaignUpdate[];
  /** Campaign IDs to remove (exist in current, not in new) */
  campaignsToRemove: string[];

  /** Ad groups to add */
  adGroupsToAdd: AdGroupWithCampaign[];
  /** Ad group IDs to remove */
  adGroupsToRemove: string[];

  /** Ads to add */
  adsToAdd: AdWithAdGroup[];
  /** Ad IDs to remove */
  adsToRemove: string[];

  /** Keywords to add */
  keywordsToAdd: KeywordWithAdGroup[];
  /** Keyword IDs to remove */
  keywordsToRemove: string[];
}

/**
 * Options for diff calculation
 */
export interface DiffCalculationOptions {
  /** Generated campaigns from the new config */
  generatedCampaigns: Campaign[];
}

/**
 * Result of applying a diff
 */
export interface DiffSyncResult {
  /** Whether the apply was successful */
  success: boolean;
  /** Number of entities created */
  created: number;
  /** Number of entities updated */
  updated: number;
  /** Number of entities removed */
  removed: number;
  /** Errors that occurred during apply */
  errors: SyncError[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Diff Sync Service Interface
 *
 * Defines the contract for calculating and applying diffs between
 * campaign set configurations.
 */
export interface DiffSyncService {
  /**
   * Calculate the diff between current state and new config
   *
   * @param currentSet - The current campaign set state
   * @param newConfig - The new configuration to diff against
   * @param options - Options including generated campaigns from new config
   * @returns The calculated diff
   */
  calculateDiff(
    currentSet: CampaignSet,
    newConfig: CampaignSetConfig,
    options: DiffCalculationOptions
  ): CampaignSetDiff;

  /**
   * Apply a diff to sync changes to the platform
   *
   * @param setId - The campaign set ID
   * @param diff - The diff to apply
   * @returns Result of the apply operation
   */
  applyDiff(setId: string, diff: CampaignSetDiff): Promise<DiffSyncResult>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default implementation of the Diff Sync Service
 */
export class DefaultDiffSyncService implements DiffSyncService {
  private readonly adapters?: Map<string, CampaignSetPlatformAdapter>;
  private readonly repository?: CampaignSetRepository;

  constructor(
    adapters?: Map<string, CampaignSetPlatformAdapter>,
    repository?: CampaignSetRepository
  ) {
    this.adapters = adapters;
    this.repository = repository;
  }

  calculateDiff(
    currentSet: CampaignSet,
    _newConfig: CampaignSetConfig,
    options: DiffCalculationOptions
  ): CampaignSetDiff {
    const { generatedCampaigns } = options;

    // Build lookup maps for current state
    const currentCampaigns = new Map<string, Campaign>();
    const currentAdGroups = new Map<string, AdGroup>();
    const currentAds = new Map<string, Ad>();
    const currentKeywords = new Map<string, Keyword>();

    for (const campaign of currentSet.campaigns) {
      currentCampaigns.set(campaign.id, campaign);
      for (const adGroup of campaign.adGroups) {
        currentAdGroups.set(adGroup.id, adGroup);
        for (const ad of adGroup.ads) {
          currentAds.set(ad.id, ad);
        }
        for (const keyword of adGroup.keywords) {
          currentKeywords.set(keyword.id, keyword);
        }
      }
    }

    // Build lookup maps for new state
    const newCampaigns = new Map<string, Campaign>();
    const newAdGroups = new Map<string, AdGroup>();
    const newAds = new Map<string, Ad>();
    const newKeywords = new Map<string, Keyword>();

    for (const campaign of generatedCampaigns) {
      newCampaigns.set(campaign.id, campaign);
      for (const adGroup of campaign.adGroups) {
        newAdGroups.set(adGroup.id, adGroup);
        for (const ad of adGroup.ads) {
          newAds.set(ad.id, ad);
        }
        for (const keyword of adGroup.keywords) {
          newKeywords.set(keyword.id, keyword);
        }
      }
    }

    // Calculate campaign diffs
    const campaignsToAdd: Campaign[] = [];
    const campaignsToUpdate: CampaignUpdate[] = [];
    const campaignsToRemove: string[] = [];

    // Find campaigns to add and update
    for (const [id, newCampaign] of newCampaigns) {
      const currentCampaign = currentCampaigns.get(id);
      if (!currentCampaign) {
        campaignsToAdd.push(newCampaign);
      } else {
        const changes = this.detectCampaignChanges(currentCampaign, newCampaign);
        if (changes.length > 0) {
          campaignsToUpdate.push({ campaign: newCampaign, changes });
        }
      }
    }

    // Find campaigns to remove
    for (const id of currentCampaigns.keys()) {
      if (!newCampaigns.has(id)) {
        campaignsToRemove.push(id);
      }
    }

    // Calculate ad group diffs
    const adGroupsToAdd: AdGroupWithCampaign[] = [];
    const adGroupsToRemove: string[] = [];

    for (const [id, newAdGroup] of newAdGroups) {
      if (!currentAdGroups.has(id)) {
        adGroupsToAdd.push({
          adGroup: newAdGroup,
          campaignId: newAdGroup.campaignId,
        });
      }
    }

    for (const id of currentAdGroups.keys()) {
      if (!newAdGroups.has(id)) {
        adGroupsToRemove.push(id);
      }
    }

    // Calculate ad diffs
    const adsToAdd: AdWithAdGroup[] = [];
    const adsToRemove: string[] = [];

    for (const [id, newAd] of newAds) {
      if (!currentAds.has(id)) {
        adsToAdd.push({
          ad: newAd,
          adGroupId: newAd.adGroupId,
        });
      }
    }

    for (const id of currentAds.keys()) {
      if (!newAds.has(id)) {
        adsToRemove.push(id);
      }
    }

    // Calculate keyword diffs
    const keywordsToAdd: KeywordWithAdGroup[] = [];
    const keywordsToRemove: string[] = [];

    for (const [id, newKeyword] of newKeywords) {
      if (!currentKeywords.has(id)) {
        keywordsToAdd.push({
          keyword: newKeyword,
          adGroupId: newKeyword.adGroupId,
        });
      }
    }

    for (const id of currentKeywords.keys()) {
      if (!newKeywords.has(id)) {
        keywordsToRemove.push(id);
      }
    }

    return {
      campaignsToAdd,
      campaignsToUpdate,
      campaignsToRemove,
      adGroupsToAdd,
      adGroupsToRemove,
      adsToAdd,
      adsToRemove,
      keywordsToAdd,
      keywordsToRemove,
    };
  }

  async applyDiff(setId: string, diff: CampaignSetDiff): Promise<DiffSyncResult> {
    if (!this.adapters || !this.repository) {
      return {
        success: false,
        created: 0,
        updated: 0,
        removed: 0,
        errors: [
          {
            campaignId: "",
            platform: "",
            code: "SERVICE_NOT_CONFIGURED",
            message: "Service not configured with adapters and repository",
          },
        ],
      };
    }

    // Load the campaign set to get platform IDs
    const campaignSet = await this.repository.getCampaignSetWithRelations(setId);

    if (!campaignSet) {
      return {
        success: false,
        created: 0,
        updated: 0,
        removed: 0,
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

    // Build lookup map for existing campaigns by ID
    const existingCampaigns = new Map<string, Campaign>();
    for (const campaign of campaignSet.campaigns) {
      existingCampaigns.set(campaign.id, campaign);
    }

    const errors: SyncError[] = [];
    let created = 0;
    let updated = 0;
    let removed = 0;

    // Apply campaign deletions first (to clean up)
    for (const campaignId of diff.campaignsToRemove) {
      const existing = existingCampaigns.get(campaignId);
      if (existing?.platformCampaignId) {
        const adapter = this.adapters.get(existing.platform);
        if (adapter) {
          try {
            await adapter.deleteCampaign(existing.platformCampaignId);
            removed++;
          } catch (error) {
            errors.push({
              campaignId,
              platform: existing.platform,
              code: "DELETE_FAILED",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }
    }

    // Apply campaign creates
    for (const campaign of diff.campaignsToAdd) {
      const adapter = this.adapters.get(campaign.platform);
      if (!adapter) {
        errors.push({
          campaignId: campaign.id,
          platform: campaign.platform,
          code: "NO_ADAPTER",
          message: `No adapter for platform: ${campaign.platform}`,
        });
        continue;
      }

      try {
        const result = await adapter.createCampaign(campaign);
        if (result.success) {
          created++;
          if (result.platformCampaignId) {
            await this.repository.updateCampaignPlatformId(
              campaign.id,
              result.platformCampaignId
            );
          }
        } else {
          errors.push({
            campaignId: campaign.id,
            platform: campaign.platform,
            code: "CREATE_FAILED",
            message: result.error || "Creation failed",
          });
        }
      } catch (error) {
        errors.push({
          campaignId: campaign.id,
          platform: campaign.platform,
          code: "CREATE_EXCEPTION",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Apply campaign updates
    for (const { campaign } of diff.campaignsToUpdate) {
      const existing = existingCampaigns.get(campaign.id);
      if (!existing?.platformCampaignId) {
        continue;
      }

      const adapter = this.adapters.get(campaign.platform);
      if (!adapter) {
        continue;
      }

      try {
        const result = await adapter.updateCampaign(
          campaign,
          existing.platformCampaignId
        );
        if (result.success) {
          updated++;
        } else {
          errors.push({
            campaignId: campaign.id,
            platform: campaign.platform,
            code: "UPDATE_FAILED",
            message: result.error || "Update failed",
          });
        }
      } catch (error) {
        errors.push({
          campaignId: campaign.id,
          platform: campaign.platform,
          code: "UPDATE_EXCEPTION",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // TODO: Apply ad group, ad, and keyword diffs
    // For now, we handle campaign-level changes only
    // A full implementation would also process:
    // - diff.adGroupsToAdd, diff.adGroupsToRemove
    // - diff.adsToAdd, diff.adsToRemove
    // - diff.keywordsToAdd, diff.keywordsToRemove

    return {
      success: errors.length === 0,
      created,
      updated,
      removed,
      errors,
    };
  }

  // ─── Private Helper Methods ────────────────────────────────────────────────

  /**
   * Detect changes between two campaigns
   */
  private detectCampaignChanges(
    current: Campaign,
    updated: Campaign
  ): string[] {
    const changes: string[] = [];

    if (current.name !== updated.name) {
      changes.push("name");
    }

    if (current.status !== updated.status) {
      changes.push("status");
    }

    // Compare budget if present
    if (
      JSON.stringify(current.budget) !== JSON.stringify(updated.budget)
    ) {
      changes.push("budget");
    }

    // Compare campaign data if present
    if (
      JSON.stringify(current.campaignData) !==
      JSON.stringify(updated.campaignData)
    ) {
      changes.push("campaignData");
    }

    // Compare platform data if present
    if (
      JSON.stringify(current.platformData) !==
      JSON.stringify(updated.platformData)
    ) {
      changes.push("platformData");
    }

    return changes;
  }
}
