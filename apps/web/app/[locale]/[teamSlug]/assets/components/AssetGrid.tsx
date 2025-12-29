"use client";

import { useState, useCallback, useMemo } from "react";
import type { Asset } from "../types";
import { AssetCard } from "./AssetCard";
import styles from "./AssetGrid.module.css";

type ViewSize = "small" | "medium" | "large";

interface AssetGridProps {
  /** List of assets to display */
  assets: Asset[];
  /** Loading state */
  loading?: boolean;
  /** Total number of assets (for pagination info) */
  total: number;
  /** Current page */
  currentPage: number;
  /** Total pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when search changes */
  onSearchChange: (search: string) => void;
  /** Callback when asset is clicked */
  onAssetClick?: (asset: Asset) => void;
  /** Callback for quick view */
  onQuickView?: (asset: Asset) => void;
  /** Callback for delete */
  onDelete?: (asset: Asset) => void;
  /** Callback for bulk move */
  onBulkMove?: (assetIds: string[]) => void;
  /** Callback for bulk delete */
  onBulkDelete?: (assetIds: string[]) => void;
  /** Callback for upload button */
  onUpload?: () => void;
  /** Current search value */
  searchValue?: string;
  /** Optional folder name for empty state */
  folderName?: string;
}

/**
 * AssetGrid Component
 *
 * Displays a grid of asset cards with search, view controls, and selection support.
 * Includes pagination and bulk action toolbar.
 */
export function AssetGrid({
  assets,
  loading = false,
  total,
  currentPage,
  totalPages,
  onPageChange,
  onSearchChange,
  onAssetClick,
  onQuickView,
  onDelete,
  onBulkMove,
  onBulkDelete,
  onUpload,
  searchValue = "",
  folderName,
}: AssetGridProps) {
  const [viewSize, setViewSize] = useState<ViewSize>("medium");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /**
   * Toggle asset selection
   */
  const handleSelect = useCallback((assetId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(assetId);
      } else {
        next.delete(assetId);
      }
      return next;
    });
  }, []);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /**
   * Select all visible assets
   * Note: Reserved for future "Select All" UI feature
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _selectAll = useCallback(() => {
    setSelectedIds(new Set(assets.map((a) => a.id)));
  }, [assets]);

  /**
   * Get selected assets
   * Note: Reserved for future bulk action details display
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _selectedAssets = useMemo(
    () => assets.filter((a) => selectedIds.has(a.id)),
    [assets, selectedIds]
  );

  /**
   * Handle bulk move
   */
  const handleBulkMove = useCallback(() => {
    if (onBulkMove && selectedIds.size > 0) {
      onBulkMove(Array.from(selectedIds));
    }
  }, [onBulkMove, selectedIds]);

  /**
   * Handle bulk delete
   */
  const handleBulkDelete = useCallback(() => {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds));
      clearSelection();
    }
  }, [onBulkDelete, selectedIds, clearSelection]);

  /**
   * Render pagination controls
   */
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | "ellipsis")[] = [];
    const showPages = 5;
    const halfShow = Math.floor(showPages / 2);

    let startPage = Math.max(1, currentPage - halfShow);
    const endPage = Math.min(totalPages, startPage + showPages - 1);

    if (endPage - startPage < showPages - 1) {
      startPage = Math.max(1, endPage - showPages + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push("ellipsis");
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push("ellipsis");
      pages.push(totalPages);
    }

    return (
      <nav className={styles.pagination} aria-label="Asset pagination">
        <button
          type="button"
          className={styles.pageButton}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </button>

        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className={styles.pageInfo}>
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              className={`${styles.pageButton} ${page === currentPage ? styles.active : ""}`}
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          className={styles.pageButton}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </button>
      </nav>
    );
  };

  /**
   * Render grid content
   */
  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Loading assets...</p>
        </div>
      );
    }

    if (assets.length === 0) {
      return (
        <div className={styles.emptyState}>
          <EmptyIcon className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>
            {searchValue
              ? "No assets found"
              : folderName
                ? `No assets in "${folderName}"`
                : "No assets yet"}
          </h3>
          <p className={styles.emptyDescription}>
            {searchValue
              ? "Try adjusting your search terms"
              : "Upload images or videos to get started with your creative library"}
          </p>
          {!searchValue && onUpload && (
            <button type="button" className={styles.uploadButton} onClick={onUpload}>
              <UploadIcon />
              Upload Assets
            </button>
          )}
        </div>
      );
    }

    const gridClass = `${styles.grid} ${viewSize === "large" ? styles.gridLarge : viewSize === "small" ? styles.gridSmall : ""}`;

    return (
      <div className={styles.gridContainer}>
        <div className={gridClass}>
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              isSelected={selectedIds.has(asset.id)}
              onClick={() => onAssetClick?.(asset)}
              onSelect={(selected) => handleSelect(asset.id, selected)}
              onQuickView={() => onQuickView?.(asset)}
              onDelete={() => onDelete?.(asset)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchContainer}>
            <SearchIcon className={styles.searchIcon} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search assets..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search assets"
            />
          </div>
          <span className={styles.assetCount}>
            {total.toLocaleString()} asset{total !== 1 ? "s" : ""}
          </span>
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.viewToggle}>
            <button
              type="button"
              className={`${styles.viewButton} ${viewSize === "small" ? styles.active : ""}`}
              onClick={() => setViewSize("small")}
              aria-label="Small grid view"
              title="Small"
            >
              <GridSmallIcon />
            </button>
            <button
              type="button"
              className={`${styles.viewButton} ${viewSize === "medium" ? styles.active : ""}`}
              onClick={() => setViewSize("medium")}
              aria-label="Medium grid view"
              title="Medium"
            >
              <GridMediumIcon />
            </button>
            <button
              type="button"
              className={`${styles.viewButton} ${viewSize === "large" ? styles.active : ""}`}
              onClick={() => setViewSize("large")}
              aria-label="Large grid view"
              title="Large"
            >
              <GridLargeIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className={styles.selectionBar}>
          <div className={styles.selectionInfo}>
            <span className={styles.selectionCount}>
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              className={styles.clearSelection}
              onClick={clearSelection}
            >
              Clear selection
            </button>
          </div>
          <div className={styles.selectionActions}>
            {onBulkMove && (
              <button
                type="button"
                className={styles.selectionButton}
                onClick={handleBulkMove}
              >
                <MoveIcon />
                Move
              </button>
            )}
            {onBulkDelete && (
              <button
                type="button"
                className={styles.selectionButton}
                onClick={handleBulkDelete}
              >
                <TrashIcon />
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid content */}
      {renderContent()}

      {/* Pagination */}
      {!loading && assets.length > 0 && renderPagination()}
    </div>
  );
}

