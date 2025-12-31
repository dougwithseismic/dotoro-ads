/**
 * Reddit Ads Platform Adapter
 *
 * Implements the CampaignSetPlatformAdapter interface for Reddit Ads.
 * Transforms our local campaign types to Reddit's API format and makes real API calls.
 *
 * Key transformations:
 * - Budget: Convert dollars to micro-units (multiply by 1,000,000)
 * - Objective: Map to Reddit's AWARENESS/CONSIDERATION/CONVERSIONS
 * - Bidding: Map to Reddit's AUTOMATIC/MANUAL_CPC/MANUAL_CPM
 *
 * Note: Reddit does not support keywords - keyword operations are no-ops.
 */

import type {
  CampaignSetPlatformAdapter,
  PlatformCampaignResult,
  PlatformAdGroupResult,
  PlatformAdResult,
  PlatformKeywordResult,
} from "../platform-adapter.js";
import type { Campaign, AdGroup, Ad, Keyword } from "../types.js";
import type { RedditApiClient } from "@repo/reddit-ads";
import { RedditApiException } from "@repo/reddit-ads";
import type {
  RedditCampaign,
  RedditAdGroup,
  RedditAd,
  CampaignObjective,
  BidStrategy,
  BidType,
  CallToAction,
  RedditApiResponse,
  RedditApiListResponse,
  CampaignResponse,
  AdGroupResponse,
  AdResponse,
  GoalType,
  SpecialAdCategory,
} from "@repo/reddit-ads";

// ─────────────────────────────────────────────────────────────────────────────
// Advanced Settings Types (from campaign set config)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reddit campaign advanced settings from campaign set config
 */
interface RedditCampaignAdvancedSettings {
  startTime?: string;
  endTime?: string;
  specialAdCategories?: SpecialAdCategory[];
  viewThroughAttributionDays?: number;
  clickThroughAttributionDays?: number;
}

/**
 * Reddit ad group advanced settings from campaign set config
 */
interface RedditAdGroupAdvancedSettings {
  startTime?: string;
  endTime?: string;
}

/**
 * Reddit advanced settings structure
 */
interface RedditAdvancedSettings {
  campaign?: RedditCampaignAdvancedSettings;
  adGroup?: RedditAdGroupAdvancedSettings;
}

/**
 * Platform advanced settings from campaign set config
 * Passed through campaign.campaignData.advancedSettings
 */
