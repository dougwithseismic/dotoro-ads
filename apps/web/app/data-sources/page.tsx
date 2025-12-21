"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DataSourcesTable,
  UploadZone,
  Pagination,
  EmptyState,
} from "./components";
import type { DataSource, DataSourceListResponse, SortDirection } from "./types";
import styles from "./DataSourceList.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type SortableColumn = "name" | "updatedAt";

export default function DataSourcesPage() {
  const router = useRouter();
  const uploadZoneRef = useRef<HTMLDivElement>(null);

  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(
    undefined
  );
  const [uploadingFileName, setUploadingFileName] = useState<
    string | undefined
  >(undefined);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortableColumn | undefined>(
    undefined
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const fetchDataSources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `${API_BASE}/api/v1/data-sources?page=${currentPage}&limit=${pageSize}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      if (sortColumn) {
        url += `&sortBy=${sortColumn}&sortOrder=${sortDirection}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch data sources");
      }
      const data: DataSourceListResponse = await response.json();
      setDataSources(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, sortColumn, sortDirection]);

  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);

  // Simulated upload progress for UI demonstration
  const simulateUploadProgress = useCallback(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      setUploadProgress(Math.round(progress));
    }, 200);
    return interval;
  }, []);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadError(null);
      setUploadingFileName(file.name);
      setUploadProgress(0);

      // Start simulated progress
      const progressInterval = simulateUploadProgress();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/api/v1/data-sources/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const newSource = await response.json();
      setDataSources((prev) => [newSource, ...prev]);
      setTotal((prev) => prev + 1);

      // Reset after short delay to show 100%
      setTimeout(() => {
        setUploadProgress(undefined);
        setUploadingFileName(undefined);
      }, 500);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload file"
      );
      setUploadProgress(undefined);
      setUploadingFileName(undefined);
    } finally {
      setUploading(false);
    }
  };

  const handleRowClick = (id: string) => {
    router.push(`/data-sources/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/data-sources/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete data source");
      }

      setDataSources((prev) => prev.filter((ds) => ds.id !== id));
      setTotal((prev) => prev - 1);
      setDeleteConfirm(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete data source"
      );
    }
  };

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleEmptyStateUploadClick = () => {
    // Scroll to upload zone and trigger file picker
    uploadZoneRef.current?.scrollIntoView({ behavior: "smooth" });
    // Give time for scroll then focus
    setTimeout(() => {
      const fileInput = uploadZoneRef.current?.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      fileInput?.click();
    }, 300);
  };

  // Sort data sources locally if we have them
  const sortedDataSources = useMemo(() => {
    if (!sortColumn || dataSources.length === 0) return dataSources;

    return [...dataSources].sort((a, b) => {
      let comparison = 0;
      if (sortColumn === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortColumn === "updatedAt") {
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [dataSources, sortColumn, sortDirection]);

  if (loading && dataSources.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Loading data sources...</span>
        </div>
      </div>
    );
  }

  if (error && dataSources.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchDataSources} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const showEmptyState = dataSources.length === 0 && !searchTerm;
  const showNoResults = dataSources.length === 0 && searchTerm;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Data Sources</h1>
          <p className={styles.subtitle}>
            Upload and manage your CSV data sources
          </p>
        </div>
      </header>

      <section className={styles.uploadSection} ref={uploadZoneRef}>
        <UploadZone
          onUpload={handleUpload}
          isUploading={uploading}
          uploadProgress={uploadProgress}
          uploadingFileName={uploadingFileName}
          error={uploadError}
        />
      </section>

      <section className={styles.tableSection}>
        {!showEmptyState && (
          <div className={styles.tableHeader}>
            <div className={styles.searchContainer}>
              <input
                type="search"
                placeholder="Search data sources..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className={styles.searchInput}
                aria-label="Search data sources"
              />
            </div>
            {total > 0 && (
              <span className={styles.totalCount}>
                {total.toLocaleString()} data source{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {showEmptyState ? (
          <EmptyState onUploadClick={handleEmptyStateUploadClick} />
        ) : showNoResults ? (
          <div className={styles.noResults}>
            <p>No data sources match your search.</p>
            <button
              onClick={() => handleSearch("")}
              className={styles.clearSearchButton}
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            <DataSourcesTable
              dataSources={sortedDataSources}
              onRowClick={handleRowClick}
              onDelete={handleDelete}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />

            {total > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
