"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, buildQueryString } from "@/lib/api-client";
import { CampaignSetCard } from "./components";
import type {
  CampaignSetSummary,
  CampaignSetListResponse,
  CampaignSetStatus,
  CampaignSetFilters,
} from "./types";
import styles from "./CampaignSetsList.module.css";

/**
 * Campaign Sets Listing Page
 *
 * Displays all campaign sets for the current user with filtering and search.
 */
export default function CampaignSetsPage() {
  const router = useRouter();

  // State
  const [campaignSets, setCampaignSets] = useState<CampaignSetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CampaignSetFilters>({});
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  /**
   * Fetch campaign sets from the API
   */
  const fetchCampaignSets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | undefined> = {
        page: String(currentPage),
        limit: "12",
      };

      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.syncStatus) {
        params.syncStatus = filters.syncStatus;
      }

      const queryString = buildQueryString(params);
      const response = await api.get<CampaignSetListResponse>(
        `/api/v1/campaign-sets${queryString}`
      );

      setCampaignSets(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchCampaignSets();
  }, [fetchCampaignSets]);

  /**
   * Handle navigation to campaign set detail
   */
  const handleCardClick = useCallback(
    (id: string) => {
      router.push(`/campaign-sets/${id}`);
    },
    [router]
  );

  /**
   * Filter campaign sets by search term
   */
  const filteredCampaignSets = useMemo(() => {
    if (!searchTerm.trim()) return campaignSets;

    const term = searchTerm.toLowerCase();
    return campaignSets.filter(
      (set) =>
        set.name.toLowerCase().includes(term) ||
        (set.description && set.description.toLowerCase().includes(term))
    );
  }, [campaignSets, searchTerm]);

  /**
   * Calculate status counts for summary
   */
  const statusCounts = useMemo(() => {
    return campaignSets.reduce(
      (acc, set) => {
        acc[set.status] = (acc[set.status] || 0) + 1;
        return acc;
      },
      {} as Record<CampaignSetStatus, number>
    );
  }, [campaignSets]);

  /**
   * Handle status filter change
   */
  const handleStatusFilter = (status: CampaignSetStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
    setCurrentPage(1);
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Loading state
  if (loading && campaignSets.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Loading campaign sets...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && campaignSets.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchCampaignSets} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const hasActiveFilters =
    filters.status || filters.syncStatus || searchTerm.trim();
  const showEmptyState = filteredCampaignSets.length === 0 && !hasActiveFilters;
  const showNoResults = filteredCampaignSets.length === 0 && hasActiveFilters;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Campaign Sets</h1>
          <p className={styles.subtitle}>
            Manage your generated campaign sets
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/campaign-sets/new" className={styles.createButton}>
            + Create Campaign Set
          </Link>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{total}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.stat} data-status="active">
              <span className={styles.statValue}>
                {statusCounts.active || 0}
              </span>
              <span className={styles.statLabel}>Active</span>
            </div>
            <div className={styles.stat} data-status="syncing">
              <span className={styles.statValue}>
                {statusCounts.syncing || 0}
              </span>
              <span className={styles.statLabel}>Syncing</span>
            </div>
            <div className={styles.stat} data-status="error">
              <span className={styles.statValue}>
                {statusCounts.error || 0}
              </span>
              <span className={styles.statLabel}>Errors</span>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchContainer}>
          <input
            type="search"
            placeholder="Search campaign sets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            aria-label="Search campaign sets"
          />
        </div>

        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterButton} ${
              !filters.status ? styles.active : ""
            }`}
            onClick={() => handleStatusFilter(undefined)}
          >
            All
          </button>
          <button
            className={`${styles.filterButton} ${
              filters.status === "active" ? styles.active : ""
            }`}
            onClick={() => handleStatusFilter("active")}
          >
            Active
          </button>
          <button
            className={`${styles.filterButton} ${
              filters.status === "draft" ? styles.active : ""
            }`}
            onClick={() => handleStatusFilter("draft")}
          >
            Draft
          </button>
          <button
            className={`${styles.filterButton} ${
              filters.status === "paused" ? styles.active : ""
            }`}
            onClick={() => handleStatusFilter("paused")}
          >
            Paused
          </button>
          <button
            className={`${styles.filterButton} ${
              filters.status === "error" ? styles.active : ""
            }`}
            onClick={() => handleStatusFilter("error")}
          >
            Error
          </button>
        </div>

        {hasActiveFilters && (
          <button
            className={styles.clearFiltersButton}
            onClick={handleClearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      {showEmptyState ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="8"
                y="12"
                width="32"
                height="28"
                rx="3"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M8 18H40"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M16 8V12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M32 8V12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M20 28L24 32L28 28"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M24 24V32"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2 className={styles.emptyTitle}>No Campaign Sets Yet</h2>
          <p className={styles.emptyDescription}>
            Create your first campaign set to start generating ad campaigns from
            your data.
          </p>
          <Link href="/campaign-sets/new" className={styles.emptyButton}>
            Create Campaign Set
          </Link>
        </div>
      ) : showNoResults ? (
        <div className={styles.noResults}>
          <p>No campaign sets match your filters.</p>
          <button onClick={handleClearFilters} className={styles.clearButton}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {filteredCampaignSets.map((set) => (
              <CampaignSetCard
                key={set.id}
                set={set}
                onClick={() => handleCardClick(set.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className={styles.pageButton}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
