/**
 * Creative Generation Routes
 *
 * API endpoints for generating images from visual templates.
 * Supports preview (data URL), single generation (with upload), and batch jobs.
 */

import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  previewRequestSchema,
  previewResponseSchema,
  singleGenerationRequestSchema,
  batchGenerationRequestSchema,
  batchGenerationResponseSchema,
  generationJobSchema,
  generationJobQuerySchema,
  generationJobListResponseSchema,
  generatedCreativeSchema,
  generatedCreativeQuerySchema,
  generatedCreativeListResponseSchema,
  jobIdParamSchema,
  cancelJobResponseSchema,
} from "../schemas/generate.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import { ApiException, ErrorCode } from "../lib/errors.js";
import { getCreativeGenerationService } from "../services/creative-generation.js";
import { getJobQueueReady } from "../jobs/queue.js";
import { GENERATE_CREATIVES_JOB } from "../jobs/handlers/generate-creatives.js";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get team ID from request header
 */
function getTeamId(headers: Headers): string {
  const teamId = headers.get("x-team-id");
  if (!teamId) {
    throw new ApiException(400, ErrorCode.VALIDATION_ERROR, "x-team-id header is required");
  }
  return teamId;
}

/**
 * Format date to ISO string
 */
function formatDate(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

// Create the OpenAPI Hono app
export const generateApp = new OpenAPIHono();

// ============================================================================
// Route Definitions
// ============================================================================

const previewRoute = createRoute({
  method: "post",
  path: "/api/v1/generate/preview",
  tags: ["Generation"],
  summary: "Generate preview",
  description: "Renders a template with variable data and returns a data URL (no storage)",
  request: {
    body: {
      content: {
        "application/json": {
          schema: previewRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Preview generated successfully",
      content: {
        "application/json": {
          schema: previewResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const singleGenerationRoute = createRoute({
  method: "post",
  path: "/api/v1/generate/single",
  tags: ["Generation"],
  summary: "Generate single image",
  description: "Generates and uploads a single image from template + data row",
  request: {
    body: {
      content: {
        "application/json": {
          schema: singleGenerationRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Image generated successfully",
      content: {
        "application/json": {
          schema: generatedCreativeSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const batchGenerationRoute = createRoute({
  method: "post",
  path: "/api/v1/generate/batch",
  tags: ["Generation"],
  summary: "Start batch generation job",
  description: "Queues a batch job to generate multiple images asynchronously",
  request: {
    body: {
      content: {
        "application/json": {
          schema: batchGenerationRequestSchema,
        },
      },
    },
  },
  responses: {
    202: {
      description: "Batch job queued",
      content: {
        "application/json": {
          schema: batchGenerationResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const listJobsRoute = createRoute({
  method: "get",
  path: "/api/v1/generate/jobs",
  tags: ["Generation"],
  summary: "List generation jobs",
  description: "Returns a paginated list of generation jobs for the team",
  request: {
    query: generationJobQuerySchema,
  },
  responses: {
    200: {
      description: "List of generation jobs",
      content: {
        "application/json": {
          schema: generationJobListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const getJobRoute = createRoute({
  method: "get",
  path: "/api/v1/generate/jobs/{id}",
  tags: ["Generation"],
  summary: "Get generation job",
  description: "Returns a generation job with current progress",
  request: {
    params: jobIdParamSchema,
  },
  responses: {
    200: {
      description: "Generation job details",
      content: {
        "application/json": {
          schema: generationJobSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const getJobResultsRoute = createRoute({
  method: "get",
  path: "/api/v1/generate/jobs/{id}/results",
  tags: ["Generation"],
  summary: "Get job results",
  description: "Returns generated creatives from a batch job",
  request: {
    params: jobIdParamSchema,
    query: generatedCreativeQuerySchema,
  },
  responses: {
    200: {
      description: "List of generated creatives",
      content: {
        "application/json": {
          schema: generatedCreativeListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const cancelJobRoute = createRoute({
  method: "delete",
  path: "/api/v1/generate/jobs/{id}",
  tags: ["Generation"],
  summary: "Cancel generation job",
  description: "Cancels a pending or processing job",
  request: {
    params: jobIdParamSchema,
  },
  responses: {
    200: {
      description: "Job cancellation result",
      content: {
        "application/json": {
          schema: cancelJobResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

generateApp.openapi(previewRoute, async (c) => {
  const body = c.req.valid("json");
  const teamId = getTeamId(c.req.raw.headers);

  const service = getCreativeGenerationService();
  const result = await service.generatePreview(
    body.templateId,
    teamId,
    body.variableData,
    body.aspectRatio
  );

  return c.json(result, 200);
});

generateApp.openapi(singleGenerationRoute, async (c) => {
  const body = c.req.valid("json");
  const teamId = getTeamId(c.req.raw.headers);

  const service = getCreativeGenerationService();
  const creative = await service.generateSingle({
    teamId,
    templateId: body.templateId,
    dataSourceId: body.dataSourceId,
    dataRowId: body.dataRowId,
    aspectRatio: body.aspectRatio,
    format: body.format,
    quality: body.quality,
  });

  return c.json(
    {
      ...creative,
      createdAt: creative.createdAt.toISOString(),
    } as never,
    200
  );
});

generateApp.openapi(batchGenerationRoute, async (c) => {
  const body = c.req.valid("json");
  const teamId = getTeamId(c.req.raw.headers);

  const service = getCreativeGenerationService();
  const job = await service.startBatchJob({
    teamId,
    templateId: body.templateId,
    dataSourceId: body.dataSourceId,
    aspectRatios: body.aspectRatios,
    rowFilter: body.rowFilter ?? undefined,
    format: body.format,
    quality: body.quality,
  });

  // Queue the job for background processing
  const boss = await getJobQueueReady();
  await boss.send(GENERATE_CREATIVES_JOB, {
    jobId: job.id,
    teamId,
    templateId: body.templateId,
    dataSourceId: body.dataSourceId,
    aspectRatios: body.aspectRatios,
    rowFilter: body.rowFilter ?? undefined,
    format: body.format,
    quality: body.quality,
  });

  return c.json(
    {
      jobId: job.id,
      status: "queued" as const,
      message: `Batch generation job queued with ${job.totalItems} items`,
      totalItems: job.totalItems,
    },
    202
  );
});

generateApp.openapi(listJobsRoute, async (c) => {
  const query = c.req.valid("query");
  const teamId = getTeamId(c.req.raw.headers);

  const service = getCreativeGenerationService();
  const result = await service.listJobs(teamId, {
    page: query.page,
    limit: query.limit,
    status: query.status,
  });

  // Format dates for response and ensure non-null arrays
  const formattedData = result.data.map((job) => ({
    ...job,
    startedAt: formatDate(job.startedAt),
    completedAt: formatDate(job.completedAt),
    createdAt: job.createdAt.toISOString(),
    errorLog: job.errorLog ?? [],
    outputCreativeIds: job.outputCreativeIds ?? [],
  }));

  return c.json(
    createPaginatedResponse(formattedData, result.total, query.page, query.limit) as never,
    200
  );
});

generateApp.openapi(getJobRoute, async (c) => {
  const { id } = c.req.valid("param");
  const teamId = getTeamId(c.req.raw.headers);

  const service = getCreativeGenerationService();
  const job = await service.getJob(id, teamId);

  if (!job) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, `Generation job not found: ${id}`);
  }

  return c.json(
    {
      ...job,
      startedAt: formatDate(job.startedAt),
      completedAt: formatDate(job.completedAt),
      createdAt: job.createdAt.toISOString(),
    } as never,
    200
  );
});

generateApp.openapi(getJobResultsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const query = c.req.valid("query");
  const teamId = getTeamId(c.req.raw.headers);

  const service = getCreativeGenerationService();
  const result = await service.getJobResults(id, teamId, {
    page: query.page,
    limit: query.limit,
  });

  // Format dates for response
  const formattedData = result.data.map((creative) => ({
    ...creative,
    createdAt: creative.createdAt.toISOString(),
  }));

  return c.json(
    createPaginatedResponse(formattedData, result.total, query.page, query.limit),
    200
  );
});

generateApp.openapi(cancelJobRoute, async (c) => {
  const { id } = c.req.valid("param");
  const teamId = getTeamId(c.req.raw.headers);

  const service = getCreativeGenerationService();
  const cancelled = await service.cancelJob(id, teamId);

  if (!cancelled) {
    return c.json(
      {
        success: false,
        message: "Job cannot be cancelled (not found or already finished)",
      },
      200
    );
  }

  return c.json(
    {
      success: true,
      message: "Job cancelled successfully",
    },
    200
  );
});

// ============================================================================
// Error Handler
// ============================================================================

generateApp.onError((err, c) => {
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  const errorId = crypto.randomUUID();
  console.error({
    errorId,
    error: err instanceof Error ? err.message : err,
    stack: err instanceof Error ? err.stack : undefined,
  });

  return c.json(
    {
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
      errorId,
    },
    500
  );
});

export default generateApp;
