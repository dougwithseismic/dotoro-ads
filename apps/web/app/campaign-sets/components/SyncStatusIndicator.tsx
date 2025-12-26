"use client";

import type { CampaignSetSyncStatus } from "../types";
import styles from "./SyncStatusIndicator.module.css";

interface SyncStatusIndicatorProps {
  /** The sync status to display */
  syncStatus: CampaignSetSyncStatus;
  /** ISO date string of the last sync time */
  lastSyncedAt?: string;
  /** Whether to show only icon without text */
  compact?: boolean;
}

/**
 * Format a date as relative time (e.g., "5 minutes ago", "2 hours ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Get the display text for a sync status
 */
function getSyncStatusText(
  syncStatus: CampaignSetSyncStatus,
  lastSyncedAt?: string
): string {
  switch (syncStatus) {
    case "pending":
      return "Never Synced";
    case "syncing":
      return "Syncing...";
    case "synced":
      if (lastSyncedAt) {
        return `Synced ${formatRelativeTime(lastSyncedAt)}`;
      }
      return "Synced";
    case "failed":
      return "Sync Failed";
    case "conflict":
      return "Sync Conflict";
    default:
      return syncStatus;
  }
}

/**
 * Get the aria-label for accessibility
 */
function getAriaLabel(
  syncStatus: CampaignSetSyncStatus,
  lastSyncedAt?: string
): string {
  switch (syncStatus) {
    case "pending":
      return "Never Synced";
    case "syncing":
      return "Currently syncing";
    case "synced":
      if (lastSyncedAt) {
        return `Synced ${formatRelativeTime(lastSyncedAt)}`;
      }
      return "Synced";
    case "failed":
      return "Sync Failed";
    case "conflict":
      return "Sync Conflict";
    default:
      return syncStatus;
  }
}

/**
 * Get the icon for each sync status
 */
function getSyncStatusIcon(syncStatus: CampaignSetSyncStatus) {
  switch (syncStatus) {
    case "pending":
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            cx="7"
            cy="7"
            r="5.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        </svg>
      );
    case "syncing":
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className={styles.spinner}
        >
          <path
            d="M1.75 7C1.75 4.1 4.1 1.75 7 1.75C9.275 1.75 11.2 3.15 11.9 5.075"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M12.25 7C12.25 9.9 9.9 12.25 7 12.25C4.725 12.25 2.8 10.85 2.1 8.925"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M9.625 5.25H12.25V2.625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4.375 8.75H1.75V11.375"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "synced":
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            cx="7"
            cy="7"
            r="5.25"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M9.1875 5.6875L6.125 8.75L4.8125 7.4375"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "failed":
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            cx="7"
            cy="7"
            r="5.25"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M9.1875 4.8125L4.8125 9.1875"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M4.8125 4.8125L9.1875 9.1875"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "conflict":
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M7 1.75L12.25 11.375H1.75L7 1.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 5.6875V7.875"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="7" cy="9.625" r="0.5" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * SyncStatusIndicator Component
 *
 * Displays the sync status of a campaign set with an icon and optional timestamp.
 * Shows relative time for the last sync when available.
 */
export function SyncStatusIndicator({
  syncStatus,
  lastSyncedAt,
  compact = false,
}: SyncStatusIndicatorProps) {
  const text = getSyncStatusText(syncStatus, lastSyncedAt);
  const ariaLabel = getAriaLabel(syncStatus, lastSyncedAt);

  return (
    <div
      className={styles.indicator}
      data-sync-status={syncStatus}
      data-compact={compact ? "true" : "false"}
      role="status"
      aria-label={ariaLabel}
    >
      <span className={styles.icon}>{getSyncStatusIcon(syncStatus)}</span>
      {!compact && <span className={styles.text}>{text}</span>}
    </div>
  );
}
