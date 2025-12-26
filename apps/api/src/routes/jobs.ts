/**
 * Jobs API Routes
 *
 * Provides endpoints for checking background job status.
 */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { Context } from "hono";
import { getJobQueue } from "../jobs/queue.js";
import { createNotFoundError, createUnauthorizedError, createForbiddenError, ApiException, ErrorCode } from "../lib/errors.js";
import { commonResponses } from "../lib/openapi.js";
import type { JobStatus, JobState } from "../jobs/types.js";

// ============================================================================
// Authorization Helper
// ============================================================================

/**
 * Extracts and validates user ID from request headers.
 */
function getUserId(c: Context): string {
  const userId = c.req.header("x-user-id") || "";
  if (!userId) {
    throw createUnauthorizedError("User ID required");
  }
  return userId;
}

// ============================================================================
// Schemas
// ============================================================================

const jobIdParamSchema = z.object({
  jobId: z.string().uuid("Job ID must be a valid UUID"),
});

const jobStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.enum(["created", "active", "completed", "failed", "cancelled"]),
  data: z.unknown(),
  progress: z.number().optional(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
});

// ============================================================================
// Create App
// ============================================================================

export const jobsApp = new OpenAPIHono();

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Get Job Status
 */
const getJobStatusRoute = createRoute({
  method: "get",
  path: "/api/v1/jobs/{jobId}",
  tags: ["Jobs"],
  summary: "Get job status",
  description: "Returns the current status of a background job",
  request: {
    params: jobIdParamSchema,
  },
  responses: {
    200: {
      description: "Job status",
      content: {
        "application/json": {
          schema: jobStatusSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

jobsApp.openapi(getJobStatusRoute, async (c) => {
  const userId = getUserId(c); // Validate auth
  const { jobId } = c.req.valid("param");

  // Get the job queue
  const boss = await getJobQueue();

  // Look up the job by ID
  // Note: pg-boss requires the queue name for getJobById
  // We'll check known job types
  const job = await boss.getJobById("sync-campaign-set", jobId);

  if (!job) {
    throw createNotFoundError("Job", jobId);
  }

  // Security: Verify job belongs to requesting user
  // Jobs store userId in their data payload
  const jobData = job.data as { userId?: string };
  if (jobData.userId !== userId) {
    throw createForbiddenError("Access denied to this job");
  }

  // Map pg-boss job to our JobStatus format
  const status: JobStatus = {
    id: job.id,
    name: job.name,
    state: job.state as JobState,
    data: job.data,
    progress: job.progress ?? undefined,
    output: job.output ?? undefined,
    error: job.state === "failed" && job.output
      ? (typeof job.output === "object" && job.output !== null && "message" in job.output
          ? String((job.output as { message?: string }).message)
          : "Job failed")
      : undefined,
    startedAt: job.startedOn ? new Date(job.startedOn).toISOString() : undefined,
    completedAt: job.completedOn ? new Date(job.completedOn).toISOString() : undefined,
    createdAt: new Date(job.createdOn).toISOString(),
  };

  return c.json({
    id: status.id,
    name: status.name,
    state: status.state,
    data: status.data,
    progress: status.progress,
    output: status.output,
    error: status.error,
    startedAt: status.startedAt,
    completedAt: status.completedAt,
    createdAt: status.createdAt,
  }, 200);
});

// ============================================================================
// Error Handler
// ============================================================================

jobsApp.onError((err, c) => {
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

export default jobsApp;