// Icon components
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7" r="5" />
      <path d="M14 14L11 11" />
    </svg>
  );
}

function GridSmallIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <rect x="1" y="1" width="3" height="3" rx="0.5" />
      <rect x="6" y="1" width="3" height="3" rx="0.5" />
      <rect x="11" y="1" width="3" height="3" rx="0.5" />
      <rect x="1" y="6" width="3" height="3" rx="0.5" />
      <rect x="6" y="6" width="3" height="3" rx="0.5" />
      <rect x="11" y="6" width="3" height="3" rx="0.5" />
      <rect x="1" y="11" width="3" height="3" rx="0.5" />
      <rect x="6" y="11" width="3" height="3" rx="0.5" />
      <rect x="11" y="11" width="3" height="3" rx="0.5" />
    </svg>
  );
}

function GridMediumIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function GridLargeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <rect x="1" y="1" width="14" height="6" rx="1" />
      <rect x="1" y="9" width="14" height="6" rx="1" />
    </svg>
  );
}

function EmptyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="8" y="8" width="48" height="48" rx="8" />
      <circle cx="24" cy="24" r="6" />
      <path d="M56 48L44 32L28 52" />
      <path d="M32 52L24 42L8 56" />
      <circle cx="48" cy="16" r="8" fill="none" />
      <path d="M48 12V20M44 16H52" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 12V3" />
      <path d="M4 7L8 3L12 7" />
      <path d="M3 14H13" />
    </svg>
  );
}

function MoveIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8V12H2V4H6" />
      <path d="M8 2H12V6" />
      <path d="M12 2L6 8" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 4H12" />
      <path d="M5 4V2.5C5 2.22 5.22 2 5.5 2H8.5C8.78 2 9 2.22 9 2.5V4" />
      <path d="M11 4V12C11 12.55 10.55 13 10 13H4C3.45 13 3 12.55 3 12V4" />
      <path d="M5.5 6.5V10.5" />
      <path d="M8.5 6.5V10.5" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 4L6 8L10 12" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4L10 8L6 12" />
    </svg>
  );
}
