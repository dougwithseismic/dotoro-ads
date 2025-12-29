/**
 * Sync Status API Routes
 *
 * Provides endpoints for monitoring sync job status and retrying failed syncs.
 *
 * Endpoints:
 * - GET /api/v1/sync/status - Get sync status summary (active, pending, failed jobs)
 * - POST /api/v1/sync/{campaignSetId}/retry - Retry a failed sync
 */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, and, inArray, gte, sql } from "drizzle-orm";
import { db, campaignSets } from "../services/db.js";
import { getJobQueue, getJobQueueReady } from "../jobs/queue.js";
import { SYNC_CAMPAIGN_SET_JOB } from "../jobs/handlers/sync-campaign-set.js";
import { validateSession } from "../middleware/auth.js";
import { commonResponses } from "../lib/openapi.js";
import {
  ApiException,
  ErrorCode,
  createUnauthorizedError,
  createNotFoundError,
  createForbiddenError,
  createInternalError,
} from "../lib/errors.js";
import type { SyncCampaignSetJob } from "../jobs/types.js";

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Progress object schema for sync jobs
 */
const progressSchema = z.object({
  synced: z.number().int().min(0).describe("Number of campaigns successfully synced"),
  failed: z.number().int().min(0).describe("Number of campaigns that failed to sync"),
  total: z.number().int().min(0).describe("Total number of campaigns to sync"),
});

/**
 * Platform enum schema
 * Note: Uses "facebook" internally but UI shows as "meta"
 */
const platformSchema = z.enum(["reddit", "google", "facebook"]).describe("Target ad platform");

/**
 * Job state enum schema
 */
const stateSchema = z
  .enum(["created", "active", "completed", "failed"])
  .describe("Current job state");

/**
 * Sync job schema - represents a single sync job
 */
export const syncJobSchema = z.object({
  id: z.string().uuid().describe("Unique job ID"),
  campaignSetId: z.string().uuid().describe("ID of the campaign set being synced"),
  campaignSetName: z.string().describe("Name of the campaign set"),
  platform: platformSchema,
  state: stateSchema,
  progress: progressSchema,
  error: z.string().optional().describe("Error message if the job failed"),
  createdAt: z.string().datetime().describe("ISO timestamp when job was created"),
  startedAt: z.string().datetime().optional().describe("ISO timestamp when job started"),
  completedAt: z.string().datetime().optional().describe("ISO timestamp when job completed"),
});

export type SyncJob = z.infer<typeof syncJobSchema>;

/**
 * Sync status response schema
 */
export const syncStatusResponseSchema = z.object({
  active: z.array(syncJobSchema).describe("Currently active sync jobs"),
  pending: z.array(syncJobSchema).describe("Pending sync jobs in queue"),
  failed: z.array(syncJobSchema).describe("Recently failed sync jobs (last 24 hours)"),
});

export type SyncStatusResponse = z.infer<typeof syncStatusResponseSchema>;

/**
 * Retry response schema
 */
const retryResponseSchema = z.object({
  jobId: z.string().uuid().describe("ID of the new sync job"),
  status: z.literal("queued").describe("Job status"),
  message: z.string().describe("Human-readable status message"),
});

/**
 * Campaign set ID parameter schema
 */
const campaignSetIdParamSchema = z.object({
  campaignSetId: z.string().uuid("Campaign set ID must be a valid UUID"),
});

// ============================================================================
// OpenAPI Route Definitions
// ============================================================================

/**
 * GET /api/v1/sync/status
 */
