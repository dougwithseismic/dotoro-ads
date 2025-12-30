import type { RedditApiClient } from "./client.js";
import type {
  RedditAdGroup,
  UpdateAdGroup,
  AdGroupResponse,
  AdGroupFilters,
  RedditApiResponse,
  RedditApiListResponse,
} from "./types.js";
import { RedditApiException } from "./types.js";

// ============================================================================
// Constants
// ============================================================================

/** Maximum length for ad group name (enforced by validation) */
const MAX_AD_GROUP_NAME_LENGTH = 255;

/**
 * Maximum number of ad groups per campaign (Reddit API limit).
 * This is an informational constant for consumers - the API will enforce this limit.
 * Use this for client-side validation or UI constraints.
 */
const MAX_AD_GROUPS_PER_CAMPAIGN = 100;

// ============================================================================
// Ad Group Service
// ============================================================================

export class AdGroupService {
  private readonly client: RedditApiClient;

  constructor(client: RedditApiClient) {
    this.client = client;
  }

  /**
   * Create a new ad group
   */
  async createAdGroup(
    accountId: string,
    adGroup: RedditAdGroup
  ): Promise<AdGroupResponse> {
    this.validateAdGroup(adGroup);

    const response = await this.client.post<RedditApiResponse<AdGroupResponse>>(
      `/ad_accounts/${accountId}/ad_groups`,
      { data: adGroup }
    );

    return response.data;
  }

  /**
   * Get an ad group by ID
   * Note: Reddit v3 API uses /ad_groups/{id} path (not under ad_accounts)
   */
  async getAdGroup(
    _accountId: string,
    adGroupId: string
  ): Promise<AdGroupResponse> {
    const response = await this.client.get<RedditApiResponse<AdGroupResponse>>(
      `/ad_groups/${adGroupId}`
    );

    return response.data;
  }

  /**
   * Update an ad group
   * Note: Reddit v3 API uses PATCH method and /ad_groups/{id} path (not PUT, not under ad_accounts)
   */
  async updateAdGroup(
    _accountId: string,
    adGroupId: string,
    updates: UpdateAdGroup
  ): Promise<AdGroupResponse> {
    if (updates.name) {
      this.validateAdGroupName(updates.name);
    }

    const response = await this.client.patch<RedditApiResponse<AdGroupResponse>>(
      `/ad_groups/${adGroupId}`,
      { data: updates }
    );

    return response.data;
  }

  /**
   * Delete an ad group
   * Note: Reddit v3 API uses /ad_groups/{id} path (not under ad_accounts)
   */
  async deleteAdGroup(_accountId: string, adGroupId: string): Promise<void> {
    await this.client.delete(`/ad_groups/${adGroupId}`);
  }

  /**
   * List ad groups with optional filters
   */
  async listAdGroups(
    accountId: string,
    filters?: AdGroupFilters
  ): Promise<AdGroupResponse[]> {
    const params = this.buildQueryParams(filters);

    const response = await this.client.get<RedditApiListResponse<AdGroupResponse>>(
      `/ad_accounts/${accountId}/ad_groups`,
      { params }
    );

    return response.data;
  }

  /**
   * Pause an active ad group
   */
  async pauseAdGroup(
    accountId: string,
    adGroupId: string
  ): Promise<AdGroupResponse> {
    return this.updateAdGroup(accountId, adGroupId, { status: "PAUSED" });
  }

  /**
   * Activate a paused ad group
   */
  async activateAdGroup(
    accountId: string,
    adGroupId: string
  ): Promise<AdGroupResponse> {
    return this.updateAdGroup(accountId, adGroupId, { status: "ACTIVE" });
  }

  /**
   * Get all ad groups for a specific campaign
   */
  async getAdGroupsByCampaign(
    accountId: string,
    campaignId: string
  ): Promise<AdGroupResponse[]> {
    return this.listAdGroups(accountId, { campaign_id: campaignId });
  }

  /**
   * Validate ad group data for Reddit v3 API
   * Note: v3 API uses configured_status instead of start_date, requires bid_type
   */
  private validateAdGroup(adGroup: RedditAdGroup): void {
    this.validateAdGroupName(adGroup.name);

    if (!adGroup.campaign_id) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: "Campaign ID is required",
        statusCode: 400,
        retryable: false,
      });
    }

    if (!adGroup.bid_strategy) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: "Bid strategy is required",
        statusCode: 400,
        retryable: false,
      });
    }

    if (!adGroup.bid_type) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: "Bid type is required",
        statusCode: 400,
        retryable: false,
      });
    }

    if (!adGroup.configured_status) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: "Configured status is required",
        statusCode: 400,
        retryable: false,
      });
    }
  }

  /**
   * Validate ad group name
   */
  private validateAdGroupName(name: string): void {
    if (name.length > MAX_AD_GROUP_NAME_LENGTH) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Ad group name must not exceed ${MAX_AD_GROUP_NAME_LENGTH} characters`,
        statusCode: 400,
        retryable: false,
      });
    }
  }

  /**
   * Build query parameters from filters
   */
  private buildQueryParams(
    filters?: AdGroupFilters
  ): Record<string, string | number> | undefined {
    if (!filters) {
      return undefined;
    }

    const params: Record<string, string | number> = {};

    if (filters.status) {
      params.status = filters.status;
    }

    if (filters.campaign_id) {
      params.campaign_id = filters.campaign_id;
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

export { MAX_AD_GROUP_NAME_LENGTH, MAX_AD_GROUPS_PER_CAMPAIGN };
