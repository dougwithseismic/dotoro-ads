/**
 * GoogleSheetsConfigPanel - Display and edit Google Sheets data source configuration
 *
 * Shows Google Sheets configuration details including:
 * - Spreadsheet name and sheet/tab name
 * - Header row configuration
 * - Sync frequency
 * - Last sync status and timing
 *
 * Supports edit mode when dataSourceId is provided.
 * Note: Spreadsheet cannot be changed (would require re-connecting),
 * but sheet name, header row, and sync frequency can be edited.
 */

import { useState, useCallback, useMemo } from "react";
import type { GoogleSheetsConfig, SyncFrequency } from "../types";
import { api, ApiError } from "@/lib/api-client";
import styles from "./ConfigPanel.module.css";

interface GoogleSheetsConfigPanelProps {
  config: GoogleSheetsConfig;
  /** Data source ID - required for edit mode */
  dataSourceId?: string;
  /** Callback when config is successfully updated */
  onConfigUpdate?: (newConfig: GoogleSheetsConfig) => void;
}

/** Form state for editing Google Sheets config */
interface EditFormState {
  sheetName: string;
  headerRow: number;
  syncFrequency: SyncFrequency;
}

/**
 * Formats sync frequency for human-readable display
 */
function formatSyncFrequency(freq: SyncFrequency): string {
  const frequencyMap: Record<SyncFrequency, string> = {
    manual: "Manual only",
    hourly: "Every hour",
    daily: "Every day",
    weekly: "Every week",
    "1h": "Every 1 hour",
    "6h": "Every 6 hours",
    "24h": "Every 24 hours",
    "7d": "Every 7 days",
  };
  return frequencyMap[freq] || freq;
}

/**
 * Formats date for display
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "Never";
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid date";
  }
}

/**
 * Validates header row value
 */
function isValidHeaderRow(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}

