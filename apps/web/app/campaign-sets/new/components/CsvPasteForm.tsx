"use client";

import { useState, useCallback, useEffect } from "react";
import styles from "./CsvPasteForm.module.css";
import { api, ApiError } from "@/lib/api-client";

/**
 * Props for the CsvPasteForm component
 */
export interface CsvPasteFormProps {
  /** Callback when form is submitted with name and CSV content */
  onSubmit: (name: string, csvContent: string) => Promise<void>;
  /** Callback when cancel button is clicked */
  onCancel: () => void;
  /** Whether the form is in a loading state (e.g., during submission) */
  isLoading?: boolean;
}

interface PreviewData {
  headers: string[];
  preview: Record<string, string>[];
}

/** Size threshold for warning (500KB) */
const SIZE_WARNING_THRESHOLD = 500 * 1024;

/**
 * CsvPasteForm - A form component for pasting CSV content directly
 *
 * Features:
 * - Large textarea for pasting CSV data
 * - Character count with size warning
 * - Preview functionality with validation
 * - Preview table showing first rows with headers
 * - Submit/Cancel buttons with loading states
 */
export function CsvPasteForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: CsvPasteFormProps) {
  const [name, setName] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPreviewedContent, setHasPreviewedContent] = useState("");

  // Clear preview when content changes significantly
  useEffect(() => {
    if (hasPreviewedContent && csvContent !== hasPreviewedContent) {
      setPreviewData(null);
      setError(null);
    }
  }, [csvContent, hasPreviewedContent]);

  const charCount = csvContent.length;
  const showSizeWarning = charCount > SIZE_WARNING_THRESHOLD;
  const isNameValid = name.trim().length > 0;
  const isCsvValid = csvContent.trim().length > 0;
  const canSubmit = isNameValid && isCsvValid && !isLoading;
  const canPreview = isCsvValid && !isLoading && !previewLoading;

  /**
   * Handle preview button click - validates CSV content via API
   */
  const handlePreview = useCallback(async () => {
    if (!isCsvValid) return;

    setPreviewLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const data = await api.post<PreviewData>(
        "/api/v1/data-sources/preview-csv",
        {
          content: csvContent,
          rows: 5,
        }
      );

      setPreviewData(data);
      setHasPreviewedContent(csvContent);
    } catch (err) {
      if (err instanceof ApiError && err.data) {
        const errorData = err.data as { error?: string };
        setError(errorData.error || "Failed to preview CSV");
      } else {
        setError(err instanceof Error ? err.message : "Network error");
      }
    } finally {
      setPreviewLoading(false);
    }
  }, [csvContent, isCsvValid]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;

      await onSubmit(name.trim(), csvContent);
    },
    [canSubmit, name, csvContent, onSubmit]
  );

  /**
   * Format byte size for display
   */
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasError = error !== null;
  const hasPreview = previewData !== null;
  const isPreviewEmpty =
    hasPreview && previewData.headers.length === 0 && previewData.preview.length === 0;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Name input field */}
      <div className={styles.field}>
        <label htmlFor="csv-name" className={styles.label}>
          Name
        </label>
        <input
          id="csv-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Data Source"
          className={styles.input}
          disabled={isLoading}
          aria-required="true"
        />
      </div>

      {/* CSV content textarea */}
      <div className={styles.field}>
        <label htmlFor="csv-content" className={styles.label}>
          CSV Content
        </label>
        <textarea
          id="csv-content"
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          placeholder="Paste your CSV content here..."
          className={`${styles.textarea} textarea`}
          disabled={isLoading}
          aria-required="true"
          aria-invalid={hasError}
          aria-describedby={hasError ? "csv-error" : undefined}
        />

        {/* Character count and size indicator */}
        <div className={styles.textareaFooter}>
          <span data-testid="char-count" className={styles.charCount}>
            {charCount.toLocaleString()} characters ({formatSize(charCount)})
          </span>
          {showSizeWarning && (
            <span data-testid="size-warning" className={styles.sizeWarning}>
              Large content may take longer to process
            </span>
          )}
        </div>
      </div>

      {/* Preview button */}
      <button
        type="button"
        onClick={handlePreview}
        disabled={!canPreview}
        className={styles.previewButton}
      >
        {previewLoading ? (
          <>
            <span className={styles.spinner} data-testid="preview-loading" />
            Previewing...
          </>
        ) : (
          "Preview"
        )}
      </button>

      {/* Error message */}
      {hasError && (
        <div
          id="csv-error"
          data-testid="error-message"
          className={styles.error}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Empty preview state */}
      {isPreviewEmpty && (
        <div data-testid="preview-empty" className={styles.previewEmpty}>
          No data found in CSV content
        </div>
      )}

      {/* Preview table */}
      {hasPreview && !isPreviewEmpty && (
        <div className={styles.previewContainer}>
          <h4 className={styles.previewTitle}>
            Preview ({previewData.preview.length} rows)
          </h4>
          <div className={styles.tableWrapper}>
            <table data-testid="preview-table" className={styles.table}>
              <thead>
                <tr>
                  {previewData.headers.map((header, index) => (
                    <th key={index} className={styles.th}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.preview.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {previewData.headers.map((header, colIndex) => (
                      <td key={colIndex} className={styles.td}>
                        {row[header] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className={styles.actions}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelButton}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className={styles.submitButton}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              Creating...
            </>
          ) : (
            "Create Data Source"
          )}
        </button>
      </div>
    </form>
  );
}
