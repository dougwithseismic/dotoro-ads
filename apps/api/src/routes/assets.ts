/**
 * Asset Folder Routes
 *
 * API endpoints for managing asset folders:
 * - POST   /api/v1/assets/folders         - Create folder
 * - GET    /api/v1/assets/folders         - List folders (tree)
 * - GET    /api/v1/assets/folders/:id     - Get folder details
 * - PUT    /api/v1/assets/folders/:id     - Update folder
 * - DELETE /api/v1/assets/folders/:id     - Delete folder
 * - POST   /api/v1/assets/folders/:id/move - Move folder
 * - GET    /api/v1/assets/folders/:id/ancestors - Get folder ancestors
 */

import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { requireAuth, getAuthUser } from "../middleware/auth.js";
import { ApiException, ErrorCode } from "../lib/errors.js";
import { db, teamMemberships } from "../services/db.js";
import { eq, and } from "drizzle-orm";
import {
  createFolderSchema,
  updateFolderSchema,
  moveFolderSchema,
  folderSchema,
  folderDetailSchema,
  folderListResponseSchema,
  folderAncestorsResponseSchema,
  folderIdParamSchema,
  folderListQuerySchema,
  deleteFolderQuerySchema,
} from "../schemas/assets.js";
import { errorResponseSchema } from "../schemas/common.js";
import * as folderService from "../services/asset-folders.js";

// ============================================================================
// Create the OpenAPI Hono app
// ============================================================================

export const assetsApp = new OpenAPIHono();

// Apply auth middleware to all routes
assetsApp.use("/api/v1/assets/*", requireAuth());

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get team ID from request header
 * Team context is provided via x-team-id header
 */
function getTeamId(headers: Headers): string {
  const teamId = headers.get("x-team-id");
  if (!teamId) {
    throw new ApiException(400, ErrorCode.VALIDATION_ERROR, "x-team-id header is required");
  }
  return teamId;
}

/**
 * Validate that user has access to the team
 */
