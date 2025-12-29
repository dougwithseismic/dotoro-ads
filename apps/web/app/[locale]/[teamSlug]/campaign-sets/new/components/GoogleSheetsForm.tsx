"use client";

import { useState, useEffect, useCallback, useRef, useMemo, useId } from "react";
import { api } from "@/lib/api-client";
import type { GoogleSheetsConfig, SyncFrequency } from "@/app/[locale]/[teamSlug]/data-sources/types";
import styles from "./GoogleSheetsForm.module.css";

// Re-export the canonical type for consumers
export type { GoogleSheetsConfig } from "@/app/[locale]/[teamSlug]/data-sources/types";

interface GoogleSheetsFormProps {
  onSubmit: (name: string, config: GoogleSheetsConfig) => Promise<void>;
  onCancel: () => void;
  isConnected: boolean;
  onConnect: () => void;
  isConnecting?: boolean;
  /** User ID for Google API calls - required for fetching spreadsheets */
  userId?: string;
}

interface Spreadsheet {
  id: string;
  name: string;
  modifiedTime: string; // ISO 8601 timestamp
}

type SortOption = "recent" | "name";

/**
 * Format a date as relative time (e.g., "2 days ago", "3 weeks ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return date.toLocaleDateString();
}

interface Sheet {
  sheetId: number;
  title: string;
  index: number;
}

interface PreviewData {
  headers: string[];
  rows: Record<string, unknown>[];
}

const SYNC_FREQUENCY_OPTIONS: { value: SyncFrequency; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "1h", label: "Every hour" },
  { value: "6h", label: "Every 6 hours" },
  { value: "24h", label: "Daily" },
  { value: "7d", label: "Weekly" },
];

export function GoogleSheetsForm({
  onSubmit,
  onCancel,
  isConnected,
  onConnect,
  isConnecting = false,
  userId,
}: GoogleSheetsFormProps) {
  // Form state
  const [name, setName] = useState("");
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState("");
  const [selectedSpreadsheetName, setSelectedSpreadsheetName] = useState("");
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>("manual");
  const [headerRow, setHeaderRow] = useState(1);

  // Data state
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  // Loading and error state
  const [loadingSpreadsheets, setLoadingSpreadsheets] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Combobox state for spreadsheet selector
  const [spreadsheetOpen, setSpreadsheetOpen] = useState(false);
  const [spreadsheetSearch, setSpreadsheetSearch] = useState("");
  const [spreadsheetHighlight, setSpreadsheetHighlight] = useState(-1);
  const [spreadsheetSort, setSpreadsheetSort] = useState<SortOption>("recent");
  const spreadsheetInputRef = useRef<HTMLInputElement>(null);
  const spreadsheetContainerRef = useRef<HTMLDivElement>(null);

  // Combobox state for sheet selector
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSearch, setSheetSearch] = useState("");
  const [sheetHighlight, setSheetHighlight] = useState(-1);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const sheetContainerRef = useRef<HTMLDivElement>(null);

  // Generate stable IDs for accessibility
  const baseId = useId();
  const spreadsheetListboxId = `spreadsheet-listbox${baseId}`;
  const sheetListboxId = `sheet-listbox${baseId}`;

  // Load spreadsheets when connected
  const fetchSpreadsheets = useCallback(async () => {
    if (!isConnected || !userId) return;

    try {
      setLoadingSpreadsheets(true);
      setError(null);
      const response = await api.get<{ spreadsheets: Spreadsheet[] }>(
        "/api/v1/google/spreadsheets",
        { headers: { "X-User-Id": userId } }
      );
      setSpreadsheets(response.spreadsheets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load spreadsheets");
    } finally {
      setLoadingSpreadsheets(false);
    }
  }, [isConnected, userId]);

  useEffect(() => {
    fetchSpreadsheets();
  }, [fetchSpreadsheets]);

  // Load sheets when spreadsheet is selected
  const fetchSheets = useCallback(async (spreadsheetId: string) => {
    if (!spreadsheetId || !userId) return;

    try {
      setLoadingSheets(true);
      setError(null);
      const response = await api.get<{ sheets: Sheet[] }>(
        `/api/v1/google/spreadsheets/${spreadsheetId}/sheets`,
        { headers: { "X-User-Id": userId } }
      );
      setSheets(response.sheets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sheets");
    } finally {
      setLoadingSheets(false);
    }
  }, [userId]);

  // Load preview when sheet is selected
  const fetchPreview = useCallback(
    async (spreadsheetId: string, sheetName: string, headerRowNum: number) => {
      if (!spreadsheetId || !sheetName || !userId) return;

      try {
        setLoadingPreview(true);
        setError(null);
        const response = await api.get<{
          data: Record<string, unknown>[];
          columns: string[];
          rowCount: number;
        }>(
          `/api/v1/google/spreadsheets/${spreadsheetId}/sheets/${encodeURIComponent(sheetName)}/data?headerRow=${headerRowNum}`,
          { headers: { "X-User-Id": userId } }
        );
        setPreview({
          headers: response.columns ?? [],
          rows: response.data ?? [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load preview");
      } finally {
        setLoadingPreview(false);
      }
    },
    [userId]
  );

  // Filter and sort spreadsheets
  const filteredSpreadsheets = useMemo(() => {
    let result = spreadsheets;

    // Filter by search query
    if (spreadsheetSearch.trim()) {
      const query = spreadsheetSearch.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(query));
    }

    // Sort
    if (spreadsheetSort === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }
    // "recent" sort is already applied by the API (modifiedTime desc)

    return result;
  }, [spreadsheets, spreadsheetSearch, spreadsheetSort]);

  // Filter sheets based on search
  const filteredSheets = useMemo(() => {
    if (!sheetSearch.trim()) return sheets;
    const query = sheetSearch.toLowerCase();
    return sheets.filter((s) => s.title.toLowerCase().includes(query));
  }, [sheets, sheetSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!spreadsheetOpen && !sheetOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        spreadsheetOpen &&
        spreadsheetContainerRef.current &&
        !spreadsheetContainerRef.current.contains(e.target as Node)
      ) {
        setSpreadsheetOpen(false);
        setSpreadsheetSearch("");
        setSpreadsheetHighlight(-1);
      }
      if (
        sheetOpen &&
        sheetContainerRef.current &&
        !sheetContainerRef.current.contains(e.target as Node)
      ) {
        setSheetOpen(false);
        setSheetSearch("");
        setSheetHighlight(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [spreadsheetOpen, sheetOpen]);

  // Handle spreadsheet selection
  const handleSpreadsheetSelect = useCallback(
    (spreadsheet: Spreadsheet) => {
      setSelectedSpreadsheetId(spreadsheet.id);
      setSelectedSpreadsheetName(spreadsheet.name);
      setSelectedSheetName("");
      setSheets([]);
      setPreview(null);
      setSpreadsheetOpen(false);
      setSpreadsheetSearch("");
      setSpreadsheetHighlight(-1);
      fetchSheets(spreadsheet.id);
    },
    [fetchSheets]
  );

  // Handle sheet selection
  const handleSheetSelect = useCallback(
    (sheet: Sheet) => {
      setSelectedSheetName(sheet.title);
      setSheetOpen(false);
      setSheetSearch("");
      setSheetHighlight(-1);
      setPreview(null);
      if (selectedSpreadsheetId) {
        fetchPreview(selectedSpreadsheetId, sheet.title, headerRow);
      }
    },
    [selectedSpreadsheetId, headerRow, fetchPreview]
  );

  // Keyboard navigation for spreadsheet combobox
  const handleSpreadsheetKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!spreadsheetOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSpreadsheetOpen(true);
          return;
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSpreadsheetHighlight((prev) =>
            Math.min(prev + 1, filteredSpreadsheets.length - 1)
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSpreadsheetHighlight((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (spreadsheetHighlight >= 0 && filteredSpreadsheets[spreadsheetHighlight]) {
            handleSpreadsheetSelect(filteredSpreadsheets[spreadsheetHighlight]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setSpreadsheetOpen(false);
          setSpreadsheetSearch("");
          setSpreadsheetHighlight(-1);
          break;
        case "Tab":
          setSpreadsheetOpen(false);
          setSpreadsheetSearch("");
          break;
      }
    },
    [spreadsheetOpen, filteredSpreadsheets, spreadsheetHighlight, handleSpreadsheetSelect]
  );

  // Keyboard navigation for sheet combobox
  const handleSheetKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!sheetOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSheetOpen(true);
          return;
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSheetHighlight((prev) => Math.min(prev + 1, filteredSheets.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSheetHighlight((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (sheetHighlight >= 0 && filteredSheets[sheetHighlight]) {
            handleSheetSelect(filteredSheets[sheetHighlight]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setSheetOpen(false);
          setSheetSearch("");
          setSheetHighlight(-1);
          break;
        case "Tab":
          setSheetOpen(false);
          setSheetSearch("");
          break;
      }
    },
    [sheetOpen, filteredSheets, sheetHighlight, handleSheetSelect]
  );

  // Handle header row change
  const handleHeaderRowChange = (row: number) => {
    setHeaderRow(row);
    if (selectedSheetName && selectedSpreadsheetId) {
      fetchPreview(selectedSpreadsheetId, selectedSheetName, row);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !selectedSpreadsheetId || !selectedSheetName) {
      return;
    }

    try {
      setSubmitting(true);
      const config: GoogleSheetsConfig = {
        spreadsheetId: selectedSpreadsheetId,
        spreadsheetName: selectedSpreadsheetName,
        sheetName: selectedSheetName,
        syncFrequency,
        headerRow,
      };
      await onSubmit(name, config);
    } catch {
      // Error is handled by the parent component
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = name.trim() !== "" && selectedSpreadsheetId !== "" && selectedSheetName !== "";

  // Render not connected state
  if (!isConnected) {
    return (
      <div className={styles.container}>
        <div className={styles.notConnected}>
          <div className={styles.googleIcon}>
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </div>
          <h3>Connect Your Google Account</h3>
          <p>
            Connect your Google account to access your spreadsheets and import data.
          </p>
          <button
            type="button"
            onClick={onConnect}
            className={styles.connectButton}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect Google Account"}
          </button>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Render connected state with form
  return (
    <form onSubmit={handleSubmit} className={styles.container}>
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button type="button" onClick={fetchSpreadsheets} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      <div className={styles.formGroup}>
        <label htmlFor="name" className={styles.label}>
          Data Source Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Product Catalog"
          className={styles.input}
          required
        />
      </div>

      {/* Spreadsheet Combobox */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Spreadsheet</label>
        <div ref={spreadsheetContainerRef} className={styles.comboboxWrapper}>
          <div
            className={`${styles.comboboxTrigger} ${spreadsheetOpen ? styles.comboboxTriggerOpen : ""} ${loadingSpreadsheets ? styles.comboboxTriggerDisabled : ""}`}
            onClick={() => {
              if (!loadingSpreadsheets) {
                setSpreadsheetOpen(true);
                spreadsheetInputRef.current?.focus();
              }
            }}
          >
            {spreadsheetOpen ? (
              <input
                ref={spreadsheetInputRef}
                type="text"
                className={styles.searchInput}
                value={spreadsheetSearch}
                onChange={(e) => {
                  setSpreadsheetSearch(e.target.value);
                  setSpreadsheetHighlight(-1);
                }}
                onKeyDown={handleSpreadsheetKeyDown}
                placeholder="Search spreadsheets..."
                autoFocus
                role="combobox"
                aria-expanded={spreadsheetOpen}
                aria-controls={spreadsheetListboxId}
                aria-autocomplete="list"
              />
            ) : selectedSpreadsheetName ? (
              <span className={styles.selectedValue}>{selectedSpreadsheetName}</span>
            ) : (
              <span className={styles.placeholder}>
                {loadingSpreadsheets ? "Loading spreadsheets..." : "Select a spreadsheet"}
              </span>
            )}
            <span className={`${styles.chevron} ${spreadsheetOpen ? styles.chevronOpen : ""}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>

          {spreadsheetOpen && (
            <div id={spreadsheetListboxId} className={styles.dropdown} role="listbox">
              {/* Sort toggle */}
              <div className={styles.sortToggle}>
                <button
                  type="button"
                  className={`${styles.sortButton} ${spreadsheetSort === "recent" ? styles.sortButtonActive : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpreadsheetSort("recent");
                  }}
                >
                  Recent
                </button>
                <button
                  type="button"
                  className={`${styles.sortButton} ${spreadsheetSort === "name" ? styles.sortButtonActive : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpreadsheetSort("name");
                  }}
                >
                  A-Z
                </button>
              </div>

              {filteredSpreadsheets.length === 0 ? (
                <div className={styles.noResults}>
                  {spreadsheetSearch ? `No spreadsheets match "${spreadsheetSearch}"` : "No spreadsheets found"}
                </div>
              ) : (
                filteredSpreadsheets.map((spreadsheet, index) => {
                  const isSelected = spreadsheet.id === selectedSpreadsheetId;
                  const isHighlighted = index === spreadsheetHighlight;
                  return (
                    <button
                      key={spreadsheet.id}
                      type="button"
                      role="option"
                      className={`${styles.option} ${isSelected ? styles.optionSelected : ""} ${isHighlighted ? styles.optionHighlighted : ""}`}
                      onClick={() => handleSpreadsheetSelect(spreadsheet)}
                      aria-selected={isSelected}
                    >
                      <div className={styles.optionContent}>
                        <span className={styles.optionName}>{spreadsheet.name}</span>
                        <span className={styles.optionMeta}>
                          {formatRelativeTime(spreadsheet.modifiedTime)}
                        </span>
                      </div>
                      {isSelected && (
                        <span className={styles.checkmark}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M3 8L6.5 11.5L13 4.5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sheet Combobox */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Sheet / Tab</label>
        <div ref={sheetContainerRef} className={styles.comboboxWrapper}>
          <div
            className={`${styles.comboboxTrigger} ${sheetOpen ? styles.comboboxTriggerOpen : ""} ${!selectedSpreadsheetId || loadingSheets ? styles.comboboxTriggerDisabled : ""}`}
            onClick={() => {
              if (selectedSpreadsheetId && !loadingSheets) {
                setSheetOpen(true);
                sheetInputRef.current?.focus();
              }
            }}
          >
            {sheetOpen ? (
              <input
                ref={sheetInputRef}
                type="text"
                className={styles.searchInput}
                value={sheetSearch}
                onChange={(e) => {
                  setSheetSearch(e.target.value);
                  setSheetHighlight(-1);
                }}
                onKeyDown={handleSheetKeyDown}
                placeholder="Search sheets..."
                autoFocus
                role="combobox"
                aria-expanded={sheetOpen}
                aria-controls={sheetListboxId}
                aria-autocomplete="list"
              />
            ) : selectedSheetName ? (
              <span className={styles.selectedValue}>{selectedSheetName}</span>
            ) : (
              <span className={styles.placeholder}>
                {loadingSheets
                  ? "Loading sheets..."
                  : !selectedSpreadsheetId
                  ? "Select a spreadsheet first"
                  : "Select a sheet"}
              </span>
            )}
            <span className={`${styles.chevron} ${sheetOpen ? styles.chevronOpen : ""}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>

          {sheetOpen && (
            <div id={sheetListboxId} className={styles.dropdown} role="listbox">
              {filteredSheets.length === 0 ? (
                <div className={styles.noResults}>
                  {sheetSearch ? `No sheets match "${sheetSearch}"` : "No sheets found"}
                </div>
              ) : (
                filteredSheets.map((sheet, index) => {
                  const isSelected = sheet.title === selectedSheetName;
                  const isHighlighted = index === sheetHighlight;
                  return (
                    <button
                      key={sheet.sheetId}
                      type="button"
                      role="option"
                      className={`${styles.option} ${isSelected ? styles.optionSelected : ""} ${isHighlighted ? styles.optionHighlighted : ""}`}
                      onClick={() => handleSheetSelect(sheet)}
                      aria-selected={isSelected}
                    >
                      <span>{sheet.title}</span>
                      {isSelected && (
                        <span className={styles.checkmark}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M3 8L6.5 11.5L13 4.5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="headerRow" className={styles.label}>
            Header Row
          </label>
          <input
            id="headerRow"
            type="number"
            min={1}
            value={headerRow}
            onChange={(e) => handleHeaderRowChange(parseInt(e.target.value, 10) || 1)}
            className={styles.inputSmall}
          />
          <span className={styles.hint}>Row number containing column headers</span>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="syncFrequency" className={styles.label}>
            Sync Frequency
          </label>
          <select
            id="syncFrequency"
            value={syncFrequency}
            onChange={(e) => setSyncFrequency(e.target.value as SyncFrequency)}
            className={styles.select}
          >
            {SYNC_FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(loadingPreview || preview) && (
        <div className={styles.previewSection}>
          <h4 className={styles.previewTitle}>Preview</h4>
          {loadingPreview ? (
            <div className={styles.previewLoading}>Loading preview...</div>
          ) : preview && preview.rows.length > 0 ? (
            <div className={styles.previewTable}>
              <table>
                <thead>
                  <tr>
                    {preview.headers.map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {preview.headers.map((header, colIndex) => (
                        <td key={colIndex}>{String(row[header] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length > 5 && (
                <p className={styles.previewMore}>
                  Showing 5 of {preview.rows.length} rows
                </p>
              )}
            </div>
          ) : (
            <div className={styles.previewEmpty}>No data found in this sheet</div>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" onClick={onCancel} className={styles.cancelButton}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isFormValid || submitting}
          className={styles.submitButton}
        >
          {submitting ? "Creating..." : "Create Data Source"}
        </button>
      </div>
    </form>
  );
}
