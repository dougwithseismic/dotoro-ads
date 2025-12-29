import { z } from "@hono/zod-openapi";

/**
 * Asset Folder Schema Definitions
 * Used for organizing creative assets into folders
 */

// ============================================================================
// Validation Constants
// ============================================================================

/**
 * Folder name pattern: alphanumeric, spaces, hyphens, underscores
 * Must start with alphanumeric character
 */
const FOLDER_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9\s\-_]*$/;

/**
 * Slug pattern for path segments: lowercase alphanumeric and hyphens
 */
const PATH_SEGMENT_PATTERN = /^[a-z0-9-]+$/;

/**
 * Full path pattern: starts with /, followed by path segments
 * e.g., "/marketing", "/marketing/q4-campaigns"
 */
const FOLDER_PATH_PATTERN = /^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/;

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create folder - POST /api/v1/assets/folders
 */
export const createFolderSchema = z
  .object({
    name: z
      .string()
      .min(1, "Folder name is required")
      .max(255, "Folder name must be 255 characters or less")
      .regex(
        FOLDER_NAME_PATTERN,
        "Folder name must start with alphanumeric and can contain letters, numbers, spaces, hyphens, and underscores"
      )
      .describe("Folder name"),
    parentId: z
      .string()
      .uuid("Parent folder ID must be a valid UUID")
      .nullable()
      .optional()
      .describe("Parent folder ID, null or omitted for root-level folder"),
  })
  .openapi("CreateFolderRequest");

export type CreateFolderInput = z.infer<typeof createFolderSchema>;

/**
 * Update folder - PUT /api/v1/assets/folders/:id
 */
export const updateFolderSchema = z
  .object({
    name: z
      .string()
      .min(1, "Folder name is required")
      .max(255, "Folder name must be 255 characters or less")
      .regex(
        FOLDER_NAME_PATTERN,
        "Folder name must start with alphanumeric and can contain letters, numbers, spaces, hyphens, and underscores"
      )
      .optional()
      .describe("New folder name"),
  })
  .openapi("UpdateFolderRequest");

export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;

/**
 * Move folder - POST /api/v1/assets/folders/:id/move
 */
export const moveFolderSchema = z
  .object({
    parentId: z
      .string()
      .uuid("Parent folder ID must be a valid UUID")
      .nullable()
      .describe("New parent folder ID, null to move to root level"),
  })
  .openapi("MoveFolderRequest");

export type MoveFolderInput = z.infer<typeof moveFolderSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Folder object returned in responses
 */
export const folderSchema = z
  .object({
    id: z.string().uuid(),
    teamId: z.string().uuid(),
    parentId: z.string().uuid().nullable(),
    name: z.string(),
    path: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Folder");

export type FolderResponse = z.infer<typeof folderSchema>;

/**
 * Folder with additional computed fields
 */
export const folderDetailSchema = folderSchema
  .extend({
    assetCount: z.number().int().optional().describe("Number of assets in this folder"),
    childCount: z.number().int().optional().describe("Number of child folders"),
  })
  .openapi("FolderDetail");

export type FolderDetailResponse = z.infer<typeof folderDetailSchema>;

/**
 * Folder list response
 */
export const folderListResponseSchema = z
  .object({
    folders: z.array(folderDetailSchema),
    total: z.number().int(),
  })
  .openapi("FolderListResponse");

export type FolderListResponse = z.infer<typeof folderListResponseSchema>;

/**
 * Folder ancestors response (for breadcrumbs)
 */
export const folderAncestorsResponseSchema = z
  .object({
    ancestors: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        path: z.string(),
      })
    ),
  })
  .openapi("FolderAncestorsResponse");

export type FolderAncestorsResponse = z.infer<typeof folderAncestorsResponseSchema>;

// ============================================================================
// Path Parameters
// ============================================================================

export const folderIdParamSchema = z.object({
  id: z.string().uuid("Folder ID must be a valid UUID"),
});

export type FolderIdParam = z.infer<typeof folderIdParamSchema>;

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Query parameters for listing folders
 */
export const folderListQuerySchema = z.object({
  parentId: z
    .string()
    .uuid()
    .optional()
    .describe("Filter by parent folder ID (omit for all folders)"),
  includeAssetCounts: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .describe("Include asset counts for each folder"),
});

export type FolderListQuery = z.infer<typeof folderListQuerySchema>;

/**
 * Query parameters for deleting folders
 */
export const deleteFolderQuerySchema = z.object({
  recursive: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .describe("If true, delete folder and all contents; if false, fail if folder has contents"),
});

export type DeleteFolderQuery = z.infer<typeof deleteFolderQuerySchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a URL-safe slug from a folder name
 * Used for path generation
 */
export function generatePathSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

/**
 * Validate that a path follows the expected format
 */
export function isValidFolderPath(path: string): boolean {
  return FOLDER_PATH_PATTERN.test(path);
}

/**
 * Build a full path from parent path and folder name
 */
export function buildFolderPath(parentPath: string | null, folderName: string): string {
  const slug = generatePathSlug(folderName);
  if (!parentPath || parentPath === "/") {
    return `/${slug}`;
  }
  return `${parentPath}/${slug}`;
}
