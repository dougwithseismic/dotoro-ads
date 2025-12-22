import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, and, count } from "drizzle-orm";
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
import { db, adAccounts, oauthTokens } from "../services/db.js";

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
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];
  if (query.platform) {
    conditions.push(eq(adAccounts.platform, query.platform));
  }
  if (query.status) {
    conditions.push(eq(adAccounts.status, query.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(adAccounts)
    .where(whereClause);
  const total = countResult?.count ?? 0;

  // Get paginated data
  const accounts = await db
    .select()
    .from(adAccounts)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(adAccounts.createdAt);

  // Convert to API format
  const data = accounts.map((account) => ({
    id: account.id,
    userId: account.userId,
    platform: account.platform as "reddit" | "google" | "facebook",
    accountId: account.accountId,
    accountName: account.accountName,
    status: account.status,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  }));

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

  // Check if account exists
  const [account] = await db
    .select()
    .from(adAccounts)
    .where(eq(adAccounts.id, id))
    .limit(1);

  if (!account) {
    throw createNotFoundError("Account", id);
  }

  // Delete the account (cascade will delete oauth tokens)
  await db.delete(adAccounts).where(eq(adAccounts.id, id));

  return c.body(null, 204);
});

accountsApp.openapi(accountStatusRoute, async (c) => {
  const { id } = c.req.valid("param");

  // Get account with oauth token
  const [account] = await db
    .select()
    .from(adAccounts)
    .where(eq(adAccounts.id, id))
    .limit(1);

  if (!account) {
    throw createNotFoundError("Account", id);
  }

  // Get oauth token if exists
  const [token] = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.adAccountId, id))
    .limit(1);

  return c.json(
    {
      accountId: id,
      platform: account.platform as "reddit" | "google" | "facebook",
      status: account.status,
      isConnected: account.status === "active",
      tokenExpiresAt: token?.expiresAt?.toISOString() ?? null,
      lastChecked: new Date().toISOString(),
      error: account.status === "error" ? "Account has an error" : null,
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
