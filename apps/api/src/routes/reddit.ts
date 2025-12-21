import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  redditOAuthCallbackSchema,
  redditOAuthInitSchema,
  redditOAuthInitResponseSchema,
  redditCampaignCreateSchema,
  redditCampaignResponseSchema,
  redditCampaignUpdateSchema,
  redditCampaignStatusResponseSchema,
  redditSyncRequestSchema,
  redditSyncResponseSchema,
  redditCampaignIdParamSchema,
} from "../schemas/reddit.js";
import { commonResponses } from "../lib/openapi.js";
import { createNotFoundError, ApiException, ErrorCode } from "../lib/errors.js";
import { getRedditOAuthService } from "../services/reddit/oauth.js";

// ============================================================================
// Mock data stores
// ============================================================================

interface RedditCampaignRecord {
  id: string;
  localId: string;
  accountId: string;
  platformId: string | null;
  name: string;
  objective: "AWARENESS" | "CONSIDERATION" | "CONVERSIONS";
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "DELETED";
  fundingInstrumentId: string;
  startDate: string;
  endDate: string | null;
  totalBudgetMicro: number | null;
  dailyBudgetMicro: number | null;
  isPaid: boolean;
  syncStatus: "synced" | "pending" | "error";
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const mockRedditCampaigns = new Map<string, RedditCampaignRecord>();

// Seed data
mockRedditCampaigns.set("camp_mock_001", {
  id: "camp_mock_001",
  localId: "local_001",
  accountId: "t5_abc123",
  platformId: "reddit_camp_001",
  name: "Demo Campaign",
  objective: "CONVERSIONS",
  status: "ACTIVE",
  fundingInstrumentId: "fi_xyz789",
  startDate: "2025-01-15T00:00:00Z",
  endDate: null,
  totalBudgetMicro: 100000000,
  dailyBudgetMicro: 10000000,
  isPaid: true,
  syncStatus: "synced",
  lastSyncedAt: "2025-01-15T12:00:00Z",
  createdAt: "2025-01-10T00:00:00Z",
  updatedAt: "2025-01-15T12:00:00Z",
});

// ============================================================================
// Create the OpenAPI Hono app
// ============================================================================

export const redditApp = new OpenAPIHono();

// ============================================================================
// OAuth Routes
// ============================================================================

const initOAuthRoute = createRoute({
  method: "post",
  path: "/api/v1/reddit/auth/init",
  tags: ["Reddit OAuth"],
  summary: "Initialize Reddit OAuth flow",
  description: "Generates an authorization URL for Reddit OAuth",
  request: {
    body: {
      content: {
        "application/json": {
          schema: redditOAuthInitSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Authorization URL generated",
      content: {
        "application/json": {
          schema: redditOAuthInitResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const oauthCallbackRoute = createRoute({
  method: "get",
  path: "/api/v1/reddit/auth/callback",
  tags: ["Reddit OAuth"],
  summary: "OAuth callback handler",
  description: "Handles the OAuth callback from Reddit and exchanges code for tokens",
  request: {
    query: redditOAuthCallbackSchema,
  },
  responses: {
    200: {
      description: "Tokens obtained successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            accountId: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Campaign Routes
// ============================================================================

const createCampaignRoute = createRoute({
  method: "post",
  path: "/api/v1/reddit/campaigns",
  tags: ["Reddit Campaigns"],
  summary: "Create Reddit campaign",
  description: "Creates a new campaign on Reddit Ads",
  request: {
    body: {
      content: {
        "application/json": {
          schema: redditCampaignCreateSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Campaign created successfully",
      content: {
        "application/json": {
          schema: redditCampaignResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const getCampaignRoute = createRoute({
  method: "get",
  path: "/api/v1/reddit/campaigns/{id}",
  tags: ["Reddit Campaigns"],
  summary: "Get Reddit campaign",
  description: "Retrieves a specific Reddit campaign",
  request: {
    params: redditCampaignIdParamSchema,
  },
  responses: {
    200: {
      description: "Campaign details",
      content: {
        "application/json": {
          schema: redditCampaignResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const updateCampaignRoute = createRoute({
  method: "put",
  path: "/api/v1/reddit/campaigns/{id}",
  tags: ["Reddit Campaigns"],
  summary: "Update Reddit campaign",
  description: "Updates an existing Reddit campaign",
  request: {
    params: redditCampaignIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: redditCampaignUpdateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Campaign updated successfully",
      content: {
        "application/json": {
          schema: redditCampaignResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const deleteCampaignRoute = createRoute({
  method: "delete",
  path: "/api/v1/reddit/campaigns/{id}",
  tags: ["Reddit Campaigns"],
  summary: "Delete Reddit campaign",
  description: "Deletes a Reddit campaign",
  request: {
    params: redditCampaignIdParamSchema,
  },
  responses: {
    204: {
      description: "Campaign deleted successfully",
    },
    ...commonResponses,
  },
});

const getCampaignStatusRoute = createRoute({
  method: "get",
  path: "/api/v1/reddit/campaigns/{id}/status",
  tags: ["Reddit Campaigns"],
  summary: "Get campaign status",
  description: "Gets the sync and platform status of a campaign",
  request: {
    params: redditCampaignIdParamSchema,
  },
  responses: {
    200: {
      description: "Campaign status",
      content: {
        "application/json": {
          schema: redditCampaignStatusResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Sync Routes
// ============================================================================

const syncCampaignsRoute = createRoute({
  method: "post",
  path: "/api/v1/reddit/sync",
  tags: ["Reddit Sync"],
  summary: "Sync campaigns to Reddit",
  description: "Syncs local campaigns to Reddit Ads platform",
  request: {
    body: {
      content: {
        "application/json": {
          schema: redditSyncRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Sync completed",
      content: {
        "application/json": {
          schema: redditSyncResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

redditApp.openapi(initOAuthRoute, async (c) => {
  try {
    const body = c.req.valid("json");
    const oauthService = getRedditOAuthService();
    const result = oauthService.initializeOAuth(body.accountId, body.redirectUri);

    return c.json(
      {
        authorizationUrl: result.authorizationUrl,
        state: result.state,
      },
      200
    );
  } catch (error) {
    throw new ApiException(
      500,
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : "Failed to initialize OAuth"
    );
  }
});

redditApp.openapi(oauthCallbackRoute, async (c) => {
  try {
    const query = c.req.valid("query");
    const oauthService = getRedditOAuthService();
    const result = await oauthService.handleCallback(query.code, query.state);

    return c.json(
      {
        success: true,
        accountId: result.accountId,
        message: "Reddit account connected successfully",
      },
      200
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "OAuth callback failed";

    // Categorize OAuth errors appropriately
    if (errorMessage.includes("expired")) {
      throw new ApiException(
        401,
        ErrorCode.TOKEN_EXPIRED,
        "OAuth session expired. Please restart the authorization flow."
      );
    }

    if (errorMessage.includes("Invalid") || errorMessage.includes("invalid")) {
      throw new ApiException(
        400,
        ErrorCode.INVALID_REQUEST,
        "Invalid OAuth state or code. Please restart the authorization flow."
      );
    }

    // Log the actual error for debugging but don't expose internal details
    console.error("[Reddit OAuth] Callback error:", errorMessage);
    throw new ApiException(
      400,
      ErrorCode.INVALID_REQUEST,
      "OAuth callback failed. Please try again."
    );
  }
});

redditApp.openapi(createCampaignRoute, async (c) => {
  const body = c.req.valid("json");

  // Create mock campaign
  const campaignId = `camp_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const campaign: RedditCampaignRecord = {
    id: campaignId,
    localId: crypto.randomUUID(),
    accountId: body.accountId,
    platformId: null, // Will be set after sync
    name: body.name,
    objective: body.objective,
    status: "PAUSED",
    fundingInstrumentId: body.fundingInstrumentId,
    startDate: body.startDate,
    endDate: body.endDate ?? null,
    totalBudgetMicro: body.totalBudgetMicro ?? null,
    dailyBudgetMicro: body.dailyBudgetMicro ?? null,
    isPaid: false,
    syncStatus: "pending",
    lastSyncedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  mockRedditCampaigns.set(campaignId, campaign);

  return c.json(
    {
      id: campaign.id,
      accountId: campaign.accountId,
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      totalBudgetMicro: campaign.totalBudgetMicro,
      dailyBudgetMicro: campaign.dailyBudgetMicro,
      isPaid: campaign.isPaid,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    },
    201
  );
});

redditApp.openapi(getCampaignRoute, async (c) => {
  const { id } = c.req.valid("param");

  const campaign = mockRedditCampaigns.get(id);
  if (!campaign) {
    throw createNotFoundError("Reddit Campaign", id);
  }

  return c.json(
    {
      id: campaign.id,
      accountId: campaign.accountId,
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      totalBudgetMicro: campaign.totalBudgetMicro,
      dailyBudgetMicro: campaign.dailyBudgetMicro,
      isPaid: campaign.isPaid,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    },
    200
  );
});

redditApp.openapi(updateCampaignRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const campaign = mockRedditCampaigns.get(id);
  if (!campaign) {
    throw createNotFoundError("Reddit Campaign", id);
  }

  // Update fields
  if (body.name !== undefined) campaign.name = body.name;
  if (body.status !== undefined) campaign.status = body.status;
  if (body.endDate !== undefined) campaign.endDate = body.endDate;
  if (body.totalBudgetMicro !== undefined) campaign.totalBudgetMicro = body.totalBudgetMicro;
  if (body.dailyBudgetMicro !== undefined) campaign.dailyBudgetMicro = body.dailyBudgetMicro;
  campaign.updatedAt = new Date().toISOString();
  campaign.syncStatus = "pending";

  mockRedditCampaigns.set(id, campaign);

  return c.json(
    {
      id: campaign.id,
      accountId: campaign.accountId,
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      totalBudgetMicro: campaign.totalBudgetMicro,
      dailyBudgetMicro: campaign.dailyBudgetMicro,
      isPaid: campaign.isPaid,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    },
    200
  );
});

redditApp.openapi(deleteCampaignRoute, async (c) => {
  const { id } = c.req.valid("param");

  const campaign = mockRedditCampaigns.get(id);
  if (!campaign) {
    throw createNotFoundError("Reddit Campaign", id);
  }

  mockRedditCampaigns.delete(id);

  return c.body(null, 204);
});

redditApp.openapi(getCampaignStatusRoute, async (c) => {
  const { id } = c.req.valid("param");

  const campaign = mockRedditCampaigns.get(id);
  if (!campaign) {
    throw createNotFoundError("Reddit Campaign", id);
  }

  return c.json(
    {
      campaignId: campaign.id,
      platformStatus: campaign.status,
      syncStatus: campaign.syncStatus,
      lastSyncedAt: campaign.lastSyncedAt,
      errors: [],
    },
    200
  );
});

redditApp.openapi(syncCampaignsRoute, async (c) => {
  const body = c.req.valid("json");

  // Get campaigns to sync
  const campaignsToSync = Array.from(mockRedditCampaigns.values()).filter(
    (c) =>
      c.accountId === body.accountId &&
      (!body.campaignIds || body.campaignIds.includes(c.id))
  );

  const now = new Date().toISOString();
  let createdCount = 0;
  let updatedCount = 0;
  const errors: { entityType: string; entityId?: string; message: string }[] = [];

  if (!body.dryRun) {
    for (const campaign of campaignsToSync) {
      if (!campaign.platformId) {
        // Would create on Reddit
        campaign.platformId = `reddit_${campaign.id}`;
        campaign.syncStatus = "synced";
        campaign.lastSyncedAt = now;
        createdCount++;
      } else if (campaign.syncStatus === "pending") {
        // Would update on Reddit
        campaign.syncStatus = "synced";
        campaign.lastSyncedAt = now;
        updatedCount++;
      }
      mockRedditCampaigns.set(campaign.id, campaign);
    }
  }

  return c.json(
    {
      success: errors.length === 0,
      syncedCount: campaignsToSync.length,
      createdCount,
      updatedCount,
      deletedCount: 0,
      errors,
      timestamp: now,
    },
    200
  );
});

// Error handler
redditApp.onError((err, c) => {
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

export default redditApp;
