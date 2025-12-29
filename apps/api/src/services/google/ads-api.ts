/**
 * Google Ads API Client
 *
 * Wrapper for Google Ads REST API v18.
 * Used for listing accessible customers and fetching account details.
 */

// ============================================================================
// Constants
// ============================================================================

const GOOGLE_ADS_API_VERSION = "v19";
const GOOGLE_ADS_API_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

// ============================================================================
// Types
// ============================================================================

export interface GoogleAdsApiConfig {
  accessToken: string;
  developerToken?: string;
  loginCustomerId?: string; // Required when operating on a client account via manager
}

export interface GoogleAdsCustomer {
  id: string;
  resourceName: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  manager: boolean; // True if this is a manager account (MCC)
}

export interface GoogleAdsCustomerClient {
  clientCustomer: string;
  hidden: boolean;
  level: number;
  descriptiveName?: string;
}

// ============================================================================
// Google Ads API Client
// ============================================================================

export class GoogleAdsApiClient {
  private readonly accessToken: string;
  private readonly developerToken: string;
  private readonly loginCustomerId?: string;

  constructor(config: GoogleAdsApiConfig) {
    const developerToken = config.developerToken ?? process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    if (!developerToken) {
      throw new Error("Google Ads developer token is required. Set GOOGLE_ADS_DEVELOPER_TOKEN environment variable or provide developerToken in config.");
    }

    this.accessToken = config.accessToken;
    this.developerToken = developerToken;
    this.loginCustomerId = config.loginCustomerId;
  }

  /**
   * Make an authenticated request to the Google Ads API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST";
      body?: Record<string, unknown>;
      customerId?: string;
    } = {}
  ): Promise<T> {
    const { method = "GET", body, customerId } = options;

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      // Developer token is always included (required in constructor)
      "developer-token": this.developerToken,
    };

    // login-customer-id is required when accessing client accounts via a manager account
    if (this.loginCustomerId) {
      headers["login-customer-id"] = this.loginCustomerId;
    }

    const url = customerId
      ? `${GOOGLE_ADS_API_BASE_URL}/customers/${customerId}${endpoint}`
      : `${GOOGLE_ADS_API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Sanitize error message to avoid exposing sensitive information
      // (developer token, access token, etc. should never appear in error messages)
      let errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        `Google Ads API request failed with status ${response.status}`;

      // Redact any potential token exposure in error messages
      errorMessage = errorMessage
        .replace(/developer.?token[=:\s]+[^\s&]+/gi, "developer-token=[REDACTED]")
        .replace(/access.?token[=:\s]+[^\s&]+/gi, "access-token=[REDACTED]")
        .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]");

      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  /**
   * List all accessible customers (accounts) for the authenticated user
   *
   * This endpoint returns the resource names of all accounts the user has access to.
   * It does not require a customer ID.
   *
   * @see https://developers.google.com/google-ads/api/rest/reference/rest/v18/customers/listAccessibleCustomers
   */
  async listAccessibleCustomers(): Promise<string[]> {
    interface ListAccessibleCustomersResponse {
      resourceNames: string[];
    }

    const response = await this.makeRequest<ListAccessibleCustomersResponse>(
      "/customers:listAccessibleCustomers"
    );

    return response.resourceNames ?? [];
  }

  /**
   * Get detailed information about a specific customer using GAQL query
   * This is more reliable than the REST GET endpoint when accessing accounts through a manager
   *
   * @param customerId - The customer ID (without dashes, e.g., "1234567890")
   * @param loginCustomerId - Optional manager account ID to use for access
   * @see https://developers.google.com/google-ads/api/docs/query/overview
   */
  async getCustomer(customerId: string, loginCustomerId?: string): Promise<GoogleAdsCustomer> {
    interface SearchResponse {
      results?: Array<{
        customer: {
          resourceName: string;
          id: string;
          descriptiveName?: string;
          currencyCode?: string;
          timeZone?: string;
          manager?: boolean;
        };
      }>;
    }

    const query = `
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone,
        customer.manager,
        customer.resource_name
      FROM customer
      LIMIT 1
    `;

    // Build headers - include login-customer-id if provided
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "developer-token": this.developerToken,
    };

    if (loginCustomerId) {
      headers["login-customer-id"] = loginCustomerId;
    }

    const url = `${GOOGLE_ADS_API_BASE_URL}/customers/${customerId}/googleAds:search`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        `Google Ads API request failed with status ${response.status}`;

