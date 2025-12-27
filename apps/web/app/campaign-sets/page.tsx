"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, buildQueryString } from "@/lib/api-client";
import { CampaignSetsTable, CreateZone } from "./components";
import type {
  CampaignSetSummary,
  CampaignSetListResponse,
  CampaignSetFilters,
} from "./types";
import styles from "./CampaignSetsList.module.css";

/**
 * Campaign Sets Listing Page
 *
 * Displays all campaign sets in a table view with search and pagination.
 * Design matches the data-sources page layout.
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
  const [pageSize] = useState(10);

  /**
   * Fetch campaign sets from the API
   */
  const fetchCampaignSets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | undefined> = {
        page: String(currentPage),
        limit: String(pageSize),
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
  }, [currentPage, pageSize, filters]);

  useEffect(() => {
    fetchCampaignSets();
  }, [fetchCampaignSets]);

  /**
   * Handle navigation to campaign set detail
   */
  const handleRowClick = useCallback(
    (id: string) => {
      router.push(`/campaign-sets/${id}`);
    },
    [router]
  );

  /**
   * Handle search
   */
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

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
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * Clear search
   */
  const handleClearSearch = () => {
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

  const showEmptyState = filteredCampaignSets.length === 0 && !searchTerm.trim();
  const showNoResults = filteredCampaignSets.length === 0 && searchTerm.trim();

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Campaign Sets</h1>
          <p className={styles.subtitle}>
            Create and manage your ad campaign sets
          </p>
        </div>
      </header>

      {/* Create Zone */}
      <section className={styles.createSection}>
        <CreateZone />
      </section>

      {/* Table Section */}
      <section className={styles.tableSection}>
        {!showEmptyState && (
          <div className={styles.tableHeader}>
            <div className={styles.searchContainer}>
              <input
                type="search"
                placeholder="Search campaign sets..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className={styles.searchInput}
                aria-label="Search campaign sets"
              />
            </div>
            {total > 0 && (
              <span className={styles.totalCount}>
                {total.toLocaleString()} campaign set{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

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
                <path d="M8 18H40" stroke="currentColor" strokeWidth="2" />
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
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>No Campaign Sets Yet</h2>
            <p className={styles.emptyDescription}>
              Create your first campaign set to start generating ad campaigns
              from your data.
            </p>
            <Link href="/campaign-sets/new" className={styles.emptyButton}>
              Create Campaign Set
            </Link>
          </div>
        ) : showNoResults ? (
          <div className={styles.noResults}>
            <p>No campaign sets match your search.</p>
            <button onClick={handleClearSearch} className={styles.clearButton}>
              Clear search
            </button>
          </div>
        ) : (
          <>
            <CampaignSetsTable
              campaignSets={filteredCampaignSets}
              onRowClick={handleRowClick}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageButton}
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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
                    handlePageChange(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
