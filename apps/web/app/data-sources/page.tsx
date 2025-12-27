"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DataSourcesTable,
  UploadZone,
  Pagination,
  EmptyState,
  type SyncButtonStatus,
} from "./components";
import { CreateDataSourceDrawer } from "@/app/campaign-sets/new/components/CreateDataSourceDrawer";
import type { DataSource, DataSourceListResponse, SortDirection } from "./types";
import styles from "./DataSourceList.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SYNC_POLL_INTERVAL = 10000; // Poll every 10 seconds when syncing

type SortableColumn = "name" | "updatedAt";

/**
 * Toast notification state
 */
interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

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

  // Sync button statuses for optimistic UI
  const [syncButtonStatuses, setSyncButtonStatuses] = useState<
    Record<string, SyncButtonStatus>
  >({});

  // Toast notification state
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });

  // Create drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Polling ref to track interval
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Toast timeout ref to prevent memory leaks
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync timeouts ref to track and cleanup sync status revert timeouts
  const syncTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Show a toast notification
   */
  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      setToast({ message, type, visible: true });
      // Auto-hide after 4 seconds
      toastTimeoutRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 4000);
    },
    []
  );

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Cleanup sync timeouts on unmount
  useEffect(() => {
    return () => {
      syncTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      syncTimeoutsRef.current.clear();
    };
  }, []);

  const fetchDataSources = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }
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
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [currentPage, pageSize, searchTerm, sortColumn, sortDirection]
  );

  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);

  /**
   * Check if any data source is currently syncing
   */
  const hasAnySyncing = useMemo(() => {
    return dataSources.some(
      (ds) =>
        ds.syncStatus === "syncing" ||
        syncButtonStatuses[ds.id] === "syncing"
    );
  }, [dataSources, syncButtonStatuses]);

  /**
   * Set up polling when any data source is syncing
   */
  useEffect(() => {
    if (hasAnySyncing) {
      // Start polling
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          fetchDataSources(true); // Silent fetch
        }, SYNC_POLL_INTERVAL);
      }
    } else {
      // Stop polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [hasAnySyncing, fetchDataSources]);

  /**
   * Handle sync for a data source
   */
  const handleSync = useCallback(
    async (id: string) => {
      // Clear any existing timeout for this data source
      const existingTimeout = syncTimeoutsRef.current.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        syncTimeoutsRef.current.delete(id);
      }

      // Optimistic UI update
      setSyncButtonStatuses((prev) => ({
        ...prev,
        [id]: "syncing",
      }));

      try {
        const response = await fetch(
          `${API_BASE}/api/v1/data-sources/${id}/sync`,
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to trigger sync");
        }

        // On success, show success state briefly then revert
        setSyncButtonStatuses((prev) => ({
          ...prev,
          [id]: "success",
        }));

        showToast("Sync completed successfully", "success");

        // Revert to idle after 3 seconds
        const successTimeoutId = setTimeout(() => {
          setSyncButtonStatuses((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
          syncTimeoutsRef.current.delete(id);
        }, 3000);
        syncTimeoutsRef.current.set(id, successTimeoutId);

        // Refresh the data
        await fetchDataSources(true);
      } catch (err) {
        // Show error state
        setSyncButtonStatuses((prev) => ({
          ...prev,
          [id]: "error",
        }));

        showToast(
          err instanceof Error ? err.message : "Failed to sync",
          "error"
        );

        // Keep error state for a bit before clearing
        const errorTimeoutId = setTimeout(() => {
          setSyncButtonStatuses((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
          syncTimeoutsRef.current.delete(id);
        }, 5000);
        syncTimeoutsRef.current.set(id, errorTimeoutId);
      }
    },
    [fetchDataSources, showToast]
  );

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

  /**
   * Handle data source created from drawer
   */
  const handleDataSourceCreated = useCallback(
    (id: string) => {
      setIsDrawerOpen(false);
      showToast("Data source created successfully", "success");
      // Navigate to the new data source
      router.push(`/data-sources/${id}`);
    },
    [router, showToast]
  );

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
          <button onClick={() => fetchDataSources()} className={styles.retryButton}>
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
      {/* Toast Notification */}
      {toast.visible && (
        <div
          className={`${styles.toast} ${styles[`toast-${toast.type}`]}`}
          role="alert"
          aria-live="polite"
        >
          {toast.type === "success" ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M13.5 4.5L6 12L2.5 8.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>Data Sources</h1>
            <button
              className={styles.createButton}
              onClick={() => setIsDrawerOpen(true)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8 3v10M3 8h10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Create Data Source
            </button>
          </div>
          <p className={styles.subtitle}>
            Upload and manage your data sources
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
              onSync={handleSync}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              syncButtonStatuses={syncButtonStatuses}
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

      {/* Create Data Source Drawer */}
      <CreateDataSourceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreated={handleDataSourceCreated}
      />
    </div>
  );
}
