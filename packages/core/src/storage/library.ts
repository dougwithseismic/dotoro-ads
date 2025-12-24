/**
 * Asset Library Types
 *
 * Types and interfaces for managing a library of assets with
 * folder organization, tagging, and search capabilities.
 */

import type { AssetMetadata } from "../creatives/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Asset Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type of asset in the library
 */
export type AssetType = "image" | "video" | "gif";

/**
 * An item in the asset library
 */
export interface AssetLibraryItem {
  /** Unique identifier */
  id: string;

  /** Storage key for the asset */
  storageKey: string;

  /** Display name */
  name: string;

  /** Type of asset */
  type: AssetType;

  /** Asset metadata (dimensions, size, etc.) */
  metadata: AssetMetadata;

  /** URL for accessing the full asset */
  url: string;

  /** Thumbnail URL for preview */
  thumbnailUrl?: string;

  /** Folder this asset belongs to */
  folderId?: string;

  /** Tags for categorization */
  tags: string[];

  /** When the asset was created */
  createdAt: Date;

  /** When the asset was last modified */
  updatedAt: Date;

  /** Usage count (how many campaigns use this asset) */
  usageCount?: number;

  /** File hash for deduplication */
  fileHash?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Folder Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A folder for organizing assets
 */
export interface AssetFolder {
  /** Unique identifier */
  id: string;

  /** Folder name */
  name: string;

  /** Parent folder ID (for nested folders) */
  parentId?: string;

  /** Number of assets in this folder (not including subfolders) */
  assetCount: number;

  /** When the folder was created */
  createdAt: Date;

  /** When the folder was last modified */
  updatedAt: Date;

  /** Color for folder icon (hex) */
  color?: string;

  /** Description of the folder */
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// List and Search Options
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sort options for asset listing
 */
export type AssetSortField =
  | "name"
  | "createdAt"
  | "updatedAt"
  | "size"
  | "type";

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Options for listing assets
 */
export interface AssetListOptions {
  /** Folder to list assets from */
  folderId?: string;

  /** Filter by asset type */
  type?: AssetType | AssetType[];

  /** Filter by tags (assets must have all specified tags) */
  tags?: string[];

  /** Search query (matches name and tags) */
  query?: string;

  /** Sort field */
  sortBy?: AssetSortField;

  /** Sort direction */
  sortDirection?: SortDirection;

  /** Maximum number of items to return */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Cursor for cursor-based pagination */
  cursor?: string;
}

/**
 * Result of a list operation
 */
export interface AssetListResult {
  /** List of assets */
  items: AssetLibraryItem[];

  /** Total count of matching assets */
  total: number;

  /** Whether there are more results */
  hasMore: boolean;

  /** Cursor for next page */
  nextCursor?: string;
}

/**
 * Options for listing folders
 */
export interface FolderListOptions {
  /** Parent folder ID (null for root folders) */
  parentId?: string | null;

  /** Sort field */
  sortBy?: "name" | "createdAt" | "assetCount";

  /** Sort direction */
  sortDirection?: SortDirection;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset Library Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asset Library interface for managing a collection of assets
 *
 * This interface defines operations for organizing assets into
 * folders, adding tags, and searching the library.
 */
export interface AssetLibrary {
  // ─────────────────────────────────────────────────────────────────────────
  // Asset Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * List assets with optional filtering and pagination
   */
  listAssets(options?: AssetListOptions): Promise<AssetListResult>;

  /**
   * Get a single asset by ID
   */
  getAsset(id: string): Promise<AssetLibraryItem | null>;

  /**
   * Get a single asset by storage key
   */
  getAssetByKey(storageKey: string): Promise<AssetLibraryItem | null>;

  /**
   * Update an asset's metadata
   */
  updateAsset(
    id: string,
    updates: Partial<Pick<AssetLibraryItem, "name" | "tags" | "folderId">>
  ): Promise<AssetLibraryItem>;

  /**
   * Delete an asset from the library
   *
   * Note: This only removes the library entry. The actual file
   * deletion should be handled separately.
   */
  deleteAsset(id: string): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────
  // Folder Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * List folders
   */
  listFolders(options?: FolderListOptions): Promise<AssetFolder[]>;

  /**
   * Get a single folder by ID
   */
  getFolder(id: string): Promise<AssetFolder | null>;

  /**
   * Create a new folder
   */
  createFolder(
    name: string,
    parentId?: string,
    options?: { color?: string; description?: string }
  ): Promise<AssetFolder>;

  /**
   * Update a folder
   */
  updateFolder(
    id: string,
    updates: Partial<Pick<AssetFolder, "name" | "parentId" | "color" | "description">>
  ): Promise<AssetFolder>;

  /**
   * Delete a folder
   *
   * @param id - Folder ID
   * @param moveToFolder - If specified, move assets to this folder instead of deleting
   */
  deleteFolder(id: string, moveToFolder?: string): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────
  // Organization Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Move an asset to a folder
   *
   * @param assetId - Asset ID
   * @param folderId - Target folder ID (null to move to root)
   */
  moveToFolder(assetId: string, folderId: string | null): Promise<void>;

  /**
   * Move multiple assets to a folder
   */
  moveAssetsToFolder(assetIds: string[], folderId: string | null): Promise<void>;

  /**
   * Add tags to an asset
   */
  addTags(assetId: string, tags: string[]): Promise<void>;

  /**
   * Remove tags from an asset
   */
  removeTags(assetId: string, tags: string[]): Promise<void>;

  /**
   * Replace all tags on an asset
   */
  setTags(assetId: string, tags: string[]): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────
  // Search Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Search assets by query
   *
   * Searches name, tags, and potentially file content.
   */
  search(query: string, options?: AssetListOptions): Promise<AssetLibraryItem[]>;

  /**
   * Get all unique tags in the library
   */
  getAllTags(): Promise<string[]>;

  /**
   * Get assets by tags
   */
  getAssetsByTags(tags: string[]): Promise<AssetLibraryItem[]>;

  // ─────────────────────────────────────────────────────────────────────────
  // Utility Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Find duplicate assets by file hash
   */
  findDuplicates(hash: string): Promise<AssetLibraryItem[]>;

  /**
   * Get asset usage information
   *
   * Returns which campaigns or ad groups use this asset.
   */
  getAssetUsage(assetId: string): Promise<{
    campaigns: string[];
    adGroups: string[];
  }>;

  /**
   * Register a new asset in the library
   *
   * Called after successful upload to storage.
   */
  registerAsset(
    data: Omit<AssetLibraryItem, "id" | "createdAt" | "updatedAt" | "usageCount">
  ): Promise<AssetLibraryItem>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Events emitted by the asset library
 */
export type AssetLibraryEvent =
  | { type: "asset:created"; asset: AssetLibraryItem }
  | { type: "asset:updated"; asset: AssetLibraryItem }
  | { type: "asset:deleted"; assetId: string }
  | { type: "asset:moved"; assetId: string; fromFolder?: string; toFolder?: string }
  | { type: "folder:created"; folder: AssetFolder }
  | { type: "folder:updated"; folder: AssetFolder }
  | { type: "folder:deleted"; folderId: string };

/**
 * Listener for asset library events
 */
export type AssetLibraryEventListener = (event: AssetLibraryEvent) => void;

/**
 * Observable asset library with event support
 */
export interface ObservableAssetLibrary extends AssetLibrary {
  /**
   * Subscribe to library events
   */
  subscribe(listener: AssetLibraryEventListener): () => void;
}
