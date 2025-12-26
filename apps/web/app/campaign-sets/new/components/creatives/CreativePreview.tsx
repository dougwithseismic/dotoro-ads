"use client";

import type { CreativeAsset } from "@repo/core/creatives";
import { formatFileSize, formatDuration } from "@repo/core/creatives";
import styles from "./CreativePreview.module.css";

interface CreativePreviewProps {
  /** The asset to preview */
  asset: CreativeAsset;
  /** Whether to show remove button */
  showRemove?: boolean;
  /** Called when remove is clicked */
  onRemove?: () => void;
  /** Use compact layout */
  compact?: boolean;
  /** Test ID */
  testId?: string;
}

export function CreativePreview({
  asset,
  showRemove = true,
  onRemove,
  compact = false,
  testId = "creative-preview",
}: CreativePreviewProps) {
  const { source, metadata, validation, type, thumbnailUrl } = asset;

  // Determine preview URL
  const previewUrl =
    source.type === "blob"
      ? source.blobUrl
      : source.type === "remote"
        ? source.url
        : source.type === "stored"
          ? source.url
          : null;

  const isVariable = source.type === "variable";
  const isVideo = type === "video";

  return (
    <div
      className={`${styles.container} ${compact ? styles.compact : ""}`}
      data-testid={testId}
      data-compact={compact ? "true" : "false"}
    >
      <div className={styles.content}>
        {/* Preview */}
        <div className={styles.previewArea}>
          {isVariable ? (
            <div className={styles.variablePreview}>
              <div className={styles.variableIcon} data-testid="variable-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </div>
              <span className={styles.variablePattern}>{source.pattern}</span>
            </div>
          ) : isVideo && thumbnailUrl ? (
            <div className={styles.videoPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbnailUrl} alt="Video thumbnail" className={styles.thumbnail} />
              <div className={styles.playOverlay}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              {metadata.duration && (
                <span className={styles.durationBadge}>
                  {formatDuration(metadata.duration)}
                </span>
              )}
            </div>
          ) : previewUrl ? (
            <div className={styles.imagePreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Preview" className={styles.previewImage} />
            </div>
          ) : (
            <div className={styles.placeholder}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className={styles.metadata}>
          {metadata.fileName && (
            <span className={styles.fileName}>{metadata.fileName}</span>
          )}
          <div className={styles.details}>
            {metadata.width && metadata.height && (
              <span className={styles.dimensions}>
                {metadata.width} x {metadata.height}
                {metadata.aspectRatio && !compact && (
                  <span className={styles.aspectRatio}>
                    ({metadata.aspectRatio})
                  </span>
                )}
              </span>
            )}
            {metadata.duration && (
              <span className={styles.duration}>
                {formatDuration(metadata.duration)}
              </span>
            )}
            {metadata.fileSize && (
              <span className={styles.fileSize}>
                {formatFileSize(metadata.fileSize)}
              </span>
            )}
          </div>
        </div>

        {/* Validation status */}
        <div
          className={`${styles.validationStatus} ${validation.isValid ? styles.valid : styles.invalid}`}
          data-testid="validation-status"
          data-valid={validation.isValid ? "true" : "false"}
        >
          {validation.isValid ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2" />
              <circle cx="12" cy="16" r="1" fill="white" />
            </svg>
          )}
        </div>

        {/* Remove button */}
        {showRemove && onRemove && (
          <button
            type="button"
            className={styles.removeButton}
            onClick={onRemove}
            aria-label="Remove"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Validation messages */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className={styles.validationMessages}>
          {validation.errors.map((error, i) => (
            <div key={i} className={styles.errorMessage}>
              {error.message}
            </div>
          ))}
          {validation.warnings.map((warning, i) => (
            <div key={i} className={styles.warningMessage}>
              {warning.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
