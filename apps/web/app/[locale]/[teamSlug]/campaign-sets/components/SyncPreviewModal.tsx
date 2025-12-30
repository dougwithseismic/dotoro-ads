"use client";

import { useId, useEffect, useRef, useState, useMemo } from "react";
import type {
  CampaignSet,
  SyncPreviewResponse,
  PreviewModalView,
  SkippedAdInfo,
  FallbackAdInfo,
} from "../types";
import styles from "./SyncPreviewModal.module.css";

/**
 * Props for SyncPreviewModal component
 */
interface SyncPreviewModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the modal should be closed */
  onClose: () => void;
  /** The campaign set being previewed */
  campaignSet: CampaignSet;
  /** The preview data from the API */
  preview: SyncPreviewResponse | null;
  /** Whether the preview is loading */
  isLoading: boolean;
  /** Error message if preview failed */
  error: string | null;
  /** Called when user clicks "Sync Now" */
  onSync: () => void;
  /** Called when user clicks "Sync Anyway" (bypass) */
  onBypass: () => void;
  /** Called when user clicks "Re-validate" */
  onRevalidate: () => void;
}

/**
 * SyncPreviewModal Component
 *
 * Displays a preview of what will happen during sync, showing breakdown
 * of valid, fallback, and skipped ads with drill-down capability.
 */
