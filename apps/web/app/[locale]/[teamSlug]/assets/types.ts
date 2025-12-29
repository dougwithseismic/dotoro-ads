/**
 * Asset Library Types
 *
 * Shared type definitions for the asset library feature.
 */

/**
 * Asset folder representation
 */
export interface AssetFolder {
  id: string;
  teamId: string;
  parentId: string | null;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  assetCount?: number;
  childCount?: number;
}

/**
 * Folder with children for tree view
 */
export interface FolderTreeNode extends AssetFolder {
  children: FolderTreeNode[];
  isExpanded?: boolean;
}

/**
 * Creative/Asset type
 */
export type CreativeType = "IMAGE" | "VIDEO" | "CAROUSEL";

/**
 * Creative/Asset status
 */
export type CreativeStatus = "PENDING" | "UPLOADED" | "PROCESSING" | "READY" | "FAILED";

/**
 * Asset/Creative representation
 */
export interface Asset {
  id: string;
  accountId: string;
  teamId?: string;
  name: string;
  type: CreativeType;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  thumbnailKey?: string | null;
  tags: string[];
  status: CreativeStatus;
  folderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Asset with download URL
 */
export interface AssetWithUrl extends Asset {
  downloadUrl: string;
  thumbnailUrl?: string;
}

/**
 * API response for folder list
 */
export interface FolderListResponse {
  folders: AssetFolder[];
  total: number;
}

/**
 * API response for asset list
 */
export interface AssetListResponse {
  data: Asset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Asset query filters
 */
export interface AssetFilters {
  folderId?: string | null;
  type?: CreativeType;
  status?: CreativeStatus;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "name" | "createdAt" | "updatedAt" | "fileSize";
  sortOrder?: "asc" | "desc";
  includeSubfolders?: boolean;
}

/**
 * Create folder request body
 */
export interface CreateFolderRequest {
  name: string;
  parentId?: string | null;
}

/**
 * Update folder request body
 */
export interface UpdateFolderRequest {
  name: string;
}

/**
 * Move folder request body
 */
export interface MoveFolderRequest {
  parentId: string | null;
}
