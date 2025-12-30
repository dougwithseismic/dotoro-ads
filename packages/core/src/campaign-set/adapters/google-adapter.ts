/**
 * Google Ads Platform Adapter
 *
 * Implementation of the CampaignSetPlatformAdapter for Google Ads.
 * Syncs campaigns, ad groups, RSAs, and keywords to Google Ads API.
 *
 * Features:
 * - Campaign CRUD with automatic budget creation
 * - Ad Group CRUD with bidding configuration
 * - Responsive Search Ad (RSA) creation (ads are immutable)
 * - Keyword CRUD with match type support
 * - Error handling with retryable flag for rate limits
 */

import type {
  CampaignSetPlatformAdapter,
  PlatformCampaignResult,
  PlatformAdGroupResult,
  PlatformAdResult,
  PlatformKeywordResult,
} from "../platform-adapter.js";
import type { Campaign, AdGroup, Ad, Keyword } from "../types.js";
import type {
  CampaignService,
  CampaignBudgetService,
  AdGroupService,
  ResponsiveSearchAdService,
  KeywordService,
} from "@repo/google-ads";
import { GoogleAdsApiException } from "@repo/google-ads";
import {
  toMicroUnits,
  mapStatusToGoogle,
  parseResourceName,
  extractIdFromResourceName,
  transformCampaignToGoogle,
  transformAdGroupToGoogle,
  transformAdToRSA,
  transformKeywordToGoogle,
} from "./google/transformers.js";

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for Google Ads adapter
 */
export interface GoogleAdsAdapterConfig {
  /** Google Ads customer ID (10 digits, no dashes) */
  customerId?: string;
  /** Google Ads developer token */
  developerToken?: string;
  /** Whether to use test mode (no actual API calls) */
  testMode?: boolean;

  // Optional service injection for testing
  /** Campaign Budget Service instance */
  campaignBudgetService?: CampaignBudgetService;
  /** Campaign Service instance */
  campaignService?: CampaignService;
  /** Ad Group Service instance */
  adGroupService?: AdGroupService;
  /** Responsive Search Ad Service instance */
  responsiveSearchAdService?: ResponsiveSearchAdService;
  /** Keyword Service instance */
  keywordService?: KeywordService;
}

// ============================================================================
// Google Ads Adapter Implementation
// ============================================================================

/**
 * Google Ads Platform Adapter
 *
 * Implements the CampaignSetPlatformAdapter interface for syncing
 * campaign sets with Google Ads.
 *
 * @example
 * ```typescript
 * // With injected services (production)
 * const client = new GoogleAdsApiClient({
 *   accessToken: "...",
 *   developerToken: "...",
 * });
 *
 * const adapter = new GoogleAdsAdapter({
 *   customerId: "1234567890",
 *   developerToken: "dev-token",
 *   campaignBudgetService: new CampaignBudgetService(client),
 *   campaignService: new CampaignService(client),
 *   adGroupService: new AdGroupService(client),
 *   responsiveSearchAdService: new ResponsiveSearchAdService(client),
 *   keywordService: new KeywordService(client),
 * });
 *
 * const result = await adapter.createCampaign(campaign);
 * ```
 */
export class GoogleAdsAdapter implements CampaignSetPlatformAdapter {
  platform = "google";

  private readonly config: GoogleAdsAdapterConfig;
  private operationCount = 0;

  // Services (injected or null in test mode)
  private readonly campaignBudgetService?: CampaignBudgetService;
  private readonly campaignService?: CampaignService;
  private readonly adGroupService?: AdGroupService;
  private readonly responsiveSearchAdService?: ResponsiveSearchAdService;
  private readonly keywordService?: KeywordService;

  constructor(config: GoogleAdsAdapterConfig = {}) {
    this.config = {
      testMode: !config.campaignService && !config.customerId,
      ...config,
    };

    // Store service references
    this.campaignBudgetService = config.campaignBudgetService;
    this.campaignService = config.campaignService;
    this.adGroupService = config.adGroupService;
    this.responsiveSearchAdService = config.responsiveSearchAdService;
    this.keywordService = config.keywordService;
  }

  // ─── Campaign Operations ───────────────────────────────────────────────────

