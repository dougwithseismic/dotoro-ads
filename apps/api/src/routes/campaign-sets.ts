import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { eq, and, count, asc, sql } from "drizzle-orm";
import { requireTeamAuth, getTeamContext, type TeamAuthVariables } from "../middleware/team-auth.js";
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
  validationResultSchema,
  validateCampaignSetRequestSchema,
  syncPreviewResponseSchema,
  type CampaignSetConfig,
  type SyncPreviewResponse,
  type ValidAdInfo,
  type FallbackAdInfo,
  type SkippedAdInfo,
} from "../schemas/campaign-sets.js";
import { getSyncValidationService } from "@repo/core/campaign-set";
import { DrizzleCampaignSetRepository } from "../repositories/campaign-set-repository.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import { createNotFoundError, createValidationError, ApiException, ErrorCode } from "../lib/errors.js";
import {
  db,
  campaignSets,
  generatedCampaigns,
  syncRecords,
  adGroups,
  ads,
  keywords,
  adAccounts,
  dataSources,
  type CampaignSetConfig as DbCampaignSetConfig,
} from "../services/db.js";
import { getJobQueueReady } from "../jobs/queue.js";
import { SYNC_CAMPAIGN_SET_JOB } from "../jobs/handlers/sync-campaign-set.js";
import { jobEvents, type SyncProgressEvent } from "../jobs/events.js";
import type { SyncCampaignSetJob } from "../jobs/types.js";

// Platform type for type assertions
type Platform = "google" | "reddit" | "facebook";

// ============================================================================
// Team Ownership Verification Helper
// ============================================================================

/**
 * Verify a campaign set belongs to the specified team.
 * Returns the campaign set if valid, throws 404 if not found or wrong team.
 * We return 404 instead of 403 to avoid leaking resource existence across teams.
 */
