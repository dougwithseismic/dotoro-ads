import { useState, useCallback } from "react";
import { api, apiUpload, buildQueryString } from "../api-client";
import type { DataSource } from "@/app/data-sources/types";

interface DataSourcesResponse {
  data: DataSource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FetchDataSourcesOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function useDataSources() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDataSources = useCallback(
    async (options: FetchDataSourcesOptions = {}) => {
      try {
        setLoading(true);
        setError(null);

        const queryString = buildQueryString({
          page: options.page,
          limit: options.limit,
          search: options.search,
          sortBy: options.sortBy,
          sortOrder: options.sortOrder,
        });

        const response = await api.get<DataSourcesResponse>(
          `/api/v1/data-sources${queryString}`
        );
        setDataSources(response.data);
        setTotal(response.total);
        setTotalPages(response.totalPages);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch data sources"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const uploadDataSource = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const newSource = await apiUpload<DataSource>(
        "/api/v1/data-sources/upload",
        formData
      );
      setDataSources((prev) => [newSource, ...prev]);
      setTotal((prev) => prev + 1);
      return newSource;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload data source");
      throw err;
    }
  }, []);

  const deleteDataSource = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/v1/data-sources/${id}`);
      setDataSources((prev) => prev.filter((ds) => ds.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete data source");
      throw err;
    }
  }, []);

  const getDataSource = useCallback(async (id: string) => {
    return api.get<DataSource>(`/api/v1/data-sources/${id}`);
  }, []);

  return {
    dataSources,
    loading,
    error,
    total,
    totalPages,
    fetchDataSources,
    uploadDataSource,
    deleteDataSource,
    getDataSource,
    setDataSources,
  };
}