  /**
   * Create a new campaign on Google Ads
   *
   * Creates the budget first (required by campaigns), then creates the campaign.
   */
  async createCampaign(campaign: Campaign): Promise<PlatformCampaignResult> {
    if (this.config.testMode) {
      return this.stubCreate("campaign", campaign.id);
    }

    const customerId = this.config.customerId!;

    try {
      // Step 1: Create the campaign budget
      const budgetAmount = campaign.budget?.amount ?? 10; // Default $10/day
      const budgetResourceName = await this.campaignBudgetService!.createCampaignBudget(
        customerId,
        {
          name: `${campaign.name} Budget`,
          amountMicros: toMicroUnits(budgetAmount),
          deliveryMethod: "STANDARD",
        }
      );

      // Step 2: Create the campaign with budget reference
      const googleCampaign = transformCampaignToGoogle(campaign, budgetResourceName);
      const campaignResourceName = await this.campaignService!.createCampaign(
        customerId,
        googleCampaign
      );

      return {
        success: true,
        platformCampaignId: campaignResourceName,
      };
    } catch (error) {
      return this.handleCampaignError(error);
    }
  }

  /**
   * Update an existing campaign on Google Ads
   */
  async updateCampaign(
    campaign: Campaign,
    platformId: string
  ): Promise<PlatformCampaignResult> {
    if (this.config.testMode) {
      return { success: true, platformCampaignId: platformId };
    }

    const parsed = parseResourceName(platformId);
    if (!parsed) {
      return {
        success: false,
        error: `Invalid platform campaign ID: ${platformId}`,
      };
    }

    try {
      const campaignId = parsed.entityId;

      await this.campaignService!.updateCampaign(
        parsed.customerId,
        campaignId,
        {
          name: campaign.name,
          status: mapStatusToGoogle(campaign.status),
        }
      );

      return {
        success: true,
        platformCampaignId: platformId,
      };
    } catch (error) {
      return this.handleCampaignError(error);
    }
  }

  /**
   * Pause a campaign on Google Ads
   */
  async pauseCampaign(platformId: string): Promise<void> {
    if (this.config.testMode) {
      return;
    }

    const parsed = parseResourceName(platformId);
    if (!parsed) {
      throw new Error(`Invalid platform campaign ID: ${platformId}`);
    }

    await this.campaignService!.pauseCampaign(parsed.customerId, parsed.entityId);
  }

  /**
   * Resume a paused campaign on Google Ads
   */
  async resumeCampaign(platformId: string): Promise<void> {
    if (this.config.testMode) {
      return;
    }

    const parsed = parseResourceName(platformId);
    if (!parsed) {
      throw new Error(`Invalid platform campaign ID: ${platformId}`);
    }

    await this.campaignService!.activateCampaign(parsed.customerId, parsed.entityId);
  }

  /**
   * Delete a campaign from Google Ads
   *
   * Note: Google Ads uses REMOVED status instead of actual deletion
   */
  async deleteCampaign(platformId: string): Promise<void> {
    if (this.config.testMode) {
      return;
    }

    const parsed = parseResourceName(platformId);
    if (!parsed) {
      throw new Error(`Invalid platform campaign ID: ${platformId}`);
    }

    await this.campaignService!.deleteCampaign(parsed.customerId, parsed.entityId);
  }

  // ─── Ad Group Operations ───────────────────────────────────────────────────

  /**
   * Create a new ad group on Google Ads
   */
  async createAdGroup(
    adGroup: AdGroup,
    platformCampaignId: string
  ): Promise<PlatformAdGroupResult> {
    if (this.config.testMode) {
      return this.stubCreateAdGroup("adgroup", adGroup.id);
    }

    const customerId = this.config.customerId!;

    try {
      const googleAdGroup = transformAdGroupToGoogle(adGroup, platformCampaignId);
      const adGroupResourceName = await this.adGroupService!.createAdGroup(
        customerId,
        googleAdGroup
      );

      return {
        success: true,
        platformAdGroupId: adGroupResourceName,
      };
    } catch (error) {
      return this.handleAdGroupError(error);
    }
  }

