import type { RedditApiClient } from "./client.js";
import type { RedditApiListResponse } from "./types.js";

// ============================================================================
// Business Types
// ============================================================================

export interface RedditBusiness {
  id: string;
  name: string;
  industry?: string;
  created_at?: string;
  modified_at?: string;
}

// ============================================================================
// Ad Account Types
// ============================================================================

export interface RedditAdAccount {
  id: string;
  name: string;
  type: "MANAGED" | "SELF_SERVE";
  currency: string;
  business_id: string;
  time_zone_id?: string;
  admin_approval?: string;
  created_at?: string;
  modified_at?: string;
}

// ============================================================================
// Ad Account Service
// ============================================================================

export class AdAccountService {
  private readonly client: RedditApiClient;

  constructor(client: RedditApiClient) {
    this.client = client;
  }

  /**
   * List all businesses the authenticated user has access to
   * Step 1: GET /me/businesses
   */
  async listBusinesses(): Promise<RedditBusiness[]> {
    const response = await this.client.get<RedditApiListResponse<RedditBusiness>>(
      "/me/businesses"
    );

    return response.data;
  }

  /**
   * List ad accounts for a specific business
   * Step 2: GET /businesses/{business_id}/ad_accounts
   */
  async listAdAccountsByBusiness(businessId: string): Promise<RedditAdAccount[]> {
    const response = await this.client.get<RedditApiListResponse<RedditAdAccount>>(
      `/businesses/${businessId}/ad_accounts`
    );

    return response.data;
  }

  /**
   * List ALL ad accounts the authenticated user has access to across all businesses
   * This combines Step 1 and Step 2
   */
  async listAdAccounts(): Promise<RedditAdAccount[]> {
    // Step 1: Get all businesses
    const businesses = await this.listBusinesses();

    if (businesses.length === 0) {
      return [];
    }

    // Step 2: Get ad accounts for each business
    const allAccounts: RedditAdAccount[] = [];
    for (const business of businesses) {
      try {
        const accounts = await this.listAdAccountsByBusiness(business.id);
        allAccounts.push(...accounts);
      } catch (error) {
        // Log but continue if one business fails
        console.warn(`[AdAccountService] Failed to fetch accounts for business ${business.id}:`, error);
      }
    }

    return allAccounts;
  }

  /**
   * Get a specific ad account by ID
   */
  async getAdAccount(accountId: string): Promise<RedditAdAccount> {
    const response = await this.client.get<{ data: RedditAdAccount }>(
      `/ad_accounts/${accountId}`
    );

    return response.data;
  }
}
