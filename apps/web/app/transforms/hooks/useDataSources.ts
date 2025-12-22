import { useState, useEffect, useCallback } from "react";
import type { DataSource, DataSourceListResponse } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface UseDataSourcesResult {
  dataSources: DataSource[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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

      const data: DataSourceListResponse = await response.json();
      // Filter only ready data sources
      const readySources = data.data.filter((ds) => ds.status === "ready");
      setDataSources(readySources);
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