interface PlatformAdvancedSettings {
  reddit?: RedditAdvancedSettings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conversion factor from dollars to Reddit API micro-units
 * Reddit API uses micro-units: $1.00 = 1,000,000 micro-units
 */
const MICRO_UNITS_MULTIPLIER = 1_000_000;

/**
 * ISO 8601 datetime regex pattern
 *
 * Matches formats like:
 * - 2025-01-15T09:00:00Z
 * - 2025-01-15T09:00:00+00:00
 * - 2025-01-15T09:00:00.000Z
 * - 2025-06-28T21:00:00-05:00
 */
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Normalize a datetime value to a valid ISO 8601 string for Reddit API
 *
 * Handles various input types:
 * - Valid ISO 8601 strings: passed through unchanged
 * - Date objects: converted to ISO string
 * - Boolean true: converted to current datetime (means "start now")
 * - Invalid values (false, null, empty string, invalid strings, numbers): returns undefined
 *
 * @param value - The datetime value to normalize (can be string, Date, boolean, number, null, undefined)
 * @returns A valid ISO 8601 datetime string, or undefined if the value is invalid
 */
function normalizeDateTime(value: unknown): string | undefined {
  // Handle null, undefined, empty string, or false
  if (value === null || value === undefined || value === "" || value === false) {
    return undefined;
  }

  // Handle boolean true - means "start now"
  if (value === true) {
    return new Date().toISOString();
  }

  // Handle Date objects
  if (value instanceof Date) {
    // Check if the Date is valid
    if (isNaN(value.getTime())) {
      return undefined;
    }
    return value.toISOString();
  }

  // Handle strings - validate ISO 8601 format
  if (typeof value === "string") {
    // Check if it matches ISO 8601 format
    if (ISO_8601_REGEX.test(value)) {
      return value;
    }
    // Invalid string format
    return undefined;
  }

  // Reject numbers and any other types
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for Reddit Ads adapter
 */
export interface RedditAdsAdapterConfig {
  /** Reddit API client instance */
  client: RedditApiClient;
  /** Reddit ad account ID */
  accountId: string;
  /** Funding instrument ID (optional in Reddit v3 API - billing is handled at account level) */
  fundingInstrumentId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transformation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert dollar amount to Reddit API micro-units
 *
 * Uses integer arithmetic via cents conversion to avoid floating point errors.
 * Example: $0.10 * 1,000,000 could produce 99999.99999999999 due to IEEE 754,
 * but converting to cents first (10) then multiplying by 10,000 gives exactly 100,000.
 */
function toMicroUnits(dollars: number): number {
  // Convert to cents first to avoid floating point issues
  const cents = Math.round(dollars * 100);
  return cents * 10_000;
}

/**
 * Map our objective to Reddit's campaign objective (v3 API)
 *
 * Reddit v3 API valid objectives:
 * - APP_INSTALLS, CATALOG_SALES, CLICKS, CONVERSIONS
 * - IMPRESSIONS, LEAD_GENERATION, VIDEO_VIEWABLE_IMPRESSIONS
 */
function mapObjective(objective?: string): CampaignObjective {
  const objectiveLower = objective?.toLowerCase();
  switch (objectiveLower) {
    // Map awareness to impressions (brand visibility)
    case "awareness":
    case "impressions":
      return "IMPRESSIONS";
    // Map consideration to clicks (traffic/engagement)
    case "consideration":
    case "clicks":
    case "traffic":
      return "CLICKS";
    // Map conversions directly
    case "conversions":
      return "CONVERSIONS";
    case "video_views":
    case "video":
      return "VIDEO_VIEWABLE_IMPRESSIONS";
    case "app_installs":
      return "APP_INSTALLS";
    case "lead_generation":
    case "leads":
      return "LEAD_GENERATION";
    case "catalog_sales":
      return "CATALOG_SALES";
    default:
      if (objective) {
        console.warn(`[RedditAdapter] Unknown objective "${objective}", defaulting to IMPRESSIONS`);
      }
      return "IMPRESSIONS";
  }
}

/**
 * Map our bidding strategy to Reddit v3 API bid strategy
 *
 * Reddit v3 API valid bid strategies:
 * - BIDLESS: No bid required (for certain objective types)
 * - MANUAL_BIDDING: Manual bid control
 * - MAXIMIZE_VOLUME: Automatic optimization for volume
 * - TARGET_CPX: Target cost per action
 */
function mapBidStrategy(strategy?: string): BidStrategy {
  const strategyLower = strategy?.toLowerCase();
  switch (strategyLower) {
    // Map automatic/auto strategies to MAXIMIZE_VOLUME
    case "automatic":
    case "auto":
    case "maximize_volume":
      return "MAXIMIZE_VOLUME";
    // Map manual CPC/CPM to MANUAL_BIDDING
    case "manual_cpc":
    case "manual_cpm":
    case "manual":
    case "manual_bidding":
      return "MANUAL_BIDDING";
    // Map target CPA/CPX strategies
    case "target_cpa":
    case "target_cpx":
    case "target":
      return "TARGET_CPX";
    // Bidless for certain campaign types
    case "bidless":
    case "none":
      return "BIDLESS";
    default:
      if (strategy) {
        console.warn(`[RedditAdapter] Unknown bid strategy "${strategy}", defaulting to MAXIMIZE_VOLUME`);
      }
      return "MAXIMIZE_VOLUME";
  }
}

/**
 * Map our bidding strategy to Reddit v3 API bid type
 *
 * Reddit v3 API requires bid_type for ad groups:
 * - CPC: Cost per click (default for most campaigns)
 * - CPM: Cost per mille (thousand impressions)
 * - CPV: Cost per view (video campaigns)
 */
function mapBidType(strategy?: string): BidType {
  const strategyLower = strategy?.toLowerCase();
  switch (strategyLower) {
    case "manual_cpm":
    case "cpm":
      return "CPM";
    case "cpv":
    case "video":
      return "CPV";
    case "manual_cpc":
    case "cpc":
    case "automatic":
    case "auto":
    case "maximize_volume":
    case "manual_bidding":
    case "target_cpa":
    case "target_cpx":
    default:
      // Default to CPC for most strategies
      return "CPC";
  }
}

/**
 * Map our call to action to Reddit's CTA enum
 */
function mapCallToAction(cta?: string): CallToAction {
  // If no CTA provided, default to LEARN_MORE
  if (!cta) return "LEARN_MORE";

  // CTA should already be in Reddit format (uppercase with underscores)
  const ctaUpper = cta.toUpperCase().replace(/-/g, "_") as CallToAction;

  // Validate against known CTAs
  const validCtas: CallToAction[] = [
    "LEARN_MORE",
    "SIGN_UP",
    "SHOP_NOW",
    "DOWNLOAD",
    "INSTALL",
    "GET_QUOTE",
    "CONTACT_US",
    "BOOK_NOW",
    "APPLY_NOW",
    "WATCH_MORE",
    "GET_STARTED",
    "SUBSCRIBE",
    "ORDER_NOW",
    "SEE_MORE",
    "VIEW_MORE",
    "PLAY_NOW",
  ];

  if (!validCtas.includes(ctaUpper)) {
    console.warn(`[RedditAdapter] Invalid call-to-action "${cta}", defaulting to LEARN_MORE`);
    return "LEARN_MORE";
  }

  return ctaUpper;
}

/**
 * Extract bid amount from bidding settings
 *
 * Validates parsed values to prevent NaN propagation from invalid inputs.
 * Only returns a value for valid, positive bid amounts.
 */
function extractBidAmount(settings?: AdGroup["settings"]): number | undefined {
  const bidding = settings?.bidding as
    | { maxCpc?: string; maxCpm?: string }
    | undefined;
  if (!bidding) return undefined;

  const maxCpc = bidding.maxCpc;
  const maxCpm = bidding.maxCpm;

  if (maxCpc) {
    const parsed = parseFloat(maxCpc);
    // Validate: must be a valid positive number
    if (!isNaN(parsed) && parsed > 0) {
      return toMicroUnits(parsed);
    }
  }
  if (maxCpm) {
    const parsed = parseFloat(maxCpm);
    // Validate: must be a valid positive number
    if (!isNaN(parsed) && parsed > 0) {
      return toMicroUnits(parsed);
    }
  }

  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reddit Ads Adapter Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reddit Ads Platform Adapter
 *
 * Implements the CampaignSetPlatformAdapter interface for syncing
 * campaign sets with Reddit Ads.
 *
 * @example
 * ```typescript
 * const client = new RedditApiClient({ accessToken: "..." });
 * const adapter = new RedditAdsAdapter({
 *   client,
 *   accountId: "account-123",
 *   fundingInstrumentId: "funding-456",
 * });
 *
 * const result = await adapter.createCampaign(campaign);
 * ```
 */
export class RedditAdsAdapter implements CampaignSetPlatformAdapter {
  readonly platform = "reddit";

  private readonly client: RedditApiClient;
  private readonly accountId: string;
  private readonly fundingInstrumentId?: string;

  constructor(config: RedditAdsAdapterConfig) {
    this.client = config.client;
    this.accountId = config.accountId;
    this.fundingInstrumentId = config.fundingInstrumentId;
  }

  // ─── Campaign Operations ───────────────────────────────────────────────────

  /**
   * Create a new campaign on Reddit Ads
   */
  async createCampaign(campaign: Campaign): Promise<PlatformCampaignResult> {
    try {
      const redditCampaign = this.transformCampaign(campaign);

      // Reddit v3 API requires payload wrapped in "data" object
      const response = await this.client.post<
        RedditApiResponse<CampaignResponse>
      >(`/ad_accounts/${this.accountId}/campaigns`, { data: redditCampaign });

      return {
        success: true,
        platformCampaignId: response.data.id,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing campaign on Reddit Ads
   */
  async updateCampaign(
    campaign: Campaign,
    platformId: string
  ): Promise<PlatformCampaignResult> {
    try {
      const updates = this.transformCampaignUpdate(campaign);

      // Reddit v3 API uses PATCH method and /campaigns/{id} path (not PUT, not under ad_accounts)
      await this.client.patch<RedditApiResponse<CampaignResponse>>(
        `/campaigns/${platformId}`,
        { data: updates }
      );

      return {
        success: true,
        platformCampaignId: platformId,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Pause a campaign on Reddit Ads
   * Note: v3 API uses PATCH method and /campaigns/{id} path
   */
  async pauseCampaign(platformId: string): Promise<void> {
    await this.client.patch<RedditApiResponse<CampaignResponse>>(
      `/campaigns/${platformId}`,
      { data: { configured_status: "PAUSED" } }
    );
  }

  /**
   * Resume a paused campaign on Reddit Ads
   * Note: v3 API uses PATCH method and /campaigns/{id} path
   */
  async resumeCampaign(platformId: string): Promise<void> {
    await this.client.patch<RedditApiResponse<CampaignResponse>>(
      `/campaigns/${platformId}`,
      { data: { configured_status: "ACTIVE" } }
    );
  }

  /**
   * Delete a campaign from Reddit Ads
   * Note: v3 API uses /campaigns/{id} path (not under ad_accounts)
   */
  async deleteCampaign(platformId: string): Promise<void> {
    await this.client.delete(`/campaigns/${platformId}`);
  }

  // ─── Ad Group Operations ───────────────────────────────────────────────────

  /**
   * Create a new ad group on Reddit Ads
   */
  async createAdGroup(
    adGroup: AdGroup,
    platformCampaignId: string
  ): Promise<PlatformAdGroupResult> {
    try {
      const redditAdGroup = this.transformAdGroup(adGroup, platformCampaignId);

      const response = await this.client.post<
        RedditApiResponse<AdGroupResponse>
      >(`/ad_accounts/${this.accountId}/ad_groups`, { data: redditAdGroup });

      return {
        success: true,
        platformAdGroupId: response.data.id,
      };
    } catch (error) {
      return this.handleAdGroupError(error);
    }
  }

  /**
   * Update an existing ad group on Reddit Ads
   * Note: v3 API uses PATCH method and /ad_groups/{id} path (not PUT, not under ad_accounts)
   */
  async updateAdGroup(
    adGroup: AdGroup,
    platformAdGroupId: string
  ): Promise<PlatformAdGroupResult> {
    try {
      const updates = this.transformAdGroupUpdate(adGroup);

      await this.client.patch<RedditApiResponse<AdGroupResponse>>(
        `/ad_groups/${platformAdGroupId}`,
        { data: updates }
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
   * Delete an ad group from Reddit Ads
   * Note: v3 API uses /ad_groups/{id} path (not under ad_accounts)
   */
  async deleteAdGroup(platformAdGroupId: string): Promise<void> {
    await this.client.delete(`/ad_groups/${platformAdGroupId}`);
  }

  /**
   * Pause an ad group on Reddit Ads
   * Note: v3 API uses PATCH method and /ad_groups/{id} path
   *
   * Used by orphan handling PAUSE strategy.
   */
  async pauseAdGroup(platformAdGroupId: string): Promise<void> {
    await this.client.patch<RedditApiResponse<AdGroupResponse>>(
      `/ad_groups/${platformAdGroupId}`,
      { data: { configured_status: "PAUSED" } }
    );
  }

  /**
   * Resume a paused ad group on Reddit Ads
   * Note: v3 API uses PATCH method and /ad_groups/{id} path
   *
   * Used by orphan handling auto-restore.
   */
  async resumeAdGroup(platformAdGroupId: string): Promise<void> {
    await this.client.patch<RedditApiResponse<AdGroupResponse>>(
      `/ad_groups/${platformAdGroupId}`,
      { data: { configured_status: "ACTIVE" } }
    );
  }

  // ─── Ad Operations ─────────────────────────────────────────────────────────

  /**
   * Create a new ad on Reddit Ads
   *
   * Validates required fields before making API call.
   */
  async createAd(
    ad: Ad,
    platformAdGroupId: string
  ): Promise<PlatformAdResult> {
    // Validate required fields
    if (!ad.finalUrl) {
      return {
        success: false,
        error: "Ad finalUrl is required for Reddit ads",
      };
    }

    try {
      const redditAd = this.transformAd(ad, platformAdGroupId);

      const response = await this.client.post<RedditApiResponse<AdResponse>>(
        `/ad_accounts/${this.accountId}/ads`,
        { data: redditAd }
      );

      return {
        success: true,
        platformAdId: response.data.id,
      };
    } catch (error) {
      return this.handleAdError(error);
    }
  }

  /**
   * Update an existing ad on Reddit Ads
   * Note: v3 API uses PATCH method and /ads/{id} path (not PUT, not under ad_accounts)
   */
  async updateAd(ad: Ad, platformAdId: string): Promise<PlatformAdResult> {
    try {
      const updates = this.transformAdUpdate(ad);

      await this.client.patch<RedditApiResponse<AdResponse>>(
        `/ads/${platformAdId}`,
        { data: updates }
      );

      return {
        success: true,
        platformAdId,
      };
    } catch (error) {
      return this.handleAdError(error);
    }
  }

  /**
   * Delete an ad from Reddit Ads
   * Note: v3 API uses /ads/{id} path (not under ad_accounts)
   */
  async deleteAd(platformAdId: string): Promise<void> {
    await this.client.delete(`/ads/${platformAdId}`);
  }

  /**
   * Pause an ad on Reddit Ads
   * Note: v3 API uses PATCH method and /ads/{id} path
   *
   * Used by orphan handling PAUSE strategy.
   */
  async pauseAd(platformAdId: string): Promise<void> {
    await this.client.patch<RedditApiResponse<AdResponse>>(
      `/ads/${platformAdId}`,
      { data: { configured_status: "PAUSED" } }
    );
  }

  /**
   * Resume a paused ad on Reddit Ads
   * Note: v3 API uses PATCH method and /ads/{id} path
   *
   * Used by orphan handling auto-restore.
   */
  async resumeAd(platformAdId: string): Promise<void> {
    await this.client.patch<RedditApiResponse<AdResponse>>(
      `/ads/${platformAdId}`,
      { data: { configured_status: "ACTIVE" } }
    );
  }

  // ─── Keyword Operations (No-op for Reddit) ─────────────────────────────────
  // Reddit uses subreddit/interest targeting instead of keywords.
  // These methods return success without making API calls.

  /**
   * Create a keyword (no-op for Reddit)
   * Reddit does not support keywords - uses subreddit/interest targeting instead.
   */
  async createKeyword(
    keyword: Keyword,
    _platformAdGroupId: string
  ): Promise<PlatformKeywordResult> {
    // Reddit doesn't support keywords - return success with the local ID
    return {
      success: true,
      platformKeywordId: keyword.id,
    };
  }

  /**
   * Update a keyword (no-op for Reddit)
   */
  async updateKeyword(
    _keyword: Keyword,
    platformKeywordId: string
  ): Promise<PlatformKeywordResult> {
    return {
      success: true,
      platformKeywordId,
    };
  }

  /**
   * Delete a keyword (no-op for Reddit)
   */
  async deleteKeyword(_platformKeywordId: string): Promise<void> {
    // No-op for Reddit
  }

  // ─── Transformation Methods ────────────────────────────────────────────────

  /**
   * Transform our Campaign type to Reddit v3 API format
   *
   * Advanced settings are read from campaign.campaignData.advancedSettings.reddit.campaign
   */
  private transformCampaign(campaign: Campaign): RedditCampaign {
    const campaignData = campaign.campaignData as
      | {
          objective?: string;
          biddingStrategy?: string;
          specialAdCategories?: SpecialAdCategory[];
          advancedSettings?: PlatformAdvancedSettings;
        }
      | undefined;

    const budget = campaign.budget;
    const advancedSettings = campaignData?.advancedSettings?.reddit?.campaign;

    // Use special ad categories from advanced settings, then legacy location, then default
    const specialAdCategories =
      advancedSettings?.specialAdCategories ??
      campaignData?.specialAdCategories ??
      ["NONE"];

    const redditCampaign: RedditCampaign = {
      name: campaign.name,
      objective: mapObjective(campaignData?.objective),
      configured_status: "ACTIVE", // Required in v3 API
      special_ad_categories: specialAdCategories, // Required in v3 API
      funding_instrument_id: this.fundingInstrumentId,
    };

    // Set budget based on type
    if (budget) {
      if (budget.type === "lifetime") {
        redditCampaign.total_budget_micro = toMicroUnits(budget.amount);
      } else {
        // daily or default
        redditCampaign.daily_budget_micro = toMicroUnits(budget.amount);
      }
    }

    // Apply advanced settings: start_time, end_time, attribution windows
    if (advancedSettings) {
      // Start time (ISO 8601 with timezone) - normalized to handle invalid values
      const normalizedStartTime = normalizeDateTime(advancedSettings.startTime);
      if (normalizedStartTime) {
        (redditCampaign as Record<string, unknown>).start_time = normalizedStartTime;
      }

      // End time (ISO 8601 with timezone) - normalized to handle invalid values
      const normalizedEndTime = normalizeDateTime(advancedSettings.endTime);
      if (normalizedEndTime) {
        (redditCampaign as Record<string, unknown>).end_time = normalizedEndTime;
      }

      // View-through attribution window (1-30 days)
      if (advancedSettings.viewThroughAttributionDays !== undefined) {
        redditCampaign.view_through_attribution_window_days =
          advancedSettings.viewThroughAttributionDays;
      }

      // Click-through attribution window (1-30 days)
      if (advancedSettings.clickThroughAttributionDays !== undefined) {
        redditCampaign.click_through_attribution_window_days =
          advancedSettings.clickThroughAttributionDays;
      }
    }

    return redditCampaign;
  }

  /**
   * Transform campaign for update (partial)
   */
  private transformCampaignUpdate(
    campaign: Campaign
  ): Partial<RedditCampaign> {
    const updates: Partial<RedditCampaign> = {
      name: campaign.name,
    };

    const budget = campaign.budget;
    if (budget) {
      if (budget.type === "lifetime") {
        updates.total_budget_micro = toMicroUnits(budget.amount);
      } else {
        updates.daily_budget_micro = toMicroUnits(budget.amount);
      }
    }

    return updates;
  }

  /**
   * Transform our AdGroup type to Reddit v3 API format
   *
   * Advanced settings are read from adGroup.settings.advancedSettings.reddit.adGroup
   * Also handles legacy data where datetime was stored at the top level of settings
   */
  private transformAdGroup(
    adGroup: AdGroup,
    platformCampaignId: string
  ): RedditAdGroup {
    const settings = adGroup.settings;
    const bidding = settings?.bidding as { strategy?: string } | undefined;
    const budget = settings?.budget as {
      type?: "daily" | "lifetime";
      amount?: number;
    } | undefined;
    const targeting = settings?.targeting as {
      subreddits?: string[];
      interests?: string[];
      locations?: ("FEED" | "COMMENTS_PAGE")[];
      devices?: ("DESKTOP" | "MOBILE" | "TABLET")[];
    } | undefined;
    const advancedSettings = (settings as { advancedSettings?: PlatformAdvancedSettings } | undefined)
      ?.advancedSettings?.reddit?.adGroup;

    // Cast settings for legacy datetime field access
    const rawSettings = settings as Record<string, unknown> | undefined;

    const redditAdGroup: RedditAdGroup = {
      name: adGroup.name,
      campaign_id: platformCampaignId,
      bid_strategy: mapBidStrategy(bidding?.strategy),
      bid_type: mapBidType(bidding?.strategy), // Required in v3 API
      configured_status: "ACTIVE", // Required in v3 API
    };

    // Add bid amount for manual strategies (v3 API uses bid_value, not bid_micro)
    const bidAmount = extractBidAmount(settings);
    if (bidAmount !== undefined) {
      redditAdGroup.bid_value = bidAmount;
    }

    // Add goal_type and goal_value for budget (required in v3 API for ad groups)
    if (budget && budget.amount !== undefined && budget.amount > 0) {
      redditAdGroup.goal_type = budget.type === "lifetime" ? "LIFETIME_SPEND" : "DAILY_SPEND";
      redditAdGroup.goal_value = toMicroUnits(budget.amount);
    }

    // Add targeting if present
    if (targeting) {
      redditAdGroup.targeting = {
        subreddits: targeting.subreddits,
        interests: targeting.interests,
        locations: targeting.locations,
        // Transform simple device types to DeviceTargeting objects
        devices: targeting.devices?.map((deviceType) => ({ type: deviceType })),
      };
    }

    // Apply advanced settings: start_time, end_time - normalized to handle invalid values
    // Advanced settings take priority over legacy top-level settings
    if (advancedSettings) {
      // Start time (ISO 8601 with timezone) - normalized to handle invalid values
      const normalizedStartTime = normalizeDateTime(advancedSettings.startTime);
      if (normalizedStartTime) {
        redditAdGroup.start_time = normalizedStartTime;
      }

      // End time (ISO 8601 with timezone) - normalized to handle invalid values
      const normalizedEndTime = normalizeDateTime(advancedSettings.endTime);
      if (normalizedEndTime) {
        redditAdGroup.end_time = normalizedEndTime;
      }
    }

    // Handle legacy datetime fields from top-level settings (fallback if not set by advancedSettings)
    // This handles old campaign sets where start_time/end_time were stored directly in settings
    if (rawSettings) {
      // Check for start_time at top level of settings (legacy data)
      // Only apply if not already set by advancedSettings
      if (!redditAdGroup.start_time) {
        const rawStartTime = rawSettings.start_time ?? rawSettings.startTime;
        const normalizedRawStartTime = normalizeDateTime(rawStartTime);
        if (normalizedRawStartTime) {
          redditAdGroup.start_time = normalizedRawStartTime;
        }
      }

      // Check for end_time at top level of settings (legacy data)
      // Only apply if not already set by advancedSettings
      if (!redditAdGroup.end_time) {
        const rawEndTime = rawSettings.end_time ?? rawSettings.endTime;
        const normalizedRawEndTime = normalizeDateTime(rawEndTime);
        if (normalizedRawEndTime) {
          redditAdGroup.end_time = normalizedRawEndTime;
        }
      }
    }

    return redditAdGroup;
  }

  /**
   * Transform ad group for update (partial)
   */
  private transformAdGroupUpdate(adGroup: AdGroup): Partial<RedditAdGroup> {
    const settings = adGroup.settings;
    const bidding = settings?.bidding as { strategy?: string } | undefined;
    const budget = settings?.budget as {
      type?: "daily" | "lifetime";
      amount?: number;
    } | undefined;
    const targeting = settings?.targeting as {
      subreddits?: string[];
      interests?: string[];
      locations?: ("FEED" | "COMMENTS_PAGE")[];
      devices?: ("DESKTOP" | "MOBILE" | "TABLET")[];
    } | undefined;

    const updates: Partial<RedditAdGroup> = {
      name: adGroup.name,
    };

    if (bidding?.strategy) {
      updates.bid_strategy = mapBidStrategy(bidding.strategy);
    }

    // v3 API uses bid_value, not bid_micro
    const bidAmount = extractBidAmount(settings);
    if (bidAmount !== undefined) {
      updates.bid_value = bidAmount;
    }

    // Update goal_type and goal_value for budget
    if (budget && budget.amount !== undefined && budget.amount > 0) {
      updates.goal_type = budget.type === "lifetime" ? "LIFETIME_SPEND" : "DAILY_SPEND";
      updates.goal_value = toMicroUnits(budget.amount);
    }

    if (targeting) {
      updates.targeting = {
        subreddits: targeting.subreddits,
        interests: targeting.interests,
        locations: targeting.locations,
        // Transform simple device types to DeviceTargeting objects
        devices: targeting.devices?.map((deviceType) => ({ type: deviceType })),
      };
    }

    return updates;
  }

  /**
   * Transform our Ad type to Reddit API format
   *
   * Note: finalUrl must be validated before calling this method.
   */
  private transformAd(ad: Ad, platformAdGroupId: string): RedditAd {
    const headline = ad.headline ?? "Untitled Ad";
    // finalUrl is validated in createAd before calling this method
    const finalUrl = ad.finalUrl!;

    return {
      name: headline.substring(0, 255),
      ad_group_id: platformAdGroupId,
      headline: headline.substring(0, 100),
      body: ad.description?.substring(0, 500),
      click_url: finalUrl,
      display_url: ad.displayUrl?.substring(0, 25),
      call_to_action: mapCallToAction(ad.callToAction),
    };
  }

  /**
   * Transform ad for update (partial)
   */
  private transformAdUpdate(ad: Ad): Partial<RedditAd> {
    const updates: Partial<RedditAd> = {};

    if (ad.headline) {
      updates.headline = ad.headline.substring(0, 100);
      updates.name = ad.headline.substring(0, 255);
    }

    if (ad.description) {
      updates.body = ad.description.substring(0, 500);
    }

    if (ad.finalUrl) {
      updates.click_url = ad.finalUrl;
    }

    if (ad.displayUrl) {
      updates.display_url = ad.displayUrl.substring(0, 25);
    }

    if (ad.callToAction) {
      updates.call_to_action = mapCallToAction(ad.callToAction);
    }

    return updates;
  }

  // ─── Error Handling ────────────────────────────────────────────────────────

  /**
   * Handle errors from campaign operations
   *
   * Preserves retry information from RedditApiException for rate limits
   * and transient server errors.
   */
  private handleError(error: unknown): PlatformCampaignResult {
    if (error instanceof RedditApiException) {
      // Include API error details in the message for better debugging
      let errorMessage = error.message;
      if (error.details) {
        const detailsStr = JSON.stringify(error.details);
        errorMessage = `${error.message} - Details: ${detailsStr}`;
      }
      return {
        success: false,
        error: errorMessage,
        retryable: error.retryable,
        retryAfter: error.retryAfter,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }

  /**
   * Handle errors from ad group operations
   *
   * Preserves retry information from RedditApiException.
   */
  private handleAdGroupError(error: unknown): PlatformAdGroupResult {
    if (error instanceof RedditApiException) {
      let errorMessage = error.message;
      if (error.details) {
        const detailsStr = JSON.stringify(error.details);
        errorMessage = `${error.message} - Details: ${detailsStr}`;
      }
      return {
        success: false,
        error: errorMessage,
        retryable: error.retryable,
        retryAfter: error.retryAfter,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }

  /**
   * Handle errors from ad operations
   *
   * Preserves retry information from RedditApiException.
   */
  private handleAdError(error: unknown): PlatformAdResult {
    if (error instanceof RedditApiException) {
      let errorMessage = error.message;
      if (error.details) {
        const detailsStr = JSON.stringify(error.details);
        errorMessage = `${error.message} - Details: ${detailsStr}`;
      }
      return {
        success: false,
        error: errorMessage,
        retryable: error.retryable,
        retryAfter: error.retryAfter,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
