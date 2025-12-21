import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  adAccountSchema,
  accountListResponseSchema,
  accountQuerySchema,
  connectAccountRequestSchema,
  connectAccountResponseSchema,
  disconnectResponseSchema,
  accountStatusResponseSchema,
} from "../schemas/accounts.js";
import { idParamSchema } from "../schemas/common.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import { createNotFoundError, ApiException, ErrorCode } from "../lib/errors.js";

// In-memory mock data store
export const mockAccounts = new Map<string, z.infer<typeof adAccountSchema>>();

// Function to reset and seed mock data
export function seedMockAccounts() {
  mockAccounts.clear();

  const seedId = "990e8400-e29b-41d4-a716-446655440000";
  mockAccounts.set(seedId, {
    id: seedId,
    userId: null,
    platform: "reddit",
    accountId: "reddit_acc_12345",
    accountName: "My Reddit Ads Account",
    status: "active",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  });

  const seedId2 = "990e8400-e29b-41d4-a716-446655440001";
  mockAccounts.set(seedId2, {
    id: seedId2,
    userId: null,
    platform: "google",
    accountId: "google_acc_67890",
    accountName: "My Google Ads Account",
    status: "inactive",
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
  });
}

// Initial seed
seedMockAccounts();

// Create the OpenAPI Hono app
export const accountsApp = new OpenAPIHono();

// ============================================================================
// Route Definitions
// ============================================================================

const listAccountsRoute = createRoute({
  method: "get",
  path: "/api/v1/accounts",
  tags: ["Accounts"],
  summary: "List connected accounts",
  description: "Returns a paginated list of connected ad platform accounts",
  request: {
    query: accountQuerySchema,
  },
  responses: {
    200: {
      description: "List of accounts",
      content: {
        "application/json": {
          schema: accountListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const connectAccountRoute = createRoute({
  method: "post",
  path: "/api/v1/accounts/connect",
  tags: ["Accounts"],
  summary: "Initiate OAuth flow",
  description: "Initiates the OAuth flow to connect a new ad platform account",
  request: {
    body: {
      content: {
        "application/json": {
          schema: connectAccountRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "OAuth authorization URL",
      content: {
        "application/json": {
          schema: connectAccountResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const disconnectAccountRoute = createRoute({
  method: "delete",
  path: "/api/v1/accounts/{id}",
  tags: ["Accounts"],
  summary: "Disconnect account",
  description: "Disconnects an ad platform account",
  request: {
    params: idParamSchema,
  },
  responses: {
    204: {
      description: "Account disconnected",
    },
    ...commonResponses,
  },
});

const accountStatusRoute = createRoute({
  method: "get",
  path: "/api/v1/accounts/{id}/status",
  tags: ["Accounts"],
  summary: "Check account status",
  description: "Returns the current status of an ad platform account",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Account status",
      content: {
        "application/json": {
          schema: accountStatusResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

accountsApp.openapi(listAccountsRoute, async (c) => {
  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  let accounts = Array.from(mockAccounts.values());

  // Filter by platform if provided
  if (query.platform) {
    accounts = accounts.filter((a) => a.platform === query.platform);
  }

  // Filter by status if provided
  if (query.status) {
    accounts = accounts.filter((a) => a.status === query.status);
  }

  const total = accounts.length;
  const start = (page - 1) * limit;
  const data = accounts.slice(start, start + limit);

  return c.json(createPaginatedResponse(data, total, page, limit), 200);
});

accountsApp.openapi(connectAccountRoute, async (c) => {
  const body = c.req.valid("json");

  // Generate mock OAuth authorization URL
  const state = crypto.randomUUID();
  const authorizationUrl = getOAuthUrl(body.platform, body.redirectUri, state);

  return c.json(
    {
      authorizationUrl,
      state,
    },
    200
  );
});

accountsApp.openapi(disconnectAccountRoute, async (c) => {
  const { id } = c.req.valid("param");

  const account = mockAccounts.get(id);
  if (!account) {
    throw createNotFoundError("Account", id);
  }

  mockAccounts.delete(id);

  return c.body(null, 204);
});

accountsApp.openapi(accountStatusRoute, async (c) => {
  const { id } = c.req.valid("param");

  const account = mockAccounts.get(id);
  if (!account) {
    throw createNotFoundError("Account", id);
  }

  return c.json(
    {
      accountId: id,
      platform: account.platform,
      status: account.status,
      isConnected: account.status === "active",
      tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(), // Mock expiry
      lastChecked: new Date().toISOString(),
      error: null,
    },
    200
  );
});

// Helper function to generate OAuth URLs
function getOAuthUrl(platform: string, redirectUri: string, state: string): string {
  const oauthEndpoints: Record<string, string> = {
    reddit: "https://www.reddit.com/api/v1/authorize",
    google: "https://accounts.google.com/o/oauth2/v2/auth",
    facebook: "https://www.facebook.com/v18.0/dialog/oauth",
  };

  const baseUrl = oauthEndpoints[platform];
  if (!baseUrl) {
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      `Unsupported platform: ${platform}`,
      { supportedPlatforms: Object.keys(oauthEndpoints) }
    );
  }

  const params = new URLSearchParams({
    client_id: "PLACEHOLDER_CLIENT_ID",
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: platform === "reddit" ? "ads_read ads_write account" : "ads",
  });

  return `${baseUrl}?${params.toString()}`;
}

// Error handler for API exceptions
accountsApp.onError((err, c) => {
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  console.error("Unexpected error:", err);
  return c.json(
    {
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
    },
    500
  );
});

export default accountsApp;
