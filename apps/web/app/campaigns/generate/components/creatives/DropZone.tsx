"use client";

import { useState, useCallback, useRef } from "react";
import { mimeToFormat, formatFileSize } from "@repo/core/creatives";
import styles from "./DropZone.module.css";

interface DropZoneProps {
  /** Label displayed above the drop zone */
  label: string;
  /** Optional description text */
  description?: string;
  /** Accepted MIME types */
  accept: string[];
  /** Callback when file is selected */
  onFileSelect: (file: File) => void;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Whether the component is in loading state */
  isLoading?: boolean;
  /** Icon type to display */
  icon?: "image" | "video";
  /** Test ID for testing */
  testId?: string;
}

export function DropZone({
  label,
  description,
  accept,
  onFileSelect,
  maxSize,
  disabled = false,
  error,
  isLoading = false,
  icon = "image",
  testId = "dropzone",
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatList = accept.map(t => mimeToFormat(t).toUpperCase()).join(", ");

  const handleClick = useCallback(() => {
    if (!disabled && !isLoading && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled, isLoading]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && !disabled && !isLoading) {
        onFileSelect(file);
      }
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onFileSelect, disabled, isLoading]
  );

  const handleDragEnter = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled && !isLoading) {
        setIsDragging(true);
      }
    },
    [disabled, isLoading]
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
    },
    []
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      if (disabled || isLoading) return;

      const file = event.dataTransfer.files[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect, disabled, isLoading]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>

      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ""} ${disabled ? styles.disabled : ""} ${error ? styles.error : ""}`}
        data-testid={testId}
        data-dragging={isDragging ? "true" : "false"}
        data-error={error ? "true" : "false"}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`Drop ${icon} here or click to browse`}
        aria-disabled={disabled}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept.join(",")}
          onChange={handleFileChange}
          className={styles.hiddenInput}
          data-testid="dropzone-input"
          disabled={disabled}
          aria-hidden="true"
        />

        {isLoading ? (
          <div className={styles.loadingContainer} data-testid="dropzone-loading">
            <div className={styles.spinner} />
            <span className={styles.loadingText}>Analyzing...</span>
          </div>
        ) : (
          <div className={styles.content}>
            {icon === "image" ? (
              <div className={styles.icon} data-testid="dropzone-icon-image">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            ) : (
              <div className={styles.icon} data-testid="dropzone-icon-video">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            )}

            <div className={styles.text}>
              <span className={styles.action}>
                Drop {icon} here or click to browse
              </span>
              {description && (
                <span className={styles.description}>{description}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={styles.meta}>
        <span className={styles.formats}>Formats: {formatList}</span>
        {maxSize && <span className={styles.maxSize}>Max: {formatFileSize(maxSize)}</span>}
      </div>

      {error && (
        <div className={styles.errorMessage} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