export function GoogleSheetsConfigPanel({
  config,
  dataSourceId,
  onConfigUpdate,
}: GoogleSheetsConfigPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerRowError, setHeaderRowError] = useState<string | null>(null);

  // Current displayed config (updated after successful save)
  const [displayConfig, setDisplayConfig] = useState<GoogleSheetsConfig>(config);

  // Form state for editing
  const [formState, setFormState] = useState<EditFormState>(() => ({
    sheetName: config.sheetName ?? "",
    headerRow: config.headerRow ?? 1,
    syncFrequency: config.syncFrequency ?? "manual",
  }));

  /**
   * Initialize form state from current config
   */
  const initFormState = useCallback(() => {
    setFormState({
      sheetName: displayConfig.sheetName ?? "",
      headerRow: displayConfig.headerRow ?? 1,
      syncFrequency: displayConfig.syncFrequency ?? "manual",
    });
    setHeaderRowError(null);
    setError(null);
  }, [displayConfig]);

  /**
   * Handle entering edit mode
   */
  const handleEdit = useCallback(() => {
    initFormState();
    setIsEditing(true);
  }, [initFormState]);

  /**
   * Handle canceling edit mode
   */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setError(null);
    setHeaderRowError(null);
    initFormState();
  }, [initFormState]);

  /**
   * Validate form before saving
   */
  const isFormValid = useMemo(() => {
    return formState.sheetName.trim() !== "" && isValidHeaderRow(formState.headerRow);
  }, [formState.sheetName, formState.headerRow]);

  /**
   * Handle header row input blur to validate
   */
  const handleHeaderRowBlur = useCallback(() => {
    if (!isValidHeaderRow(formState.headerRow)) {
      setHeaderRowError("Please enter a positive number (1 or greater)");
    } else {
      setHeaderRowError(null);
    }
  }, [formState.headerRow]);

  /**
   * Handle saving changes
   */
  const handleSave = useCallback(async () => {
    if (!dataSourceId || !isFormValid) return;

    setIsSaving(true);
    setError(null);

    try {
      const updatedConfig: Partial<GoogleSheetsConfig> = {
        sheetName: formState.sheetName,
        headerRow: formState.headerRow,
        syncFrequency: formState.syncFrequency,
      };

      await api.patch(`/api/v1/data-sources/${dataSourceId}`, {
        config: { googleSheets: updatedConfig },
      });

      // Update display config
      const newConfig: GoogleSheetsConfig = {
        ...displayConfig,
        ...updatedConfig,
      };
      setDisplayConfig(newConfig);
      setIsEditing(false);

      // Call the callback if provided
      onConfigUpdate?.(newConfig);
    } catch (err) {
      if (err instanceof ApiError) {
        const errorData = err.data as { error?: string } | null;
        setError(errorData?.error || "Failed to update configuration");
      } else {
        setError(err instanceof Error ? err.message : "An error occurred while saving");
      }
    } finally {
      setIsSaving(false);
    }
  }, [dataSourceId, isFormValid, formState, displayConfig, onConfigUpdate]);

  // Render edit mode
  if (isEditing) {
    return (
      <div className={styles.panel}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>Google Sheets Configuration</h2>
        </div>

        {error && (
          <div className={styles.errorAlert} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <form className={styles.editForm} onSubmit={(e) => e.preventDefault()}>
          {/* Spreadsheet Section (Read-only) */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Spreadsheet</h3>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <span className={styles.label}>Spreadsheet</span>
                <span className={styles.value}>{displayConfig.spreadsheetName}</span>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="sheets-sheet-name" className={styles.formLabel}>
                  Sheet Name
                </label>
                <input
                  id="sheets-sheet-name"
                  type="text"
                  className={styles.formInput}
                  value={formState.sheetName}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, sheetName: e.target.value }))
                  }
                  placeholder="Sheet1"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="sheets-header-row" className={styles.formLabel}>
                  Header Row
                </label>
                <input
                  id="sheets-header-row"
                  type="number"
                  min="1"
                  className={`${styles.formInput} ${headerRowError ? styles.inputError : ""}`}
                  value={formState.headerRow}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      headerRow: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  onBlur={handleHeaderRowBlur}
                />
                {headerRowError && <span className={styles.fieldError}>{headerRowError}</span>}
              </div>
            </div>
          </div>

          {/* Sync Settings Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Sync Settings</h3>
            <div className={styles.formGroup}>
              <label htmlFor="sheets-sync-frequency" className={styles.formLabel}>
                Sync Frequency
              </label>
              <select
                id="sheets-sync-frequency"
                className={styles.formSelect}
                value={formState.syncFrequency}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    syncFrequency: e.target.value as SyncFrequency,
                  }))
                }
              >
                <option value="manual">Manual only</option>
                <option value="1h">Every 1 hour</option>
                <option value="6h">Every 6 hours</option>
                <option value="24h">Every 24 hours</option>
                <option value="7d">Every 7 days</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSave}
              disabled={isSaving || !isFormValid}
              aria-busy={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Render read-only mode
  return (
    <div className={styles.panel}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>Google Sheets Configuration</h2>
        {dataSourceId && (
          <button
            type="button"
            className={styles.editButton}
            onClick={handleEdit}
            aria-label="Edit configuration"
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
            Edit
          </button>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Spreadsheet</h3>
        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <span className={styles.label}>Spreadsheet</span>
            <span className={styles.value}>{displayConfig.spreadsheetName}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Sheet</span>
            <span className={styles.value}>{displayConfig.sheetName}</span>
          </div>
          {displayConfig.headerRow !== undefined && (
            <div className={styles.field}>
              <span className={styles.label}>Header Row</span>
              <span className={styles.value}>Row {displayConfig.headerRow}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Sync Settings</h3>
        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <span className={styles.label}>Frequency</span>
            <span className={styles.value}>
              {formatSyncFrequency(displayConfig.syncFrequency)}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Last Synced</span>
            <span className={styles.value}>{formatDate(displayConfig.lastSyncAt)}</span>
          </div>
          {displayConfig.lastSyncStatus && (
            <div className={styles.field}>
              <span className={styles.label}>Status</span>
              <span
                className={`${styles.statusBadge} ${
                  displayConfig.lastSyncStatus === "success" ||
                  displayConfig.lastSyncStatus === "synced"
                    ? styles.statusSuccess
                    : displayConfig.lastSyncStatus === "error"
                    ? styles.statusError
                    : styles.statusSyncing
                }`}
              >
                {displayConfig.lastSyncStatus}
              </span>
            </div>
          )}
          {displayConfig.lastSyncError && (
            <div className={styles.field}>
              <span className={styles.label}>Error</span>
              <span className={styles.errorText}>{displayConfig.lastSyncError}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Connection</h3>
        <div className={styles.field}>
          <span className={styles.label}>Spreadsheet ID</span>
          <code className={styles.code}>{displayConfig.spreadsheetId}</code>
        </div>
      </div>
    </div>
  );
}
