import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  creativeSchema,
  creativeListResponseSchema,
  creativeQuerySchema,
  requestUploadUrlSchema,
  uploadUrlResponseSchema,
  registerCreativeSchema,
  updateCreativeSchema,
  modifyTagsSchema,
  deleteResponseSchema,
  creativeWithUrlSchema,
} from "../schemas/creatives.js";
import { idParamSchema, accountIdQuerySchema } from "../schemas/common.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import { createNotFoundError, ApiException, ErrorCode } from "../lib/errors.js";
import {
  CreativeLibraryService,
  type CreativeFilters,
} from "../services/creative-library.js";
import {
  getStorageService,
  getAllowedContentTypes,
  getFileSizeLimits,
  resetStorageService,
  type StorageService,
  type MockStorageService,
} from "../services/storage.js";
import { formatBytes } from "@repo/core";

// Create service instances
let creativeService = new CreativeLibraryService();
let storageService: StorageService = getStorageService();

// Reset function for testing
export function resetCreativesState() {
  creativeService = new CreativeLibraryService();
  resetStorageService();
  storageService = getStorageService();
}

// Export for testing - casts to MockStorageService for test helpers
export function getStorageServiceForTesting(): MockStorageService {
  return storageService as MockStorageService;
}

// Content type to file extension mapping
const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

/**
 * Check if the requesting account has access to the creative
 */
function checkCreativeAccess(creative: { accountId: string }, requestAccountId: string): void {
  if (creative.accountId !== requestAccountId) {
    throw new ApiException(403, ErrorCode.FORBIDDEN, "Access denied to this creative");
  }
}

// Create the OpenAPI Hono app
export const creativesApp = new OpenAPIHono();

// ============================================================================
// Route Definitions
// ============================================================================

