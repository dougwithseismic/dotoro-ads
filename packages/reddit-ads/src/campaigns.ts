import type { RedditApiClient } from "./client.js";
import type {
  RedditCampaign,
  UpdateCampaign,
  CampaignResponse,
  CampaignFilters,
  RedditApiResponse,
  RedditApiListResponse,
} from "./types.js";
import { RedditApiException } from "./types.js";

// ============================================================================
// Constants
// ============================================================================

/** Maximum length for campaign name (enforced by validation) */
const MAX_CAMPAIGN_NAME_LENGTH = 255;

/**
 * Maximum number of campaigns per account (Reddit API limit).
 * This is an informational constant for consumers - the API will enforce this limit.
 * Use this for client-side validation or UI constraints.
 */
const MAX_CAMPAIGNS_PER_ACCOUNT = 10000;

// ============================================================================
// Campaign Service
// ============================================================================

export class CampaignService {
  private readonly client: RedditApiClient;

  constructor(client: RedditApiClient) {
    this.client = client;
  }

  /**
   * Create a new campaign
   * Note: Reddit v3 API requires the payload to be wrapped in a "data" object
   */
  async createCampaign(
    accountId: string,
    campaign: RedditCampaign
  ): Promise<CampaignResponse> {
    this.validateCampaign(campaign);

    const response = await this.client.post<RedditApiResponse<CampaignResponse>>(
      `/ad_accounts/${accountId}/campaigns`,
      { data: campaign }
    );

    return response.data;
  }

  /**
   * Get a campaign by ID
   * Note: Reddit v3 API uses /campaigns/{id} path (not under ad_accounts)
   */
  async getCampaign(
    _accountId: string,
    campaignId: string
  ): Promise<CampaignResponse> {
    const response = await this.client.get<RedditApiResponse<CampaignResponse>>(
      `/campaigns/${campaignId}`
    );

    return response.data;
  }

  /**
   * Update a campaign
   * Note: Reddit v3 API uses PATCH method and /campaigns/{id} path (not PUT, not under ad_accounts)
   */
  async updateCampaign(
    _accountId: string,
    campaignId: string,
    updates: UpdateCampaign
  ): Promise<CampaignResponse> {
    if (updates.name) {
      this.validateCampaignName(updates.name);
    }

    const response = await this.client.patch<RedditApiResponse<CampaignResponse>>(
      `/campaigns/${campaignId}`,
      { data: updates }
    );

    return response.data;
  }

  /**
   * Delete a campaign
   * Note: Reddit v3 API uses /campaigns/{id} path (not under ad_accounts)
   */
  async deleteCampaign(_accountId: string, campaignId: string): Promise<void> {
    await this.client.delete(`/campaigns/${campaignId}`);
  }

  /**
   * List campaigns with optional filters
   */
  async listCampaigns(
    accountId: string,
    filters?: CampaignFilters
  ): Promise<CampaignResponse[]> {
    const params = this.buildQueryParams(filters);

    const response = await this.client.get<RedditApiListResponse<CampaignResponse>>(
      `/ad_accounts/${accountId}/campaigns`,
      { params }
    );

    return response.data;
  }

  /**
   * Pause an active campaign
   * Note: Reddit v3 API uses configured_status instead of status
   */
  async pauseCampaign(
    accountId: string,
    campaignId: string
  ): Promise<CampaignResponse> {
    return this.updateCampaign(accountId, campaignId, { configured_status: "PAUSED" });
  }

  /**
   * Activate a paused campaign
   * Note: Reddit v3 API uses configured_status instead of status
   */
  async activateCampaign(
    accountId: string,
    campaignId: string
  ): Promise<CampaignResponse> {
    return this.updateCampaign(accountId, campaignId, { configured_status: "ACTIVE" });
  }

  /**
   * Validate campaign data for Reddit v3 API
   * Note: v3 API uses configured_status instead of start_date
   */
  private validateCampaign(campaign: RedditCampaign): void {
    this.validateCampaignName(campaign.name);

    if (!campaign.objective) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: "Campaign objective is required",
        statusCode: 400,
        retryable: false,
      });
    }

    if (!campaign.configured_status) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: "Configured status is required",
        statusCode: 400,
        retryable: false,
      });
    }
  }

  /**
   * Validate campaign name
   */
  private validateCampaignName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: "Campaign name is required",
        statusCode: 400,
        retryable: false,
      });
    }

    if (name.length > MAX_CAMPAIGN_NAME_LENGTH) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Campaign name must not exceed ${MAX_CAMPAIGN_NAME_LENGTH} characters`,
        statusCode: 400,
        retryable: false,
      });
    }
  }

  /**
   * Build query parameters from filters
   */
  private buildQueryParams(
    filters?: CampaignFilters
  ): Record<string, string | number> | undefined {
    if (!filters) {
      return undefined;
    }

    const params: Record<string, string | number> = {};

    if (filters.status) {
      params.status = filters.status;
    }

    if (filters.objective) {
      params.objective = filters.objective;
    }

    if (filters.page) {
      params.page = filters.page;
    }

    if (filters.limit) {
      params.limit = filters.limit;
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }
}

export { MAX_CAMPAIGN_NAME_LENGTH, MAX_CAMPAIGNS_PER_ACCOUNT };
