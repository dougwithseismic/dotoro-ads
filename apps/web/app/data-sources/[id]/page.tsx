"use client";

import { useState, useEffect, useCallback, useRef, useMemo, KeyboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DataPreviewEnhanced } from "../components/DataPreviewEnhanced";
import { ColumnMapperEnhanced } from "../components/ColumnMapperEnhanced";
import { ValidationPanel } from "../components/ValidationPanel";
import { ApiConfigPanel } from "../components/ApiConfigPanel";
import { GoogleSheetsConfigPanel } from "../components/GoogleSheetsConfigPanel";
import { SyncButton, type SyncButtonStatus } from "../components/SyncButton";
import type { DataSourceDetail, ColumnMapping, ValidationError, SyncStatus } from "../types";
import { api, ApiError } from "@/lib/api-client";
import styles from "./DataSourceDetail.module.css";

/** Polling interval for sync status (3 seconds) */
const SYNC_POLL_INTERVAL = 3000;

/** Data source types that support syncing */
const SYNCABLE_TYPES = ["api", "google-sheets"] as const;

/**
 * Toast notification state
 */
interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

/**
 * Checks if a data source type supports syncing
 */
function isSyncable(type: string): boolean {
  return (SYNCABLE_TYPES as readonly string[]).includes(type);
}

type TabId = "configuration" | "preview" | "mapping" | "validation";

interface Tab {
  id: TabId;
  label: string;
}

/** Base tabs shown for all data source types */
const BASE_TABS: Tab[] = [
  { id: "preview", label: "Preview" },
  { id: "mapping", label: "Mapping" },
  { id: "validation", label: "Validation" },
];

/** Configuration tab (only for api and google-sheets types) */
const CONFIG_TAB: Tab = { id: "configuration", label: "Configuration" };

/** Data source types that show the Configuration tab */
const TYPES_WITH_CONFIG = ["api", "google-sheets"] as const;

/**
 * Checks if a data source type requires a Configuration tab
 */
function hasConfigTab(type: string): boolean {
  return (TYPES_WITH_CONFIG as readonly string[]).includes(type);
}

