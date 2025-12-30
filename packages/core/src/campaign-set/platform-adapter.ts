/**
 * Campaign Set Platform Adapter Interface
 *
 * Defines the contract that all platform-specific adapters must implement
 * to sync campaign sets with ad platforms (Google, Facebook, Reddit, etc.).
 *
 * Each platform adapter handles the platform-specific API calls and data
 * transformations required to create, update, pause, resume, and delete
 * campaigns and their child entities.
 */

import type { Campaign, AdGroup, Ad, Keyword } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Result Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of a platform campaign operation
 */
export interface PlatformCampaignResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Platform-assigned campaign ID (set on success) */
  platformCampaignId?: string;
  /** Error message (set on failure) */
  error?: string;
  /** Whether the error is retryable (e.g., rate limits, server errors) */
  retryable?: boolean;
  /** Suggested wait time in seconds before retrying (for rate limit errors) */
  retryAfter?: number;
}

/**
 * Result of a platform ad group operation
 */
export interface PlatformAdGroupResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Platform-assigned ad group ID (set on success) */
  platformAdGroupId?: string;
  /** Error message (set on failure) */
  error?: string;
  /** Whether the error is retryable (e.g., rate limits, server errors) */
  retryable?: boolean;
  /** Suggested wait time in seconds before retrying (for rate limit errors) */
  retryAfter?: number;
}

/**
 * Result of a platform ad operation
 */
export interface PlatformAdResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Platform-assigned ad ID (set on success) */
  platformAdId?: string;
  /** Error message (set on failure) */
  error?: string;
  /** Whether the error is retryable (e.g., rate limits, server errors) */
  retryable?: boolean;
  /** Suggested wait time in seconds before retrying (for rate limit errors) */
  retryAfter?: number;
}

/**
 * Result of a platform keyword operation
 */
export interface PlatformKeywordResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Platform-assigned keyword ID (set on success) */
  platformKeywordId?: string;
  /** Error message (set on failure) */
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Adapter Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Platform adapter interface for syncing campaign sets to ad platforms.
 *
 * Implementations should handle:
 * - Platform-specific API authentication
 * - Data transformation between our types and platform API formats
 * - Rate limiting and retry logic
 * - Error handling and mapping to our error types
 *
 * @example
 * ```typescript
 * const googleAdapter: CampaignSetPlatformAdapter = {
 *   platform: "google",
 *   async createCampaign(campaign) {
 *     const googleCampaign = transformToGoogleFormat(campaign);
 *     const response = await googleAdsApi.createCampaign(googleCampaign);
 *     return {
 *       success: true,
 *       platformCampaignId: response.campaignId,
 *     };
 *   },
 *   // ... other methods
 * };
 * ```
 */
export interface CampaignSetPlatformAdapter {
  /**
   * Platform identifier (e.g., "google", "facebook", "reddit")
   */
  platform: string;

  // ─── Campaign Operations ───────────────────────────────────────────────────

  /**
   * Create a new campaign on the platform
   *
   * @param campaign - The campaign to create
   * @returns Result with platform-assigned campaign ID on success
   */
  createCampaign(campaign: Campaign): Promise<PlatformCampaignResult>;

  /**
   * Update an existing campaign on the platform
   *
   * @param campaign - The campaign with updated data
   * @param platformId - The platform-assigned campaign ID
   * @returns Result indicating success or failure
   */
  updateCampaign(campaign: Campaign, platformId: string): Promise<PlatformCampaignResult>;

  /**
   * Pause a campaign on the platform
   *
   * @param platformId - The platform-assigned campaign ID
   * @throws Error if the pause operation fails
   */
  pauseCampaign(platformId: string): Promise<void>;

  /**
   * Resume a paused campaign on the platform
   *
   * @param platformId - The platform-assigned campaign ID
   * @throws Error if the resume operation fails
   */
  resumeCampaign(platformId: string): Promise<void>;

  /**
   * Delete a campaign from the platform
   *
   * @param platformId - The platform-assigned campaign ID
   * @throws Error if the delete operation fails
   */
  deleteCampaign(platformId: string): Promise<void>;

  // ─── Ad Group Operations ───────────────────────────────────────────────────

  /**
   * Create a new ad group on the platform
   *
   * @param adGroup - The ad group to create
   * @param platformCampaignId - The platform-assigned parent campaign ID
   * @returns Result with platform-assigned ad group ID on success
   */
  createAdGroup(adGroup: AdGroup, platformCampaignId: string): Promise<PlatformAdGroupResult>;

  /**
   * Update an existing ad group on the platform
   *
   * @param adGroup - The ad group with updated data
   * @param platformAdGroupId - The platform-assigned ad group ID
   * @returns Result indicating success or failure
   */
  updateAdGroup(adGroup: AdGroup, platformAdGroupId: string): Promise<PlatformAdGroupResult>;

  /**
   * Delete an ad group from the platform
   *
   * @param platformAdGroupId - The platform-assigned ad group ID
   * @throws Error if the delete operation fails
   */
  deleteAdGroup(platformAdGroupId: string): Promise<void>;