  /**
   * Update an existing ad group on Google Ads
   */
  async updateAdGroup(
    adGroup: AdGroup,
    platformAdGroupId: string
  ): Promise<PlatformAdGroupResult> {
    if (this.config.testMode) {
      return { success: true, platformAdGroupId };
    }

    const parsed = parseResourceName(platformAdGroupId);
    if (!parsed) {
      return {
        success: false,
        error: `Invalid platform ad group ID: ${platformAdGroupId}`,
      };
    }

    try {
      await this.adGroupService!.updateAdGroup(
        parsed.customerId,
        parsed.entityId,
        {
          name: adGroup.name,
          status: mapStatusToGoogle(adGroup.status) as "ENABLED" | "PAUSED" | "REMOVED",
        }
      );

      return {
        success: true,
        platformAdGroupId,
      };
    } catch (error) {
      return this.handleAdGroupError(error);
    }
  }

  /**
   * Delete an ad group from Google Ads
   */
  async deleteAdGroup(platformAdGroupId: string): Promise<void> {
    if (this.config.testMode) {
      return;
    }

    const parsed = parseResourceName(platformAdGroupId);
    if (!parsed) {
      throw new Error(`Invalid platform ad group ID: ${platformAdGroupId}`);
    }

    await this.adGroupService!.deleteAdGroup(parsed.customerId, parsed.entityId);
  }

  // ─── Ad Operations (RSA) ─────────────────────────────────────────────────────

  /**
   * Create a new Responsive Search Ad on Google Ads
   *
   * Validates RSA requirements (min 3 headlines, 2 descriptions)
   */
  async createAd(
    ad: Ad,
    platformAdGroupId: string
  ): Promise<PlatformAdResult> {
    // Validate required fields
    if (!ad.finalUrl) {
      return {
        success: false,
        error: "Ad finalUrl is required for Google Ads RSAs",
      };
    }

    if (this.config.testMode) {
      return this.stubCreateAd("ad", ad.id);
    }

    const customerId = this.config.customerId!;

    try {
      const rsaInput = transformAdToRSA(ad, platformAdGroupId);
      const adGroupAdResourceName = await this.responsiveSearchAdService!.createResponsiveSearchAd(
        customerId,
        rsaInput
      );

      return {
        success: true,
        platformAdId: adGroupAdResourceName,
      };
    } catch (error) {
      return this.handleAdError(error);
    }
  }

  /**
   * Update an existing ad on Google Ads
   *
   * Note: Ads are immutable in Google Ads. To change ad content,
   * you must remove the old ad and create a new one.
   */
  async updateAd(ad: Ad, platformAdId: string): Promise<PlatformAdResult> {
    // Ads are immutable in Google Ads
    return {
      success: false,
      error:
        "Google Ads RSAs are immutable. To modify an ad, remove the existing ad and create a new one with the updated content.",
    };
  }

  /**
   * Delete an ad from Google Ads
   */
  async deleteAd(platformAdId: string): Promise<void> {
    if (this.config.testMode) {
      return;
    }

    const parsed = parseResourceName(platformAdId);
    if (!parsed) {
      throw new Error(`Invalid platform ad ID: ${platformAdId}`);
    }

    // Platform ID format: customers/{id}/adGroupAds/{adGroupId}~{adId}
    const [adGroupId, adId] = parsed.entityId.split("~");
    if (!adGroupId || !adId) {
      throw new Error(`Invalid AdGroupAd resource name: ${platformAdId}`);
    }

    await this.responsiveSearchAdService!.deleteAd(
      parsed.customerId,
      adGroupId,
      adId
    );
  }

  // ─── Keyword Operations ────────────────────────────────────────────────────

  /**
   * Create a new keyword on Google Ads
   */
  async createKeyword(
    keyword: Keyword,
    platformAdGroupId: string
  ): Promise<PlatformKeywordResult> {
    if (this.config.testMode) {
      return this.stubCreateKeyword("keyword", keyword.id);
    }

    const customerId = this.config.customerId!;

    try {
      const googleKeyword = transformKeywordToGoogle(keyword, platformAdGroupId);
      const criterionResourceName = await this.keywordService!.createKeyword(
        customerId,
        googleKeyword
      );

      return {
        success: true,
        platformKeywordId: criterionResourceName,
      };
    } catch (error) {
      return this.handleKeywordError(error);
    }
  }