async function verifyCampaignSetTeamOwnership(
  id: string,
  teamId: string
): Promise<typeof campaignSets.$inferSelect> {
  const [campaignSet] = await db
    .select()
    .from(campaignSets)
    .where(eq(campaignSets.id, id))
    .limit(1);

  if (!campaignSet) {
    throw createNotFoundError("Campaign set", id);
  }

  // Return 404 instead of 403 to avoid leaking resource existence
  if (campaignSet.teamId !== teamId) {
    throw createNotFoundError("Campaign set", id);
  }

  return campaignSet;
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
 * Sync status type for campaigns
 */
type CampaignSyncStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";

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
  syncStatus: CampaignSyncStatus;
  lastSyncedAt: string | undefined;
  syncError: string | undefined;
  platformCampaignId: string | undefined;
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
 * Sync status data for a campaign
 */
interface CampaignSyncInfo {
  syncStatus: CampaignSyncStatus;
  lastSyncedAt: string | undefined;
  syncError: string | undefined;
  platformCampaignId: string | undefined;
}

/**
 * Fetches sync record for a campaign.
 * Returns actual sync status, error, and platform ID from the sync_records table.
 */
async function fetchCampaignSyncInfo(campaignId: string): Promise<CampaignSyncInfo> {
  const [syncRecord] = await db
    .select({
      syncStatus: syncRecords.syncStatus,
      lastSyncedAt: syncRecords.lastSyncedAt,
      errorLog: syncRecords.errorLog,
      platformId: syncRecords.platformId,
    })
    .from(syncRecords)
    .where(eq(syncRecords.generatedCampaignId, campaignId))
    .limit(1);

  if (!syncRecord) {
    return {
      syncStatus: "pending",
      lastSyncedAt: undefined,
      syncError: undefined,
      platformCampaignId: undefined,
    };
  }

  return {
    syncStatus: syncRecord.syncStatus,
    lastSyncedAt: syncRecord.lastSyncedAt?.toISOString(),
    syncError: syncRecord.errorLog ?? undefined,
    platformCampaignId: syncRecord.platformId ?? undefined,
  };
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
 * Now includes actual sync status, errors, and platform IDs from sync_records.
 */
async function fetchCampaignWithHierarchy(
  campaign: typeof generatedCampaigns.$inferSelect,
  fallbackSetId: string
): Promise<CampaignWithHierarchy> {
  // Fetch ad groups and sync info in parallel
  const [adGroupsWithChildren, syncInfo] = await Promise.all([
    fetchAdGroupsWithChildren(campaign.id),
    fetchCampaignSyncInfo(campaign.id),
  ]);

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
    syncStatus: syncInfo.syncStatus,
    lastSyncedAt: syncInfo.lastSyncedAt,
    syncError: syncInfo.syncError,
    platformCampaignId: syncInfo.platformCampaignId,
    platformData: undefined,
    adGroups: adGroupsWithChildren,
    budget: (campaignData?.budget as { type: "daily" | "lifetime" | "shared"; amount: number; currency: string }) ?? undefined,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

// Create the OpenAPI Hono app with team context
export const campaignSetsApp = new OpenAPIHono<{ Variables: TeamAuthVariables }>();

// Apply team auth middleware to all campaign sets routes
// This validates the X-Team-Id header and verifies team membership
campaignSetsApp.use("/api/v1/campaign-sets/*", requireTeamAuth());
campaignSetsApp.use("/api/v1/campaign-sets", requireTeamAuth());

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
 * Validate Campaign Set (Dry-Run)
 *
 * Validates the campaign set against Reddit v3 API requirements
 * without making any API calls. Returns all validation errors.
 */
const validateCampaignSetRoute = createRoute({
  method: "post",
  path: "/api/v1/campaign-sets/{setId}/validate",
  tags: ["Campaign Sets"],
  summary: "Validate campaign set",
  description: "Validates the campaign set against platform API requirements. Returns all validation errors without making any API calls. Use this before syncing to catch all data issues.",
  request: {
    params: setIdParamSchema,
    body: {
      required: false,
      content: {
        "application/json": {
          schema: validateCampaignSetRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Validation completed",
      content: {
        "application/json": {
          schema: validationResultSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * Preview Sync (Pre-Sync Validation)
 *
 * Returns a preview of what will happen during sync, including:
 * - Breakdown of valid, fallback, and skipped ads
 * - Detailed information about each ad's status
 * - Warnings and suggestions
 */
const previewSyncRoute = createRoute({
  method: "post",
  path: "/api/v1/campaign-sets/{setId}/preview-sync",
  tags: ["Campaign Sets"],
  summary: "Preview sync results",
  description: "Returns a preview of what will happen during sync without executing it. Shows breakdown of valid, fallback, and skipped ads with detailed error information.",
  request: {
    params: setIdParamSchema,
  },
  responses: {
    200: {
      description: "Sync preview",
      content: {
        "application/json": {
          schema: syncPreviewResponseSchema,
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
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  // Build where conditions - always filter by teamId
  const conditions = [eq(campaignSets.teamId, teamId)];
  if (query.status) {
    conditions.push(eq(campaignSets.status, query.status));
  }
  if (query.syncStatus) {
    conditions.push(eq(campaignSets.syncStatus, query.syncStatus));
  }

  const whereClause = and(...conditions);

  // Get total count for team's campaign sets
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
    teamId: set.teamId,
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
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

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
      teamId, // Set team ID from context
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
      teamId: newSet.teamId,
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
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const { setId } = c.req.valid("param");

  // Verify campaign set exists and belongs to team
  const set = await verifyCampaignSetTeamOwnership(setId, teamId);

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
      teamId: set.teamId,
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
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const { setId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Verify campaign set exists and belongs to team
  await verifyCampaignSetTeamOwnership(setId, teamId);

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
    .where(eq(campaignSets.id, setId))
    .returning();

  if (!updated) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to update campaign set");
  }

  // Return with empty campaigns array (full hierarchy can be fetched separately)
  return c.json(
    {
      id: updated.id,
      userId: updated.userId,
      teamId: updated.teamId,
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
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const { setId } = c.req.valid("param");

  // Verify campaign set exists and belongs to team
  await verifyCampaignSetTeamOwnership(setId, teamId);

  // Delete will cascade to campaigns due to foreign key constraint
  await db.delete(campaignSets).where(eq(campaignSets.id, setId));

  return c.body(null, 204);
});

// ============================================================================
// Route Handlers - Actions
// ============================================================================

campaignSetsApp.openapi(generateCampaignsRoute, async (c) => {
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const { setId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Verify campaign set exists and belongs to team
  const set = await verifyCampaignSetTeamOwnership(setId, teamId);

  // Validate that the campaign set has the required config
  const config = set.config as DbCampaignSetConfig | null;
  if (!config) {
    throw createValidationError("Campaign set has no configuration");
  }

  if (!config.dataSourceId) {
    throw createValidationError("Campaign set has no data source configured");
  }

  if (!config.selectedPlatforms || config.selectedPlatforms.length === 0) {
    throw createValidationError("Campaign set has no platforms selected");
  }

  if (!config.campaignConfig || !config.campaignConfig.namePattern) {
    throw createValidationError("Campaign set has no campaign name pattern configured");
  }

  if (!config.hierarchyConfig || !config.hierarchyConfig.adGroups || config.hierarchyConfig.adGroups.length === 0) {
    throw createValidationError("Campaign set has no hierarchy configuration");
  }

  // CRITICAL: Verify data source exists and belongs to the same team
  // Allow access if: data source belongs to team OR is a demo data source (teamId is null)
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, config.dataSourceId))
    .limit(1);

  if (!dataSource) {
    throw createValidationError("Data source not found");
  }

  // Check authorization: team must own the data source OR it's a demo data source
  // Return same error as "not found" to avoid leaking resource existence across teams
  if (dataSource.teamId !== null && dataSource.teamId !== teamId) {
    throw createValidationError("Data source not found");
  }

  // Import and use the campaign generation service
  const { campaignGenerationService, extractGenerationConfig } = await import("../services/campaign-generation.js");

  // Extract generation config from campaign set config
  const generationConfig = extractGenerationConfig(setId, config);

  // Generate campaigns
  const result = await campaignGenerationService.generateCampaigns(generationConfig, {
    regenerate: body.regenerate ?? false,
  });

  // Fetch the full campaign hierarchy for the response
  const createdCampaigns = await db
    .select()
    .from(generatedCampaigns)
    .where(eq(generatedCampaigns.campaignSetId, setId))
    .orderBy(asc(generatedCampaigns.orderIndex));

  const campaignsWithHierarchy = await Promise.all(
    createdCampaigns.map((campaign) => fetchCampaignWithHierarchy(campaign, setId))
  );

  return c.json(
    {
      campaigns: campaignsWithHierarchy,
      created: result.created,
      updated: result.updated,
    },
    200
  );
});

campaignSetsApp.openapi(syncCampaignsRoute, async (c) => {
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const { setId } = c.req.valid("param");

  // Verify campaign set exists and belongs to team
  const set = await verifyCampaignSetTeamOwnership(setId, teamId);

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

  // Validate ad account exists and belongs to team (security check)
  const [adAccount] = await db
    .select()
    .from(adAccounts)
    .where(and(
      eq(adAccounts.id, adAccountId),
      eq(adAccounts.teamId, teamId)
    ))
    .limit(1);

  if (!adAccount) {
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      "Invalid or unauthorized ad account"
    );
  }

  // fundingInstrumentId is optional in Reddit v3 API
  const fundingInstrumentId = (config as Record<string, unknown> | null)?.fundingInstrumentId as string | undefined;

  // Promote draft campaigns to pending so they can be synced
  // The sync service skips campaigns with status "draft"
  const promotedCampaigns = await db
    .update(generatedCampaigns)
    .set({ status: "pending" })
    .where(
      and(
        eq(generatedCampaigns.campaignSetId, setId),
        eq(generatedCampaigns.status, "draft")
      )
    )
    .returning({ id: generatedCampaigns.id });

  if (promotedCampaigns.length > 0) {
    console.log(`[Sync] Promoted ${promotedCampaigns.length} draft campaigns to pending for set ${setId}`);
  }

  // Queue the sync job
  try {
    const boss = await getJobQueueReady();

    const jobData: SyncCampaignSetJob = {
      campaignSetId: setId,
      teamId, // Use teamId instead of userId
      adAccountId,
      fundingInstrumentId, // Optional in v3
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

// ============================================================================
// Route Handlers - Validation (Dry-Run)
// ============================================================================

campaignSetsApp.openapi(validateCampaignSetRoute, async (c) => {
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const { setId } = c.req.valid("param");

  // Parse optional body (may be empty)
  let body: { platform?: "reddit" | "google" } = {};
  try {
    const jsonBody = await c.req.json();
    body = jsonBody ?? {};
  } catch {
    // Empty body is fine
  }

  // Verify campaign set exists and belongs to team
  await verifyCampaignSetTeamOwnership(setId, teamId);

  // Load campaign set with full hierarchy for validation
  const repository = new DrizzleCampaignSetRepository(db);
  const campaignSet = await repository.getCampaignSetWithRelations(setId);

  if (!campaignSet) {
    throw createNotFoundError("Campaign set", setId);
  }

  // Run validation
  const validationService = getSyncValidationService();
  const result = validationService.validateCampaignSet(campaignSet, {
    platform: body.platform,
  });

  console.log(
    `[Validate] Campaign set ${setId}: ` +
      `${result.isValid ? "VALID" : "INVALID"} ` +
      `(${result.totalErrors} errors, ${result.validationTimeMs}ms)`
  );

  return c.json(result, 200);
});

// ============================================================================
// Route Handlers - Preview Sync
// ============================================================================

campaignSetsApp.openapi(previewSyncRoute, async (c) => {
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const { setId } = c.req.valid("param");

  // Verify campaign set exists and belongs to team
  await verifyCampaignSetTeamOwnership(setId, teamId);

  const startTime = performance.now();

  // Load campaign set with full hierarchy for validation
  const repository = new DrizzleCampaignSetRepository(db);
  const campaignSet = await repository.getCampaignSetWithRelations(setId);

  if (!campaignSet) {
    throw createNotFoundError("Campaign set", setId);
  }

  // Get fallback strategy from config
  // The config JSON may contain fallbackStrategy which is an optional property
  type ConfigWithFallback = {
    fallbackStrategy?: "skip" | "truncate" | "use_fallback";
    [key: string]: unknown;
  };
  const config = campaignSet.config as ConfigWithFallback | null;
  const fallbackStrategy = config?.fallbackStrategy ?? "skip";

  // Run validation to get all errors
  const validationService = getSyncValidationService();
  const validationResult = validationService.validateCampaignSet(campaignSet);

  // Collect all ads and classify them
  const validAds: ValidAdInfo[] = [];
  const fallbackAds: FallbackAdInfo[] = [];
  const skippedAds: SkippedAdInfo[] = [];
  const warnings: string[] = [];

  // Build a map of entity IDs to their errors
  const errorsByEntityId = new Map<string, Array<{ field: string; message: string; code: string; value?: unknown; expected?: string }>>();
  for (const campaign of validationResult.campaigns) {
    for (const error of campaign.errors) {
      const existing = errorsByEntityId.get(error.entityId) || [];
      existing.push({ field: error.field, message: error.message, code: error.code, value: error.value, expected: error.expected });
      errorsByEntityId.set(error.entityId, existing);
    }
    for (const adGroup of campaign.adGroups) {
      for (const error of adGroup.errors) {
        const existing = errorsByEntityId.get(error.entityId) || [];
        existing.push({ field: error.field, message: error.message, code: error.code, value: error.value, expected: error.expected });
        errorsByEntityId.set(error.entityId, existing);
      }
      for (const adResult of adGroup.ads) {
        for (const error of adResult.errors) {
          const existing = errorsByEntityId.get(error.entityId) || [];
          existing.push({ field: error.field, message: error.message, code: error.code, value: error.value, expected: error.expected });
          errorsByEntityId.set(error.entityId, existing);
        }
      }
    }
  }

  // Process all ads and classify them
  for (const campaign of campaignSet.campaigns) {
    for (const adGroup of campaign.adGroups) {
      for (const ad of adGroup.ads) {
        const adErrors = errorsByEntityId.get(ad.id) || [];

        if (adErrors.length === 0) {
          // Ad is valid
          validAds.push({
            adId: ad.id,
            adGroupId: adGroup.id,
            campaignId: campaign.id,
            name: ad.headline || `Ad ${ad.id.slice(0, 8)}`,
          });
        } else {
          // Check if errors can be handled by fallback strategy
          const canUseFallback = adErrors.every(
            (err) => err.code === "FIELD_TOO_LONG" && (fallbackStrategy === "truncate" || fallbackStrategy === "use_fallback")
          );

          if (canUseFallback && fallbackStrategy !== "skip") {
            // Ad will use fallback
            const reason = adErrors.map((e) => e.message).join("; ");
            fallbackAds.push({
              adId: ad.id,
              adGroupId: adGroup.id,
              campaignId: campaign.id,
              name: ad.headline || `Ad ${ad.id.slice(0, 8)}`,
              reason:
                fallbackStrategy === "truncate"
                  ? `Text will be truncated: ${reason}`
                  : `Will use fallback ad: ${reason}`,
              fallbackAdId: fallbackStrategy === "use_fallback" ? "fallback" : undefined,
            });
          } else {
            // Ad will be skipped
            const firstError = adErrors[0];
            skippedAds.push({
              adId: ad.id,
              adGroupId: adGroup.id,
              campaignId: campaign.id,
              name: ad.headline || `Ad ${ad.id.slice(0, 8)}`,
              productName: (ad as unknown as { productName?: string }).productName,
              reason: firstError?.message || "Validation failed",
              errorCode: firstError?.code || "UNKNOWN",
              field: firstError?.field || "unknown",
              value: firstError?.value,
              expected: firstError?.expected,
            });
          }
        }
      }
    }
  }

  // Generate warnings
  const totalAds = validAds.length + fallbackAds.length + skippedAds.length;
  const skipRate = totalAds > 0 ? (skippedAds.length / totalAds) * 100 : 0;

  if (skipRate > 20) {
    warnings.push(
      `High skip rate (${skipRate.toFixed(1)}%): ${skippedAds.length} of ${totalAds} ads will be skipped. Consider reviewing your campaign set configuration.`
    );
  }

  if (fallbackAds.length > 0) {
    warnings.push(
      `${fallbackAds.length} ads will use fallback content. Original content exceeded platform limits.`
    );
  }

  // Determine if sync can proceed (at least one valid or fallback ad)
  const canProceed = validAds.length > 0 || fallbackAds.length > 0;

  const endTime = performance.now();

  const response: SyncPreviewResponse = {
    campaignSetId: setId,
    totalAds,
    breakdown: {
      valid: validAds.length,
      fallback: fallbackAds.length,
      skipped: skippedAds.length,
    },
    validAds,
    fallbackAds,
    skippedAds,
    canProceed,
    warnings,
    validationTimeMs: Math.round(endTime - startTime),
  };

  console.log(
    `[PreviewSync] Campaign set ${setId}: ` +
      `${validAds.length} valid, ${fallbackAds.length} fallback, ${skippedAds.length} skipped ` +
      `(${response.validationTimeMs}ms)`
  );

  return c.json(response, 200);
});

campaignSetsApp.openapi(pauseCampaignsRoute, async (c) => {
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const { setId } = c.req.valid("param");

  // Verify campaign set exists and belongs to team
  await verifyCampaignSetTeamOwnership(setId, teamId);

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
    .where(eq(campaignSets.id, setId));

  return c.json(
    {
      paused: result.length,
    },
    200
  );
});

campaignSetsApp.openapi(resumeCampaignsRoute, async (c) => {
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const { setId } = c.req.valid("param");

  // Verify campaign set exists and belongs to team
  await verifyCampaignSetTeamOwnership(setId, teamId);

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
    .where(eq(campaignSets.id, setId));

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
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const { setId } = c.req.valid("param");

  // Verify campaign set exists and belongs to team
  await verifyCampaignSetTeamOwnership(setId, teamId);

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
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const { setId, campaignId } = c.req.valid("param");

  // Verify campaign set exists and belongs to team
  await verifyCampaignSetTeamOwnership(setId, teamId);

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
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const { setId, campaignId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Verify campaign set exists and belongs to team
  await verifyCampaignSetTeamOwnership(setId, teamId);

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
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const { setId, campaignId } = c.req.valid("param");

  // Verify campaign set exists and belongs to team
  await verifyCampaignSetTeamOwnership(setId, teamId);

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
  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

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

  // Verify campaign set exists and belongs to team
  await verifyCampaignSetTeamOwnership(setId, teamId);

  // SECURITY: Validate job exists AND belongs to this campaign set and team
  const boss = await getJobQueueReady();
  const job = await boss.getJobById(SYNC_CAMPAIGN_SET_JOB, jobId);

  if (!job) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Job not found");
  }

  const jobData = job.data as { campaignSetId?: string; teamId?: string };
  if (jobData.campaignSetId !== setId || jobData.teamId !== teamId) {
    console.log(`[SSE] Access denied: job ${jobId} belongs to campaignSet ${jobData.campaignSetId}/${jobData.teamId}, requested by ${setId}/${teamId}`);
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
