/**
 * ApiConfigPanel - Display and edit API data source configuration
 *
 * Shows API fetch configuration details including:
 * - Endpoint URL and HTTP method
 * - Authentication type and credentials
 * - Headers (key-value pairs)
 * - Sync frequency
 * - Last sync status and timing
 *
 * Supports edit mode when dataSourceId is provided
 */

import { useState, useCallback, useMemo } from "react";
import type { ApiFetchConfig, SyncFrequency, ApiAuthType } from "../types";
import styles from "./ConfigPanel.module.css";

interface ApiConfigPanelProps {
  config: ApiFetchConfig;
  /** Data source ID - required for edit mode */
  dataSourceId?: string;
  /** Callback when config is successfully updated */
  onConfigUpdate?: (newConfig: ApiFetchConfig) => void;
}

/** Form state for editing API config */
interface EditFormState {
  url: string;
  method: "GET" | "POST";
  authType: ApiAuthType;
  authCredentials: string;
  syncFrequency: SyncFrequency;
  headers: Array<{ key: string; value: string }>;
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
 * Formats authentication type for display
 */
function formatAuthType(authType: string | undefined): string {
  if (!authType || authType === "none") return "None";
  const authMap: Record<string, string> = {
    bearer: "Bearer Token",
    "api-key": "API Key",
    basic: "Basic Auth",
  };
  return authMap[authType] || authType;
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
 * Converts headers object to array format for editing
 */
function headersToArray(headers?: Record<string, string>): Array<{ key: string; value: string }> {
  if (!headers) return [];
  return Object.entries(headers).map(([key, value]) => ({ key, value }));
}

/**
 * Converts headers array back to object format
 */
function headersToObject(headers: Array<{ key: string; value: string }>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const { key, value } of headers) {
    if (key.trim()) {
      result[key.trim()] = value;
    }
  }
  return result;
}

/**
 * Validates a URL string
 */
function isValidUrl(url: string): boolean {
  if (!url.trim()) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the label for auth credentials based on auth type
 */
function getAuthCredentialsLabel(authType: ApiAuthType): string {
  switch (authType) {
    case "bearer":
      return "Bearer Token";
    case "api-key":
      return "API Key";
    case "basic":
      return "Credentials";
    default:
      return "Credentials";
  }
}

export function ApiConfigPanel({ config, dataSourceId, onConfigUpdate }: ApiConfigPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Current displayed config (updated after successful save)
  const [displayConfig, setDisplayConfig] = useState<ApiFetchConfig>(config);

  // Form state for editing
  const [formState, setFormState] = useState<EditFormState>(() => ({
    url: config.url,
    method: config.method,
    authType: config.authType || "none",
    authCredentials: config.authCredentials || "",
    syncFrequency: config.syncFrequency,
    headers: headersToArray(config.headers),
  }));

  /**
   * Initialize form state from current config
   */
  const initFormState = useCallback(() => {
    setFormState({
      url: displayConfig.url,
      method: displayConfig.method,
      authType: displayConfig.authType || "none",
      authCredentials: displayConfig.authCredentials || "",
      syncFrequency: displayConfig.syncFrequency,
      headers: headersToArray(displayConfig.headers),
    });
    setUrlError(null);
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
    setUrlError(null);
    initFormState();
  }, [initFormState]);

  /**
   * Validate form before saving
   */
  const isFormValid = useMemo(() => {
    return formState.url.trim() !== "" && isValidUrl(formState.url);
  }, [formState.url]);

  /**
   * Handle URL input blur to validate
   */
  const handleUrlBlur = useCallback(() => {
    if (formState.url.trim() && !isValidUrl(formState.url)) {
      setUrlError("Please enter a valid URL");
    } else {
      setUrlError(null);
    }
  }, [formState.url]);

  /**
   * Handle saving changes
   */
  const handleSave = useCallback(async () => {
    if (!dataSourceId || !isFormValid) return;

    setIsSaving(true);
    setError(null);

    try {
      const updatedConfig: Partial<ApiFetchConfig> = {
        url: formState.url,
        method: formState.method,
        authType: formState.authType,
        authCredentials: formState.authType !== "none" ? formState.authCredentials : undefined,
        syncFrequency: formState.syncFrequency,
        headers: headersToObject(formState.headers),
      };

      const response = await fetch(`/api/v1/data-sources/${dataSourceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config: { apiFetch: updatedConfig } }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update configuration");
      }

      // Update display config
      const newConfig: ApiFetchConfig = {
        ...displayConfig,
        ...updatedConfig,
      };
      setDisplayConfig(newConfig);
      setIsEditing(false);

      // Call the callback if provided
      onConfigUpdate?.(newConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  }, [dataSourceId, isFormValid, formState, displayConfig, onConfigUpdate]);

  /**
   * Handle adding a new header
   */
  const handleAddHeader = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      headers: [...prev.headers, { key: "", value: "" }],
    }));
  }, []);

  /**
   * Handle removing a header
   */
  const handleRemoveHeader = useCallback((index: number) => {
    setFormState((prev) => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index),
    }));
  }, []);

  /**
   * Handle updating a header
   */
  const handleHeaderChange = useCallback(
    (index: number, field: "key" | "value", value: string) => {
      setFormState((prev) => ({
        ...prev,
        headers: prev.headers.map((header, i) =>
          i === index ? { ...header, [field]: value } : header
        ),
      }));
    },
    []
  );

  // Render edit mode
  if (isEditing) {
    return (
      <div className={styles.panel}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>API Configuration</h2>
        </div>

        {error && (
          <div className={styles.errorAlert} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <form className={styles.editForm} onSubmit={(e) => e.preventDefault()}>
          {/* Endpoint Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Endpoint</h3>
            <div className={styles.formGroup}>
              <label htmlFor="api-url" className={styles.formLabel}>
                Endpoint URL
              </label>
              <input
                id="api-url"
                type="url"
                className={`${styles.formInput} ${urlError ? styles.inputError : ""}`}
                value={formState.url}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, url: e.target.value }))
                }
                onBlur={handleUrlBlur}
                placeholder="https://api.example.com/data"
              />
              {urlError && <span className={styles.fieldError}>{urlError}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="api-method" className={styles.formLabel}>
                HTTP Method
              </label>
              <select
                id="api-method"
                className={styles.formSelect}
                value={formState.method}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    method: e.target.value as "GET" | "POST",
                  }))
                }
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
          </div>

          {/* Authentication Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Authentication</h3>
            <div className={styles.formGroup}>
              <label htmlFor="api-auth-type" className={styles.formLabel}>
                Authentication Type
              </label>
              <select
                id="api-auth-type"
                className={styles.formSelect}
                value={formState.authType}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    authType: e.target.value as ApiAuthType,
                  }))
                }
              >
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="api-key">API Key</option>
                <option value="basic">Basic Auth</option>
              </select>
            </div>

            {formState.authType !== "none" && (
              <div className={styles.formGroup}>
                <label htmlFor="api-auth-credentials" className={styles.formLabel}>
                  {getAuthCredentialsLabel(formState.authType)}
                </label>
                <input
                  id="api-auth-credentials"
                  type="password"
                  className={styles.formInput}
                  value={formState.authCredentials}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      authCredentials: e.target.value,
                    }))
                  }
                  placeholder={`Enter ${getAuthCredentialsLabel(formState.authType).toLowerCase()}`}
                />
              </div>
            )}
          </div>

          {/* Headers Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Headers</h3>
            <div className={styles.headersContainer}>
              {formState.headers.map((header, index) => (
                <div key={index} className={styles.headerRow}>
                  <input
                    type="text"
                    className={styles.headerInput}
                    value={header.key}
                    onChange={(e) => handleHeaderChange(index, "key", e.target.value)}
                    placeholder="Header name"
                    aria-label={`Header ${index + 1} name`}
                  />
                  <input
                    type="text"
                    className={styles.headerInput}
                    value={header.value}
                    onChange={(e) => handleHeaderChange(index, "value", e.target.value)}
                    placeholder="Header value"
                    aria-label={`Header ${index + 1} value`}
                  />
                  <button
                    type="button"
                    className={styles.removeHeaderButton}
                    onClick={() => handleRemoveHeader(index)}
                    aria-label="Remove header"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 4L4 12M4 4L12 12"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.addHeaderButton}
                onClick={handleAddHeader}
              >
                + Add Header
              </button>
            </div>
          </div>

          {/* Sync Settings Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Sync Settings</h3>
            <div className={styles.formGroup}>
              <label htmlFor="api-sync-frequency" className={styles.formLabel}>
                Sync Frequency
              </label>
              <select
                id="api-sync-frequency"
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
        <h2 className={styles.title}>API Configuration</h2>
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
        <h3 className={styles.sectionTitle}>Endpoint</h3>
        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <span className={styles.label}>URL</span>
            <span className={styles.value}>{displayConfig.url}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Method</span>
            <span className={styles.methodBadge}>{displayConfig.method}</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Authentication</h3>
        <div className={styles.field}>
          <span className={styles.label}>Type</span>
          <span className={styles.value}>{formatAuthType(displayConfig.authType)}</span>
        </div>
        {displayConfig.headers && Object.keys(displayConfig.headers).length > 0 && (
          <div className={styles.field}>
            <span className={styles.label}>Custom Headers</span>
            <span className={styles.value}>
              {Object.keys(displayConfig.headers).length} header(s) configured
            </span>
          </div>
        )}
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
                  displayConfig.lastSyncStatus === "success" || displayConfig.lastSyncStatus === "synced"
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
          {displayConfig.lastSyncDuration !== undefined && (
            <div className={styles.field}>
              <span className={styles.label}>Duration</span>
              <span className={styles.value}>{displayConfig.lastSyncDuration}ms</span>
            </div>
          )}
        </div>
      </div>

      {displayConfig.flattenConfig && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Data Processing</h3>
          <div className={styles.fieldGroup}>
            {displayConfig.flattenConfig.dataPath && (
              <div className={styles.field}>
                <span className={styles.label}>Data Path</span>
                <code className={styles.code}>{displayConfig.flattenConfig.dataPath}</code>
              </div>
            )}
            <div className={styles.field}>
              <span className={styles.label}>Array Handling</span>
              <span className={styles.value}>{displayConfig.flattenConfig.arrayHandling}</span>
            </div>
            {displayConfig.flattenConfig.maxDepth !== undefined && (
              <div className={styles.field}>
                <span className={styles.label}>Max Depth</span>
                <span className={styles.value}>{displayConfig.flattenConfig.maxDepth}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
