import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { TransformConfig } from "@repo/core";
import {
  transformResponseSchema,
  transformListResponseSchema,
  transformQuerySchema,
  createTransformSchema,
  updateTransformSchema,
  previewTransformSchema,
  previewExistingTransformQuerySchema,
  previewResponseSchema,
  executeResponseSchema,
  validateConfigRequestSchema,
  validationResultResponseSchema,
} from "../schemas/transforms.js";
import { idParamSchema } from "../schemas/common.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import { createNotFoundError, ApiException, ErrorCode } from "../lib/errors.js";
import { transformService } from "../services/transform-service.js";

// Create the OpenAPI Hono app
export const transformsApp = new OpenAPIHono();

// ============================================================================
// Route Definitions
// ============================================================================

const listTransformsRoute = createRoute({
  method: "get",
  path: "/api/v1/transforms",
  tags: ["Transforms"],
  summary: "List all transforms",
  description: "Returns a paginated list of transforms with optional filtering",
  request: {
    query: transformQuerySchema,
  },
  responses: {
    200: {
      description: "List of transforms",
      content: {
        "application/json": {
          schema: transformListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const createTransformRoute = createRoute({
  method: "post",
  path: "/api/v1/transforms",
  tags: ["Transforms"],
  summary: "Create a new transform",
  description:
    "Creates a new transform for grouping and aggregating data from a source data source. Also creates a virtual output data source.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createTransformSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Transform created successfully",
      content: {
        "application/json": {
          schema: transformResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const getTransformRoute = createRoute({
  method: "get",
  path: "/api/v1/transforms/{id}",
  tags: ["Transforms"],
  summary: "Get a transform by ID",
  description: "Returns the details of a specific transform",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Transform details",
      content: {
        "application/json": {
          schema: transformResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const updateTransformRoute = createRoute({
  method: "put",
  path: "/api/v1/transforms/{id}",
  tags: ["Transforms"],
  summary: "Update a transform",
  description: "Updates an existing transform configuration",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateTransformSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Transform updated successfully",
      content: {
        "application/json": {
          schema: transformResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const deleteTransformRoute = createRoute({
  method: "delete",
  path: "/api/v1/transforms/{id}",
  tags: ["Transforms"],
  summary: "Delete a transform",
  description:
    "Deletes a transform and its associated virtual output data source",
  request: {
    params: idParamSchema,
  },
  responses: {
    204: {
      description: "Transform deleted successfully",
    },
    ...commonResponses,
  },
});

const executeTransformRoute = createRoute({
  method: "post",
  path: "/api/v1/transforms/{id}/execute",
  tags: ["Transforms"],
  summary: "Execute a transform",
  description:
    "Executes the transform against its source data and populates the output data source",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Transform executed successfully",
      content: {
        "application/json": {
          schema: executeResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const previewExistingTransformRoute = createRoute({
  method: "post",
  path: "/api/v1/transforms/{id}/preview",
  tags: ["Transforms"],
  summary: "Preview an existing transform",
  description:
    "Runs the transform and returns preview results without persisting to the output data source",
  request: {
    params: idParamSchema,
    query: previewExistingTransformQuerySchema,
  },
  responses: {
    200: {
      description: "Preview results",
      content: {
        "application/json": {
          schema: previewResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const previewDraftTransformRoute = createRoute({
  method: "post",
  path: "/api/v1/transforms/preview",
  tags: ["Transforms"],
  summary: "Preview a draft transform",
  description:
    "Preview a transform configuration without creating or persisting it. Useful for testing configurations before saving.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: previewTransformSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Preview results",
      content: {
        "application/json": {
          schema: previewResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const validateConfigRoute = createRoute({
  method: "post",
  path: "/api/v1/transforms/validate",
  tags: ["Transforms"],
  summary: "Validate transform configuration",
  description:
    "Validates a transform configuration against the source data schema without executing it",
  request: {
    body: {
      content: {
        "application/json": {
          schema: validateConfigRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Validation result",
      content: {
        "application/json": {
          schema: validationResultResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert database transform to API response format
 */
function toApiTransform(transform: {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  sourceDataSourceId: string;
  outputDataSourceId: string;
  config: unknown;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): z.infer<typeof transformResponseSchema> {
  return {
    id: transform.id,
    userId: transform.userId,
    name: transform.name,
    description: transform.description,
    sourceDataSourceId: transform.sourceDataSourceId,
    outputDataSourceId: transform.outputDataSourceId,
    config: transform.config as z.infer<typeof transformResponseSchema>["config"],
    enabled: transform.enabled,
    createdAt: transform.createdAt.toISOString(),
    updatedAt: transform.updatedAt.toISOString(),
  };
}

// ============================================================================
// Route Handlers
// ============================================================================

transformsApp.openapi(listTransformsRoute, async (c) => {
  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const { transforms, total } = await transformService.list({
    page,
    limit,
    sourceDataSourceId: query.sourceDataSourceId,
    enabled: query.enabled,
  });

  const data = transforms.map(toApiTransform);
  return c.json(createPaginatedResponse(data, total, page, limit), 200);
});

transformsApp.openapi(createTransformRoute, async (c) => {
  const body = c.req.valid("json");

  const transform = await transformService.create({
    name: body.name,
    description: body.description,
    sourceDataSourceId: body.sourceDataSourceId,
    config: body.config as TransformConfig,
    enabled: body.enabled,
  });

  return c.json(toApiTransform(transform), 201);
});

transformsApp.openapi(getTransformRoute, async (c) => {
  const { id } = c.req.valid("param");

  const transform = await transformService.getById(id);
  if (!transform) {
    throw createNotFoundError("Transform", id);
  }

  return c.json(toApiTransform(transform), 200);
});

transformsApp.openapi(updateTransformRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const transform = await transformService.update(id, {
    name: body.name,
    description: body.description,
    sourceDataSourceId: body.sourceDataSourceId,
    config: body.config as TransformConfig | undefined,
    enabled: body.enabled,
  });

  return c.json(toApiTransform(transform), 200);
});

transformsApp.openapi(deleteTransformRoute, async (c) => {
  const { id } = c.req.valid("param");

  await transformService.delete(id);
  return c.body(null, 204);
});

transformsApp.openapi(executeTransformRoute, async (c) => {
  const { id } = c.req.valid("param");

  const result = await transformService.execute(id);

  return c.json(
    {
      rowsCreated: result.rowsCreated,
      groupCount: result.groupCount,
      sourceRowCount: result.sourceRowCount,
      executedAt: result.executedAt.toISOString(),
    },
    200
  );
});

transformsApp.openapi(previewExistingTransformRoute, async (c) => {
  const { id } = c.req.valid("param");
  const query = c.req.valid("query");

  const result = await transformService.previewExisting(id, query.limit);

  return c.json(result, 200);
});

transformsApp.openapi(previewDraftTransformRoute, async (c) => {
  const body = c.req.valid("json");

  const result = await transformService.preview(
    body.sourceDataSourceId,
    body.config as TransformConfig,
    body.limit
  );

  return c.json(result, 200);
});

transformsApp.openapi(validateConfigRoute, async (c) => {
  const body = c.req.valid("json");

  const result = await transformService.validateConfig(
    body.sourceDataSourceId,
    body.config as TransformConfig
  );

  return c.json(result, 200);
});

// Error handler for API exceptions
transformsApp.onError((err, c) => {
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

export default transformsApp;
