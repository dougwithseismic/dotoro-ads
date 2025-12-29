/**
 * Asset Folders Service
 *
 * Provides business logic for folder CRUD operations with:
 * - Same-team parent validation
 * - Path auto-generation from hierarchy
 * - Circular reference prevention
 * - Descendant path updates on move/rename
 */

import { eq, and, like, sql, count, isNull } from "drizzle-orm";
import { db, assetFolders, creatives } from "./db.js";
import type { AssetFolder, NewAssetFolder } from "./db.js";
import {
  ApiException,
  ErrorCode,
  createNotFoundError,
  createValidationError,
  createConflictError,
} from "../lib/errors.js";
import { buildFolderPath, generatePathSlug } from "../schemas/assets.js";

// ============================================================================
// Types
// ============================================================================

export interface CreateFolderParams {
  teamId: string;
  name: string;
  parentId?: string | null;
}

export interface UpdateFolderParams {
  name?: string;
}

export interface FolderWithCounts extends AssetFolder {
  assetCount?: number;
  childCount?: number;
}

export interface FolderAncestor {
  id: string;
  name: string;
  path: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create a new folder
 *
 * Validations:
 * - If parentId provided, validates it belongs to the same team
 * - Generates path from parent hierarchy
 * - Checks unique name within parent (same path)
 */
export async function createFolder(params: CreateFolderParams): Promise<AssetFolder> {
  const { teamId, name, parentId } = params;

  let parentPath: string | null = null;

  // Validate parent folder if provided
  if (parentId) {
    const parent = await db
      .select()
      .from(assetFolders)
      .where(eq(assetFolders.id, parentId))
      .limit(1);

    const parentFolder = parent[0];
    if (!parentFolder) {
      throw createNotFoundError("Parent folder", parentId);
    }

    // Validate same team
    if (parentFolder.teamId !== teamId) {
      throw createValidationError("Parent folder must belong to the same team", {
        parentId,
        expectedTeamId: teamId,
        actualTeamId: parentFolder.teamId,
      });
    }

    parentPath = parentFolder.path;
  }

  // Generate the path for this folder
  const folderPath = buildFolderPath(parentPath, name);

  // Check if path already exists in this team (unique name within parent)
  const existing = await db
    .select({ id: assetFolders.id })
    .from(assetFolders)
    .where(and(eq(assetFolders.teamId, teamId), eq(assetFolders.path, folderPath)))
    .limit(1);

  const existingFolder = existing[0];
  if (existingFolder) {
    throw createConflictError("A folder with this name already exists in the parent folder", {
      existingId: existingFolder.id,
      path: folderPath,
    });
  }

  // Create the folder
  const [newFolder] = await db
    .insert(assetFolders)
    .values({
      teamId,
      name,
      parentId: parentId || null,
      path: folderPath,
    })
    .returning();

  if (!newFolder) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to create folder");
  }

  return newFolder;
}

/**
 * Get a single folder by ID
 *
 * Validates ownership by teamId
 */
export async function getFolder(id: string, teamId: string): Promise<AssetFolder> {
  const [folder] = await db
    .select()
    .from(assetFolders)
    .where(and(eq(assetFolders.id, id), eq(assetFolders.teamId, teamId)))
    .limit(1);

  if (!folder) {
    throw createNotFoundError("Folder", id);
  }

  return folder;
}

/**
 * Get folder tree (flat list with parent references)
 *
 * Options:
 * - parentId: filter to children of specific folder
 * - includeAssetCounts: include count of assets in each folder
 */
export async function getFolderTree(
  teamId: string,
  options: {
    parentId?: string;
    includeAssetCounts?: boolean;
  } = {}
): Promise<FolderWithCounts[]> {
  const { parentId, includeAssetCounts } = options;

  // Build the base query
  let query = db
    .select({
      id: assetFolders.id,
      teamId: assetFolders.teamId,
      parentId: assetFolders.parentId,
      name: assetFolders.name,
      path: assetFolders.path,
      createdAt: assetFolders.createdAt,
      updatedAt: assetFolders.updatedAt,
    })
    .from(assetFolders)
    .where(eq(assetFolders.teamId, teamId));

  const folders = await query;

  // If we need to filter by parentId
  let filteredFolders = folders;
  if (parentId !== undefined) {
    filteredFolders = folders.filter((f) =>
      parentId === null ? f.parentId === null : f.parentId === parentId
    );
  }

  // Add counts if requested
  if (includeAssetCounts) {
    // Get child counts for each folder
    const childCounts = await db
      .select({
        parentId: assetFolders.parentId,
        count: count(assetFolders.id),
      })
      .from(assetFolders)
      .where(eq(assetFolders.teamId, teamId))
      .groupBy(assetFolders.parentId);

    const childCountMap = new Map(
      childCounts.map((c) => [c.parentId, c.count])
    );

    // Get asset counts for each folder
    const assetCounts = await db
      .select({
        folderId: creatives.folderId,
        count: count(creatives.id),
      })
      .from(creatives)
      .where(eq(creatives.teamId, teamId))
      .groupBy(creatives.folderId);

    const assetCountMap = new Map(
      assetCounts.map((c) => [c.folderId, c.count])
    );

    return filteredFolders.map((folder) => ({
      ...folder,
      childCount: childCountMap.get(folder.id) || 0,
      assetCount: assetCountMap.get(folder.id) || 0,
    }));
  }

  return filteredFolders;
}