const requestUploadRoute = createRoute({
  method: "post",
  path: "/api/v1/creatives/upload",
  tags: ["Creatives"],
  summary: "Request upload URL",
  description: "Generates a presigned URL for direct file upload to storage",
  request: {
    body: {
      content: {
        "application/json": {
          schema: requestUploadUrlSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Upload URL generated successfully",
      content: {
        "application/json": {
          schema: uploadUrlResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const registerCreativeRoute = createRoute({
  method: "post",
  path: "/api/v1/creatives",
  tags: ["Creatives"],
  summary: "Register uploaded creative",
  description:
    "Registers a creative after successful upload, linking storage key to metadata",
  request: {
    body: {
      content: {
        "application/json": {
          schema: registerCreativeSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Creative registered successfully",
      content: {
        "application/json": {
          schema: creativeSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const listCreativesRoute = createRoute({
  method: "get",
  path: "/api/v1/creatives",
  tags: ["Creatives"],
  summary: "List creatives",
  description: "Returns a paginated list of creatives for an account",
  request: {
    query: creativeQuerySchema,
  },
  responses: {
    200: {
      description: "List of creatives",
      content: {
        "application/json": {
          schema: creativeListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const getCreativeRoute = createRoute({
  method: "get",
  path: "/api/v1/creatives/{id}",
  tags: ["Creatives"],
  summary: "Get creative details",
  description: "Returns the details of a specific creative with download URL",
  request: {
    params: idParamSchema,
    query: accountIdQuerySchema,
  },
  responses: {
    200: {
      description: "Creative details",
      content: {
        "application/json": {
          schema: creativeWithUrlSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const updateCreativeRoute = createRoute({
  method: "put",
  path: "/api/v1/creatives/{id}",
  tags: ["Creatives"],
  summary: "Update creative metadata",
  description: "Updates the name or tags of a creative",
  request: {
    params: idParamSchema,
    query: accountIdQuerySchema,
    body: {
      content: {
        "application/json": {
          schema: updateCreativeSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Creative updated successfully",
      content: {
        "application/json": {
          schema: creativeSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const deleteCreativeRoute = createRoute({
  method: "delete",
  path: "/api/v1/creatives/{id}",
  tags: ["Creatives"],
  summary: "Delete creative",
  description: "Deletes a creative and its storage object",
  request: {
    params: idParamSchema,
    query: accountIdQuerySchema,
  },
  responses: {
    200: {
      description: "Creative deleted successfully",
      content: {
        "application/json": {
          schema: deleteResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const addTagsRoute = createRoute({
  method: "post",
  path: "/api/v1/creatives/{id}/tags",
  tags: ["Creatives"],
  summary: "Add tags to creative",
  description: "Adds one or more tags to a creative",
  request: {
    params: idParamSchema,
    query: accountIdQuerySchema,
    body: {
      content: {
        "application/json": {
          schema: modifyTagsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Tags added successfully",
      content: {
        "application/json": {
          schema: creativeSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const removeTagsRoute = createRoute({
  method: "delete",
  path: "/api/v1/creatives/{id}/tags",
  tags: ["Creatives"],
  summary: "Remove tags from creative",
  description: "Removes one or more tags from a creative",
  request: {
    params: idParamSchema,
    query: accountIdQuerySchema,
    body: {
      content: {
        "application/json": {
          schema: modifyTagsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Tags removed successfully",
      content: {
        "application/json": {
          schema: creativeSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

creativesApp.openapi(requestUploadRoute, async (c) => {
  const body = c.req.valid("json");

  // Validate content type
  const allowedTypes = getAllowedContentTypes();
  const isAllowed =
    allowedTypes.image.includes(body.contentType) ||
    allowedTypes.video.includes(body.contentType);

  if (!isAllowed) {
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      `Content type "${body.contentType}" is not allowed. Allowed types: ${[...allowedTypes.image, ...allowedTypes.video].join(", ")}`
    );
  }

  // Validate file size
  const limits = getFileSizeLimits();
  const isVideo = allowedTypes.video.includes(body.contentType);
  const maxSize = isVideo ? limits.video : limits.image;

  if (body.fileSize > maxSize) {
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      `File size ${formatBytes(body.fileSize)} exceeds maximum ${formatBytes(maxSize)} for ${isVideo ? "video" : "image"} files`
    );
  }

  try {
    // Derive extension from validated contentType (not user input)
    const extension = CONTENT_TYPE_EXTENSIONS[body.contentType];
    if (!extension) {
      throw new ApiException(
        400,
        ErrorCode.VALIDATION_ERROR,
        `Unsupported content type: ${body.contentType}`
      );
    }
    const key = `uploads/${crypto.randomUUID()}.${extension}`;

    const result = await storageService.generateUploadUrl(
      key,
      body.contentType,
      body.fileSize
    );

    return c.json(
      {
        uploadUrl: result.url,
        key: result.key,
        expiresAt: result.expiresAt,
      },
      200
    );
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      error instanceof Error ? error.message : "Failed to generate upload URL"
    );
  }
});

creativesApp.openapi(registerCreativeRoute, async (c) => {
  const body = c.req.valid("json");

  // Fetch metadata from storage to get actual file size
  const metadata = await storageService.headObject(body.key);
  if (!metadata) {
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      "File not found in storage. Upload must complete before registering."
    );
  }

  const creative = await creativeService.registerCreative({
    key: body.key,
    name: body.name,
    type: body.type as "IMAGE" | "VIDEO" | "CAROUSEL",
    accountId: body.accountId,
    mimeType: metadata.contentType,
    fileSize: metadata.size,
    tags: body.tags,
  });

  return c.json(creative, 201);
});

creativesApp.openapi(listCreativesRoute, async (c) => {
  const query = c.req.valid("query");

  const filters: CreativeFilters = {
    accountId: query.accountId,
    type: query.type as "IMAGE" | "VIDEO" | "CAROUSEL" | undefined,
    status: query.status as "PENDING" | "UPLOADED" | "PROCESSING" | "READY" | "FAILED" | undefined,
    tags: query.tags ? query.tags.split(",").map((t) => t.trim()) : undefined,
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };

  const result = await creativeService.listCreatives(filters);

  return c.json(result, 200);
});

creativesApp.openapi(getCreativeRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { accountId } = c.req.valid("query");

  const creative = await creativeService.getCreative(id);
  if (!creative) {
    throw createNotFoundError("Creative", id);
  }

  // Authorization check
  checkCreativeAccess(creative, accountId);

  // Generate download URLs from storage service
  const downloadUrl = await storageService.generateDownloadUrl(creative.storageKey);
  const thumbnailUrl = creative.thumbnailKey
    ? await storageService.generateDownloadUrl(creative.thumbnailKey)
    : undefined;

  const creativeWithUrl = {
    ...creative,
    downloadUrl,
    thumbnailUrl,
  };

  return c.json(creativeWithUrl, 200);
});

creativesApp.openapi(updateCreativeRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { accountId } = c.req.valid("query");
  const body = c.req.valid("json");

  const existing = await creativeService.getCreative(id);
  if (!existing) {
    throw createNotFoundError("Creative", id);
  }

  // Authorization check
  checkCreativeAccess(existing, accountId);

  // Handle tags update separately if provided
  if (body.tags !== undefined) {
    // Replace all tags
    await creativeService.removeTags(id, existing.tags);
    await creativeService.addTags(id, body.tags);
  }

  // Update name if provided
  const updates: { name?: string } = {};
  if (body.name !== undefined) {
    updates.name = body.name;
  }

  let updated = existing;
  if (Object.keys(updates).length > 0) {
    updated = await creativeService.updateCreative(id, updates);
  } else {
    const refreshed = await creativeService.getCreative(id);
    if (!refreshed) {
      throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to retrieve updated creative");
    }
    updated = refreshed;
  }

  return c.json(updated, 200);
});

creativesApp.openapi(deleteCreativeRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { accountId } = c.req.valid("query");

  const existing = await creativeService.getCreative(id);
  if (!existing) {
    throw createNotFoundError("Creative", id);
  }

  // Authorization check
  checkCreativeAccess(existing, accountId);

  // Delete from storage with proper error handling
  try {
    await storageService.deleteObject(existing.storageKey);
  } catch (error) {
    console.error(`Failed to delete storage object ${existing.storageKey}:`, error);
    throw new ApiException(
      500,
      ErrorCode.INTERNAL_ERROR,
      "Failed to delete creative file from storage"
    );
  }

  // Delete from database
  await creativeService.deleteCreative(id);

  return c.json({ success: true }, 200);
});

creativesApp.openapi(addTagsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { accountId } = c.req.valid("query");
  const body = c.req.valid("json");

  const existing = await creativeService.getCreative(id);
  if (!existing) {
    throw createNotFoundError("Creative", id);
  }

  // Authorization check
  checkCreativeAccess(existing, accountId);

  await creativeService.addTags(id, body.tags);
  const updated = await creativeService.getCreative(id);
  if (!updated) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to retrieve updated creative");
  }

  return c.json(updated, 200);
});

creativesApp.openapi(removeTagsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { accountId } = c.req.valid("query");
  const body = c.req.valid("json");

  const existing = await creativeService.getCreative(id);
  if (!existing) {
    throw createNotFoundError("Creative", id);
  }

  // Authorization check
  checkCreativeAccess(existing, accountId);

  await creativeService.removeTags(id, body.tags);
  const updated = await creativeService.getCreative(id);
  if (!updated) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to retrieve updated creative");
  }

  return c.json(updated, 200);
});

// Error handler for API exceptions
creativesApp.onError((err, c) => {
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  // Generate unique error ID for tracking
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

export default creativesApp;
