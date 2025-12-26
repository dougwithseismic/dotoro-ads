import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { eq, and, count, asc, sql } from "drizzle-orm";
import {
  // Schema types
  campaignSetStatusSchema,
  campaignSetSyncStatusSchema,
  campaignSetSchema,
  campaignSetSummarySchema,
  campaignSchema,
  createCampaignSetRequestSchema,
  updateCampaignSetRequestSchema,
  campaignSetQuerySchema,
  campaignSetListResponseSchema,
  setIdParamSchema,
  campaignIdParamSchema,
  generateCampaignsRequestSchema,
  generateCampaignsResponseSchema,
  queuedJobResponseSchema,
  pauseResponseSchema,
  resumeResponseSchema,
  campaignsListResponseSchema,
  updateCampaignRequestSchema,
  syncStreamQuerySchema,
  type CampaignSetConfig,
} from "../schemas/campaign-sets.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import { createNotFoundError, createUnauthorizedError, createValidationError, ApiException, ErrorCode } from "../lib/errors.js";
import {
  db,
  campaignSets,
  generatedCampaigns,
  adGroups,
  ads,
  keywords,
  adAccounts,
  type CampaignSetConfig as DbCampaignSetConfig,
} from "../services/db.js";
import { getJobQueue } from "../jobs/queue.js";
import { SYNC_CAMPAIGN_SET_JOB } from "../jobs/handlers/sync-campaign-set.js";
import { jobEvents, type SyncProgressEvent } from "../jobs/events.js";
import type { SyncCampaignSetJob } from "../jobs/types.js";

// Platform type for type assertions
type Platform = "google" | "reddit" | "facebook";

// ============================================================================
// Authorization Helper
// ============================================================================

/**
 * Extracts and validates user ID from request headers.
 * TODO: Replace with actual auth middleware when available.
 */
function getUserId(c: Context): string {
  const userId = c.req.header("x-user-id") || "";
  if (!userId) {
    throw createUnauthorizedError("User ID required");
  }
  return userId;
}

// ============================================================================
// Campaign Hierarchy Helper
// ============================================================================

/**
 * Entity status type (for ads, ad groups, keywords).
 */
type EntityStatus = "active" | "paused" | "removed";

/**
 * Campaign status type matching the schema.
 */
type CampaignStatus = "draft" | "pending" | "active" | "paused" | "completed" | "error";

/**
 * Keyword match type.
 */
type MatchType = "broad" | "phrase" | "exact";

/**
 * Ad group with nested ads and keywords for response formatting.
 */
