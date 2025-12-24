"use client";

import { useCallback, useMemo } from "react";
import styles from "./VariableImageInput.module.css";

interface VariableImageInputProps {
  /** Current variable pattern value (e.g., "{image_url}") */
  value: string;
  /** Called when pattern changes */
  onChange: (pattern: string) => void;
  /** Available column names for selection */
  availableColumns: string[];
  /** Sample data for preview */
  sampleData?: Record<string, unknown>[];
  /** Label text */
  label?: string;
  /** Help text */
  helpText?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Test ID */
  testId?: string;
}

/**
 * Extract column name from a variable pattern like "{column_name}"
 */
function extractColumnName(pattern: string): string {
  const match = pattern.match(/^\{(.+)\}$/);
  return match ? match[1] : "";
}

/**
 * Validate that a URL is a safe HTTP/HTTPS URL for rendering in an img tag.
 */
function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function VariableImageInput({
  value,
  onChange,
  availableColumns,
  sampleData,
  label,
  helpText,
  disabled = false,
  error,
  testId = "variable-image-input",
}: VariableImageInputProps) {
  const selectedColumn = useMemo(() => extractColumnName(value), [value]);

  const handleColumnChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const column = event.target.value;
      if (column) {
        onChange(`{${column}}`);
      } else {
        onChange("");
      }
    },
    [onChange]
  );

  // Get sample value for preview
  const sampleValue = useMemo(() => {
    if (!selectedColumn || !sampleData || sampleData.length === 0) {
      return null;
    }
    const firstRow = sampleData[0];
    return firstRow?.[selectedColumn] as string | undefined;
  }, [selectedColumn, sampleData]);

  return (
    <div className={styles.container} data-testid={testId}>
      {/* Label */}
      {label && <label className={styles.label}>{label}</label>}

      {/* Column selector */}
      <select
        className={`${styles.select} ${error ? styles.selectError : ""}`}
        value={selectedColumn}
        onChange={handleColumnChange}
        disabled={disabled}
        data-testid="column-select"
      >
        <option value="">Select column with image URLs...</option>
        {availableColumns.map((column) => (
          <option key={column} value={column}>
            {column}
          </option>
        ))}
      </select>

      {/* Help text */}
      {helpText && <p className={styles.helpText}>{helpText}</p>}

      {/* Error message */}
      {error && <p className={styles.error}>{error}</p>}

      {/* Sample preview */}
      {selectedColumn && sampleValue && (
        <div className={styles.samplePreview} data-testid="sample-preview">
          <span className={styles.sampleLabel}>Sample:</span>
          <div className={styles.sampleContent}>
            {isValidImageUrl(sampleValue) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sampleValue}
                alt="Sample preview"
                className={styles.sampleImage}
                onError={(e) => {
                  // Hide broken images
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <span className={styles.sampleUrl}>{sampleValue}</span>
          </div>
        </div>
      )}
    </div>
  );
}
