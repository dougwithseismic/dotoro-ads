"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TransformsTable } from "./components";
import { Pagination } from "../data-sources/components/Pagination";
import { useUpdateTransform } from "./hooks/useUpdateTransform";
import { useDeleteTransform } from "./hooks/useDeleteTransform";
import { useExecuteTransform } from "./hooks/useExecuteTransform";
import type { Transform, TransformListResponse } from "./types";
import styles from "./TransformList.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type SortableColumn = "name" | "updatedAt";
type SortDirection = "asc" | "desc";

export default function TransformsPage() {
  const router = useRouter();
  const { updateTransform } = useUpdateTransform();
  const { deleteTransform } = useDeleteTransform();
  const { executeTransform } = useExecuteTransform();

  const [transforms, setTransforms] = useState<Transform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortableColumn | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const fetchTransforms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `${API_BASE}/api/v1/transforms?page=${currentPage}&limit=${pageSize}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      if (sortColumn) {
        url += `&sortBy=${sortColumn}&sortOrder=${sortDirection}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch transforms");
      }
      const data: TransformListResponse = await response.json();
      setTransforms(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, sortColumn, sortDirection]);

  useEffect(() => {
    fetchTransforms();
  }, [fetchTransforms]);

  const handleRowClick = (id: string) => {
    router.push(`/transforms/builder/${id}`);
  };

  const handleToggleEnabled = useCallback(
    async (transform: Transform) => {
      try {
        setActionError(null);
        await updateTransform(transform.id, { enabled: !transform.enabled });
        await fetchTransforms();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to update transform"
        );
      }
    },
    [updateTransform, fetchTransforms]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        setActionError(null);
        await deleteTransform(id);
        setDeleteConfirm(null);
        await fetchTransforms();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to delete transform"
        );
      }
    },
    [deleteTransform, fetchTransforms]
  );

  const handleExecute = useCallback(
    async (id: string) => {
      try {
        setActionError(null);
        setExecutingId(id);
        await executeTransform(id);
        await fetchTransforms();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to execute transform"
        );
      } finally {
        setExecutingId(null);
      }
    },
    [executeTransform, fetchTransforms]
  );

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
    setCurrentPage(1);
  };

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Sort transforms locally for immediate feedback
  const sortedTransforms = useMemo(() => {
    if (!sortColumn || transforms.length === 0) return transforms;

    return [...transforms].sort((a, b) => {
      let comparison = 0;
      if (sortColumn === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortColumn === "updatedAt") {
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [transforms, sortColumn, sortDirection]);

  if (loading && transforms.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Loading transforms...</span>
        </div>
      </div>
    );
  }

  if (error && transforms.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchTransforms} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const showEmptyState = transforms.length === 0 && !searchTerm;
  const showNoResults = transforms.length === 0 && searchTerm;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Transforms</h1>
          <p className={styles.subtitle}>
            Group and aggregate your data sources
          </p>
        </div>
        <Link href="/transforms/builder" className={styles.createButton}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 4V16M4 10H16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          New Transform
        </Link>
      </header>

      {actionError && (
        <div className={styles.actionError}>
          <p>{actionError}</p>
          <button onClick={() => setActionError(null)}>Dismiss</button>
        </div>
      )}

      <section className={styles.tableSection}>
        {!showEmptyState && (
          <div className={styles.tableHeader}>
            <div className={styles.searchContainer}>
              <input
                type="search"
                placeholder="Search transforms..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className={styles.searchInput}
                aria-label="Search transforms"
              />
            </div>
            {total > 0 && (
              <span className={styles.totalCount}>
                {total.toLocaleString()} transform{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {showEmptyState ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 12H40M8 24H40M8 36H40"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M24 8V40"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>
            <h2>No transforms yet</h2>
            <p>
              Create your first transform to aggregate and group your data
            </p>
            <Link href="/transforms/builder" className={styles.emptyButton}>
              Create Your First Transform
            </Link>
          </div>
        ) : showNoResults ? (
          <div className={styles.noResults}>
            <p>No transforms match your search.</p>
            <button
              onClick={() => handleSearch("")}
              className={styles.clearSearchButton}
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            <TransformsTable
              transforms={sortedTransforms}
              onRowClick={handleRowClick}
              onDelete={handleDelete}
              onExecute={handleExecute}
              onToggleEnabled={handleToggleEnabled}
              executingId={executingId}
              deleteConfirmId={deleteConfirm}
              onDeleteConfirm={setDeleteConfirm}
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
