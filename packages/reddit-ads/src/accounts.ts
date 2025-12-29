import type { RedditApiClient } from "./client.js";
import type { RedditApiListResponse } from "./types.js";

// ============================================================================
// Ad Account Types
// ============================================================================

export interface RedditAdAccount {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DELETED";
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
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
   * List all ad accounts the authenticated user has access to
   */
  async listAdAccounts(): Promise<RedditAdAccount[]> {
    const response = await this.client.get<RedditApiListResponse<RedditAdAccount>>(
      "/me/ad_accounts"
    );

    return response.data;
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
