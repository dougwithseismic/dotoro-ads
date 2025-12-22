import { useState, useEffect, useCallback } from "react";
import type { DataSource } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Raw API response structure for data sources
 */
interface ApiDataSource {
  id: string;
  userId: string | null;
  name: string;
  type: string;
  config: {
    rowCount?: number;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

interface ApiDataSourceListResponse {
  data: ApiDataSource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UseDataSourcesResult {
  dataSources: DataSource[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Map API data source to frontend DataSource type
 */
function mapApiDataSource(apiDs: ApiDataSource): DataSource {
  return {
    id: apiDs.id,
    name: apiDs.name,
    type: apiDs.type as DataSource["type"],
    rowCount: apiDs.config?.rowCount ?? 0,
    status: "ready", // Assume ready if returned from API
    columns: undefined, // Will be fetched separately if needed
  };
}

/**
 * Hook for fetching data sources for the transform builder source selector
 */
export function useDataSources(): UseDataSourcesResult {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDataSources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data sources with a large limit for the dropdown
      const response = await fetch(
        `${API_BASE}/api/v1/data-sources?limit=100`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch data sources");
      }

      const data: ApiDataSourceListResponse = await response.json();
      // Map API response to frontend DataSource type
      const mappedSources = data.data.map(mapApiDataSource);
      setDataSources(mappedSources);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);

  return {
    dataSources,
    loading,
    error,
    refetch: fetchDataSources,
  };
}

/**
 * Hook for fetching a single data source with its schema
 */
export function useDataSource(id: string | undefined) {
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  const fetchDataSource = useCallback(async () => {
    if (!id) {
      setDataSource(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/v1/data-sources/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Data source not found");
        }
        throw new Error("Failed to fetch data source");
      }

      const data = await response.json();
      setDataSource(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDataSource();
  }, [fetchDataSource]);

  return {
    dataSource,
    loading,
    error,
    refetch: fetchDataSource,
  };
}