export default function DataSourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [dataSource, setDataSource] = useState<DataSourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("preview");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterToRow, setFilterToRow] = useState<number | null>(null);

  // Sync-related state
  const [syncButtonStatus, setSyncButtonStatus] = useState<SyncButtonStatus>("idle");
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });

  // Poll error tracking for sync status
  const [pollErrorCount, setPollErrorCount] = useState(0);
  const MAX_POLL_ERRORS = 3;

  const nameInputRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusRevertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Compute tabs based on data source type
   * - API and Google Sheets types get a Configuration tab first
   * - All types get Preview, Mapping, and Validation tabs
   */
  const tabs = useMemo<Tab[]>(() => {
    if (!dataSource) return BASE_TABS;

    if (hasConfigTab(dataSource.type)) {
      return [CONFIG_TAB, ...BASE_TABS];
    }

    return BASE_TABS;
  }, [dataSource]);

  const fetchDataSource = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.get<DataSourceDetail>(`/api/v1/data-sources/${id}`);
      setDataSource(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("Data source not found");
      } else {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDataSource();
  }, [fetchDataSource]);

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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (statusRevertTimeoutRef.current) {
        clearTimeout(statusRevertTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Check if we should poll for sync status
   */
  const shouldPoll = useMemo(() => {
    if (!dataSource) return false;
    return dataSource.syncStatus === "syncing" || syncButtonStatus === "syncing";
  }, [dataSource, syncButtonStatus]);

  /**
   * Polling effect for sync status
   * Polls every 3 seconds while syncing, stops when complete or error
   */
  useEffect(() => {
    if (shouldPoll) {
      // Start polling
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(async () => {
          try {
            const data = await api.get<DataSourceDetail>(`/api/v1/data-sources/${id}`);
            setDataSource(data);
            // Reset poll error count on successful poll
            setPollErrorCount(0);

            // Stop polling if sync is complete or errored
            if (data.syncStatus !== "syncing") {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              // Update button status based on sync result
              if (data.syncStatus === "success") {
                setSyncButtonStatus("success");
                showToast("Sync complete", "success");
              } else if (data.syncStatus === "error") {
                setSyncButtonStatus("error");
                showToast("Sync failed", "error");
              }
            }
          } catch (err) {
            console.error('Sync status poll failed:', err);
            setPollErrorCount(prev => {
              const newCount = prev + 1;
              if (newCount >= MAX_POLL_ERRORS && pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
                setSyncButtonStatus("error");
                showToast("Unable to check sync status. Please refresh the page.", "error");
              }
              return newCount;
            });
          }
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
  }, [shouldPoll, id, showToast]);

  /**
   * Handle sync button click
   */
  const handleSync = useCallback(async () => {
    if (!dataSource || syncButtonStatus === "syncing") return;

    setSyncButtonStatus("syncing");

    try {
      await api.post(`/api/v1/data-sources/${id}/sync`, {});

      // Fetch updated data source to get new sync status
      const updatedData = await api.get<DataSourceDetail>(`/api/v1/data-sources/${id}`);
      setDataSource(updatedData);

      // If sync completed immediately
      if (updatedData.syncStatus === "success") {
        setSyncButtonStatus("success");
        showToast("Sync complete", "success");
        // Revert to idle after 3 seconds
        if (statusRevertTimeoutRef.current) {
          clearTimeout(statusRevertTimeoutRef.current);
        }
        statusRevertTimeoutRef.current = setTimeout(() => {
          setSyncButtonStatus("idle");
        }, 3000);
      } else if (updatedData.syncStatus === "error") {
        setSyncButtonStatus("error");
        showToast("Sync failed", "error");
      }
      // If still syncing, polling will handle status updates
    } catch (err) {
      setSyncButtonStatus("error");
      const errorMessage = err instanceof Error ? err.message : "Sync failed";
      showToast(`Sync failed: ${errorMessage}`, "error");
    }
  }, [dataSource, syncButtonStatus, id, showToast]);

  /**
   * Format last synced time as relative or absolute
   */
  const formatLastSynced = useCallback((date: Date | undefined | null): string => {
    if (!date) return "Never synced";

    const syncDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "Last synced just now";
    if (diffMinutes < 60) return `Last synced ${diffMinutes}m ago`;
    if (diffHours < 24) return `Last synced ${diffHours}h ago`;
    if (diffDays < 7) return `Last synced ${diffDays}d ago`;

    return `Last synced ${syncDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  }, []);

  /**
   * Map backend sync status to button status
   */
  const getButtonStatus = useCallback((): SyncButtonStatus => {
    // Local status takes precedence during actions
    if (syncButtonStatus === "syncing") return "syncing";

    // Otherwise use backend status
    const backendStatus = dataSource?.syncStatus;
    if (backendStatus === "syncing") return "syncing";
    if (backendStatus === "success") return "success";
    if (backendStatus === "error") return "error";

    return "idle";
  }, [syncButtonStatus, dataSource?.syncStatus]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleMappingChange = (mappings: ColumnMapping[]) => {
    if (!dataSource) return;

    setDataSource({
      ...dataSource,
      columnMappings: mappings,
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!dataSource || !hasChanges) return;

    try {
      setSaving(true);
      setError(null);

      const updated = await api.put<DataSourceDetail>(`/api/v1/data-sources/${id}`, {
        columnMappings: dataSource.columnMappings,
      });

      setDataSource(updated);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditName = () => {
    if (!dataSource) return;
    setEditedName(dataSource.name);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!dataSource || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }

    if (editedName === dataSource.name) {
      setIsEditingName(false);
      return;
    }

    setError(null);

    try {
      await api.patch(`/api/v1/data-sources/${id}`, { name: editedName });
      setDataSource({ ...dataSource, name: editedName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
    }
  };

  const handleDelete = async () => {
    if (!dataSource) return;

    setError(null);

    try {
      setDeleting(true);
      await api.delete(`/api/v1/data-sources/${id}`);
      router.push("/data-sources");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setShowDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    setFilterToRow(null);
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let newIndex = currentIndex;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      newIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      newIndex = tabs.length - 1;
    } else {
      return;
    }

    const newTab = tabs[newIndex];
    if (newTab) {
      setActiveTab(newTab.id);
      tabRefs.current.get(newTab.id)?.focus();
    }
  };

  const handleValidationErrorClick = (error: ValidationError) => {
    setFilterToRow(error.row);
    setActiveTab("preview");
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Loading data source...</span>
        </div>
      </div>
    );
  }

  if (error && !dataSource) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <div className={styles.errorActions}>
            <button onClick={fetchDataSource} className={styles.retryButton}>
              Try Again
            </button>
            <Link href="/data-sources" className={styles.backLink}>
              Back to Data Sources
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!dataSource) {
    return null;
  }

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
        <div className={styles.breadcrumb}>
          <Link href="/data-sources" className={styles.breadcrumbLink}>
            Data Sources
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbCurrent}>{dataSource.name}</span>
        </div>

        <div className={styles.headerMain}>
          <div className={styles.headerContent}>
            <div className={styles.titleRow}>
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={handleNameKeyDown}
                  className={styles.titleInput}
                  aria-label="Data source name"
                />
              ) : (
                <h1 className={styles.title}>{dataSource.name}</h1>
              )}
              {!isEditingName && (
                <button
                  onClick={handleStartEditName}
                  className={styles.editNameButton}
                  aria-label="Edit name"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11.5 2.5L13.5 4.5M2 14H4L12.5 5.5C13.0523 4.94772 13.0523 4.05228 12.5 3.5L12.5 3.5C11.9477 2.94772 11.0523 2.94772 10.5 3.5L2 12V14Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div className={styles.meta}>
              <span className={`${styles.typeBadge} ${styles[dataSource.type]}`}>
                {dataSource.type.toUpperCase()}
              </span>
              {/* Sync status badge - only for syncable types */}
              {isSyncable(dataSource.type) && (
                <span
                  className={`${styles.syncStatusBadge} ${styles[`syncStatus-${dataSource.syncStatus || "idle"}`]}`}
                  data-testid="sync-status-badge"
                  data-status={dataSource.syncStatus || "idle"}
                  role="status"
                  aria-live="polite"
                >
                  {dataSource.syncStatus === "syncing" && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={styles.syncStatusSpinner}
                      aria-hidden="true"
                    >
                      <circle
                        cx="6"
                        cy="6"
                        r="4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeDasharray="18"
                        strokeDashoffset="9"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {dataSource.syncStatus === "success" && "Synced"}
                  {dataSource.syncStatus === "syncing" && "Syncing"}
                  {dataSource.syncStatus === "error" && "Sync Error"}
                  {(!dataSource.syncStatus || dataSource.syncStatus === "synced") && "Ready"}
                </span>
              )}
              <span className={styles.metaItem}>
                {(dataSource.rowCount ?? 0).toLocaleString()} rows
              </span>
              <span className={styles.metaItem}>
                Updated {formatDate(dataSource.updatedAt)}
              </span>
              {/* Last synced timestamp - only for syncable types */}
              {isSyncable(dataSource.type) && (
                <span className={styles.metaItem}>
                  {formatLastSynced(dataSource.lastSyncedAt)}
                </span>
              )}
            </div>
          </div>

          <div className={styles.headerActions}>
            {/* Sync button - only for API and Google Sheets types */}
            {isSyncable(dataSource.type) && (
              <SyncButton
                dataSourceId={id}
                status={getButtonStatus()}
                dataSourceType={dataSource.type as "api" | "google-sheets"}
                onSync={handleSync}
              />
            )}

            <button
              onClick={() => setShowDeleteDialog(true)}
              className={styles.deleteButton}
              aria-label="Delete data source"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 4H14M5.333 4V2.667C5.333 2.298 5.632 2 6 2H10C10.368 2 10.667 2.298 10.667 2.667V4M12.667 4V13.333C12.667 13.702 12.368 14 12 14H4C3.632 14 3.333 13.702 3.333 13.333V4H12.667Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Delete
            </button>

            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                className={styles.saveButton}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className={styles.inlineError} role="alert">
          {error}
          <button
            onClick={() => setError(null)}
            className={styles.dismissError}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div
        className={styles.tabList}
        role="tablist"
        aria-label="Data source sections"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ""}`}
            onClick={() => handleTabClick(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, index)}
          >
            {tab.label}
            {tab.id === "validation" && dataSource.validationErrors && dataSource.validationErrors.length > 0 && (
              <span className={styles.tabBadge}>
                {dataSource.validationErrors.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className={styles.content}>
        {/* Configuration Panel - only for API and Google Sheets types */}
        {hasConfigTab(dataSource.type) && (
          <div
            role="tabpanel"
            id="tabpanel-configuration"
            aria-labelledby="tab-configuration"
            hidden={activeTab !== "configuration"}
            className={styles.tabPanel}
          >
            {activeTab === "configuration" && (
              <>
                {dataSource.type === "api" && dataSource.config?.apiFetch && (
                  <ApiConfigPanel
                    config={dataSource.config.apiFetch}
                    dataSourceId={id}
                    onConfigUpdate={() => fetchDataSource()}
                  />
                )}
                {dataSource.type === "google-sheets" && dataSource.config?.googleSheets && (
                  <GoogleSheetsConfigPanel
                    config={dataSource.config.googleSheets}
                    dataSourceId={id}
                    onConfigUpdate={() => fetchDataSource()}
                  />
                )}
              </>
            )}
          </div>
        )}

        <div
          role="tabpanel"
          id="tabpanel-preview"
          aria-labelledby="tab-preview"
          hidden={activeTab !== "preview"}
          className={styles.tabPanel}
        >
          {activeTab === "preview" && (
            <DataPreviewEnhanced
              columns={dataSource.columns || []}
              data={dataSource.data}
              columnMappings={dataSource.columnMappings}
              highlightRow={filterToRow}
              onClearHighlight={() => setFilterToRow(null)}
            />
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-mapping"
          aria-labelledby="tab-mapping"
          hidden={activeTab !== "mapping"}
          className={styles.tabPanel}
        >
          {activeTab === "mapping" && (
            <ColumnMapperEnhanced
              mappings={dataSource.columnMappings}
              onChange={handleMappingChange}
              disabled={dataSource.status === "processing"}
            />
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-validation"
          aria-labelledby="tab-validation"
          hidden={activeTab !== "validation"}
          className={styles.tabPanel}
        >
          {activeTab === "validation" && (
            <ValidationPanel
              errors={dataSource.validationErrors || []}
              onErrorClick={handleValidationErrorClick}
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div
          className={styles.dialogOverlay}
          onClick={() => setShowDeleteDialog(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className={styles.dialog}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-dialog-title" className={styles.dialogTitle}>
              Delete Data Source
            </h2>
            <p className={styles.dialogMessage}>
              Are you sure you want to delete &quot;{dataSource.name}&quot;? This action cannot be undone.
            </p>
            <div className={styles.dialogActions}>
              <button
                onClick={() => setShowDeleteDialog(false)}
                className={styles.cancelButton}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className={styles.confirmDeleteButton}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