interface AdGroupWithChildren {
  id: string;
  campaignId: string;
  name: string;
  orderIndex: number;
  settings: Record<string, unknown> | null;
  platformAdGroupId?: string;
  status: EntityStatus;
  ads: Array<{
    id: string;
    adGroupId: string;
    orderIndex: number;
    headline: string | null;
    description: string | null;
    displayUrl: string | null;
    finalUrl: string | null;
    callToAction: string | null;
    assets: Record<string, unknown> | null;
    platformAdId?: string;
    status: EntityStatus;
    createdAt: string;
    updatedAt: string;
  }>;
  keywords: Array<{
    id: string;
    adGroupId: string;
    keyword: string;
    matchType: MatchType;
    bid?: number;
    platformKeywordId?: string;
    status: EntityStatus;
    createdAt: string;
    updatedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Campaign with full hierarchy for response formatting.
 */
interface CampaignWithHierarchy {
  id: string;
  campaignSetId: string;
  name: string;
  platform: Platform;
  orderIndex: number;
  templateId: string | null;
  dataRowId: string | null;
  campaignData: Record<string, unknown> | null;
  status: CampaignStatus;
  syncStatus: "pending";
  lastSyncedAt: undefined;
  syncError: undefined;
  platformCampaignId: undefined;
  platformData: undefined;
  adGroups: AdGroupWithChildren[];
  budget: { type: "daily" | "lifetime" | "shared"; amount: number; currency: string } | undefined;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ensures a status value is a valid EntityStatus.
 */
function toEntityStatus(status: string): EntityStatus {
  const validStatuses: EntityStatus[] = ["active", "paused", "removed"];
  return validStatuses.includes(status as EntityStatus) ? (status as EntityStatus) : "active";
}

/**
 * Ensures a match type value is valid.
 */
function toMatchType(matchType: string): MatchType {
  const validTypes: MatchType[] = ["broad", "phrase", "exact"];
  return validTypes.includes(matchType as MatchType) ? (matchType as MatchType) : "broad";
}

/**
 * Converts null to undefined for optional string fields.
 */
function nullToUndefined(value: string | null): string | undefined {
  return value ?? undefined;
}

/**
 * Fetches ad groups with their ads and keywords for a campaign.
 */
async function fetchAdGroupsWithChildren(campaignId: string): Promise<AdGroupWithChildren[]> {
  const campaignAdGroups = await db
    .select()
    .from(adGroups)
    .where(eq(adGroups.campaignId, campaignId))
    .orderBy(asc(adGroups.orderIndex));

  return Promise.all(
    campaignAdGroups.map(async (adGroup) => {
      const [adsInGroup, keywordsInGroup] = await Promise.all([
        db
          .select()
          .from(ads)
          .where(eq(ads.adGroupId, adGroup.id))
          .orderBy(asc(ads.orderIndex)),
        db.select().from(keywords).where(eq(keywords.adGroupId, adGroup.id)),
      ]);

      return {
        id: adGroup.id,
        campaignId: adGroup.campaignId,
        name: adGroup.name,
        orderIndex: adGroup.orderIndex,
        settings: adGroup.settings,
        platformAdGroupId: nullToUndefined(adGroup.platformAdGroupId),
        status: toEntityStatus(adGroup.status),
        ads: adsInGroup.map((ad) => ({
          id: ad.id,
          adGroupId: ad.adGroupId,
          orderIndex: ad.orderIndex,
          headline: ad.headline,
          description: ad.description,
          displayUrl: ad.displayUrl,
          finalUrl: ad.finalUrl,
          callToAction: ad.callToAction,
          assets: ad.assets,
          platformAdId: nullToUndefined(ad.platformAdId),
          status: toEntityStatus(ad.status),
          createdAt: ad.createdAt.toISOString(),
          updatedAt: ad.updatedAt.toISOString(),
        })),
        keywords: keywordsInGroup.map((kw) => ({
          id: kw.id,
          adGroupId: kw.adGroupId,
          keyword: kw.keyword,
          matchType: toMatchType(kw.matchType),
          bid: kw.bid ? parseFloat(kw.bid) : undefined,
          platformKeywordId: nullToUndefined(kw.platformKeywordId),
          status: toEntityStatus(kw.status),
          createdAt: kw.createdAt.toISOString(),
          updatedAt: kw.updatedAt.toISOString(),
        })),
        createdAt: adGroup.createdAt.toISOString(),
        updatedAt: adGroup.updatedAt.toISOString(),
      };
    })
  );
}

/**
 * Fetches a campaign with its full hierarchy (ad groups, ads, keywords).
 */
async function fetchCampaignWithHierarchy(
  campaign: typeof generatedCampaigns.$inferSelect,
  fallbackSetId: string
): Promise<CampaignWithHierarchy> {
  const adGroupsWithChildren = await fetchAdGroupsWithChildren(campaign.id);

  const campaignData = campaign.campaignData as Record<string, unknown> | null;
  const platform = ((campaignData?.platform as string) ?? "google") as Platform;

  // Ensure status is a valid CampaignStatus
  const validStatuses: CampaignStatus[] = ["draft", "pending", "active", "paused", "completed", "error"];
  const status = validStatuses.includes(campaign.status as CampaignStatus)
    ? (campaign.status as CampaignStatus)
    : "draft";

  return {
    id: campaign.id,
    campaignSetId: campaign.campaignSetId ?? fallbackSetId,
    name: (campaignData?.name as string) ?? `Campaign ${campaign.id}`,
    platform,
    orderIndex: campaign.orderIndex,
    templateId: campaign.templateId,
    dataRowId: campaign.dataRowId,
    campaignData,
    status,
    syncStatus: "pending" as const,
    lastSyncedAt: undefined,
    syncError: undefined,
    platformCampaignId: undefined,
    platformData: undefined,
    adGroups: adGroupsWithChildren,
    budget: (campaignData?.budget as { type: "daily" | "lifetime" | "shared"; amount: number; currency: string }) ?? undefined,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

// Create the OpenAPI Hono app
export const campaignSetsApp = new OpenAPIHono();

// ============================================================================
// Route Definitions - CRUD Operations
// ============================================================================

/**
 * List Campaign Sets
 */
const listCampaignSetsRoute = createRoute({
  method: "get",
  path: "/api/v1/campaign-sets",
  tags: ["Campaign Sets"],
  summary: "List campaign sets",
  description: "Returns a paginated list of campaign sets with summary information",
  request: {
    query: campaignSetQuerySchema,
  },
  responses: {
    200: {
      description: "List of campaign sets",
      content: {
        "application/json": {
          schema: campaignSetListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * Create Campaign Set
 */
const createCampaignSetRoute = createRoute({
  method: "post",
  path: "/api/v1/campaign-sets",
  tags: ["Campaign Sets"],
  summary: "Create campaign set",
  description: "Creates a new campaign set with the provided configuration",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createCampaignSetRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Campaign set created successfully",
      content: {
        "application/json": {
          schema: campaignSetSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * Get Campaign Set
 */
const getCampaignSetRoute = createRoute({
  method: "get",
  path: "/api/v1/campaign-sets/{setId}",
  tags: ["Campaign Sets"],
  summary: "Get campaign set",
  description: "Returns a campaign set with all its campaigns and nested hierarchy",
  request: {
    params: setIdParamSchema,
  },
  responses: {
    200: {
      description: "Campaign set details",
      content: {
        "application/json": {
          schema: campaignSetSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * Update Campaign Set
 */
const updateCampaignSetRoute = createRoute({
  method: "put",
  path: "/api/v1/campaign-sets/{setId}",
  tags: ["Campaign Sets"],
  summary: "Update campaign set",
  description: "Updates an existing campaign set",
  request: {
    params: setIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateCampaignSetRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Campaign set updated successfully",
      content: {
        "application/json": {
          schema: campaignSetSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * Delete Campaign Set
 */
const deleteCampaignSetRoute = createRoute({
  method: "delete",
  path: "/api/v1/campaign-sets/{setId}",
  tags: ["Campaign Sets"],
  summary: "Delete campaign set",
  description: "Deletes a campaign set and all its campaigns (cascades)",
  request: {
    params: setIdParamSchema,
  },
  responses: {
    204: {
      description: "Campaign set deleted successfully",
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Definitions - Actions
// ============================================================================

/**
 * Generate Campaigns
 */
const generateCampaignsRoute = createRoute({
  method: "post",
  path: "/api/v1/campaign-sets/{setId}/generate",
  tags: ["Campaign Sets"],
  summary: "Generate campaigns",
  description: "Generates campaigns from the campaign set configuration",
  request: {
    params: setIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: generateCampaignsRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Campaigns generated successfully",
      content: {
        "application/json": {
          schema: generateCampaignsResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * Sync Campaigns
 */
const syncCampaignsRoute = createRoute({
  method: "post",
  path: "/api/v1/campaign-sets/{setId}/sync",
  tags: ["Campaign Sets"],
  summary: "Sync campaigns to platforms",
  description: "Queues a background job to sync all campaigns in the set to their respective ad platforms. Returns 202 Accepted with a job ID for tracking progress.",
  request: {
    params: setIdParamSchema,
  },
  responses: {
    202: {
      description: "Sync job queued",
      content: {
        "application/json": {
          schema: queuedJobResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * Pause Campaigns
 */
const pauseCampaignsRoute = createRoute({
  method: "post",
  path: "/api/v1/campaign-sets/{setId}/pause",
  tags: ["Campaign Sets"],
  summary: "Pause all campaigns",
  description: "Pauses all campaigns in the campaign set",
  request: {
    params: setIdParamSchema,
  },
  responses: {
    200: {
      description: "Campaigns paused",
      content: {
        "application/json": {
          schema: pauseResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * Resume Campaigns
 */
const resumeCampaignsRoute = createRoute({
  method: "post",
  path: "/api/v1/campaign-sets/{setId}/resume",
  tags: ["Campaign Sets"],
  summary: "Resume all campaigns",
  description: "Resumes all paused campaigns in the campaign set",
  request: {
    params: setIdParamSchema,
  },
  responses: {
    200: {
      description: "Campaigns resumed",
      content: {
        "application/json": {
          schema: resumeResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Definitions - Campaigns Within Set
// ============================================================================

/**
 * List Campaigns in Set
 */
const listCampaignsInSetRoute = createRoute({
  method: "get",
  path: "/api/v1/campaign-sets/{setId}/campaigns",
  tags: ["Campaign Sets"],
  summary: "List campaigns in set",
  description: "Returns all campaigns in the campaign set",
  request: {
    params: setIdParamSchema,
  },
  responses: {
    200: {
      description: "List of campaigns",
      content: {
        "application/json": {
          schema: campaignsListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * Get Campaign in Set
 */
const getCampaignInSetRoute = createRoute({
  method: "get",
  path: "/api/v1/campaign-sets/{setId}/campaigns/{campaignId}",
  tags: ["Campaign Sets"],
  summary: "Get campaign",
  description: "Returns a single campaign with full hierarchy (ad groups, ads, keywords)",
  request: {
    params: campaignIdParamSchema,
  },
  responses: {
    200: {
      description: "Campaign details",
      content: {
        "application/json": {
          schema: campaignSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * Update Campaign in Set
 */
const updateCampaignInSetRoute = createRoute({
  method: "put",
  path: "/api/v1/campaign-sets/{setId}/campaigns/{campaignId}",
  tags: ["Campaign Sets"],
  summary: "Update campaign",
  description: "Updates a campaign within the set",
  request: {
    params: campaignIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateCampaignRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Campaign updated successfully",
      content: {
        "application/json": {
          schema: campaignSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * Delete Campaign from Set
 */
const deleteCampaignFromSetRoute = createRoute({
  method: "delete",
  path: "/api/v1/campaign-sets/{setId}/campaigns/{campaignId}",
  tags: ["Campaign Sets"],
  summary: "Delete campaign",
  description: "Removes a campaign from the set",
  request: {
    params: campaignIdParamSchema,
  },
  responses: {
    204: {
      description: "Campaign deleted successfully",
    },
    ...commonResponses,
  },
});

/**
 * Sync Stream (SSE)
 *
 * Note: This route is defined manually (not via openapi) because SSE streaming
 * is not well-supported by OpenAPI specs. The route is documented here for clarity.
 *
 * GET /api/v1/campaign-sets/{setId}/sync-stream?jobId={jobId}
 *
 * Returns a Server-Sent Events stream with sync progress updates.
 *
 * Query parameters:
 * - jobId (required): The job ID returned from POST /api/v1/campaign-sets/{setId}/sync
 *
 * Event types:
 * - progress: Periodic progress updates
 * - campaign_synced: A campaign was successfully synced
 * - campaign_failed: A campaign failed to sync
 * - completed: Sync job completed successfully
 * - error: Sync job failed with an error
 *
 * Heartbeat: Sends `: heartbeat\n\n` every 15 seconds to keep connection alive.
 */

// ============================================================================
// Route Handlers - CRUD Operations
// ============================================================================

campaignSetsApp.openapi(listCampaignSetsRoute, async (c) => {
  const userId = getUserId(c);
  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  // Build where conditions - always filter by userId
  const conditions = [eq(campaignSets.userId, userId)];
  if (query.status) {
    conditions.push(eq(campaignSets.status, query.status));
  }
  if (query.syncStatus) {
    conditions.push(eq(campaignSets.syncStatus, query.syncStatus));
  }

  const whereClause = and(...conditions);

  // Get total count for user's campaign sets
  const [countResult] = await db
    .select({ count: count() })
    .from(campaignSets)
    .where(whereClause);
  const total = countResult?.count ?? 0;

  // Get paginated campaign sets
  const sets = await db
    .select()
    .from(campaignSets)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(asc(campaignSets.createdAt));

  if (sets.length === 0) {
    return c.json(createPaginatedResponse([], total, page, limit), 200);
  }

  // Batch fetch all counts using SQL aggregation to avoid N+1 queries
  const setIds = sets.map((s) => s.id);

  // Get campaign counts and platforms per set in a single query
  const campaignStats = await db
    .select({
      campaignSetId: generatedCampaigns.campaignSetId,
      campaignCount: count(generatedCampaigns.id),
    })
    .from(generatedCampaigns)
    .where(sql`${generatedCampaigns.campaignSetId} IN (${sql.join(setIds.map(id => sql`${id}`), sql`, `)})`)
    .groupBy(generatedCampaigns.campaignSetId);

  // Get ad group counts per set
  const adGroupStats = await db
    .select({
      campaignSetId: generatedCampaigns.campaignSetId,
      adGroupCount: count(adGroups.id),
    })
    .from(adGroups)
    .innerJoin(generatedCampaigns, eq(adGroups.campaignId, generatedCampaigns.id))
    .where(sql`${generatedCampaigns.campaignSetId} IN (${sql.join(setIds.map(id => sql`${id}`), sql`, `)})`)
    .groupBy(generatedCampaigns.campaignSetId);

  // Get ad counts per set
  const adStats = await db
    .select({
      campaignSetId: generatedCampaigns.campaignSetId,
      adCount: count(ads.id),
    })
    .from(ads)
    .innerJoin(adGroups, eq(ads.adGroupId, adGroups.id))
    .innerJoin(generatedCampaigns, eq(adGroups.campaignId, generatedCampaigns.id))
    .where(sql`${generatedCampaigns.campaignSetId} IN (${sql.join(setIds.map(id => sql`${id}`), sql`, `)})`)
    .groupBy(generatedCampaigns.campaignSetId);

  // Get platforms per set
  const campaignsForPlatforms = await db
    .select({
      campaignSetId: generatedCampaigns.campaignSetId,
      campaignData: generatedCampaigns.campaignData,
    })
    .from(generatedCampaigns)
    .where(sql`${generatedCampaigns.campaignSetId} IN (${sql.join(setIds.map(id => sql`${id}`), sql`, `)})`);

  // Create lookup maps
  const campaignCountMap = new Map(campaignStats.map((s) => [s.campaignSetId, s.campaignCount]));
  const adGroupCountMap = new Map(adGroupStats.map((s) => [s.campaignSetId, s.adGroupCount]));
  const adCountMap = new Map(adStats.map((s) => [s.campaignSetId, s.adCount]));

  // Build platforms map
  const platformsMap = new Map<string, Set<string>>();
  for (const campaign of campaignsForPlatforms) {
    if (!campaign.campaignSetId) continue;
    if (!platformsMap.has(campaign.campaignSetId)) {
      platformsMap.set(campaign.campaignSetId, new Set());
    }
    const data = campaign.campaignData as { platform?: string } | null;
    if (data?.platform) {
      platformsMap.get(campaign.campaignSetId)!.add(data.platform);
    }
  }

  // Build summaries
  const summaries = sets.map((set) => ({
    id: set.id,
    name: set.name,
    description: set.description,
    status: set.status,
    syncStatus: set.syncStatus,
    campaignCount: campaignCountMap.get(set.id) ?? 0,
    adGroupCount: adGroupCountMap.get(set.id) ?? 0,
    adCount: adCountMap.get(set.id) ?? 0,
    platforms: Array.from(platformsMap.get(set.id) ?? []) as Platform[],
    createdAt: set.createdAt.toISOString(),
    updatedAt: set.updatedAt.toISOString(),
  }));

  return c.json(createPaginatedResponse(summaries, total, page, limit), 200);
});

campaignSetsApp.openapi(createCampaignSetRoute, async (c) => {
  const userId = getUserId(c);
  const body = c.req.valid("json");

  // Convert config dates to proper format for storage
  // Cast to DbCampaignSetConfig to satisfy the database type constraint
  const configForStorage = {
    ...body.config,
    // Ensure generatedAt is stored as ISO string
    generatedAt: body.config.generatedAt,
  } as DbCampaignSetConfig;

  const [newSet] = await db
    .insert(campaignSets)
    .values({
      userId,
      name: body.name,
      description: body.description,
      dataSourceId: body.dataSourceId,
      templateId: body.templateId,
      config: configForStorage,
      status: body.status ?? "draft",
      syncStatus: body.syncStatus ?? "pending",
    })
    .returning();

  if (!newSet) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to create campaign set");
  }

  return c.json(
    {
      id: newSet.id,
      userId: newSet.userId,
      name: newSet.name,
      description: newSet.description,
      dataSourceId: newSet.dataSourceId,
      templateId: newSet.templateId,
      config: newSet.config as CampaignSetConfig,
      campaigns: [],
      status: newSet.status,
      syncStatus: newSet.syncStatus,
      lastSyncedAt: newSet.lastSyncedAt?.toISOString() ?? null,
      createdAt: newSet.createdAt.toISOString(),
      updatedAt: newSet.updatedAt.toISOString(),
    },
    201
  );
});

campaignSetsApp.openapi(getCampaignSetRoute, async (c) => {
  const userId = getUserId(c);
  const { setId } = c.req.valid("param");

  const [set] = await db
    .select()
    .from(campaignSets)
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)))
    .limit(1);

  if (!set) {
    throw createNotFoundError("Campaign set", setId);
  }

  // Get campaigns with full hierarchy using helper function
  const campaignsInSet = await db
    .select()
    .from(generatedCampaigns)
    .where(eq(generatedCampaigns.campaignSetId, setId))
    .orderBy(asc(generatedCampaigns.orderIndex));

  const campaignsWithHierarchy = await Promise.all(
    campaignsInSet.map((campaign) => fetchCampaignWithHierarchy(campaign, setId))
  );

  return c.json(
    {
      id: set.id,
      userId: set.userId,
      name: set.name,
      description: set.description,
      dataSourceId: set.dataSourceId,
      templateId: set.templateId,
      config: set.config as CampaignSetConfig,
      campaigns: campaignsWithHierarchy,
      status: set.status,
      syncStatus: set.syncStatus,
      lastSyncedAt: set.lastSyncedAt?.toISOString() ?? null,
      createdAt: set.createdAt.toISOString(),
      updatedAt: set.updatedAt.toISOString(),
    },
    200
  );
});

campaignSetsApp.openapi(updateCampaignSetRoute, async (c) => {
  const userId = getUserId(c);
  const { setId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Check if set exists and belongs to user
  const [existing] = await db
    .select()
    .from(campaignSets)
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)))
    .limit(1);

  if (!existing) {
    throw createNotFoundError("Campaign set", setId);
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.dataSourceId !== undefined) updates.dataSourceId = body.dataSourceId;
  if (body.templateId !== undefined) updates.templateId = body.templateId;
  if (body.config !== undefined) updates.config = body.config;
  if (body.status !== undefined) updates.status = body.status;
  if (body.syncStatus !== undefined) updates.syncStatus = body.syncStatus;

  const [updated] = await db
    .update(campaignSets)
    .set(updates)
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)))
    .returning();

  if (!updated) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to update campaign set");
  }

  // Return with empty campaigns array (full hierarchy can be fetched separately)
  return c.json(
    {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      description: updated.description,
      dataSourceId: updated.dataSourceId,
      templateId: updated.templateId,
      config: updated.config as CampaignSetConfig,
      campaigns: [],
      status: updated.status,
      syncStatus: updated.syncStatus,
      lastSyncedAt: updated.lastSyncedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
    200
  );
});

campaignSetsApp.openapi(deleteCampaignSetRoute, async (c) => {
  const userId = getUserId(c);
  const { setId } = c.req.valid("param");

  // Check if set exists and belongs to user
  const [existing] = await db
    .select()
    .from(campaignSets)
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)))
    .limit(1);

  if (!existing) {
    throw createNotFoundError("Campaign set", setId);
  }

  // Delete will cascade to campaigns due to foreign key constraint
  await db.delete(campaignSets).where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)));

  return c.body(null, 204);
});

// ============================================================================
// Route Handlers - Actions
// ============================================================================

campaignSetsApp.openapi(generateCampaignsRoute, async (c) => {
  const userId = getUserId(c);
  const { setId } = c.req.valid("param");
  const _body = c.req.valid("json"); // TODO: Use body.regenerate when implementing generation logic

  // Check if set exists and belongs to user
  const [set] = await db
    .select()
    .from(campaignSets)
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)))
    .limit(1);

  if (!set) {
    throw createNotFoundError("Campaign set", setId);
  }

  // For now, return a placeholder response
  // Full implementation would use the config to generate campaigns
  // TODO: Implement actual campaign generation logic
  return c.json(
    {
      campaigns: [],
      created: 0,
      updated: 0,
    },
    200
  );
});

campaignSetsApp.openapi(syncCampaignsRoute, async (c) => {
  const userId = getUserId(c);
  const { setId } = c.req.valid("param");

  // Check if set exists and belongs to user
  const [set] = await db
    .select()
    .from(campaignSets)
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)))
    .limit(1);

  if (!set) {
    throw createNotFoundError("Campaign set", setId);
  }

  // Get configuration to determine platform
  const config = set.config as DbCampaignSetConfig | null;
  const selectedPlatforms = config?.selectedPlatforms ?? [];
  const adAccountId = (config as Record<string, unknown> | null)?.adAccountId as string | undefined;

  // Validate platform support - currently only Reddit is supported
  const hasSupportedPlatform = selectedPlatforms.some((p) => p === "reddit");
  if (!hasSupportedPlatform) {
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      `Unsupported platform. Currently only Reddit is supported. Found: ${selectedPlatforms.join(", ")}`
    );
  }

  // Validate required configuration for Reddit
  if (!adAccountId) {
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      "Ad account ID is required for Reddit sync. Please configure the campaign set with an ad account."
    );
  }

  // Validate ad account exists and belongs to user (security check)
  const [adAccount] = await db
    .select()
    .from(adAccounts)
    .where(and(
      eq(adAccounts.id, adAccountId),
      eq(adAccounts.userId, userId)
    ))
    .limit(1);

  if (!adAccount) {
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      "Invalid or unauthorized ad account"
    );
  }

  // Validate fundingInstrumentId is present
  const fundingInstrumentId = (config as Record<string, unknown> | null)?.fundingInstrumentId as string | undefined;

  if (!fundingInstrumentId) {
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      "Funding instrument ID is required for Reddit sync. Please configure the campaign set with a funding instrument."
    );
  }

  // Queue the sync job
  try {
    const boss = await getJobQueue();

    const jobData: SyncCampaignSetJob = {
      campaignSetId: setId,
      userId,
      adAccountId,
      fundingInstrumentId,
      platform: "reddit",
    };

    const jobId = await boss.send(SYNC_CAMPAIGN_SET_JOB, jobData, {
      singletonKey: `sync-campaign-set-${setId}`,
    });

    if (!jobId) {
      throw new ApiException(
        500,
        ErrorCode.INTERNAL_ERROR,
        "Failed to queue sync job"
      );
    }

    console.log(`[Sync] Queued sync job ${jobId} for campaign set ${setId}`);

    return c.json(
      {
        jobId,
        status: "queued" as const,
        message: "Sync job has been queued. Use GET /api/v1/jobs/{jobId} to check status.",
      },
      202
    );
  } catch (error) {
    // Log the error for debugging
    console.error(`[Sync] Failed to queue sync job for campaign set ${setId}:`, error);

    // Re-throw known exceptions
    if (error instanceof ApiException) {
      throw error;
    }

    // Wrap unknown errors
    throw new ApiException(
      500,
      ErrorCode.INTERNAL_ERROR,
      `Failed to queue sync job: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});

campaignSetsApp.openapi(pauseCampaignsRoute, async (c) => {
  const userId = getUserId(c);
  const { setId } = c.req.valid("param");

  // Check if set exists and belongs to user
  const [set] = await db
    .select()
    .from(campaignSets)
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)))
    .limit(1);

  if (!set) {
    throw createNotFoundError("Campaign set", setId);
  }

  // Update all campaigns in set to paused
  const result = await db
    .update(generatedCampaigns)
    .set({ status: "paused" })
    .where(eq(generatedCampaigns.campaignSetId, setId))
    .returning();

  // Update set status
  await db
    .update(campaignSets)
    .set({ status: "paused" })
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)));

  return c.json(
    {
      paused: result.length,
    },
    200
  );
});

campaignSetsApp.openapi(resumeCampaignsRoute, async (c) => {
  const userId = getUserId(c);
  const { setId } = c.req.valid("param");

  // Check if set exists and belongs to user
  const [set] = await db
    .select()
    .from(campaignSets)
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)))
    .limit(1);

  if (!set) {
    throw createNotFoundError("Campaign set", setId);
  }

  // Update all paused campaigns in set to active
  const result = await db
    .update(generatedCampaigns)
    .set({ status: "active" })
    .where(
      and(
        eq(generatedCampaigns.campaignSetId, setId),
        eq(generatedCampaigns.status, "paused")
      )
    )
    .returning();

  // Update set status
  await db
    .update(campaignSets)
    .set({ status: "active" })
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)));

  return c.json(
    {
      resumed: result.length,
    },
    200
  );
});

// ============================================================================
// Route Handlers - Campaigns Within Set
// ============================================================================

campaignSetsApp.openapi(listCampaignsInSetRoute, async (c) => {
  const userId = getUserId(c);
  const { setId } = c.req.valid("param");

  // Check if set exists and belongs to user
  const [set] = await db
    .select()
    .from(campaignSets)
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)))
    .limit(1);

  if (!set) {
    throw createNotFoundError("Campaign set", setId);
  }

  // Get campaigns with full hierarchy using helper function
  const campaignsInSet = await db
    .select()
    .from(generatedCampaigns)
    .where(eq(generatedCampaigns.campaignSetId, setId))
    .orderBy(asc(generatedCampaigns.orderIndex));

  const campaignsWithHierarchy = await Promise.all(
    campaignsInSet.map((campaign) => fetchCampaignWithHierarchy(campaign, setId))
  );

  return c.json({ campaigns: campaignsWithHierarchy }, 200);
});

campaignSetsApp.openapi(getCampaignInSetRoute, async (c) => {
  const userId = getUserId(c);
  const { setId, campaignId } = c.req.valid("param");

  // Check if set exists and belongs to user
  const [set] = await db
    .select()
    .from(campaignSets)
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)))
    .limit(1);

  if (!set) {
    throw createNotFoundError("Campaign set", setId);
  }

  // Get the campaign
  const [campaign] = await db
    .select()
    .from(generatedCampaigns)
    .where(
      and(
        eq(generatedCampaigns.id, campaignId),
        eq(generatedCampaigns.campaignSetId, setId)
      )
    )
    .limit(1);

  if (!campaign) {
    throw createNotFoundError("Campaign", campaignId);
  }

  // Get full hierarchy using helper function
  const campaignWithHierarchy = await fetchCampaignWithHierarchy(campaign, setId);

  return c.json(campaignWithHierarchy, 200);
});

campaignSetsApp.openapi(updateCampaignInSetRoute, async (c) => {
  const userId = getUserId(c);
  const { setId, campaignId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Check if set exists and belongs to user
  const [set] = await db
    .select()
    .from(campaignSets)
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)))
    .limit(1);

  if (!set) {
    throw createNotFoundError("Campaign set", setId);
  }

  // Check if campaign exists in set
  const [existing] = await db
    .select()
    .from(generatedCampaigns)
    .where(
      and(
        eq(generatedCampaigns.id, campaignId),
        eq(generatedCampaigns.campaignSetId, setId)
      )
    )
    .limit(1);

  if (!existing) {
    throw createNotFoundError("Campaign", campaignId);
  }

  // Build updates
  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;

  // Update campaign data for name, budget, platformData
  const currentData = (existing.campaignData as Record<string, unknown>) ?? {};
  const newData = { ...currentData };

  if (body.name !== undefined) newData.name = body.name;
  if (body.budget !== undefined) newData.budget = body.budget;
  if (body.platformData !== undefined) newData.platformData = body.platformData;

  if (Object.keys(newData).length > Object.keys(currentData).length || body.name || body.budget || body.platformData) {
    updates.campaignData = newData;
  }

  const [updated] = await db
    .update(generatedCampaigns)
    .set(updates)
    .where(eq(generatedCampaigns.id, campaignId))
    .returning();

  if (!updated) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to update campaign");
  }

  const updatedData = updated.campaignData as Record<string, unknown> | null;
  const platform = ((updatedData?.platform as string) ?? "google") as Platform;

  return c.json(
    {
      id: updated.id,
      campaignSetId: updated.campaignSetId ?? setId,
      name: (updatedData?.name as string) ?? `Campaign ${updated.id}`,
      platform,
      orderIndex: updated.orderIndex,
      templateId: updated.templateId,
      dataRowId: updated.dataRowId,
      campaignData: updatedData,
      status: updated.status,
      syncStatus: "pending" as const,
      lastSyncedAt: undefined,
      syncError: undefined,
      platformCampaignId: undefined,
      platformData: undefined,
      adGroups: [],
      budget: (updatedData?.budget as { type: "daily" | "lifetime" | "shared"; amount: number; currency: string }) ?? undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
    200
  );
});

campaignSetsApp.openapi(deleteCampaignFromSetRoute, async (c) => {
  const userId = getUserId(c);
  const { setId, campaignId } = c.req.valid("param");

  // Check if set exists and belongs to user
  const [set] = await db
    .select()
    .from(campaignSets)
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)))
    .limit(1);

  if (!set) {
    throw createNotFoundError("Campaign set", setId);
  }

  // Check if campaign exists in set
  const [existing] = await db
    .select()
    .from(generatedCampaigns)
    .where(
      and(
        eq(generatedCampaigns.id, campaignId),
        eq(generatedCampaigns.campaignSetId, setId)
      )
    )
    .limit(1);

  if (!existing) {
    throw createNotFoundError("Campaign", campaignId);
  }

  // Delete campaign (cascades to ad groups, ads, keywords)
  await db.delete(generatedCampaigns).where(eq(generatedCampaigns.id, campaignId));

  return c.body(null, 204);
});

// ============================================================================
// SSE Sync Stream Handler
// ============================================================================

/**
 * SSE endpoint for real-time sync progress updates.
 *
 * This is a non-OpenAPI route because SSE streaming is not well-supported
 * by the OpenAPI specification.
 */
campaignSetsApp.get("/api/v1/campaign-sets/:setId/sync-stream", async (c) => {
  // Authenticate user
  const userId = getUserId(c);
  const setId = c.req.param("setId");
  const jobIdRaw = c.req.query("jobId");

  // Validate setId format
  const setIdResult = setIdParamSchema.safeParse({ setId });
  if (!setIdResult.success) {
    throw createValidationError("Invalid setId format", {
      errors: setIdResult.error.flatten().fieldErrors,
    });
  }

  // Validate jobId is present and valid
  const jobIdResult = syncStreamQuerySchema.safeParse({ jobId: jobIdRaw });
  if (!jobIdResult.success) {
    throw createValidationError("Invalid or missing jobId query parameter", {
      errors: jobIdResult.error.flatten().fieldErrors,
    });
  }
  const jobId = jobIdResult.data.jobId;

  // Verify campaign set exists and belongs to user
  const [set] = await db
    .select()
    .from(campaignSets)
    .where(and(eq(campaignSets.id, setId), eq(campaignSets.userId, userId)))
    .limit(1);

  if (!set) {
    throw createNotFoundError("Campaign set", setId);
  }

  // SECURITY: Validate job exists AND belongs to this campaign set and user
  const boss = await getJobQueue();
  const job = await boss.getJobById(SYNC_CAMPAIGN_SET_JOB, jobId);

  if (!job) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Job not found");
  }

  const jobData = job.data as { campaignSetId?: string; userId?: string };
  if (jobData.campaignSetId !== setId || jobData.userId !== userId) {
    console.log(`[SSE] Access denied: job ${jobId} belongs to campaignSet ${jobData.campaignSetId}/${jobData.userId}, requested by ${setId}/${userId}`);
    throw new ApiException(403, ErrorCode.FORBIDDEN, "Access denied to this job");
  }

  // Return SSE stream
  return streamSSE(c, async (stream) => {
    // Track if stream is still open
    let isOpen = true;

    // Cleanup function - defined first so it can be referenced
    let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
    let resolveCompletion: (() => void) | undefined;

    const cleanup = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = undefined;
      }
      jobEvents.off(`sync:${jobId}`, listener);
      jobEvents.off(`sync:${jobId}:done`, onDone);
    };

    // Set up event listener for sync progress
    const listener = (event: SyncProgressEvent) => {
      if (!isOpen) return;

      // Write SSE event
      stream.writeSSE({
        event: event.type,
        data: JSON.stringify(event.data),
      });
    };

    // Handle completion - single listener pattern to avoid memory leak
    const onDone = () => {
      console.log(`[SSE] Job ${jobId} completed, closing stream`);
      isOpen = false;
      cleanup();
      resolveCompletion?.();
    };

    // Subscribe to job events
    jobEvents.on(`sync:${jobId}`, listener);
    jobEvents.once(`sync:${jobId}:done`, onDone);

    // Set up heartbeat interval (every 15 seconds)
    heartbeatInterval = setInterval(() => {
      if (!isOpen) return;

      stream.writeSSE({
        event: "heartbeat",
        data: "",
      });
    }, 15000);

    // Handle stream abort (client disconnect)
    stream.onAbort(() => {
      console.log(`[SSE] Client disconnected from job ${jobId}`);
      isOpen = false;
      cleanup();
      resolveCompletion?.();
    });

    // RACE CONDITION FIX: Send initial job status on connect
    // This handles the case where job starts/completes before SSE connection
    const jobState = job.state as string;
    if (jobState === "completed" && job.output) {
      console.log(`[SSE] Job ${jobId} already completed, sending result`);
      await stream.writeSSE({
        event: "completed",
        data: JSON.stringify(job.output),
      });
      cleanup();
      return;
    }

    if (jobState === "failed") {
      console.log(`[SSE] Job ${jobId} already failed, sending error`);
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ error: "Job failed" }),
      });
      cleanup();
      return;
    }

    // Send connected event with current job state
    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({ jobId, state: jobState }),
    });

    // Wait for completion or timeout (5 minutes max)
    await new Promise<void>((resolve) => {
      resolveCompletion = resolve;

      const timeout = setTimeout(() => {
        console.log(`[SSE] Stream timed out for job ${jobId}`);
        isOpen = false;
        cleanup();
        resolve();
      }, 300000); // 5 minutes

      // Store timeout cleanup in the resolver
      const originalResolve = resolveCompletion;
      resolveCompletion = () => {
        clearTimeout(timeout);
        originalResolve();
      };
    });
  });
});

// ============================================================================
// Error Handler
// ============================================================================

campaignSetsApp.onError((err, c) => {
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

export default campaignSetsApp;
