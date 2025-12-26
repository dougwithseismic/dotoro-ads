/**
 * Reddit Platform Poller
 *
 * Implements the PlatformPoller interface for Reddit Ads.
 * Fetches campaign status from Reddit's API and transforms
 * to the common PlatformCampaignStatus format.
 *
 * Uses the Reddit Ads API client to:
 * - Get individual campaign status
 * - List all campaigns for an account
 */

import type { PlatformPoller, PlatformCampaignStatus, PlatformStatusValue } from "./platform-poller.js";
import type { RedditApiClient, CampaignResponse, CampaignStatus, RedditApiResponse, RedditApiListResponse } from "@repo/reddit-ads";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conversion factor from Reddit API micro-units to dollars
 * Reddit API uses micro-units: 1,000,000 micro-units = $1.00
 */
const MICRO_UNITS_DIVISOR = 1_000_000;

// ─────────────────────────────────────────────────────────────────────────────
// Transformation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert Reddit API micro-units to dollars
 */
function fromMicroUnits(microUnits: number): number {
  return microUnits / MICRO_UNITS_DIVISOR;
}

/**
 * Map Reddit campaign status to our normalized status
 */
function mapRedditStatus(status: CampaignStatus): PlatformStatusValue {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "PAUSED":
      return "paused";
    case "COMPLETED":
      return "completed";
    case "DELETED":
      return "deleted";
    default:
      // Unknown status maps to error
      return "error";
  }
}

/**
 * Extract budget from Reddit campaign response
 *
 * Prefers daily budget if both are set.
 */
function extractBudget(
  campaign: CampaignResponse
): PlatformCampaignStatus["budget"] | undefined {
  if (campaign.daily_budget_micro !== null && campaign.daily_budget_micro !== undefined) {
    return {
      type: "daily",
      amount: fromMicroUnits(campaign.daily_budget_micro),
    };
  }

  if (campaign.total_budget_micro !== null && campaign.total_budget_micro !== undefined) {
    return {
      type: "lifetime",
      amount: fromMicroUnits(campaign.total_budget_micro),
    };
  }

  return undefined;
}

/**
 * Transform Reddit campaign response to our PlatformCampaignStatus
 */
function transformCampaign(campaign: CampaignResponse): PlatformCampaignStatus {
  return {
    platformId: campaign.id,
    status: mapRedditStatus(campaign.status),
    budget: extractBudget(campaign),
    lastModified: new Date(campaign.updated_at),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reddit Poller Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reddit Platform Poller
 *
 * Fetches campaign status from Reddit Ads API.
 *
 * @example
 * ```typescript
 * const client = new RedditApiClient({ accessToken: "..." });
 * const poller = new RedditPoller(client, "account-123");
 *
 * // Get single campaign status
 * const status = await poller.getCampaignStatus("campaign-456");
 * if (status) {
 *   console.log(`Campaign is ${status.status}`);
 * }
 *
 * // Get all campaign statuses
 * const statuses = await poller.listCampaignStatuses("account-123");
 * ```
 */
export class RedditPoller implements PlatformPoller {
  readonly platform = "reddit";

  private readonly client: RedditApiClient;
  private readonly accountId: string;

  /**
   * Create a new Reddit poller
   *
   * @param client - Reddit API client instance
   * @param accountId - Reddit ad account ID
   */
  constructor(client: RedditApiClient, accountId: string) {
    this.client = client;
    this.accountId = accountId;
  }

  /**
   * Fetch status for a single campaign
   *
   * @param platformCampaignId - The Reddit campaign ID
   * @returns The campaign status, or null if not found (deleted)
   */
  async getCampaignStatus(
    platformCampaignId: string
  ): Promise<PlatformCampaignStatus | null> {
    try {
      const response = await this.client.get<RedditApiResponse<CampaignResponse>>(
        `/accounts/${this.accountId}/campaigns/${platformCampaignId}`
      );

      return transformCampaign(response.data);
    } catch (error) {
      // If 404, campaign was deleted
      if (this.is404Error(error)) {
        return null;
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Fetch all campaign statuses for an account
   *
   * @param accountId - The Reddit ad account ID
   * @returns Array of campaign statuses
   */
  async listCampaignStatuses(accountId: string): Promise<PlatformCampaignStatus[]> {
    const response = await this.client.get<RedditApiListResponse<CampaignResponse>>(
      `/accounts/${accountId}/campaigns`,
      { params: undefined }
    );

    return response.data.map(transformCampaign);
  }

  /**
   * Check if an error is a 404 Not Found error
   */
  private is404Error(error: unknown): boolean {
    if (error && typeof error === "object") {
      const errorObj = error as { statusCode?: number; status?: number };
      return errorObj.statusCode === 404 || errorObj.status === 404;
    }
    return false;
  }
}