const getSyncStatusRoute = createRoute({
  method: "get",
  path: "/api/v1/sync/status",
  tags: ["Sync"],
  summary: "Get sync status summary",
  description:
    "Returns a summary of sync jobs grouped by state: active (currently syncing), pending (queued), and failed (last 24 hours).",
  responses: {
    200: {
      description: "Sync status summary",
      content: {
        "application/json": {
          schema: syncStatusResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * POST /api/v1/sync/{campaignSetId}/retry
 */
const retrySyncRoute = createRoute({
  method: "post",
  path: "/api/v1/sync/{campaignSetId}/retry",
  tags: ["Sync"],
  summary: "Retry a sync job",
  description: "Queues a new sync job for the specified campaign set.",
  request: {
    params: campaignSetIdParamSchema,
  },
  responses: {
    202: {
      description: "Sync job queued successfully",
      content: {
        "application/json": {
          schema: retryResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Create the OpenAPI Hono app
// ============================================================================

export const syncApp = new OpenAPIHono();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the date 24 hours ago for filtering failed jobs
 */
function get24HoursAgo(): Date {
  const date = new Date();
  date.setHours(date.getHours() - 24);
  return date;
}

/**
 * Map campaign set and job data to SyncJob interface
 */
function mapToSyncJob(
  campaignSet: {
    id: string;
    name: string;
    syncStatus: string;
    lastSyncedAt: Date | null;
    createdAt: Date;
    config?: { platform?: string } | null;
  },
  job?: {
    id: string;
    state: string;
    data?: { platform?: string };
    output?: { synced?: number; failed?: number; total?: number };
    createdOn: Date;
    startedOn?: Date | null;
    completedOn?: Date | null;
  } | null
): SyncJob {
  // Determine platform from job data or campaign set config
  const platformRaw =
    job?.data?.platform ||
    (campaignSet.config as { platform?: string })?.platform ||
    "reddit";

  // Map "facebook" to "meta" for frontend consistency
  // The frontend uses "meta" while internal types use "facebook"
  const platform = platformRaw === "facebook" ? "facebook" : platformRaw;

  // Map sync status to state
  let state: "created" | "active" | "completed" | "failed";
  if (job) {
    state = job.state as "created" | "active" | "completed" | "failed";
  } else {
    switch (campaignSet.syncStatus) {
      case "syncing":
        state = "active";
        break;
      case "pending":
        state = "created";
        break;
      case "synced":
        state = "completed";
        break;
      case "failed":
      case "conflict":
        state = "failed";
        break;
      default:
        state = "created";
    }
  }

  // Get progress from job output or default to zeros
  const progress = {
    synced: job?.output?.synced ?? 0,
    failed: job?.output?.failed ?? 0,
    total: job?.output?.total ?? 0,
  };

  return {
    id: job?.id ?? campaignSet.id, // Use job ID if available, else campaign set ID
    campaignSetId: campaignSet.id,
    campaignSetName: campaignSet.name,
    platform: platform as "reddit" | "google" | "facebook",
    state,
    progress,
    createdAt: (job?.createdOn ?? campaignSet.createdAt).toISOString(),
    startedAt: job?.startedOn?.toISOString(),
    completedAt: job?.completedOn?.toISOString(),
  };
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/v1/sync/status handler
 */
syncApp.openapi(getSyncStatusRoute, async (c) => {
  // Validate session and get authenticated user
  const session = await validateSession(c.req.raw.headers);
  if (!session) {
    throw createUnauthorizedError("Authentication required");
  }
  const userId = session.user.id;

  // Get pg-boss instance for job lookups
  const boss = await getJobQueue();

  // Query campaign sets with relevant sync statuses
  const twentyFourHoursAgo = get24HoursAgo();

  // Get campaign sets that are actively syncing or pending
  const activeSets = await db
    .select({
      id: campaignSets.id,
      name: campaignSets.name,
      syncStatus: campaignSets.syncStatus,
      lastSyncedAt: campaignSets.lastSyncedAt,
      createdAt: campaignSets.createdAt,
      config: campaignSets.config,
    })
    .from(campaignSets)
    .where(
      and(
        eq(campaignSets.userId, userId),
        inArray(campaignSets.syncStatus, ["syncing"])
      )
    );

  // Get pending campaign sets
  const pendingSets = await db
    .select({
      id: campaignSets.id,
      name: campaignSets.name,
      syncStatus: campaignSets.syncStatus,
      lastSyncedAt: campaignSets.lastSyncedAt,
      createdAt: campaignSets.createdAt,
      config: campaignSets.config,
    })
    .from(campaignSets)
    .where(
      and(
        eq(campaignSets.userId, userId),
        eq(campaignSets.syncStatus, "pending")
      )
    );

  // Get recently failed campaign sets (last 24 hours)
  const failedSets = await db
    .select({
      id: campaignSets.id,
      name: campaignSets.name,
      syncStatus: campaignSets.syncStatus,
      lastSyncedAt: campaignSets.lastSyncedAt,
      createdAt: campaignSets.createdAt,
      config: campaignSets.config,
    })
    .from(campaignSets)
    .where(
      and(
        eq(campaignSets.userId, userId),
        inArray(campaignSets.syncStatus, ["failed", "conflict"]),
        gte(campaignSets.updatedAt, twentyFourHoursAgo)
      )
    );

  // Map to SyncJob format
  const activeJobs: SyncJob[] = activeSets.map((set) =>
    mapToSyncJob({
      id: set.id,
      name: set.name,
      syncStatus: set.syncStatus,
      lastSyncedAt: set.lastSyncedAt,
      createdAt: set.createdAt,
      config: set.config as { platform?: string } | null,
    })
  );

  const pendingJobs: SyncJob[] = pendingSets.map((set) =>
    mapToSyncJob({
      id: set.id,
      name: set.name,
      syncStatus: set.syncStatus,
      lastSyncedAt: set.lastSyncedAt,
      createdAt: set.createdAt,
      config: set.config as { platform?: string } | null,
    })
  );

  const failedJobs: SyncJob[] = failedSets.map((set) =>
    mapToSyncJob({
      id: set.id,
      name: set.name,
      syncStatus: set.syncStatus,
      lastSyncedAt: set.lastSyncedAt,
      createdAt: set.createdAt,
      config: set.config as { platform?: string } | null,
    })
  );

  return c.json(
    {
      active: activeJobs,
      pending: pendingJobs,
      failed: failedJobs,
    },
    200
  );
});

/**
 * POST /api/v1/sync/{campaignSetId}/retry handler
 */
syncApp.openapi(retrySyncRoute, async (c) => {
  // Validate session and get authenticated user
  const session = await validateSession(c.req.raw.headers);
  if (!session) {
    throw createUnauthorizedError("Authentication required");
  }
  const userId = session.user.id;

  const { campaignSetId } = c.req.valid("param");

  // Find the campaign set
  const [campaignSet] = await db
    .select({
      id: campaignSets.id,
      name: campaignSets.name,
      userId: campaignSets.userId,
      teamId: campaignSets.teamId,
      syncStatus: campaignSets.syncStatus,
      config: campaignSets.config,
    })
    .from(campaignSets)
    .where(eq(campaignSets.id, campaignSetId))
    .limit(1);

  if (!campaignSet) {
    throw createNotFoundError("Campaign set", campaignSetId);
  }

  // Verify ownership (TODO: migrate to team-based auth)
  if (campaignSet.userId !== userId) {
    throw createForbiddenError("You do not have access to this campaign set");
  }

  // Get job queue and queue a new sync job
  const boss = await getJobQueueReady();

  // Extract platform, funding instrument, and ad account from config
  const config = campaignSet.config as {
    platform?: string;
    selectedPlatforms?: string[];
    fundingInstrumentId?: string;
    adAccountId?: string;
  } | null;

  const platformRaw = config?.platform || config?.selectedPlatforms?.[0] || "reddit";
  // Map "meta" to "facebook" for internal platform type consistency
  const platform = platformRaw === "meta" ? "facebook" : platformRaw;
  const fundingInstrumentId = config?.fundingInstrumentId ?? "";
  const adAccountId = config?.adAccountId ?? "";

  // Validate required fields based on platform
  // Reddit requires adAccountId for syncing
  if (platform === "reddit" && !adAccountId) {
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      "Ad account ID is required for Reddit sync. Please configure the campaign set with an ad account."
    );
  }

  // Validate teamId is present (required for team-based ownership)
  if (!campaignSet.teamId) {
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      "Campaign set must be associated with a team."
    );
  }

  // Create job data (use teamId from campaign set for team-based ownership)
  const jobData: SyncCampaignSetJob = {
    campaignSetId,
    teamId: campaignSet.teamId,
    adAccountId,
    fundingInstrumentId,
    platform: platform as "reddit" | "google" | "facebook",
  };

  // Queue the sync job
  const jobId = await boss.send(SYNC_CAMPAIGN_SET_JOB, jobData, {
    singletonKey: `sync-campaign-set-${campaignSetId}`,
  });

  if (!jobId) {
    throw createInternalError("Failed to queue sync job");
  }

  // Update campaign set status to pending
  await db
    .update(campaignSets)
    .set({ syncStatus: "pending" })
    .where(eq(campaignSets.id, campaignSetId));

  return c.json(
    {
      jobId,
      status: "queued" as const,
      message: `Sync job queued for campaign set "${campaignSet.name}"`,
    },
    202
  );
});

// ============================================================================
// Error Handler
// ============================================================================

syncApp.onError((err, c) => {
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  console.error("Sync API error:", err);
  return c.json(
    {
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
    },
    500
  );
});

export default syncApp;