/**
 * Update a folder (name only, path updates automatically)
 *
 * When name changes:
 * - Updates folder's path
 * - Updates all descendant paths
 */
export async function updateFolder(
  id: string,
  teamId: string,
  updates: UpdateFolderParams
): Promise<AssetFolder> {
  // Get current folder
  const folder = await getFolder(id, teamId);

  if (!updates.name || updates.name === folder.name) {
    // No changes needed
    return folder;
  }

  const newName = updates.name;

  // Calculate new path
  let parentPath: string | null = null;
  if (folder.parentId) {
    const [parent] = await db
      .select({ path: assetFolders.path })
      .from(assetFolders)
      .where(eq(assetFolders.id, folder.parentId))
      .limit(1);

    if (!parent) {
      throw new ApiException(
        500,
        ErrorCode.INTERNAL_ERROR,
        `Parent folder ${folder.parentId} no longer exists`
      );
    }
    parentPath = parent.path;
  }

  const newPath = buildFolderPath(parentPath, newName);

  // Check if new path conflicts with existing folder
  if (newPath !== folder.path) {
    const existing = await db
      .select({ id: assetFolders.id })
      .from(assetFolders)
      .where(
        and(
          eq(assetFolders.teamId, teamId),
          eq(assetFolders.path, newPath)
        )
      )
      .limit(1);

    const existingFolder = existing[0];
    if (existingFolder) {
      throw createConflictError("A folder with this name already exists in the parent folder", {
        existingId: existingFolder.id,
        path: newPath,
      });
    }
  }

  // Update descendants paths
  const oldPathPrefix = folder.path;
  const newPathPrefix = newPath;

  // Update folder and all descendants in a transaction
  try {
    await db.transaction(async (tx) => {
      // Update the folder itself
      await tx
        .update(assetFolders)
        .set({
          name: newName,
          path: newPath,
        })
        .where(eq(assetFolders.id, id));

      // Update descendant paths using string replacement
      // All descendants have paths that start with oldPathPrefix + "/"
      await tx
        .update(assetFolders)
        .set({
          path: sql`${newPathPrefix} || substring(${assetFolders.path} from ${oldPathPrefix.length + 1})`,
        })
        .where(
          and(
            eq(assetFolders.teamId, teamId),
            like(assetFolders.path, `${oldPathPrefix}/%`)
          )
        );
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new ApiException(
      500,
      ErrorCode.INTERNAL_ERROR,
      `Failed to update folder "${id}": ${message}`
    );
  }

  // Return updated folder
  return getFolder(id, teamId);
}

/**
 * Delete a folder
 *
 * Options:
 * - recursive: if true, delete all contents; if false, fail if folder has contents
 */
export async function deleteFolder(
  id: string,
  teamId: string,
  recursive: boolean
): Promise<void> {
  // Verify folder exists and belongs to team
  const folder = await getFolder(id, teamId);

  // Check for children
  const [childCount] = await db
    .select({ count: count(assetFolders.id) })
    .from(assetFolders)
    .where(eq(assetFolders.parentId, id));

  // Check for assets in this folder
  const [assetCount] = await db
    .select({ count: count(creatives.id) })
    .from(creatives)
    .where(eq(creatives.folderId, id));

  const hasChildren = (childCount?.count ?? 0) > 0;
  const hasAssets = (assetCount?.count ?? 0) > 0;

  if ((hasChildren || hasAssets) && !recursive) {
    throw createConflictError("Folder is not empty. Use recursive=true to delete with contents.", {
      childCount: childCount?.count ?? 0,
      assetCount: assetCount?.count ?? 0,
    });
  }

  if (recursive) {
    // Delete recursively - get all descendant folder IDs by path prefix
    const descendants = await db
      .select({ id: assetFolders.id })
      .from(assetFolders)
      .where(
        and(
          eq(assetFolders.teamId, teamId),
          like(assetFolders.path, `${folder.path}/%`)
        )
      );

    const descendantIds = descendants.map((d) => d.id);
    const allFolderIds = [id, ...descendantIds];

    try {
      await db.transaction(async (tx) => {
        // Update assets to have null folderId (or delete them - depending on requirements)
        // For now, we'll set folderId to null for assets in deleted folders
        if (allFolderIds.length > 0) {
          await tx
            .update(creatives)
            .set({ folderId: null })
            .where(
              sql`${creatives.folderId} IN (${sql.join(
                allFolderIds.map((fid) => sql`${fid}`),
                sql`, `
              )})`
            );
        }

        // Delete all descendant folders first (due to foreign key constraints)
        if (descendantIds.length > 0) {
          await tx
            .delete(assetFolders)
            .where(
              sql`${assetFolders.id} IN (${sql.join(
                descendantIds.map((did) => sql`${did}`),
                sql`, `
              )})`
            );
        }

        // Delete the folder itself
        await tx.delete(assetFolders).where(eq(assetFolders.id, id));
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new ApiException(
        500,
        ErrorCode.INTERNAL_ERROR,
        `Failed to delete folder "${id}": ${message}`
      );
    }
  } else {
    // Simple delete (already verified empty)
    await db.delete(assetFolders).where(eq(assetFolders.id, id));
  }
}

/**
 * Move a folder to a new parent
 *
 * Validations:
 * - New parent must be in same team (or null for root)
 * - Cannot create circular reference (moving folder into itself or descendant)
 * - Updates paths for folder and all descendants
 */
export async function moveFolder(
  id: string,
  teamId: string,
  newParentId: string | null
): Promise<AssetFolder> {
  // Get the folder being moved
  const folder = await getFolder(id, teamId);

  // If no change, return early
  if (folder.parentId === newParentId) {
    return folder;
  }

  let newParentPath: string | null = null;

  // Validate new parent if provided
  if (newParentId !== null) {
    const [newParent] = await db
      .select()
      .from(assetFolders)
      .where(eq(assetFolders.id, newParentId))
      .limit(1);

    if (!newParent) {
      throw createNotFoundError("New parent folder", newParentId);
    }

    // Validate same team
    if (newParent.teamId !== teamId) {
      throw createValidationError("New parent folder must belong to the same team", {
        newParentId,
        expectedTeamId: teamId,
        actualTeamId: newParent.teamId,
      });
    }

    // Check for circular reference
    // The new parent cannot be the folder itself or any of its descendants
    if (newParent.id === id) {
      throw createValidationError("Cannot move a folder into itself");
    }

    // Check if new parent is a descendant of the folder being moved
    if (newParent.path.startsWith(folder.path + "/")) {
      throw createValidationError("Cannot move a folder into one of its descendants", {
        folderId: id,
        folderPath: folder.path,
        newParentId,
        newParentPath: newParent.path,
      });
    }

    newParentPath = newParent.path;
  }

  // Calculate new path for the moved folder
  const newPath = buildFolderPath(newParentPath, folder.name);

  // Check if new path conflicts
  if (newPath !== folder.path) {
    const existing = await db
      .select({ id: assetFolders.id })
      .from(assetFolders)
      .where(
        and(
          eq(assetFolders.teamId, teamId),
          eq(assetFolders.path, newPath)
        )
      )
      .limit(1);

    const existingFolder = existing[0];
    if (existingFolder) {
      throw createConflictError("A folder with this name already exists in the destination", {
        existingId: existingFolder.id,
        path: newPath,
      });
    }
  }

  // Update folder and descendants
  const oldPathPrefix = folder.path;
  const newPathPrefix = newPath;

  try {
    await db.transaction(async (tx) => {
      // Update the folder itself
      await tx
        .update(assetFolders)
        .set({
          parentId: newParentId,
          path: newPath,
        })
        .where(eq(assetFolders.id, id));

      // Update descendant paths
      await tx
        .update(assetFolders)
        .set({
          path: sql`${newPathPrefix} || substring(${assetFolders.path} from ${oldPathPrefix.length + 1})`,
        })
        .where(
          and(
            eq(assetFolders.teamId, teamId),
            like(assetFolders.path, `${oldPathPrefix}/%`)
          )
        );
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new ApiException(
      500,
      ErrorCode.INTERNAL_ERROR,
      `Failed to move folder "${id}": ${message}`
    );
  }

  // Return updated folder
  return getFolder(id, teamId);
}

/**
 * Get ancestors of a folder (for breadcrumb generation)
 *
 * Returns list from root to parent (not including the folder itself)
 */
export async function getFolderAncestors(
  id: string,
  teamId: string
): Promise<FolderAncestor[]> {
  // Get the folder
  const folder = await getFolder(id, teamId);

  if (!folder.parentId) {
    // Root folder, no ancestors
    return [];
  }

  // Parse the path to get ancestor paths
  // e.g., "/a/b/c" -> ["/a", "/a/b"]
  const pathParts = folder.path.split("/").filter(Boolean);
  pathParts.pop(); // Remove the folder itself

  if (pathParts.length === 0) {
    return [];
  }

  const ancestorPaths: string[] = [];
  let currentPath = "";
  for (const part of pathParts) {
    currentPath += `/${part}`;
    ancestorPaths.push(currentPath);
  }

  // Fetch ancestors
  const ancestors = await db
    .select({
      id: assetFolders.id,
      name: assetFolders.name,
      path: assetFolders.path,
    })
    .from(assetFolders)
    .where(
      and(
        eq(assetFolders.teamId, teamId),
        sql`${assetFolders.path} IN (${sql.join(
          ancestorPaths.map((p) => sql`${p}`),
          sql`, `
        )})`
      )
    );

  // Sort by path length to get root-first order
  return ancestors.sort((a, b) => a.path.length - b.path.length);
}