export function SyncPreviewModal({
  isOpen,
  onClose,
  campaignSet,
  preview,
  isLoading,
  error,
  onSync,
  onBypass,
  onRevalidate,
}: SyncPreviewModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<PreviewModalView>("summary");
  const [errorFilter, setErrorFilter] = useState<string>("all");

  // Reset view when modal opens
  useEffect(() => {
    if (isOpen) {
      setView("summary");
      setErrorFilter("all");
    }
  }, [isOpen]);

  // Focus trap effect
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement;
    modalRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Backspace" && view !== "summary") {
        e.preventDefault();
        setView("summary");
        return;
      }

      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstFocusable || document.activeElement === modalRef.current) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose, view]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Get unique error types for filter dropdown
  const errorTypes = useMemo(() => {
    if (!preview) return [];
    return [...new Set(preview.skippedAds.map((ad) => ad.errorCode))];
  }, [preview]);

  // Filter skipped ads based on selected error type
  const filteredSkippedAds = useMemo(() => {
    if (!preview) return [];
    if (errorFilter === "all") return preview.skippedAds;
    return preview.skippedAds.filter((ad) => ad.errorCode === errorFilter);
  }, [preview, errorFilter]);

  if (!isOpen) {
    return null;
  }

  // Get human-readable error code label
  const getErrorLabel = (code: string): string => {
    const labels: Record<string, string> = {
      REQUIRED_FIELD: "Missing Required Field",
      INVALID_DATETIME: "Invalid Date/Time",
      INVALID_URL: "Invalid URL",
      FIELD_TOO_LONG: "Text Too Long",
      INVALID_ENUM_VALUE: "Invalid Option",
      INVALID_BUDGET: "Invalid Budget",
      MISSING_DEPENDENCY: "Missing Dependency",
      CONSTRAINT_VIOLATION: "Constraint Violation",
      VALUE_OUT_OF_RANGE: "Value Out of Range",
    };
    return labels[code] || code;
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            {view !== "summary" && (
              <button
                className={styles.backButton}
                onClick={() => setView("summary")}
                type="button"
                aria-label="Back to summary"
              >
                <ArrowLeftIcon />
              </button>
            )}
            <h2 id={titleId} className={styles.title}>
              {view === "summary" && "Sync Preview"}
              {view === "skipped" && `Skipped Ads (${preview?.breakdown.skipped ?? 0})`}
              {view === "fallback" && `Fallback Ads (${preview?.breakdown.fallback ?? 0})`}
            </h2>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <XIcon />
          </button>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {isLoading && (
            <div className={styles.loadingState}>
              <div className={styles.skeleton}>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonBreakdown}>
                  <div className={styles.skeletonItem} />
                  <div className={styles.skeletonItem} />
                  <div className={styles.skeletonItem} />
                </div>
              </div>
              <p className={styles.loadingText}>Analyzing {campaignSet.campaigns.reduce((acc, c) => acc + c.adGroups.reduce((ag, a) => ag + a.ads.length, 0), 0)} ads...</p>
            </div>
          )}

          {error && (
            <div className={styles.errorState}>
              <ErrorIcon />
              <p className={styles.errorMessage}>{error}</p>
              <button className={styles.retryButton} onClick={onRevalidate} type="button">
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && preview && view === "summary" && (
            <SummaryView
              preview={preview}
              campaignSetName={campaignSet.name}
              onViewSkipped={() => setView("skipped")}
              onViewFallback={() => setView("fallback")}
            />
          )}

          {!isLoading && !error && preview && view === "skipped" && (
            <SkippedAdsView
              skippedAds={filteredSkippedAds}
              errorTypes={errorTypes}
              errorFilter={errorFilter}
              onErrorFilterChange={setErrorFilter}
              getErrorLabel={getErrorLabel}
            />
          )}

          {!isLoading && !error && preview && view === "fallback" && (
            <FallbackAdsView fallbackAds={preview.fallbackAds} />
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && preview && (
          <footer className={styles.footer}>
            {preview.breakdown.skipped > 0 && view === "summary" && (
              <button
                className={styles.secondaryButton}
                onClick={onBypass}
                type="button"
              >
                Sync Anyway
              </button>
            )}
            <button className={styles.cancelButton} onClick={onClose} type="button">
              Cancel
            </button>
            {preview.canProceed && (
              <button className={styles.primaryButton} onClick={onSync} type="button">
                <SyncIcon />
                Sync Now
              </button>
            )}
            {!preview.canProceed && (
              <button className={styles.primaryButton} onClick={onRevalidate} type="button">
                <RefreshIcon />
                Re-validate
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}

/**
 * Summary View - Shows breakdown of ad statuses
 */
function SummaryView({
  preview,
  campaignSetName,
  onViewSkipped,
  onViewFallback,
}: {
  preview: SyncPreviewResponse;
  campaignSetName: string;
  onViewSkipped: () => void;
  onViewFallback: () => void;
}) {
  return (
    <>
      <div className={styles.summaryHeader}>
        <h3 className={styles.campaignSetName}>{campaignSetName}</h3>
        <p className={styles.totalAds}>Total ads to process: {preview.totalAds}</p>
      </div>

      {/* Warnings */}
      {preview.warnings.length > 0 && (
        <div className={styles.warnings}>
          {preview.warnings.map((warning, index) => (
            <div key={index} className={styles.warning}>
              <WarningIcon />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Breakdown */}
      <div className={styles.breakdown}>
        <BreakdownItem
          icon={<CheckCircleIcon />}
          label="Valid"
          count={preview.breakdown.valid}
          color="green"
          description="Will sync successfully"
        />
        <BreakdownItem
          icon={<RefreshIcon />}
          label="Fallback"
          count={preview.breakdown.fallback}
          color="yellow"
          description="Will use fallback content"
          onClick={preview.breakdown.fallback > 0 ? onViewFallback : undefined}
        />
        <BreakdownItem
          icon={<SkipIcon />}
          label="Skipped"
          count={preview.breakdown.skipped}
          color="red"
          description="Will be skipped"
          onClick={preview.breakdown.skipped > 0 ? onViewSkipped : undefined}
        />
      </div>

      {/* Validation time */}
      <p className={styles.validationTime}>
        Validated in {preview.validationTimeMs}ms
      </p>
    </>
  );
}

/**
 * Breakdown Item Component
 */
function BreakdownItem({
  icon,
  label,
  count,
  color,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: "green" | "yellow" | "red";
  description: string;
  onClick?: () => void;
}) {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      className={styles.breakdownItem}
      data-color={color}
      onClick={onClick}
      type={onClick ? "button" : undefined}
      aria-label={onClick ? `View ${label.toLowerCase()} ads` : undefined}
    >
      <div className={styles.breakdownIcon}>{icon}</div>
      <div className={styles.breakdownContent}>
        <span className={styles.breakdownCount}>{count}</span>
        <span className={styles.breakdownLabel}>{label}</span>
        <span className={styles.breakdownDescription}>{description}</span>
      </div>
      {onClick && (
        <div className={styles.breakdownArrow}>
          <ChevronRightIcon />
        </div>
      )}
    </Component>
  );
}

/**
 * Skipped Ads View
 */
function SkippedAdsView({
  skippedAds,
  errorTypes,
  errorFilter,
  onErrorFilterChange,
  getErrorLabel,
}: {
  skippedAds: SkippedAdInfo[];
  errorTypes: string[];
  errorFilter: string;
  onErrorFilterChange: (filter: string) => void;
  getErrorLabel: (code: string) => string;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const totalPages = Math.ceil(skippedAds.length / pageSize);
  const paginatedAds = skippedAds.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className={styles.tableContainer}>
      {/* Filter */}
      <div className={styles.filterBar}>
        <label className={styles.filterLabel} htmlFor="error-filter">
          Filter by error type:
        </label>
        <select
          id="error-filter"
          className={styles.filterSelect}
          value={errorFilter}
          onChange={(e) => {
            onErrorFilterChange(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">All errors ({skippedAds.length})</option>
          {errorTypes.map((code) => (
            <option key={code} value={code}>
              {getErrorLabel(code)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ad Name</th>
            <th>Error Type</th>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {paginatedAds.map((ad) => (
            <tr key={ad.adId}>
              <td className={styles.adName}>
                <span className={styles.adNameText}>{ad.name}</span>
                {ad.productName && (
                  <span className={styles.productName}>{ad.productName}</span>
                )}
              </td>
              <td>
                <span className={styles.errorBadge} data-code={ad.errorCode}>
                  {getErrorLabel(ad.errorCode)}
                </span>
              </td>
              <td className={styles.fieldCell}>{ad.field}</td>
              <td className={styles.valueCell}>
                {ad.value !== undefined ? (
                  <span
                    className={styles.invalidValue}
                    title={String(ad.value)}
                  >
                    {String(ad.value).slice(0, 50)}
                    {String(ad.value).length > 50 && "..."}
                  </span>
                ) : (
                  <span className={styles.emptyValue}>-</span>
                )}
                {ad.expected && (
                  <span className={styles.expectedValue}>
                    Expected: {ad.expected}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationButton}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            type="button"
          >
            Previous
          </button>
          <span className={styles.paginationInfo}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            className={styles.paginationButton}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Fallback Ads View
 */
function FallbackAdsView({ fallbackAds }: { fallbackAds: FallbackAdInfo[] }) {
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const totalPages = Math.ceil(fallbackAds.length / pageSize);
  const paginatedAds = fallbackAds.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ad Name</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {paginatedAds.map((ad) => (
            <tr key={ad.adId}>
              <td className={styles.adName}>{ad.name}</td>
              <td className={styles.reasonCell}>{ad.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationButton}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            type="button"
          >
            Previous
          </button>
          <span className={styles.paginationInfo}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            className={styles.paginationButton}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// Icon components
function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 18a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 8a6 6 0 0110.89-3.477L14 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 8a6 6 0 01-10.89 3.477L2 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.5 3.5h3v3M4.5 12.5h-3v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 4l8 6-8 6V4zM14 4v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 5v4M8 11h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6.93 2.25a2 2 0 012.14 0l4.93 3.29a2 2 0 01.93 1.69v5.54a2 2 0 01-.93 1.69l-4.93 3.29a2 2 0 01-2.14 0l-4.93-3.29a2 2 0 01-.93-1.69V7.23a2 2 0 01.93-1.69l4.93-3.29z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 8C2 4.68629 4.68629 2 8 2C10.6 2 12.8 3.6 13.6 5.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 8C14 11.3137 11.3137 14 8 14C5.4 14 3.2 12.4 2.4 10.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 6H14V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10H2V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
