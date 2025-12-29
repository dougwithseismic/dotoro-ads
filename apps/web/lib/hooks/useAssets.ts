import { useState, useCallback, useMemo } from "react";
import { createTeamApi, buildQueryString } from "../api-client";
import type {
  Asset,
  AssetWithUrl,
  AssetListResponse,
  AssetFilters,
} from "@/app/[locale]/[teamSlug]/assets/types";

/**
 * Hook return type for useAssets
 */
export interface UseAssetsReturn {
  /** List of assets */
  assets: Asset[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Total number of assets (for pagination) */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Current page */
  currentPage: number;
  /** Fetch assets from API */
  fetchAssets: (filters?: AssetFilters) => Promise<void>;
  /** Get a single asset with download URL */
  getAsset: (id: string, accountId: string) => Promise<AssetWithUrl>;
  /** Delete an asset */
  deleteAsset: (id: string, accountId: string) => Promise<void>;
  /** Move an asset to a folder */
  moveAsset: (id: string, accountId: string, folderId: string | null) => Promise<Asset>;
  /** Bulk move assets to a folder */
  bulkMoveAssets: (
    creativeIds: string[],
    folderId: string | null,
    accountId: string
  ) => Promise<{ success: number; failed: number; errors: string[] }>;
  /** Update local assets state */
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
}

/**
 * Hook for managing assets/creatives
 *
 * @param teamId - The current team ID
 * @returns Asset state and operations
 *
 * @example
 * ```tsx
 * const { currentTeam } = useTeam();
 * const {
 *   assets,
 *   loading,
 *   fetchAssets,
 *   total,
 *   totalPages
 * } = useAssets(currentTeam?.id);
 *
 * useEffect(() => {
 *   fetchAssets({ folderId: selectedFolderId, page: 1, limit: 20 });
 * }, [fetchAssets, selectedFolderId]);
 * ```
 */
export function useAssets(teamId: string | undefined): UseAssetsReturn {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Create team-aware API client
  const teamApi = useMemo(() => createTeamApi(teamId), [teamId]);

  /**
   * Fetch assets with optional filters
   */
  const fetchAssets = useCallback(
    async (filters: AssetFilters = {}) => {
      if (!teamId) {
        setError("Team context not available");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Build query string from filters
        const queryParams: Record<string, string | number | boolean | undefined> = {
          page: filters.page ?? 1,
          limit: filters.limit ?? 20,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          search: filters.search,
          type: filters.type,
          status: filters.status,
          includeSubfolders: filters.includeSubfolders ? "true" : undefined,
        };

        // Handle folderId - null means root level, undefined means all
        if (filters.folderId !== undefined) {
          queryParams.folderId = filters.folderId === null ? "null" : filters.folderId;
        }

        // Handle tags array
        if (filters.tags && filters.tags.length > 0) {
          queryParams.tags = filters.tags.join(",");
        }

        const queryString = buildQueryString(queryParams);
        const response = await teamApi.get<AssetListResponse>(
          `/api/v1/creatives${queryString}`
        );

        setAssets(response.data);
        setTotal(response.total);
        setTotalPages(response.totalPages);
        setCurrentPage(response.page);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch assets";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [teamId, teamApi]
  );

  /**
   * Get a single asset with download URL
   */
  const getAsset = useCallback(
    async (id: string, accountId: string): Promise<AssetWithUrl> => {
      if (!teamId) {
        throw new Error("Team context not available");
      }

      return teamApi.get<AssetWithUrl>(`/api/v1/creatives/${id}?accountId=${accountId}`);
    },
    [teamId, teamApi]
  );

  /**
   * Delete an asset
   */
  const deleteAsset = useCallback(
    async (id: string, accountId: string): Promise<void> => {
      if (!teamId) {
        throw new Error("Team context not available");
      }

      try {
        await teamApi.delete(`/api/v1/creatives/${id}?accountId=${accountId}`);

        // Remove from local state
        setAssets((prev) => prev.filter((a) => a.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete asset";
        setError(message);
        throw err;
      }
    },
    [teamId, teamApi]
  );

  /**
   * Move an asset to a folder
   */
  const moveAsset = useCallback(
    async (id: string, accountId: string, folderId: string | null): Promise<Asset> => {
      if (!teamId) {
        throw new Error("Team context not available");
      }

      try {
        const asset = await teamApi.post<Asset>(
          `/api/v1/creatives/${id}/move?accountId=${accountId}`,
          { folderId }
        );

        // Update in local state
        setAssets((prev) => prev.map((a) => (a.id === id ? asset : a)));

        return asset;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to move asset";
        setError(message);
        throw err;
      }
    },
    [teamId, teamApi]
  );

  /**
   * Bulk move assets to a folder
   */
  const bulkMoveAssets = useCallback(
    async (
      creativeIds: string[],
      folderId: string | null,
      accountId: string
    ): Promise<{ success: number; failed: number; errors: string[] }> => {
      if (!teamId) {
        throw new Error("Team context not available");
      }

      try {
        const result = await teamApi.post<{
          success: number;
          failed: number;
          errors: string[];
        }>(`/api/v1/creatives/bulk-move?accountId=${accountId}`, {
          creativeIds,
          folderId,
        });

        // Refetch to update local state
        if (result.success > 0) {
          // Update moved assets in local state
          setAssets((prev) =>
            prev.map((a) => {
              if (creativeIds.includes(a.id)) {
                return { ...a, folderId };
              }
              return a;
            })
          );
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to move assets";
        setError(message);
        throw err;
      }
    },
    [teamId, teamApi]
  );

  return {
    assets,
    loading,
    error,
    total,
    totalPages,
    currentPage,
    fetchAssets,
    getAsset,
    deleteAsset,
    moveAsset,
    bulkMoveAssets,
    setAssets,
  };
}
