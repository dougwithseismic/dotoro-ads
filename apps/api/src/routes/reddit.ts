import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, and } from "drizzle-orm";
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
import { db, adAccounts } from "../services/db.js";

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
  description: "Handles the OAuth callback from Reddit, exchanges code for tokens, and redirects to frontend",
  request: {
    query: redditOAuthCallbackSchema,
  },
  responses: {
    302: {
      description: "Redirects to frontend with oauth status",
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
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  try {
    const query = c.req.valid("query");
    const oauthService = getRedditOAuthService();
    const { tokens, accountId } = await oauthService.handleCallback(query.code, query.state);

    // Wrap account creation and token storage in a transaction for atomicity
    await db.transaction(async (tx) => {
      // Check if this Reddit account already exists
      const [existingAccount] = await tx
        .select()
        .from(adAccounts)
        .where(
          and(
            eq(adAccounts.platform, "reddit"),
            eq(adAccounts.accountId, accountId)
          )
        )
        .limit(1);

      let adAccountId: string;

      if (existingAccount) {
        // Update existing account status to active
        await tx
          .update(adAccounts)
          .set({ status: "active" })
          .where(eq(adAccounts.id, existingAccount.id));
        adAccountId = existingAccount.id;
      } else {
        // Create new ad account record
        const result = await tx
          .insert(adAccounts)
          .values({
            platform: "reddit",
            accountId: accountId,
            accountName: `Reddit Account ${accountId}`,
            status: "active",
          })
          .returning();

        if (!result[0]) {
          throw new Error("Failed to create ad account");
        }
        adAccountId = result[0].id;
      }

      // Store tokens within the same transaction
      await oauthService.storeTokens(adAccountId, tokens, tx);
    });

    // Redirect to frontend with success
    return c.redirect(`${frontendUrl}/accounts?oauth=success&platform=reddit`);
  } catch (error) {
    // Log detailed error for debugging, but show generic message to user
    const internalError = error instanceof Error ? error.message : "OAuth callback failed";
    console.error("[Reddit OAuth] Callback error:", internalError);

    // Redirect to frontend with generic error (internal details already logged)
    return c.redirect(
      `${frontendUrl}/accounts?oauth=error&message=${encodeURIComponent("Failed to connect Reddit account. Please try again.")}`
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
