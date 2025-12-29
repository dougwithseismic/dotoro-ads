"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import type { Asset, AssetWithUrl } from "../types";
import styles from "./AssetPreviewModal.module.css";

interface AssetPreviewModalProps {
  /** The asset to preview */
  asset: Asset | AssetWithUrl;
  /** Download URL for the full asset */
  downloadUrl?: string;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback for next asset (optional, for gallery mode) */
  onNext?: () => void;
  /** Callback for previous asset (optional, for gallery mode) */
  onPrevious?: () => void;
  /** Whether there is a next asset */
  hasNext?: boolean;
  /** Whether there is a previous asset */
  hasPrevious?: boolean;
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
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format duration in MM:SS
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * AssetPreviewModal Component
 *
 * Lightbox-style preview modal for viewing assets at full resolution.
 * Supports images and videos with metadata display and keyboard navigation.
 */
export function AssetPreviewModal({
  asset,
  downloadUrl,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: AssetPreviewModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isVideo = asset.type === "VIDEO";

  // Get the URL to display
  const displayUrl =
    downloadUrl ||
    ("downloadUrl" in asset ? asset.downloadUrl : undefined);

  /**
   * Handle keyboard navigation
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
          if (hasNext && onNext) {
            e.preventDefault();
            onNext();
          }
          break;
        case "ArrowLeft":
          if (hasPrevious && onPrevious) {
            e.preventDefault();
            onPrevious();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onNext, onPrevious, hasNext, hasPrevious]);

  /**
   * Prevent body scroll when modal is open
   */
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  /**
   * Handle overlay click to close
   */
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${asset.name}`}
    >
      {/* Close button */}
      <button
        type="button"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close preview"
      >
        <CloseIcon />
      </button>

      {/* Navigation arrows */}
      {hasPrevious && onPrevious && (
        <button
          type="button"
          className={`${styles.navButton} ${styles.prevButton}`}
          onClick={onPrevious}
          aria-label="Previous asset"
        >
          <ChevronLeftIcon />
        </button>
      )}
      {hasNext && onNext && (
        <button
          type="button"
          className={`${styles.navButton} ${styles.nextButton}`}
          onClick={onNext}
          aria-label="Next asset"
        >
          <ChevronRightIcon />
        </button>
      )}

      {/* Main content area */}
      <div className={styles.content}>
        {/* Preview area */}
        <div className={styles.previewArea}>
          {displayUrl ? (
            isVideo ? (
              <video
                className={styles.video}
                src={displayUrl}
                controls
                autoPlay
                playsInline
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className={styles.imageContainer}>
                <Image
                  src={displayUrl}
                  alt={asset.name}
                  fill
                  sizes="90vw"
                  className={styles.image}
                  priority
                />
              </div>
            )
          ) : (
            <div className={styles.placeholder}>
              <PlaceholderIcon type={asset.type} />
              <p>Preview not available</p>
            </div>
          )}
        </div>

        {/* Metadata sidebar */}
        <aside className={styles.sidebar}>
          <h2 className={styles.assetName}>{asset.name}</h2>

          <dl className={styles.metadataList}>
            {/* Type */}
            <div className={styles.metadataItem}>
              <dt>Type</dt>
              <dd>
                <span className={styles.badge}>{asset.type}</span>
              </dd>
            </div>

            {/* Dimensions */}
            {(asset.width || asset.height) && (
              <div className={styles.metadataItem}>
                <dt>Dimensions</dt>
                <dd>
                  {asset.width} x {asset.height} px
                </dd>
              </div>
            )}

            {/* Duration (for videos) */}
            {isVideo && asset.duration && (
              <div className={styles.metadataItem}>
                <dt>Duration</dt>
                <dd>{formatDuration(asset.duration)}</dd>
              </div>
            )}

            {/* File size */}
            <div className={styles.metadataItem}>
              <dt>Size</dt>
              <dd>{formatFileSize(asset.fileSize)}</dd>
            </div>

            {/* MIME type */}
            <div className={styles.metadataItem}>
              <dt>Format</dt>
              <dd>{asset.mimeType}</dd>
            </div>

            {/* Created date */}
            <div className={styles.metadataItem}>
              <dt>Uploaded</dt>
              <dd>{formatDate(asset.createdAt)}</dd>
            </div>

            {/* Status */}
            {asset.status !== "READY" && (
              <div className={styles.metadataItem}>
                <dt>Status</dt>
                <dd>
                  <span className={`${styles.statusBadge} ${styles[asset.status.toLowerCase()]}`}>
                    {asset.status}
                  </span>
                </dd>
              </div>
            )}

            {/* Tags */}
            {asset.tags.length > 0 && (
              <div className={styles.metadataItem}>
                <dt>Tags</dt>
                <dd className={styles.tagList}>
                  {asset.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>

          {/* Actions */}
          {displayUrl && (
            <div className={styles.actions}>
              <a
                href={displayUrl}
                download={asset.name}
                className={styles.downloadButton}
                target="_blank"
                rel="noopener noreferrer"
              >
                <DownloadIcon />
                Download
              </a>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// Icon components
function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 4L16 16M16 4L4 16" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 6L9 12L15 18" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 6L15 12L9 18" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3V10" />
      <path d="M4 7L8 11L12 7" />
      <path d="M3 14H13" />
    </svg>
  );
}

function PlaceholderIcon({ type }: { type: string }) {
  if (type === "VIDEO") {
    return (
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="8" y="14" width="48" height="36" rx="4" />
        <polygon points="26,24 42,32 26,40" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="8" y="8" width="48" height="48" rx="4" />
      <circle cx="22" cy="22" r="5" fill="currentColor" />
      <path d="M56 44L44 30L24 52" />
      <path d="M28 52L20 42L8 54" />
    </svg>
  );
}
