import { useState, useCallback, useMemo } from "react";
import { createTeamApi, buildQueryString } from "../api-client";
import type {
  AssetFolder,
  FolderTreeNode,
  FolderListResponse,
  CreateFolderRequest,
  UpdateFolderRequest,
  MoveFolderRequest,
} from "@/app/[locale]/[teamSlug]/assets/types";

/**
 * Hook return type for useAssetFolders
 */
export interface UseAssetFoldersReturn {
  /** Flat list of folders */
  folders: AssetFolder[];
  /** Tree-structured folders */
  folderTree: FolderTreeNode[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Fetch folders from API */
  fetchFolders: (options?: FetchFoldersOptions) => Promise<void>;
  /** Create a new folder */
  createFolder: (data: CreateFolderRequest) => Promise<AssetFolder>;
  /** Update a folder */
  updateFolder: (id: string, data: UpdateFolderRequest) => Promise<AssetFolder>;
  /** Delete a folder */
  deleteFolder: (id: string, recursive?: boolean) => Promise<void>;
  /** Move a folder */
  moveFolder: (id: string, data: MoveFolderRequest) => Promise<AssetFolder>;
  /** Get folder ancestors for breadcrumbs */
  getFolderAncestors: (id: string) => Promise<AssetFolder[]>;
  /** Get a single folder by ID */
  getFolder: (id: string) => Promise<AssetFolder>;
}

interface FetchFoldersOptions {
  parentId?: string;
  includeAssetCounts?: boolean;
}

/**
 * Build a tree structure from flat folder list
 */
function buildFolderTree(folders: AssetFolder[]): FolderTreeNode[] {
  const folderMap = new Map<string, FolderTreeNode>();
  const rootFolders: FolderTreeNode[] = [];

  // First pass: create nodes
  for (const folder of folders) {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      isExpanded: false,
    });
  }

  // Second pass: build tree
  for (const folder of folders) {
    const node = folderMap.get(folder.id)!;
    if (folder.parentId === null) {
      rootFolders.push(node);
    } else {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Orphaned folder - add to root
        rootFolders.push(node);
      }
    }
  }

  // Sort children alphabetically
  const sortChildren = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) {
      if (node.children.length > 0) {
        node.children = sortChildren(node.children);
      }
    }
    return nodes;
  };

  return sortChildren(rootFolders);
}

/**
 * Hook for managing asset folders
 *
 * @param teamId - The current team ID
 * @returns Folder state and CRUD operations
 *
 * @example
 * ```tsx
 * const { currentTeam } = useTeam();
 * const {
 *   folders,
 *   folderTree,
 *   loading,
 *   fetchFolders,
 *   createFolder
 * } = useAssetFolders(currentTeam?.id);
 *
 * useEffect(() => {
 *   fetchFolders({ includeAssetCounts: true });
 * }, [fetchFolders]);
 * ```
 */
export function useAssetFolders(teamId: string | undefined): UseAssetFoldersReturn {
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create team-aware API client
  const teamApi = useMemo(() => createTeamApi(teamId), [teamId]);

  // Build tree structure from flat list
  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  /**
   * Fetch all folders for the team
   */
  const fetchFolders = useCallback(
    async (options: FetchFoldersOptions = {}) => {
      if (!teamId) {
        setError("Team context not available");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const queryString = buildQueryString({
          parentId: options.parentId,
          includeAssetCounts: options.includeAssetCounts ? "true" : undefined,
        });

        const response = await teamApi.get<FolderListResponse>(
          `/api/v1/assets/folders${queryString}`
        );

        setFolders(response.folders);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch folders";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [teamId, teamApi]
  );

  /**
   * Create a new folder
   */
  const createFolder = useCallback(
    async (data: CreateFolderRequest): Promise<AssetFolder> => {
      if (!teamId) {
        throw new Error("Team context not available");
      }

      try {
        const folder = await teamApi.post<AssetFolder>("/api/v1/assets/folders", data);

        // Add to local state
        setFolders((prev) => [...prev, folder]);

        return folder;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create folder";
        setError(message);
        throw err;
      }
    },
    [teamId, teamApi]
  );

  /**
   * Update a folder
   */
  const updateFolder = useCallback(
    async (id: string, data: UpdateFolderRequest): Promise<AssetFolder> => {
      if (!teamId) {
        throw new Error("Team context not available");
      }

      try {
        const folder = await teamApi.put<AssetFolder>(`/api/v1/assets/folders/${id}`, data);

        // Update in local state
        setFolders((prev) => prev.map((f) => (f.id === id ? folder : f)));

        return folder;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update folder";
        setError(message);
        throw err;
      }
    },
    [teamId, teamApi]
  );

  /**
   * Delete a folder
   */
  const deleteFolder = useCallback(
    async (id: string, recursive = false): Promise<void> => {
      if (!teamId) {
        throw new Error("Team context not available");
      }

      try {
        const queryString = recursive ? "?recursive=true" : "";
        await teamApi.delete(`/api/v1/assets/folders/${id}${queryString}`);

        // Remove from local state (and children if recursive)
        setFolders((prev) => {
          if (recursive) {
            // Get the folder path to remove children
            const targetFolder = prev.find((f) => f.id === id);
            if (targetFolder) {
              return prev.filter(
                (f) => f.id !== id && !f.path.startsWith(targetFolder.path + "/")
              );
            }
          }
          return prev.filter((f) => f.id !== id);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete folder";
        setError(message);
        throw err;
      }
    },
    [teamId, teamApi]
  );

  /**
   * Move a folder to a new parent
   */
  const moveFolder = useCallback(
    async (id: string, data: MoveFolderRequest): Promise<AssetFolder> => {
      if (!teamId) {
        throw new Error("Team context not available");
      }

      try {
        const folder = await teamApi.post<AssetFolder>(
          `/api/v1/assets/folders/${id}/move`,
          data
        );

        // Refetch to get updated paths
        await fetchFolders({ includeAssetCounts: true });

        return folder;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to move folder";
        setError(message);
        throw err;
      }
    },
    [teamId, teamApi, fetchFolders]
  );

  /**
   * Get folder ancestors for breadcrumbs
   */
  const getFolderAncestors = useCallback(
    async (id: string): Promise<AssetFolder[]> => {
      if (!teamId) {
        throw new Error("Team context not available");
      }

      try {
        const response = await teamApi.get<{ ancestors: AssetFolder[] }>(
          `/api/v1/assets/folders/${id}/ancestors`
        );
        return response.ancestors;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to get folder ancestors";
        setError(message);
        throw err;
      }
    },
    [teamId, teamApi]
  );

  /**
   * Get a single folder by ID
   */
  const getFolder = useCallback(
    async (id: string): Promise<AssetFolder> => {
      if (!teamId) {
        throw new Error("Team context not available");
      }

      return teamApi.get<AssetFolder>(`/api/v1/assets/folders/${id}`);
    },
    [teamId, teamApi]
  );

  return {
    folders,
    folderTree,
    loading,
    error,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    getFolderAncestors,
    getFolder,
  };
}
