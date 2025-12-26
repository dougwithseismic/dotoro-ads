"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";
import styles from "./GoogleSheetsForm.module.css";

/**
 * Sync frequency options for scheduled data syncing
 */
type SyncFrequency = "manual" | "1h" | "6h" | "24h" | "7d";

/**
 * Configuration for Google Sheets data sources
 */
interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  syncFrequency: SyncFrequency;
  lastSyncAt?: string;
  lastSyncStatus?: "success" | "error" | "syncing";
  lastSyncError?: string;
  headerRow?: number;
}

interface GoogleSheetsFormProps {
  onSubmit: (name: string, config: GoogleSheetsConfig) => Promise<void>;
  onCancel: () => void;
  isConnected: boolean;
  onConnect: () => void;
}

interface Spreadsheet {
  id: string;
  name: string;
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

  // Load spreadsheets when connected
  const fetchSpreadsheets = useCallback(async () => {
    if (!isConnected) return;

    try {
      setLoadingSpreadsheets(true);
      setError(null);
      const response = await api.get<{ data: Spreadsheet[] }>("/api/v1/google/spreadsheets");
      setSpreadsheets(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load spreadsheets");
    } finally {
      setLoadingSpreadsheets(false);
    }
  }, [isConnected]);

  useEffect(() => {
    fetchSpreadsheets();
  }, [fetchSpreadsheets]);

  // Load sheets when spreadsheet is selected
  const fetchSheets = useCallback(async (spreadsheetId: string) => {
    if (!spreadsheetId) return;

    try {
      setLoadingSheets(true);
      setError(null);
      const response = await api.get<{ data: Sheet[] }>(
        `/api/v1/google/spreadsheets/${spreadsheetId}/sheets`
      );
      setSheets(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sheets");
    } finally {
      setLoadingSheets(false);
    }
  }, []);

  // Load preview when sheet is selected
  const fetchPreview = useCallback(
    async (spreadsheetId: string, sheetName: string, headerRowNum: number) => {
      if (!spreadsheetId || !sheetName) return;

      try {
        setLoadingPreview(true);
        setError(null);
        const response = await api.get<{ data: PreviewData }>(
          `/api/v1/google/spreadsheets/${spreadsheetId}/sheets/${encodeURIComponent(sheetName)}/preview?headerRow=${headerRowNum}`
        );
        setPreview(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load preview");
      } finally {
        setLoadingPreview(false);
      }
    },
    []
  );

  // Handle spreadsheet selection
  const handleSpreadsheetChange = (spreadsheetId: string) => {
    setSelectedSpreadsheetId(spreadsheetId);
    const spreadsheet = spreadsheets.find((s) => s.id === spreadsheetId);
    setSelectedSpreadsheetName(spreadsheet?.name || "");
    setSelectedSheetName("");
    setSheets([]);
    setPreview(null);

    if (spreadsheetId) {
      fetchSheets(spreadsheetId);
    }
  };

  // Handle sheet selection
  const handleSheetChange = (sheetName: string) => {
    setSelectedSheetName(sheetName);
    setPreview(null);

    if (sheetName && selectedSpreadsheetId) {
      fetchPreview(selectedSpreadsheetId, sheetName, headerRow);
    }
  };

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
          >
            Connect Google Account
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

      <div className={styles.formGroup}>
        <label htmlFor="spreadsheet" className={styles.label}>
          Spreadsheet
        </label>
        <select
          id="spreadsheet"
          value={selectedSpreadsheetId}
          onChange={(e) => handleSpreadsheetChange(e.target.value)}
          className={styles.select}
          disabled={loadingSpreadsheets}
        >
          <option value="">
            {loadingSpreadsheets ? "Loading spreadsheets..." : "Select a spreadsheet"}
          </option>
          {spreadsheets.map((spreadsheet) => (
            <option key={spreadsheet.id} value={spreadsheet.id}>
              {spreadsheet.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="sheet" className={styles.label}>
          Sheet / Tab
        </label>
        <select
          id="sheet"
          value={selectedSheetName}
          onChange={(e) => handleSheetChange(e.target.value)}
          className={styles.select}
          disabled={!selectedSpreadsheetId || loadingSheets}
        >
          <option value="">
            {loadingSheets
              ? "Loading sheets..."
              : !selectedSpreadsheetId
              ? "Select a spreadsheet first"
              : "Select a sheet"}
          </option>
          {sheets.map((sheet) => (
            <option key={sheet.sheetId} value={sheet.title}>
              {sheet.title}
            </option>
          ))}
        </select>
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
