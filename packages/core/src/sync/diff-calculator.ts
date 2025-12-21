/**
 * Sync Diff Calculator
 *
 * Compares local generated state with platform state using content hashes
 * to determine what needs to be synced.
 *
 * Matching logic:
 * 1. First tries to match by localId stored on platform campaigns
 * 2. Falls back to matching by content hash
 * 3. If no match found, campaign needs to be created
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Campaign data fields
 */
export interface CampaignData {
  objective?: string;
  budget?: {
    type: "daily" | "lifetime";
    amount: number;
    currency: string;
  };
  targeting?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Local campaign state
 */
export interface LocalCampaign {
  id: string;
  name: string;
  status: "draft" | "ready";
  data: CampaignData;
  hash: string;
}

/**
 * Platform campaign state
 */
export interface PlatformCampaign {
  platformId: string;
  localId?: string;
  name: string;
  data: CampaignData;
  hash: string;
}

/**
 * Campaign to create
 */
export interface CampaignToCreate {
  id: string;
  name: string;
  data: CampaignData;
  hash: string;
}

/**
 * Campaign to update
 */
export interface CampaignToUpdate {
  local: LocalCampaign;
  platform: PlatformCampaign;
}

/**
 * Campaign to delete
 */
export interface CampaignToDelete {
  platformId: string;
  name: string;
}

/**
 * Unchanged campaign pair
 */
export interface UnchangedCampaign {
  local: LocalCampaign;
  platform: PlatformCampaign;
}

/**
 * Diff summary
 */
export interface DiffSummary {
  createCount: number;
  updateCount: number;
  deleteCount: number;
  unchangedCount: number;
  estimatedApiCalls: number;
}

/**
 * Diff result
 */
export interface DiffResult {
  toCreate: CampaignToCreate[];
  toUpdate: CampaignToUpdate[];
  toDelete: CampaignToDelete[];
  unchanged: UnchangedCampaign[];
  summary: DiffSummary;
}

/**
 * Diff options
 */
export interface DiffOptions {
  /** Include orphaned platform campaigns in toDelete */
  includeDeleted?: boolean;
  /** Fields to ignore when comparing (uses data field comparison instead of hash) */
  ignoreFields?: string[];
}

// ============================================================================
// Implementation
// ============================================================================

export class DiffCalculator {
  /**
   * Calculate the diff between local and platform campaigns
   */
  calculateDiff(
    localCampaigns: LocalCampaign[],
    platformCampaigns: PlatformCampaign[],
    options: DiffOptions = {}
  ): DiffResult {
    const { includeDeleted = false, ignoreFields } = options;

    const toCreate: CampaignToCreate[] = [];
    const toUpdate: CampaignToUpdate[] = [];
    const toDelete: CampaignToDelete[] = [];
    const unchanged: UnchangedCampaign[] = [];

    // Build lookup maps for platform campaigns
    const platformByLocalId = new Map<string, PlatformCampaign>();
    const platformByHash = new Map<string, PlatformCampaign>();

    for (const platform of platformCampaigns) {
      if (platform.localId) {
        platformByLocalId.set(platform.localId, platform);
      }
      platformByHash.set(platform.hash, platform);
    }

    // Track matched platform campaigns
    const matchedPlatformIds = new Set<string>();

    // Process each local campaign
    for (const local of localCampaigns) {
      // Skip draft campaigns
      if (local.status === "draft") {
        continue;
      }

      // Try to find matching platform campaign
      let matchedPlatform: PlatformCampaign | undefined;

      // First try localId match
      matchedPlatform = platformByLocalId.get(local.id);

      // If no localId match, try hash match
      if (!matchedPlatform) {
        matchedPlatform = platformByHash.get(local.hash);
      }

      if (matchedPlatform) {
        matchedPlatformIds.add(matchedPlatform.platformId);

        // Check if content changed
        const isUnchanged = ignoreFields
          ? this.compareDataIgnoringFields(local.data, matchedPlatform.data, ignoreFields)
          : local.hash === matchedPlatform.hash;

        if (isUnchanged) {
          unchanged.push({ local, platform: matchedPlatform });
        } else {
          toUpdate.push({ local, platform: matchedPlatform });
        }
      } else {
        // No match - needs to be created
        toCreate.push({
          id: local.id,
          name: local.name,
          data: local.data,
          hash: local.hash,
        });
      }
    }

    // Find orphaned platform campaigns
    if (includeDeleted) {
      for (const platform of platformCampaigns) {
        if (!matchedPlatformIds.has(platform.platformId)) {
          toDelete.push({
            platformId: platform.platformId,
            name: platform.name,
          });
        }
      }
    }

    // Build summary
    const summary: DiffSummary = {
      createCount: toCreate.length,
      updateCount: toUpdate.length,
      deleteCount: toDelete.length,
      unchangedCount: unchanged.length,
      estimatedApiCalls: toCreate.length + toUpdate.length + toDelete.length,
    };

    return { toCreate, toUpdate, toDelete, unchanged, summary };
  }

  /**
   * Compare two data objects ignoring specified fields
   */
  private compareDataIgnoringFields(
    localData: CampaignData,
    platformData: CampaignData,
    ignoreFields: string[]
  ): boolean {
    const ignoreSet = new Set(ignoreFields);

    // Get all keys from both objects
    const allKeys = new Set([
      ...Object.keys(localData),
      ...Object.keys(platformData),
    ]);

    for (const key of allKeys) {
      if (ignoreSet.has(key)) {
        continue;
      }

      const localValue = localData[key];
      const platformValue = platformData[key];

      if (JSON.stringify(localValue) !== JSON.stringify(platformValue)) {
        return false;
      }
    }

    return true;
  }
}
