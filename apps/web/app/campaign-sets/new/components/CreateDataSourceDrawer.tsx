"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./CreateDataSourceDrawer.module.css";
import { CsvPasteForm } from "./CsvPasteForm";
import { ApiPushConfig, type ApiKeyConfig } from "./ApiPushConfig";
import { ApiDataSourceForm, type ApiFetchConfig } from "./ApiDataSourceForm";
import { GoogleSheetsForm, type GoogleSheetsConfig } from "./GoogleSheetsForm";
import { api } from "@/lib/api-client";

interface CreateDataSourceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (dataSourceId: string) => void;
}

type SourceType = "csv-upload" | "csv-paste" | "api" | "api-fetch" | "google-sheets";

export function CreateDataSourceDrawer({
  isOpen,
  onClose,
  onCreated,
}: CreateDataSourceDrawerProps) {
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // API Push specific state
  const [apiDataSourceId, setApiDataSourceId] = useState<string | null>(null);
  const [apiKeyConfig, setApiKeyConfig] = useState<ApiKeyConfig | undefined>(undefined);

  // Google Sheets specific state
  const [googleConnected, setGoogleConnected] = useState(false);
  const [checkingGoogleConnection, setCheckingGoogleConnection] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focus close button when opened
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSourceType(null);
      setName("");
      setFile(null);
      setError(null);
      setApiDataSourceId(null);
      setApiKeyConfig(undefined);
      setGoogleConnected(false);
      setCheckingGoogleConnection(false);
      setConnectingGoogle(false);
    }
  }, [isOpen]);

  // Handle file drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      setFile(droppedFile);
      if (!name) {
        setName(droppedFile.name.replace(/\.csv$/i, ""));
      }
    } else {
      setError("Please upload a CSV file");
    }
  }, [name]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        if (!name) {
          setName(selectedFile.name.replace(/\.csv$/i, ""));
        }
      }
    },
    [name]
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a name for your data source");
      return;
    }

    if (sourceType === "csv-upload" && !file) {
      setError("Please select a CSV file");
      return;
    }

    setUploading(true);

    try {
      if (sourceType === "csv-upload" && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", name.trim());

        const response = await fetch("/api/v1/data-sources/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to upload file");
        }

        const data = await response.json();
        onCreated(data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handle API Push data source creation
   * 1. Create data source with type: 'api'
   * 2. Show the ApiPushConfig component for key generation
   */
  const handleApiPushCreate = useCallback(async () => {
    if (!name.trim()) {
      setError("Please enter a name for your data source");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/data-sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          type: "api",
          config: { source: "api-push" },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create data source");
      }

      const { id: dataSourceId } = await response.json();
      setApiDataSourceId(dataSourceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUploading(false);
    }
  }, [name]);

  /**
   * Handle API key generation callback - refresh API key config
   */
  const handleApiKeyGenerated = useCallback(async () => {
    if (!apiDataSourceId) return;

    try {
      const response = await fetch(`/api/v1/data-sources/${apiDataSourceId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.config?.apiKey) {
          setApiKeyConfig({
            keyPrefix: data.config.apiKey.keyPrefix,
            createdAt: data.config.apiKey.createdAt,
            lastUsedAt: data.config.apiKey.lastUsedAt,
          });
        }
      }
    } catch (err) {
      console.error('Failed to refresh API key configuration:', err);
    }
  }, [apiDataSourceId]);

  /**
   * Handle finishing API Push setup
   */
  const handleApiPushFinish = useCallback(() => {
    if (apiDataSourceId) {
      onCreated(apiDataSourceId);
    }
  }, [apiDataSourceId, onCreated]);

  /**
   * Handle API Fetch data source creation
   * Creates a data source that fetches from an external API
   */
  const handleApiFetchSubmit = useCallback(
    async (dataSourceName: string, config: ApiFetchConfig) => {
      setUploading(true);
      setError(null);

      try {
        const response = await fetch("/api/v1/data-sources", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: dataSourceName,
            type: "api",
            config: {
              source: "api-fetch",
              ...config,
            },
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create data source");
        }

        const { id: dataSourceId } = await response.json();
        onCreated(dataSourceId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        throw err; // Re-throw so the form knows submission failed
      } finally {
        setUploading(false);
      }
    },
    [onCreated]
  );

  /**
   * Handle CSV paste form submission
   * 1. Parse CSV content via preview endpoint to get structured data
   * 2. Create data source with type: 'csv', config: { source: 'paste' }
   * 3. Insert parsed rows via items endpoint
   */
  const handleCsvPasteSubmit = useCallback(
    async (dataSourceName: string, csvContent: string) => {
      setUploading(true);
      setError(null);

      try {
        // Step 1: Parse CSV content via preview endpoint
        // Note: max 50000 rows supported by the API
        const previewResponse = await fetch("/api/v1/data-sources/preview-csv", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: csvContent,
            rows: 50000, // Get all rows (API max is 50000)
          }),
        });

        if (!previewResponse.ok) {
          const data = await previewResponse.json();
          throw new Error(data.error || "Failed to parse CSV content");
        }

        const { preview: parsedItems } = await previewResponse.json();

        if (!parsedItems || parsedItems.length === 0) {
          throw new Error("CSV content is empty or invalid");
        }

        // Step 2: Create the data source
        const createResponse = await fetch("/api/v1/data-sources", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: dataSourceName,
            type: "csv",
            config: { source: "paste" },
          }),
        });

        if (!createResponse.ok) {
          const data = await createResponse.json();
          throw new Error(data.error || "Failed to create data source");
        }

        const { id: dataSourceId } = await createResponse.json();

        // Step 3: Insert parsed rows via items endpoint
        const itemsResponse = await fetch(
          `/api/v1/data-sources/${dataSourceId}/items`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              mode: "replace",
              items: parsedItems,
            }),
          }
        );

        if (!itemsResponse.ok) {
          const data = await itemsResponse.json();
          throw new Error(data.error || "Failed to import CSV data");
        }

        onCreated(dataSourceId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        throw err; // Re-throw so the form knows submission failed
      } finally {
        setUploading(false);
      }
    },
    [onCreated]
  );

  /**
   * Check Google connection status when Google Sheets is selected
   */
  const checkGoogleConnection = useCallback(async () => {
    setCheckingGoogleConnection(true);
    setError(null);

    try {
      const response = await api.get<{ connected: boolean }>(
        "/api/v1/auth/google/status"
      );
      setGoogleConnected(response.connected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check Google connection");
      setGoogleConnected(false);
    } finally {
      setCheckingGoogleConnection(false);
    }
  }, []);

  /**
   * Handle selecting Google Sheets source type
   */
  const handleGoogleSheetsSelect = useCallback(() => {
    setSourceType("google-sheets");
    checkGoogleConnection();
  }, [checkGoogleConnection]);

  /**
   * Initiate Google OAuth flow
   */
  const handleGoogleConnect = useCallback(async () => {
    setConnectingGoogle(true);
    setError(null);

    try {
      const response = await api.post<{ authorizationUrl: string }>("/api/v1/auth/google/connect", {
        // Pass current URL for redirect after OAuth
        redirectUrl: window.location.href,
      });
      // Redirect to Google OAuth
      window.location.href = response.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate Google connection");
      setConnectingGoogle(false);
    }
    // Note: Don't reset connectingGoogle on success since we're redirecting away
  }, []);

  /**
   * Handle Google Sheets data source creation
   */
  const handleGoogleSheetsSubmit = useCallback(
    async (dataSourceName: string, config: GoogleSheetsConfig) => {
      setUploading(true);
      setError(null);

      try {
        const response = await api.post<{ id: string }>("/api/v1/data-sources", {
          name: dataSourceName,
          type: "google-sheets",
          config: {
            source: "google-sheets",
            spreadsheetId: config.spreadsheetId,
            spreadsheetName: config.spreadsheetName,
            sheetName: config.sheetName,
            syncFrequency: config.syncFrequency,
            headerRow: config.headerRow,
          },
        });

        onCreated(response.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        throw err; // Re-throw so the form knows submission failed
      } finally {
        setUploading(false);
      }
    },
    [onCreated]
  );

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <header className={styles.header}>
          <h2 id="drawer-title" className={styles.title}>
            Create Data Source
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {/* Step 1: Choose source type */}
          {!sourceType && (
            <div className={styles.step}>
              <p className={styles.stepDescription}>
                Choose how you want to import your data
              </p>

              <div className={styles.sourceTypes}>
                {/* Upload CSV option */}
                <button
                  type="button"
                  className={styles.sourceTypeCard}
                  onClick={() => setSourceType("csv-upload")}
                >
                  <div className={styles.sourceTypeIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14 2V8H20"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 13H16"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M8 17H16"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className={styles.sourceTypeInfo}>
                    <span className={styles.sourceTypeName}>Upload CSV</span>
                    <span className={styles.sourceTypeDesc}>
                      Import data from a CSV file
                    </span>
                  </div>
                </button>

                {/* Paste CSV option */}
                <button
                  type="button"
                  className={styles.sourceTypeCard}
                  onClick={() => setSourceType("csv-paste")}
                >
                  <div className={styles.sourceTypeIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M15 2H9C8.44772 2 8 2.44772 8 3V5C8 5.55228 8.44772 6 9 6H15C15.5523 6 16 5.55228 16 5V3C16 2.44772 15.5523 2 15 2Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 12H16"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M8 16H12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className={styles.sourceTypeInfo}>
                    <span className={styles.sourceTypeName}>Paste CSV</span>
                    <span className={styles.sourceTypeDesc}>
                      Paste CSV content directly
                    </span>
                  </div>
                </button>

                {/* API Push option */}
                <button
                  type="button"
                  className={styles.sourceTypeCard}
                  onClick={() => setSourceType("api")}
                >
                  <div className={styles.sourceTypeIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M21 3L15 9M21 3V8M21 3H16"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className={styles.sourceTypeInfo}>
                    <span className={styles.sourceTypeName}>API Push</span>
                    <span className={styles.sourceTypeDesc}>
                      External systems push data via API
                    </span>
                  </div>
                </button>

                {/* API Fetch option */}
                <button
                  type="button"
                  className={styles.sourceTypeCard}
                  onClick={() => setSourceType("api-fetch")}
                >
                  <div className={styles.sourceTypeIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M15 3L21 9M21 3V9M21 3H15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className={styles.sourceTypeInfo}>
                    <span className={styles.sourceTypeName}>API Fetch</span>
                    <span className={styles.sourceTypeDesc}>
                      Pull data from an external API
                    </span>
                  </div>
                </button>

                {/* Google Sheets option */}
                <button
                  type="button"
                  className={styles.sourceTypeCard}
                  onClick={handleGoogleSheetsSelect}
                >
                  <div className={styles.sourceTypeIcon}>
                    <svg viewBox="0 0 24 24" width="24" height="24">
                      <path
                        fill="#0F9D58"
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                      />
                      <path
                        fill="#87CEAC"
                        d="M14 2v6h6l-6-6z"
                      />
                      <path
                        fill="#FFF"
                        d="M7 13h10v1H7zm0 2h10v1H7zm0 2h7v1H7z"
                      />
                    </svg>
                  </div>
                  <div className={styles.sourceTypeInfo}>
                    <span className={styles.sourceTypeName}>Google Sheets</span>
                    <span className={styles.sourceTypeDesc}>
                      Import data from a Google Spreadsheet
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2a: CSV Upload */}
          {sourceType === "csv-upload" && (
            <form onSubmit={handleSubmit} className={styles.step}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setSourceType(null)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 12L6 8L10 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back
              </button>

              {/* Name input */}
              <div className={styles.field}>
                <label htmlFor="ds-name" className={styles.fieldLabel}>
                  Name
                </label>
                <input
                  id="ds-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Data Source"
                  className={styles.input}
                />
              </div>

              {/* File upload */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>CSV File</label>
                <div
                  className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""} ${file ? styles.dropzoneHasFile : ""}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className={styles.fileInput}
                  />

                  {file ? (
                    <div className={styles.fileInfo}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M11.667 1.667H5a1.667 1.667 0 00-1.667 1.666v13.334A1.667 1.667 0 005 18.333h10a1.667 1.667 0 001.667-1.666V6.667l-5-5z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M11.667 1.667v5h5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileSize}>
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ) : (
                    <div className={styles.dropzoneContent}>
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <path
                          d="M28 20V25.3333C28 26.0406 27.719 26.7189 27.219 27.219C26.7189 27.719 26.0406 28 25.3333 28H6.66667C5.95942 28 5.28115 27.719 4.78105 27.219C4.28095 26.7189 4 26.0406 4 25.3333V20"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M22.6667 10.6667L16 4L9.33333 10.6667"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M16 4V20"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className={styles.dropzoneText}>
                        Drag and drop your CSV file here, or click to browse
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error message */}
              {error && <p className={styles.error}>{error}</p>}

              {/* Submit button */}
              <button
                type="submit"
                className={styles.submitButton}
                disabled={uploading || !name.trim() || !file}
              >
                {uploading ? (
                  <>
                    <span className={styles.spinner} />
                    Uploading...
                  </>
                ) : (
                  "Create Data Source"
                )}
              </button>
            </form>
          )}

          {/* Step 2b: CSV Paste */}
          {sourceType === "csv-paste" && (
            <div className={styles.step}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setSourceType(null)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 12L6 8L10 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back
              </button>

              {/* Error message from parent */}
              {error && <p className={styles.error}>{error}</p>}

              <CsvPasteForm
                onSubmit={handleCsvPasteSubmit}
                onCancel={() => setSourceType(null)}
                isLoading={uploading}
              />
            </div>
          )}

          {/* Step 2c: API Push - Name input */}
          {sourceType === "api" && !apiDataSourceId && (
            <div className={styles.step}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setSourceType(null)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 12L6 8L10 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back
              </button>

              <p className={styles.stepDescription}>
                Create a data source that accepts data via API calls
              </p>

              {/* Name input */}
              <div className={styles.field}>
                <label htmlFor="api-ds-name" className={styles.fieldLabel}>
                  Name
                </label>
                <input
                  id="api-ds-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My API Data Source"
                  className={styles.input}
                />
              </div>

              {/* Error message */}
              {error && <p className={styles.error}>{error}</p>}

              {/* Create button */}
              <button
                type="button"
                className={styles.submitButton}
                disabled={uploading || !name.trim()}
                onClick={handleApiPushCreate}
              >
                {uploading ? (
                  <>
                    <span className={styles.spinner} />
                    Creating...
                  </>
                ) : (
                  "Create Data Source"
                )}
              </button>
            </div>
          )}

          {/* Step 3: API Push Configuration */}
          {sourceType === "api" && apiDataSourceId && (
            <div className={styles.step}>
              <p className={styles.stepDescription}>
                Configure your API endpoint and generate an API key
              </p>

              <ApiPushConfig
                dataSourceId={apiDataSourceId}
                apiKeyConfig={apiKeyConfig}
                onKeyGenerated={handleApiKeyGenerated}
              />

              {/* Done button */}
              <button
                type="button"
                className={styles.submitButton}
                onClick={handleApiPushFinish}
                style={{ marginTop: "20px" }}
              >
                Done
              </button>
            </div>
          )}

          {/* Step 2d: API Fetch Configuration */}
          {sourceType === "api-fetch" && (
            <div className={styles.step}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setSourceType(null)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 12L6 8L10 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back
              </button>

              {/* Error message from parent */}
              {error && <p className={styles.error}>{error}</p>}

              <ApiDataSourceForm
                onSubmit={handleApiFetchSubmit}
                onCancel={() => setSourceType(null)}
                isLoading={uploading}
              />
            </div>
          )}

          {/* Step 2e: Google Sheets Configuration */}
          {sourceType === "google-sheets" && (
            <div className={styles.step}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setSourceType(null)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 12L6 8L10 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back
              </button>

              {/* Error message from parent */}
              {error && <p className={styles.error}>{error}</p>}

              {/* Loading state while checking connection */}
              {checkingGoogleConnection && (
                <div className={styles.stepDescription}>
                  Checking Google connection...
                </div>
              )}

              {/* Google Sheets form */}
              {!checkingGoogleConnection && (
                <GoogleSheetsForm
                  onSubmit={handleGoogleSheetsSubmit}
                  onCancel={() => setSourceType(null)}
                  isConnected={googleConnected}
                  onConnect={handleGoogleConnect}
                  isConnecting={connectingGoogle}
                />
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