async function validateTeamAccess(userId: string, teamId: string): Promise<void> {
  try {
    const membership = await db
      .select({ id: teamMemberships.id })
      .from(teamMemberships)
      .where(
        and(
          eq(teamMemberships.userId, userId),
          eq(teamMemberships.teamId, teamId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      throw new ApiException(403, ErrorCode.FORBIDDEN, "You don't have access to this team");
    }
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new ApiException(
      500,
      ErrorCode.INTERNAL_ERROR,
      `Failed to validate team access: ${message}`
    );
  }
}

// ============================================================================
// Route Definitions
// ============================================================================

const createFolderRoute = createRoute({
  method: "post",
  path: "/api/v1/assets/folders",
  tags: ["Asset Folders"],
  summary: "Create folder",
  description: "Create a new asset folder. Requires x-team-id header.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createFolderSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Folder created successfully",
      content: {
        "application/json": {
          schema: folderSchema,
        },
      },
    },
    400: {
      description: "Invalid request (missing team header, invalid parent, etc.)",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden - no access to team",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: "Parent folder not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    409: {
      description: "Folder with this name already exists in parent",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const listFoldersRoute = createRoute({
  method: "get",
  path: "/api/v1/assets/folders",
  tags: ["Asset Folders"],
  summary: "List folders",
  description: "Get all folders for the team. Optionally filter by parent and include asset counts.",
  request: {
    query: folderListQuerySchema,
  },
  responses: {
    200: {
      description: "List of folders",
      content: {
        "application/json": {
          schema: folderListResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const getFolderRoute = createRoute({
  method: "get",
  path: "/api/v1/assets/folders/{id}",
  tags: ["Asset Folders"],
  summary: "Get folder",
  description: "Get details of a specific folder.",
  request: {
    params: folderIdParamSchema,
  },
  responses: {
    200: {
      description: "Folder details",
      content: {
        "application/json": {
          schema: folderDetailSchema,
        },
      },
    },
    400: {
      description: "Invalid folder ID",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: "Folder not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const updateFolderRoute = createRoute({
  method: "put",
  path: "/api/v1/assets/folders/{id}",
  tags: ["Asset Folders"],
  summary: "Update folder",
  description: "Update folder name. Path is automatically updated for folder and descendants.",
  request: {
    params: folderIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateFolderSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Folder updated",
      content: {
        "application/json": {
          schema: folderSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: "Folder not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    409: {
      description: "Folder with this name already exists in parent",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const deleteFolderRoute = createRoute({
  method: "delete",
  path: "/api/v1/assets/folders/{id}",
  tags: ["Asset Folders"],
  summary: "Delete folder",
  description:
    "Delete a folder. Use recursive=true to delete folder with contents, otherwise fails if folder is not empty.",
  request: {
    params: folderIdParamSchema,
    query: deleteFolderQuerySchema,
  },
  responses: {
    204: {
      description: "Folder deleted",
    },
    400: {
      description: "Invalid request",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: "Folder not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    409: {
      description: "Folder is not empty (use recursive=true)",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const moveFolderRoute = createRoute({
  method: "post",
  path: "/api/v1/assets/folders/{id}/move",
  tags: ["Asset Folders"],
  summary: "Move folder",
  description:
    "Move a folder to a new parent. Validates same-team and prevents circular references.",
  request: {
    params: folderIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: moveFolderSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Folder moved",
      content: {
        "application/json": {
          schema: folderSchema,
        },
      },
    },
    400: {
      description: "Invalid request (circular reference, wrong team, etc.)",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: "Folder or new parent not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    409: {
      description: "Folder with this name already exists in destination",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const getFolderAncestorsRoute = createRoute({
  method: "get",
  path: "/api/v1/assets/folders/{id}/ancestors",
  tags: ["Asset Folders"],
  summary: "Get folder ancestors",
  description: "Get ancestor folders for breadcrumb navigation. Returns path from root to parent.",
  request: {
    params: folderIdParamSchema,
  },
  responses: {
    200: {
      description: "Folder ancestors",
      content: {
        "application/json": {
          schema: folderAncestorsResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid folder ID",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: "Folder not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

assetsApp.openapi(createFolderRoute, async (c) => {
  const user = getAuthUser(c);
  const teamId = getTeamId(c.req.raw.headers);
  await validateTeamAccess(user.id, teamId);

  const body = c.req.valid("json");

  const folder = await folderService.createFolder({
    teamId,
    name: body.name,
    parentId: body.parentId ?? null,
  });

  return c.json(
    {
      id: folder.id,
      teamId: folder.teamId,
      parentId: folder.parentId,
      name: folder.name,
      path: folder.path,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    },
    201
  );
});

assetsApp.openapi(listFoldersRoute, async (c) => {
  const user = getAuthUser(c);
  const teamId = getTeamId(c.req.raw.headers);
  await validateTeamAccess(user.id, teamId);

  const query = c.req.valid("query");

  const folders = await folderService.getFolderTree(teamId, {
    parentId: query.parentId,
    includeAssetCounts: query.includeAssetCounts === "true",
  });

  const response = folders.map((folder) => ({
    id: folder.id,
    teamId: folder.teamId,
    parentId: folder.parentId,
    name: folder.name,
    path: folder.path,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
    assetCount: folder.assetCount,
    childCount: folder.childCount,
  }));

  return c.json(
    {
      folders: response,
      total: response.length,
    },
    200
  );
});

assetsApp.openapi(getFolderRoute, async (c) => {
  const user = getAuthUser(c);
  const teamId = getTeamId(c.req.raw.headers);
  await validateTeamAccess(user.id, teamId);

  const { id } = c.req.valid("param");

  const folder = await folderService.getFolder(id, teamId);

  return c.json(
    {
      id: folder.id,
      teamId: folder.teamId,
      parentId: folder.parentId,
      name: folder.name,
      path: folder.path,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    },
    200
  );
});

assetsApp.openapi(updateFolderRoute, async (c) => {
  const user = getAuthUser(c);
  const teamId = getTeamId(c.req.raw.headers);
  await validateTeamAccess(user.id, teamId);

  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const folder = await folderService.updateFolder(id, teamId, {
    name: body.name,
  });

  return c.json(
    {
      id: folder.id,
      teamId: folder.teamId,
      parentId: folder.parentId,
      name: folder.name,
      path: folder.path,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    },
    200
  );
});

assetsApp.openapi(deleteFolderRoute, async (c) => {
  const user = getAuthUser(c);
  const teamId = getTeamId(c.req.raw.headers);
  await validateTeamAccess(user.id, teamId);

  const { id } = c.req.valid("param");
  const query = c.req.valid("query");

  const recursive = query.recursive === "true";

  await folderService.deleteFolder(id, teamId, recursive);

  return c.body(null, 204);
});

assetsApp.openapi(moveFolderRoute, async (c) => {
  const user = getAuthUser(c);
  const teamId = getTeamId(c.req.raw.headers);
  await validateTeamAccess(user.id, teamId);

  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const folder = await folderService.moveFolder(id, teamId, body.parentId);

  return c.json(
    {
      id: folder.id,
      teamId: folder.teamId,
      parentId: folder.parentId,
      name: folder.name,
      path: folder.path,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    },
    200
  );
});

assetsApp.openapi(getFolderAncestorsRoute, async (c) => {
  const user = getAuthUser(c);
  const teamId = getTeamId(c.req.raw.headers);
  await validateTeamAccess(user.id, teamId);

  const { id } = c.req.valid("param");

  const ancestors = await folderService.getFolderAncestors(id, teamId);

  return c.json(
    {
      ancestors,
    },
    200
  );
});

// ============================================================================
// Error Handler
// ============================================================================

assetsApp.onError((err, c) => {
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  console.error("Asset folders route error:", err);
  return c.json(
    {
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
    },
    500
  );
});

export default assetsApp;