  // ─── Ad Operations ─────────────────────────────────────────────────────────

  /**
   * Create a new ad on the platform
   *
   * @param ad - The ad to create
   * @param platformAdGroupId - The platform-assigned parent ad group ID
   * @returns Result with platform-assigned ad ID on success
   */
  createAd(ad: Ad, platformAdGroupId: string): Promise<PlatformAdResult>;

  /**
   * Update an existing ad on the platform
   *
   * @param ad - The ad with updated data
   * @param platformAdId - The platform-assigned ad ID
   * @returns Result indicating success or failure
   */
  updateAd(ad: Ad, platformAdId: string): Promise<PlatformAdResult>;

  /**
   * Delete an ad from the platform
   *
   * @param platformAdId - The platform-assigned ad ID
   * @throws Error if the delete operation fails
   */
  deleteAd(platformAdId: string): Promise<void>;

  // ─── Keyword Operations ────────────────────────────────────────────────────

  /**
   * Create a new keyword on the platform
   *
   * @param keyword - The keyword to create
   * @param platformAdGroupId - The platform-assigned parent ad group ID
   * @returns Result with platform-assigned keyword ID on success
   */
  createKeyword(keyword: Keyword, platformAdGroupId: string): Promise<PlatformKeywordResult>;

  /**
   * Update an existing keyword on the platform
   *
   * @param keyword - The keyword with updated data
   * @param platformKeywordId - The platform-assigned keyword ID
   * @returns Result indicating success or failure
   */
  updateKeyword(keyword: Keyword, platformKeywordId: string): Promise<PlatformKeywordResult>;

  /**
   * Delete a keyword from the platform
   *
   * @param platformKeywordId - The platform-assigned keyword ID
   * @throws Error if the delete operation fails
   */
  deleteKeyword(platformKeywordId: string): Promise<void>;

  // ─── Deduplication Queries ────────────────────────────────────────────────

  /**
   * Find an existing campaign on the platform by name.
   * Used for deduplication during crash recovery - prevents duplicate
   * entity creation when sync resumes after a crash that occurred after
   * Reddit created the entity but before we persisted the platformId.
   *
   * @param accountId - The ad account ID to search in
   * @param name - The exact campaign name to match
   * @returns Platform campaign ID if found, null otherwise
   */
  findExistingCampaign(accountId: string, name: string): Promise<string | null>;

  /**
   * Find an existing ad group on the platform by name and parent campaign.
   * Used for deduplication during crash recovery.
   *
   * @param campaignId - The platform campaign ID to search in
   * @param name - The exact ad group name to match
   * @returns Platform ad group ID if found, null otherwise
   */
  findExistingAdGroup(campaignId: string, name: string): Promise<string | null>;

  /**
   * Find an existing ad on the platform by name/headline and parent ad group.
   * Used for deduplication during crash recovery.
   *
   * @param adGroupId - The platform ad group ID to search in
   * @param name - The exact ad name/headline to match
   * @returns Platform ad ID if found, null otherwise
   */
  findExistingAd(adGroupId: string, name: string): Promise<string | null>;

  /**
   * Find an existing keyword on the platform by text, match type, and parent ad group.
   * Used for deduplication during crash recovery.
   * Keywords are uniquely identified by (adGroupId, text, matchType), not just name.
   *
   * @param adGroupId - The platform ad group ID to search in
   * @param text - The exact keyword text to match
   * @param matchType - The keyword match type (broad, phrase, exact)
   * @returns Platform keyword ID if found, null otherwise
   */
  findExistingKeyword?(adGroupId: string, text: string, matchType: string): Promise<string | null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type guard to check if an object implements CampaignSetPlatformAdapter
 */
export function isCampaignSetPlatformAdapter(
  obj: unknown
): obj is CampaignSetPlatformAdapter {
  if (!obj || typeof obj !== "object") return false;

  const adapter = obj as CampaignSetPlatformAdapter;
  return (
    typeof adapter.platform === "string" &&
    typeof adapter.createCampaign === "function" &&
    typeof adapter.updateCampaign === "function" &&
    typeof adapter.pauseCampaign === "function" &&
    typeof adapter.resumeCampaign === "function" &&
    typeof adapter.deleteCampaign === "function" &&
    typeof adapter.createAdGroup === "function" &&
    typeof adapter.updateAdGroup === "function" &&
    typeof adapter.deleteAdGroup === "function" &&
    typeof adapter.createAd === "function" &&
    typeof adapter.updateAd === "function" &&
    typeof adapter.deleteAd === "function" &&
    typeof adapter.createKeyword === "function" &&
    typeof adapter.updateKeyword === "function" &&
    typeof adapter.deleteKeyword === "function" &&
    typeof adapter.findExistingCampaign === "function" &&
    typeof adapter.findExistingAdGroup === "function" &&
    typeof adapter.findExistingAd === "function"
  );
}