  /**
   * Update an existing keyword on Google Ads
   *
   * Note: Only status and CPC bid can be updated.
   * Text and match type are immutable.
   */
  async updateKeyword(
    keyword: Keyword,
    platformKeywordId: string
  ): Promise<PlatformKeywordResult> {
    if (this.config.testMode) {
      return { success: true, platformKeywordId };
    }

    const parsed = parseResourceName(platformKeywordId);
    if (!parsed) {
      return {
        success: false,
        error: `Invalid platform keyword ID: ${platformKeywordId}`,
      };
    }

    try {
      // Platform ID format: customers/{id}/adGroupCriteria/{adGroupId}~{criterionId}
      const [adGroupId, criterionId] = parsed.entityId.split("~");
      if (!adGroupId || !criterionId) {
        return {
          success: false,
          error: `Invalid AdGroupCriterion resource name: ${platformKeywordId}`,
        };
      }

      await this.keywordService!.updateKeyword(
        parsed.customerId,
        adGroupId,
        criterionId,
        {
          status: mapStatusToGoogle(keyword.status) as "ENABLED" | "PAUSED" | "REMOVED",
          cpcBidMicros: keyword.bid ? toMicroUnits(keyword.bid) : undefined,
        }
      );

      return {
        success: true,
        platformKeywordId,
      };
    } catch (error) {
      return this.handleKeywordError(error);
    }
  }

  /**
   * Delete a keyword from Google Ads
   */
  async deleteKeyword(platformKeywordId: string): Promise<void> {
    if (this.config.testMode) {
      return;
    }

    const parsed = parseResourceName(platformKeywordId);
    if (!parsed) {
      throw new Error(`Invalid platform keyword ID: ${platformKeywordId}`);
    }

    // Platform ID format: customers/{id}/adGroupCriteria/{adGroupId}~{criterionId}
    const [adGroupId, criterionId] = parsed.entityId.split("~");
    if (!adGroupId || !criterionId) {
      throw new Error(`Invalid AdGroupCriterion resource name: ${platformKeywordId}`);
    }

    await this.keywordService!.deleteKeyword(
      parsed.customerId,
      adGroupId,
      criterionId
    );
  }

  // ─── Error Handling ────────────────────────────────────────────────────────

  private handleCampaignError(error: unknown): PlatformCampaignResult {
    if (error instanceof GoogleAdsApiException) {
      return {
        success: false,
        error: error.message,
        retryable: error.retryable,
        retryAfter: error.retryAfter,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }

  private handleAdGroupError(error: unknown): PlatformAdGroupResult {
    if (error instanceof GoogleAdsApiException) {
      return {
        success: false,
        error: error.message,
        retryable: error.retryable,
        retryAfter: error.retryAfter,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }

  private handleAdError(error: unknown): PlatformAdResult {
    if (error instanceof GoogleAdsApiException) {
      return {
        success: false,
        error: error.message,
        retryable: error.retryable,
        retryAfter: error.retryAfter,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }

  private handleKeywordError(error: unknown): PlatformKeywordResult {
    if (error instanceof GoogleAdsApiException) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }

  // ─── Test Mode Helpers ────────────────────────────────────────────────────

  private stubCreate(
    entityType: string,
    localId: string
  ): PlatformCampaignResult {
    this.operationCount++;
    return {
      success: true,
      platformCampaignId: `google_${entityType}_${localId}_${Date.now()}_${this.operationCount}`,
    };
  }

  private stubCreateAdGroup(
    entityType: string,
    localId: string
  ): PlatformAdGroupResult {
    this.operationCount++;
    return {
      success: true,
      platformAdGroupId: `google_${entityType}_${localId}_${Date.now()}_${this.operationCount}`,
    };
  }

  private stubCreateAd(entityType: string, localId: string): PlatformAdResult {
    this.operationCount++;
    return {
      success: true,
      platformAdId: `google_${entityType}_${localId}_${Date.now()}_${this.operationCount}`,
    };
  }

  private stubCreateKeyword(
    entityType: string,
    localId: string
  ): PlatformKeywordResult {
    this.operationCount++;
    return {
      success: true,
      platformKeywordId: `google_${entityType}_${localId}_${Date.now()}_${this.operationCount}`,
    };
  }

}
