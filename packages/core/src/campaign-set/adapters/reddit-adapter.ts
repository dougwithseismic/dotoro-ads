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
  CallToAction,
  RedditApiResponse,
  CampaignResponse,
  AdGroupResponse,
  AdResponse,
} from "@repo/reddit-ads";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conversion factor from dollars to Reddit API micro-units
 * Reddit API uses micro-units: $1.00 = 1,000,000 micro-units
 */
const MICRO_UNITS_MULTIPLIER = 1_000_000;

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
  /** Funding instrument ID (required for campaign creation) */
  fundingInstrumentId: string;
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
 * Map our objective to Reddit's campaign objective
 */
function mapObjective(objective?: string): CampaignObjective {
  const objectiveLower = objective?.toLowerCase();
  switch (objectiveLower) {
    case "awareness":
      return "AWARENESS";
    case "consideration":
      return "CONSIDERATION";
    case "conversions":
      return "CONVERSIONS";
    default:
      return "AWARENESS";
  }
}

/**
 * Map our bidding strategy to Reddit's bid strategy
 */
function mapBidStrategy(strategy?: string): BidStrategy {
  const strategyLower = strategy?.toLowerCase();
  switch (strategyLower) {
    case "automatic":
      return "AUTOMATIC";
    case "manual_cpc":
      return "MANUAL_CPC";
    case "manual_cpm":
      return "MANUAL_CPM";
    default:
      return "AUTOMATIC";
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

  return validCtas.includes(ctaUpper) ? ctaUpper : "LEARN_MORE";
}

/**
 * Get current date as ISO string for start_date
 *
 * Returns date in "YYYY-MM-DD" format using substring instead of split
 * to avoid non-null assertion on array access.
 */
function getStartDate(): string {
  return new Date().toISOString().substring(0, 10); // "YYYY-MM-DD"
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
  private readonly fundingInstrumentId: string;

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

      const response = await this.client.post<
        RedditApiResponse<CampaignResponse>
      >(`/accounts/${this.accountId}/campaigns`, redditCampaign);

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

      await this.client.put<RedditApiResponse<CampaignResponse>>(
        `/accounts/${this.accountId}/campaigns/${platformId}`,
        updates
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
   */
  async pauseCampaign(platformId: string): Promise<void> {
    await this.client.put<RedditApiResponse<CampaignResponse>>(
      `/accounts/${this.accountId}/campaigns/${platformId}`,
      { status: "PAUSED" }
    );
  }

  /**
   * Resume a paused campaign on Reddit Ads
   */
  async resumeCampaign(platformId: string): Promise<void> {
    await this.client.put<RedditApiResponse<CampaignResponse>>(
      `/accounts/${this.accountId}/campaigns/${platformId}`,
      { status: "ACTIVE" }
    );
  }

  /**
   * Delete a campaign from Reddit Ads
   */
  async deleteCampaign(platformId: string): Promise<void> {
    await this.client.delete(`/accounts/${this.accountId}/campaigns/${platformId}`);
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
      >(`/accounts/${this.accountId}/adgroups`, redditAdGroup);

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
   */
  async updateAdGroup(
    adGroup: AdGroup,
    platformAdGroupId: string
  ): Promise<PlatformAdGroupResult> {
    try {
      const updates = this.transformAdGroupUpdate(adGroup);

      await this.client.put<RedditApiResponse<AdGroupResponse>>(
        `/accounts/${this.accountId}/adgroups/${platformAdGroupId}`,
        updates
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
   */
  async deleteAdGroup(platformAdGroupId: string): Promise<void> {
    await this.client.delete(
      `/accounts/${this.accountId}/adgroups/${platformAdGroupId}`
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
        `/accounts/${this.accountId}/ads`,
        redditAd
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
   */
  async updateAd(ad: Ad, platformAdId: string): Promise<PlatformAdResult> {
    try {
      const updates = this.transformAdUpdate(ad);

      await this.client.put<RedditApiResponse<AdResponse>>(
        `/accounts/${this.accountId}/ads/${platformAdId}`,
        updates
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
   */
  async deleteAd(platformAdId: string): Promise<void> {
    await this.client.delete(`/accounts/${this.accountId}/ads/${platformAdId}`);
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
   * Transform our Campaign type to Reddit API format
   */
  private transformCampaign(campaign: Campaign): RedditCampaign {
    const campaignData = campaign.campaignData as
      | { objective?: string; biddingStrategy?: string }
      | undefined;

    const budget = campaign.budget;

    const redditCampaign: RedditCampaign = {
      name: campaign.name,
      objective: mapObjective(campaignData?.objective),
      funding_instrument_id: this.fundingInstrumentId,
      start_date: getStartDate(),
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
   * Transform our AdGroup type to Reddit API format
   */
  private transformAdGroup(
    adGroup: AdGroup,
    platformCampaignId: string
  ): RedditAdGroup {
    const settings = adGroup.settings;
    const bidding = settings?.bidding as { strategy?: string } | undefined;
    const targeting = settings?.targeting as {
      subreddits?: string[];
      interests?: string[];
      locations?: string[];
      devices?: ("DESKTOP" | "MOBILE" | "TABLET")[];
    } | undefined;

    const redditAdGroup: RedditAdGroup = {
      name: adGroup.name,
      campaign_id: platformCampaignId,
      bid_strategy: mapBidStrategy(bidding?.strategy),
      start_date: getStartDate(),
    };

    // Add bid amount for manual strategies
    const bidAmount = extractBidAmount(settings);
    if (bidAmount !== undefined) {
      redditAdGroup.bid_micro = bidAmount;
    }

    // Add targeting if present
    if (targeting) {
      redditAdGroup.targeting = {
        subreddits: targeting.subreddits,
        interests: targeting.interests,
        locations: targeting.locations,
        devices: targeting.devices,
      };
    }

    return redditAdGroup;
  }

  /**
   * Transform ad group for update (partial)
   */
  private transformAdGroupUpdate(adGroup: AdGroup): Partial<RedditAdGroup> {
    const settings = adGroup.settings;
    const bidding = settings?.bidding as { strategy?: string } | undefined;
    const targeting = settings?.targeting as {
      subreddits?: string[];
      interests?: string[];
      locations?: string[];
      devices?: ("DESKTOP" | "MOBILE" | "TABLET")[];
    } | undefined;

    const updates: Partial<RedditAdGroup> = {
      name: adGroup.name,
    };

    if (bidding?.strategy) {
      updates.bid_strategy = mapBidStrategy(bidding.strategy);
    }

    const bidAmount = extractBidAmount(settings);
    if (bidAmount !== undefined) {
      updates.bid_micro = bidAmount;
    }

    if (targeting) {
      updates.targeting = {
        subreddits: targeting.subreddits,
        interests: targeting.interests,
        locations: targeting.locations,
        devices: targeting.devices,
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

  /**
   * Handle errors from ad group operations
   *
   * Preserves retry information from RedditApiException.
   */
  private handleAdGroupError(error: unknown): PlatformAdGroupResult {
    if (error instanceof RedditApiException) {
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

  /**
   * Handle errors from ad operations
   *
   * Preserves retry information from RedditApiException.
   */
  private handleAdError(error: unknown): PlatformAdResult {
    if (error instanceof RedditApiException) {
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
}
