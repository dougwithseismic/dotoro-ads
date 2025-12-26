"use client";

import { useCallback, useMemo } from "react";
import styles from "./HeadersEditor.module.css";

/**
 * Props for the HeadersEditor component
 */
export interface HeadersEditorProps {
  /** Current headers as key-value pairs */
  value: Record<string, string>;
  /** Callback when headers change */
  onChange: (headers: Record<string, string>) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

/**
 * Internal representation of a header row for editing
 * We use an array of objects to preserve order and allow duplicate keys during editing
 */
interface HeaderRow {
  id: string;
  key: string;
  value: string;
}

/**
 * HeadersEditor - A key-value editor for HTTP headers
 *
 * Features:
 * - Add/remove header rows
 * - Edit header keys and values inline
 * - Preserves order when editing
 * - Handles duplicate keys by keeping the last value
 */
export function HeadersEditor({
  value,
  onChange,
  disabled = false,
}: HeadersEditorProps) {
  // Convert Record to array of HeaderRow for editing
  // Generate stable IDs based on the key and index
  const headerRows = useMemo((): HeaderRow[] => {
    return Object.entries(value).map(([key, val], index) => ({
      id: `header-${index}-${key}`,
      key,
      value: val,
    }));
  }, [value]);

  /**
   * Convert HeaderRow array back to Record for onChange
   */
  const rowsToRecord = useCallback((rows: HeaderRow[]): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const row of rows) {
      // Later entries overwrite earlier ones for duplicate keys
      result[row.key] = row.value;
    }
    return result;
  }, []);

  /**
   * Add a new empty header row
   */
  const handleAddHeader = useCallback(() => {
    const newRows: HeaderRow[] = [
      ...headerRows,
      { id: `header-${Date.now()}`, key: "", value: "" },
    ];
    onChange(rowsToRecord(newRows));
  }, [headerRows, onChange, rowsToRecord]);

  /**
   * Remove a header row by index
   */
  const handleRemoveHeader = useCallback(
    (indexToRemove: number) => {
      const newRows = headerRows.filter((_, index) => index !== indexToRemove);
      onChange(rowsToRecord(newRows));
    },
    [headerRows, onChange, rowsToRecord]
  );

  /**
   * Update a header key at a specific index
   */
  const handleKeyChange = useCallback(
    (index: number, newKey: string) => {
      const newRows = headerRows.map((row, i) =>
        i === index ? { ...row, key: newKey } : row
      );
      onChange(rowsToRecord(newRows));
    },
    [headerRows, onChange, rowsToRecord]
  );

  /**
   * Update a header value at a specific index
   */
  const handleValueChange = useCallback(
    (index: number, newValue: string) => {
      const newRows = headerRows.map((row, i) =>
        i === index ? { ...row, value: newValue } : row
      );
      onChange(rowsToRecord(newRows));
    },
    [headerRows, onChange, rowsToRecord]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Headers</span>
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAddHeader}
          disabled={disabled}
          aria-label="Add header"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M7 1V13M1 7H13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Add Header
        </button>
      </div>

      {headerRows.length === 0 ? (
        <div className={styles.emptyState}>
          No custom headers configured
        </div>
      ) : (
        <div className={styles.rows}>
          {headerRows.map((row, index) => (
            <div key={row.id} className={styles.row}>
              <input
                type="text"
                className={styles.keyInput}
                value={row.key}
                onChange={(e) => handleKeyChange(index, e.target.value)}
                placeholder="Key"
                disabled={disabled}
                aria-label={`Header ${index + 1} key`}
              />
              <input
                type="text"
                className={styles.valueInput}
                value={row.value}
                onChange={(e) => handleValueChange(index, e.target.value)}
                placeholder="Value"
                disabled={disabled}
                aria-label={`Header ${index + 1} value`}
              />
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => handleRemoveHeader(index)}
                disabled={disabled}
                aria-label="Remove header"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M1 7H13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
