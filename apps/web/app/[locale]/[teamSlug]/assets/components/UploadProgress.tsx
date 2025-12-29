"use client";

import { useCallback } from "react";
import styles from "./UploadProgress.module.css";

/**
 * Upload status for individual files
 */
export type UploadStatus = "pending" | "uploading" | "success" | "error";

/**
 * Individual file upload item
 */
export interface UploadItem {
  /** Unique identifier for the upload */
  id: string;
  /** Original file */
  file: File;
  /** Current upload status */
  status: UploadStatus;
  /** Upload progress (0-100) */
  progress: number;
  /** Error message if status is error */
  error?: string;
  /** Preview URL (blob URL) */
  previewUrl?: string;
}

interface UploadProgressProps {
  /** List of upload items */
  uploads: UploadItem[];
  /** Callback to cancel an upload */
  onCancel?: (id: string) => void;
  /** Callback to retry a failed upload */
  onRetry?: (id: string) => void;
  /** Callback to remove a completed/failed upload from list */
  onRemove?: (id: string) => void;
  /** Whether to show as a compact list */
  compact?: boolean;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get file type category from MIME type
 */
function getFileType(mimeType: string): "image" | "video" | "unknown" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "unknown";
}

/**
 * UploadProgress Component
 *
 * Displays the progress of file uploads with individual progress bars,
 * cancel buttons, and success/error states.
 */
export function UploadProgress({
  uploads,
  onCancel,
  onRetry,
  onRemove,
  compact = false,
}: UploadProgressProps) {
  const handleCancel = useCallback(
    (id: string) => {
      onCancel?.(id);
    },
    [onCancel]
  );

  const handleRetry = useCallback(
    (id: string) => {
      onRetry?.(id);
    },
    [onRetry]
  );

  const handleRemove = useCallback(
    (id: string) => {
      onRemove?.(id);
    },
    [onRemove]
  );

  if (uploads.length === 0) {
    return null;
  }

  // Calculate overall progress
  const totalProgress =
    uploads.length > 0
      ? Math.round(
          uploads.reduce((sum, u) => sum + u.progress, 0) / uploads.length
        )
      : 0;
  const pendingCount = uploads.filter(
    (u) => u.status === "pending" || u.status === "uploading"
  ).length;
  const successCount = uploads.filter((u) => u.status === "success").length;
  const errorCount = uploads.filter((u) => u.status === "error").length;

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ""}`}>
      {/* Header with overall progress */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.headerTitle}>
            {pendingCount > 0
              ? `Uploading ${pendingCount} file${pendingCount > 1 ? "s" : ""}...`
              : errorCount > 0
                ? `${errorCount} upload${errorCount > 1 ? "s" : ""} failed`
                : `${successCount} file${successCount > 1 ? "s" : ""} uploaded`}
          </span>
          {pendingCount > 0 && (
            <span className={styles.headerProgress}>{totalProgress}%</span>
          )}
        </div>
        {pendingCount > 0 && (
          <div className={styles.overallProgress}>
            <div
              className={styles.overallProgressFill}
              style={{ width: `${totalProgress}%` }}
              role="progressbar"
              aria-valuenow={totalProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}
      </div>

      {/* Individual upload items */}
      <ul className={styles.list}>
        {uploads.map((upload) => (
          <li key={upload.id} className={styles.item}>
            {/* Thumbnail/Icon */}
            <div className={styles.thumbnail}>
              {upload.previewUrl && getFileType(upload.file.type) === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={upload.previewUrl}
                  alt=""
                  className={styles.thumbnailImage}
                />
              ) : (
                <FileTypeIcon type={getFileType(upload.file.type)} />
              )}
            </div>

            {/* File info and progress */}
            <div className={styles.info}>
              <div className={styles.fileName}>{upload.file.name}</div>
              <div className={styles.meta}>
                <span className={styles.fileSize}>
                  {formatFileSize(upload.file.size)}
                </span>
                {upload.status === "uploading" && (
                  <span className={styles.progressText}>{upload.progress}%</span>
                )}
                {upload.status === "success" && (
                  <span className={styles.successText}>Uploaded</span>
                )}
                {upload.status === "error" && (
                  <span className={styles.errorText}>
                    {upload.error || "Failed"}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {(upload.status === "uploading" || upload.status === "pending") && (
                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progressFill} ${upload.status === "pending" ? styles.pending : ""}`}
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              {upload.status === "uploading" && onCancel && (
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => handleCancel(upload.id)}
                  aria-label={`Cancel upload of ${upload.file.name}`}
                  title="Cancel"
                >
                  <CloseIcon />
                </button>
              )}
              {upload.status === "error" && (
                <>
                  {onRetry && (
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => handleRetry(upload.id)}
                      aria-label={`Retry upload of ${upload.file.name}`}
                      title="Retry"
                    >
                      <RetryIcon />
                    </button>
                  )}
                  {onRemove && (
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => handleRemove(upload.id)}
                      aria-label={`Remove ${upload.file.name} from list`}
                      title="Remove"
                    >
                      <CloseIcon />
                    </button>
                  )}
                </>
              )}
              {upload.status === "success" && onRemove && (
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.successIcon}`}
                  onClick={() => handleRemove(upload.id)}
                  aria-label={`Remove ${upload.file.name} from list`}
                  title="Done"
                >
                  <CheckIcon />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Icon components
function FileTypeIcon({ type }: { type: "image" | "video" | "unknown" }) {
  if (type === "video") {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="4" width="16" height="12" rx="2" />
        <polygon points="8,7 14,10 8,13" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="16" height="16" rx="2" />
      <circle cx="7" cy="7" r="2" fill="currentColor" />
      <path d="M18 14L14 10L6 18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M2 2L12 12M12 2L2 12" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 7C1 3.7 3.7 1 7 1C10.3 1 13 3.7 13 7C13 10.3 10.3 13 7 13C5 13 3.3 12 2.2 10.5" />
      <path d="M1 3V7H5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 7L5.5 10.5L12 3.5" />
    </svg>
  );
}
