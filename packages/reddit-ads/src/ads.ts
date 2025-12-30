import type { RedditApiClient } from "./client.js";
import type {
  RedditAd,
  UpdateAd,
  AdResponse,
  AdFilters,
  RedditApiResponse,
  RedditApiListResponse,
} from "./types.js";
import { RedditApiException } from "./types.js";

// ============================================================================
// Constants
// ============================================================================

/** Maximum length for ad name (enforced by validation) */
const MAX_AD_NAME_LENGTH = 255;

/** Maximum length for ad headline (enforced by validation) */
const MAX_HEADLINE_LENGTH = 100;

/** Maximum length for ad body text (enforced by validation) */
const MAX_BODY_LENGTH = 500;

/** Maximum length for display URL (enforced by validation) */
const MAX_DISPLAY_URL_LENGTH = 25;

/**
 * Maximum number of ads per ad group (Reddit API limit).
 * This is an informational constant for consumers - the API will enforce this limit.
 * Use this for client-side validation or UI constraints.
 */
const MAX_ADS_PER_AD_GROUP = 50;

// ============================================================================
// Ad Service
// ============================================================================

export class AdService {
  private readonly client: RedditApiClient;

  constructor(client: RedditApiClient) {
    this.client = client;
  }

  /**
   * Create a new ad
   */
  async createAd(
    accountId: string,
    ad: RedditAd
  ): Promise<AdResponse> {
    this.validateAd(ad);

    const response = await this.client.post<RedditApiResponse<AdResponse>>(
      `/ad_accounts/${accountId}/ads`,
      { data: ad }
    );

    return response.data;
  }

  /**
   * Get an ad by ID
   * Note: Reddit v3 API uses /ads/{id} path (not under ad_accounts)
   */
  async getAd(
    _accountId: string,
    adId: string
  ): Promise<AdResponse> {
    const response = await this.client.get<RedditApiResponse<AdResponse>>(
      `/ads/${adId}`
    );

    return response.data;
  }

  /**
   * Update an ad
   * Note: Reddit v3 API uses PATCH method and /ads/{id} path (not PUT, not under ad_accounts)
   */
  async updateAd(
    _accountId: string,
    adId: string,
    updates: UpdateAd
  ): Promise<AdResponse> {
    this.validateAdUpdates(updates);

    const response = await this.client.patch<RedditApiResponse<AdResponse>>(
      `/ads/${adId}`,
      { data: updates }
    );

    return response.data;
  }

  /**
   * Delete an ad
   * Note: Reddit v3 API uses /ads/{id} path (not under ad_accounts)
   */
  async deleteAd(_accountId: string, adId: string): Promise<void> {
    await this.client.delete(`/ads/${adId}`);
  }

  /**
   * List ads with optional filters
   */
  async listAds(
    accountId: string,
    filters?: AdFilters
  ): Promise<AdResponse[]> {
    const params = this.buildQueryParams(filters);

    const response = await this.client.get<RedditApiListResponse<AdResponse>>(
      `/ad_accounts/${accountId}/ads`,
      { params }
    );

    return response.data;
  }

  /**
   * Pause an active ad
   */
  async pauseAd(
    accountId: string,
    adId: string
  ): Promise<AdResponse> {
    return this.updateAd(accountId, adId, { status: "PAUSED" });
  }

  /**
   * Activate a paused ad
   */
  async activateAd(
    accountId: string,
    adId: string
  ): Promise<AdResponse> {
    return this.updateAd(accountId, adId, { status: "ACTIVE" });
  }

  /**
   * Get all ads for a specific ad group
   */
  async getAdsByAdGroup(
    accountId: string,
    adGroupId: string
  ): Promise<AdResponse[]> {
    return this.listAds(accountId, { ad_group_id: adGroupId });
  }

  /**
   * Validate ad data
   */
  private validateAd(ad: RedditAd): void {
    if (ad.name && ad.name.length > MAX_AD_NAME_LENGTH) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Ad name must not exceed ${MAX_AD_NAME_LENGTH} characters`,
        statusCode: 400,
        retryable: false,
      });
    }

    if (!ad.headline) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: "Headline is required",
        statusCode: 400,
        retryable: false,
      });
    }

    if (ad.headline.length > MAX_HEADLINE_LENGTH) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Headline must not exceed ${MAX_HEADLINE_LENGTH} characters`,
        statusCode: 400,
        retryable: false,
      });
    }

    if (ad.body && ad.body.length > MAX_BODY_LENGTH) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Body must not exceed ${MAX_BODY_LENGTH} characters`,
        statusCode: 400,
        retryable: false,
      });
    }

    if (ad.display_url && ad.display_url.length > MAX_DISPLAY_URL_LENGTH) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Display URL must not exceed ${MAX_DISPLAY_URL_LENGTH} characters`,
        statusCode: 400,
        retryable: false,
      });
    }

    if (!ad.ad_group_id) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: "Ad group ID is required",
        statusCode: 400,
        retryable: false,
      });
    }

    if (!ad.click_url) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: "Click URL is required",
        statusCode: 400,
        retryable: false,
      });
    }

    if (!ad.call_to_action) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: "Call to action is required",
        statusCode: 400,
        retryable: false,
      });
    }
  }

  /**
   * Validate ad updates
   */
  private validateAdUpdates(updates: UpdateAd): void {
    if (updates.name && updates.name.length > MAX_AD_NAME_LENGTH) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Ad name must not exceed ${MAX_AD_NAME_LENGTH} characters`,
        statusCode: 400,
        retryable: false,
      });
    }

    if (updates.headline && updates.headline.length > MAX_HEADLINE_LENGTH) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Headline must not exceed ${MAX_HEADLINE_LENGTH} characters`,
        statusCode: 400,
        retryable: false,
      });
    }

    if (updates.body && updates.body.length > MAX_BODY_LENGTH) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Body must not exceed ${MAX_BODY_LENGTH} characters`,
        statusCode: 400,
        retryable: false,
      });
    }

    if (updates.display_url && updates.display_url.length > MAX_DISPLAY_URL_LENGTH) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Display URL must not exceed ${MAX_DISPLAY_URL_LENGTH} characters`,
        statusCode: 400,
        retryable: false,
      });
    }
  }

  /**
   * Build query parameters from filters
   */
  private buildQueryParams(
    filters?: AdFilters
  ): Record<string, string | number> | undefined {
    if (!filters) {
      return undefined;
    }

    const params: Record<string, string | number> = {};

    if (filters.status) {
      params.status = filters.status;
    }

    if (filters.ad_group_id) {
      params.ad_group_id = filters.ad_group_id;
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

export {
  MAX_AD_NAME_LENGTH,
  MAX_HEADLINE_LENGTH,
  MAX_BODY_LENGTH,
  MAX_DISPLAY_URL_LENGTH,
  MAX_ADS_PER_AD_GROUP,
};
