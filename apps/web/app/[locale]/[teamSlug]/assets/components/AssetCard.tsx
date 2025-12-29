"use client";

import { useCallback } from "react";
import Image from "next/image";
import type { Asset } from "../types";
import styles from "./AssetCard.module.css";

interface AssetCardProps {
  /** The asset to display */
  asset: Asset;
  /** Whether the card is selected */
  isSelected?: boolean;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Callback when selection checkbox is clicked */
  onSelect?: (selected: boolean) => void;
  /** Callback for quick view action */
  onQuickView?: () => void;
  /** Callback for delete action */
  onDelete?: () => void;
  /** Optional thumbnail URL (pre-signed) */
  thumbnailUrl?: string;
}

/**
 * AssetCard Component
 *
 * Displays an asset thumbnail with type indicator, name, and quick actions.
 * Supports selection mode for bulk operations.
 */
export function AssetCard({
  asset,
  isSelected = false,
  onClick,
  onSelect,
  onQuickView,
  onDelete,
  thumbnailUrl,
}: AssetCardProps) {
  const isVideo = asset.type === "VIDEO";
  const isCarousel = asset.type === "CAROUSEL";
  const showStatus = asset.status !== "READY";

  /**
   * Handle checkbox click without triggering card click
   */
  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.(!isSelected);
    },
    [isSelected, onSelect]
  );

  /**
   * Handle overlay button clicks without triggering card click
   */
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent, action: () => void) => {
      e.stopPropagation();
      action();
    },
    []
  );

  /**
   * Format duration in MM:SS
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <article
      className={`${styles.card} ${isSelected ? styles.selected : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Asset: ${asset.name}`}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Thumbnail */}
      <div className={styles.thumbnailContainer}>
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={asset.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            className={styles.thumbnail}
          />
        ) : (
          <PlaceholderIcon
            className={styles.placeholderIcon}
            type={asset.type}
          />
        )}
      </div>

      {/* Type badge */}
      <div className={styles.typeBadge} title={asset.type}>
        {isVideo ? <VideoIcon /> : isCarousel ? <CarouselIcon /> : <ImageIcon />}
      </div>

      {/* Duration badge for videos */}
      {isVideo && asset.duration && (
        <div className={styles.durationBadge}>{formatDuration(asset.duration)}</div>
      )}

      {/* Status indicator (for non-ready assets) */}
      {showStatus && (
        <div className={styles.statusIndicator}>
          <span className={`${styles.statusDot} ${styles[asset.status.toLowerCase()]}`} />
          <span className={styles.statusText}>{asset.status}</span>
        </div>
      )}

      {/* Selection checkbox */}
      {onSelect && (
        <button
          type="button"
          className={`${styles.checkbox} ${isSelected ? styles.checked : ""}`}
          onClick={handleCheckboxClick}
          aria-label={isSelected ? "Deselect asset" : "Select asset"}
        >
          <CheckIcon />
        </button>
      )}

      {/* Info bar */}
      <div className={styles.infoBar}>
        <p className={styles.name} title={asset.name}>
          {asset.name}
        </p>
      </div>

      {/* Hover overlay with quick actions */}
      {(onQuickView || onDelete) && (
        <div className={styles.overlay}>
          {onQuickView && (
            <button
              type="button"
              className={styles.overlayButton}
              onClick={(e) => handleOverlayClick(e, onQuickView)}
              aria-label="Quick view"
              title="Quick view"
            >
              <EyeIcon />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className={styles.overlayButton}
              onClick={(e) => handleOverlayClick(e, onDelete)}
              aria-label="Delete asset"
              title="Delete"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// Icon components
function ImageIcon() {
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
      <rect x="1" y="1" width="12" height="12" rx="2" />
      <circle cx="4.5" cy="4.5" r="1" fill="currentColor" />
      <path d="M13 9L10 6L5 11" />
      <path d="M6 11L4 9L1 12" />
    </svg>
  );
}

function VideoIcon() {
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
      <rect x="1" y="2" width="12" height="10" rx="2" />
      <polygon points="6,5 10,7 6,9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CarouselIcon() {
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
      <rect x="3" y="1" width="8" height="10" rx="1" />
      <rect x="1" y="3" width="8" height="10" rx="1" />
    </svg>
  );
}

function PlaceholderIcon({
  className,
  type,
}: {
  className?: string;
  type: string;
}) {
  if (type === "VIDEO") {
    return (
      <svg
        className={className}
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="4" y="8" width="32" height="24" rx="4" />
        <polygon points="17,14 27,20 17,26" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="4" y="4" width="32" height="32" rx="4" />
      <circle cx="14" cy="14" r="3" fill="currentColor" />
      <path d="M36 28L28 18L16 32" />
      <path d="M18 32L12 26L4 34" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6L5 9L10 3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 9C1 9 4 3 9 3C14 3 17 9 17 9C17 9 14 15 9 15C4 15 1 9 1 9Z" />
      <circle cx="9" cy="9" r="3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 5H15" />
      <path d="M6 5V3C6 2.5 6.5 2 7 2H11C11.5 2 12 2.5 12 3V5" />
      <path d="M14 5V15C14 15.5 13.5 16 13 16H5C4.5 16 4 15.5 4 15V5" />
      <path d="M7 8V13" />
      <path d="M11 8V13" />
    </svg>
  );
}