      // Redact any potential token exposure in error messages
      errorMessage = errorMessage
        .replace(/developer.?token[=:\s]+[^\s&]+/gi, "developer-token=[REDACTED]")
        .replace(/access.?token[=:\s]+[^\s&]+/gi, "access-token=[REDACTED]")
        .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]");

      throw new Error(errorMessage);
    }

    const data = await response.json() as SearchResponse;

    if (!data.results || data.results.length === 0) {
      throw new Error(`No customer data found for ${customerId}`);
    }

    const customer = data.results[0].customer;

    return {
      id: customer.id,
      resourceName: customer.resourceName,
      descriptiveName: customer.descriptiveName ?? `Account ${customer.id}`,
      currencyCode: customer.currencyCode ?? "USD",
      timeZone: customer.timeZone ?? "America/New_York",
      manager: customer.manager ?? false,
    };
  }

  /**
   * List all customer client links for a manager account
   *
   * This returns all client accounts managed by the specified manager account.
   * Only works for manager (MCC) accounts.
   *
   * @param managerCustomerId - The manager account customer ID
   * @see https://developers.google.com/google-ads/api/rest/reference/rest/v19/customers.customerClients
   */
  async listManagedAccounts(managerCustomerId: string): Promise<GoogleAdsCustomerClient[]> {
    // Use Google Ads Query Language (GAQL) to fetch customer clients
    interface SearchResponse {
      results?: Array<{
        customerClient: {
          clientCustomer: string;
          hidden: boolean;
          level: number;
          descriptiveName?: string;
        };
      }>;
    }

    const query = `
      SELECT
        customer_client.client_customer,
        customer_client.hidden,
        customer_client.level,
        customer_client.descriptive_name
      FROM customer_client
      WHERE customer_client.level <= 1
        AND customer_client.hidden = FALSE
    `;

    // For REST API, use googleAds:search (not searchStream which is gRPC)
    const response = await this.makeRequest<SearchResponse>(
      `/googleAds:search`,
      {
        method: "POST",
        body: { query },
        customerId: managerCustomerId,
      }
    );

    if (!response.results) {
      return [];
    }

    return response.results.map((result) => ({
      clientCustomer: result.customerClient.clientCustomer,
      hidden: result.customerClient.hidden,
      level: result.customerClient.level,
      descriptiveName: result.customerClient.descriptiveName,
    }));
  }

  /**
   * Get accessible accounts with full details
   *
   * This handles the Google Ads account hierarchy correctly:
   * 1. Lists all accessible customers (includes manager and client accounts)
   * 2. Tries direct access first (works for manager accounts)
   * 3. For failed accounts, tries accessing via each manager as login-customer-id
   * 4. Returns all accounts with proper hierarchy
   *
   * @returns Array of customer details with nested client accounts for managers
   */
  async getAccessibleAccountsWithDetails(): Promise<
    Array<GoogleAdsCustomer & { clients?: GoogleAdsCustomer[] }>
  > {
    // Step 1: Get all accessible customer resource names
    const resourceNames = await this.listAccessibleCustomers();
    console.log("[Google Ads API] listAccessibleCustomers returned:", resourceNames);

    const customerIds = resourceNames.map((name) =>
      name.replace("customers/", "")
    );
    console.log("[Google Ads API] Customer IDs to fetch:", customerIds);

    // Step 2: Try direct access for each account
    // Manager accounts and accounts with direct access will succeed
    const directAccessResults: Array<{ id: string; customer: GoogleAdsCustomer | null; error?: string }> = [];

    for (const id of customerIds) {
      try {
        const customer = await this.getCustomer(id);
        console.log(`[Google Ads API] Direct access SUCCESS for ${id}:`, {
          name: customer.descriptiveName,
          manager: customer.manager,
        });
        directAccessResults.push({ id, customer });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`[Google Ads API] Direct access FAILED for ${id}: ${errorMsg}`);
        directAccessResults.push({ id, customer: null, error: errorMsg });
      }
    }

    // Step 3: Collect successful accounts (managers and direct-access accounts)
    const successfulAccounts = directAccessResults
      .filter((r): r is { id: string; customer: GoogleAdsCustomer } => r.customer !== null)
      .map((r) => r.customer);

    const failedAccountIds = directAccessResults
      .filter((r) => r.customer === null)
      .map((r) => r.id);

    console.log("[Google Ads API] Successful direct access:", successfulAccounts.map(c => c.id));
    console.log("[Google Ads API] Failed direct access:", failedAccountIds);

    // Step 4: For each manager account, query customer_clients to build hierarchy
    const managerAccounts = successfulAccounts.filter((c) => c.manager);
    console.log("[Google Ads API] Manager accounts found:", managerAccounts.map(c => c.id));

    // Build final result with client accounts under managers
    const result: Array<GoogleAdsCustomer & { clients?: GoogleAdsCustomer[] }> = [];
    const accountsFoundViaManagers = new Set<string>();

    for (const manager of managerAccounts) {
      console.log(`[Google Ads API] Fetching clients for manager ${manager.id}...`);
      try {
        const clientLinks = await this.listManagedAccounts(manager.id);
        console.log(`[Google Ads API] Manager ${manager.id} has ${clientLinks.length} client links`);

        // Fetch details for each client (using manager as login-customer-id)
        const clients: GoogleAdsCustomer[] = [];
        for (const link of clientLinks) {
          const clientId = link.clientCustomer.replace("customers/", "");

          // Skip the manager itself (level 0 in customer_client includes self)
          if (clientId === manager.id) continue;

          accountsFoundViaManagers.add(clientId);

          try {
            // Use the manager as login-customer-id to access client account
            const client = await this.getCustomer(clientId, manager.id);
            console.log(`[Google Ads API] Got client ${clientId} via manager ${manager.id}:`, {
              name: client.descriptiveName,
              manager: client.manager,
            });
            clients.push(client);
          } catch (clientError) {
            console.warn(`[Google Ads API] Failed to get client ${clientId} via manager:`,
              clientError instanceof Error ? clientError.message : String(clientError));
            // Use link info as fallback
            clients.push({
              id: clientId,
              resourceName: link.clientCustomer,
              descriptiveName: link.descriptiveName ?? `Account ${clientId}`,
              currencyCode: "USD",
              timeZone: "America/New_York",
              manager: false,
            });
          }
        }

        result.push({ ...manager, clients });
      } catch (error) {
        console.warn(`[Google Ads API] Failed to get clients for manager ${manager.id}:`,
          error instanceof Error ? error.message : String(error));
        result.push(manager);
      }
    }

    // Step 5: Add non-manager accounts that have direct access (not found via managers)
    const nonManagerAccounts = successfulAccounts.filter((c) => !c.manager);
    for (const account of nonManagerAccounts) {
      if (!accountsFoundViaManagers.has(account.id)) {
        console.log(`[Google Ads API] Adding standalone account ${account.id}`);
        result.push(account);
      }
    }

    // Step 6: For any remaining failed accounts, try accessing via each manager
    for (const failedId of failedAccountIds) {
      if (accountsFoundViaManagers.has(failedId)) {
        console.log(`[Google Ads API] Account ${failedId} already found via manager, skipping`);
        continue;
      }

      // Try each manager as login-customer-id
      let found = false;
      for (const manager of managerAccounts) {
        try {
          const customer = await this.getCustomer(failedId, manager.id);
          console.log(`[Google Ads API] Found ${failedId} via manager ${manager.id}:`, {
            name: customer.descriptiveName,
            manager: customer.manager,
          });

          // Add to the manager's clients if not already there
          const managerResult = result.find((r) => r.id === manager.id);
          if (managerResult && managerResult.clients) {
            if (!managerResult.clients.some((c) => c.id === customer.id)) {
              managerResult.clients.push(customer);
            }
          }
          found = true;
          break;
        } catch {
          // Continue trying other managers
        }
      }

      if (!found) {
        console.warn(`[Google Ads API] Could not access account ${failedId} via any manager`);
      }
    }

    console.log("[Google Ads API] Final result:", result.map(c => ({
      id: c.id,
      name: c.descriptiveName,
      manager: c.manager,
      clientCount: c.clients?.length ?? 0,
    })));

    return result;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract customer ID from a resource name
 * e.g., "customers/1234567890" -> "1234567890"
 */
export function extractCustomerId(resourceName: string): string {
  return resourceName.replace("customers/", "");
}

/**
 * Format customer ID for display (add dashes)
 * e.g., "1234567890" -> "123-456-7890"
 */
export function formatCustomerId(customerId: string): string {
  const cleaned = customerId.replace(/-/g, "");
  if (cleaned.length !== 10) {
    return customerId;
  }
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}

/**
 * Parse customer ID from formatted string (remove dashes)
 * e.g., "123-456-7890" -> "1234567890"
 */
export function parseCustomerId(formattedId: string): string {
  return formattedId.replace(/-/g, "");
}
