import { useState, useEffect, useCallback } from "react";
import type { Transform, TransformListResponse } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface UseTransformsOptions {
  page?: number;
  limit?: number;
  sourceDataSourceId?: string;
  enabled?: boolean;
}

interface UseTransformsResult {
  transforms: Transform[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTransforms(
  options: UseTransformsOptions = {}
): UseTransformsResult {
  const { page = 1, limit = 20, sourceDataSourceId, enabled } = options;

  const [transforms, setTransforms] = useState<Transform[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransforms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (sourceDataSourceId) {
        params.set("sourceDataSourceId", sourceDataSourceId);
      }
      if (enabled !== undefined) {
        params.set("enabled", String(enabled));
      }

      const response = await fetch(
        `${API_BASE}/api/v1/transforms?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transforms");
      }

      const data: TransformListResponse = await response.json();
      setTransforms(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [page, limit, sourceDataSourceId, enabled]);

  useEffect(() => {
    fetchTransforms();
  }, [fetchTransforms]);

  return {
    transforms,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,
    refetch: fetchTransforms,
  };
}
