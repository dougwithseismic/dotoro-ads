import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface DataRowResponse {
  data: Array<{
    id: string;
    dataSourceId: string;
    rowData: Record<string, unknown>;
    rowIndex: number;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UseDataSourceColumnsResult {
  columns: string[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching column names from a data source by sampling the first row.
 * This is used in the TransformBuilder to populate the GroupByPicker and AggregationList.
 */
export function useDataSourceColumns(
  dataSourceId: string | undefined
): UseDataSourceColumnsResult {
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchColumns = useCallback(async (signal?: AbortSignal) => {
    if (!dataSourceId) {
      setColumns([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch a single row to extract column names
      const response = await fetch(
        `${API_BASE}/api/v1/data-sources/${dataSourceId}/rows?limit=1`,
        { signal }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch data source columns");
      }

      const data: DataRowResponse = await response.json();

      if (data.data.length > 0 && data.data[0]) {
        // Extract column names from the first row's data
        const columnNames = Object.keys(data.data[0].rowData);
        setColumns(columnNames);
      } else {
        setColumns([]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Silently ignore aborted requests
      }
      setError(err instanceof Error ? err.message : "An error occurred");
      setColumns([]);
    } finally {
      setLoading(false);
    }
  }, [dataSourceId]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchColumns(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [fetchColumns]);

  return {
    columns,
    loading,
    error,
    refetch: fetchColumns,
  };
}
