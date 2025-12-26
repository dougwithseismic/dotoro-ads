"use client";

import type { CampaignSetStatus, CampaignStatus } from "../types";
import styles from "./StatusBadge.module.css";

interface StatusBadgeProps {
  /** The status to display */
  status: CampaignSetStatus | CampaignStatus;
  /** Size variant - sm for compact views, md for default */
  size?: "sm" | "md";
}

/**
 * Get the human-readable label for a status
 */
function getStatusLabel(status: CampaignSetStatus | CampaignStatus): string {
  const labels: Record<string, string> = {
    draft: "Draft",
    pending: "Pending",
    syncing: "Syncing",
    active: "Active",
    paused: "Paused",
    completed: "Completed",
    archived: "Archived",
    error: "Error",
  };
  return labels[status] || status;
}

/**
 * Get the appropriate icon for each status
 */
function getStatusIcon(status: CampaignSetStatus | CampaignStatus) {
  switch (status) {
    case "draft":
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
            d="M10.5 1.75L12.25 3.5L5.25 10.5H3.5V8.75L10.5 1.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
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
          />
          <path
            d="M7 4.375V7L8.75 8.75"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
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
    case "active":
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
            d="M11.8125 4.375L5.6875 10.5L2.1875 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "paused":
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="3.5"
            y="2.625"
            width="2.625"
            height="8.75"
            rx="0.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect
            x="7.875"
            y="2.625"
            width="2.625"
            height="8.75"
            rx="0.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "completed":
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
    case "archived":
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
            d="M12.25 4.375V11.375C12.25 11.8582 11.8582 12.25 11.375 12.25H2.625C2.14175 12.25 1.75 11.8582 1.75 11.375V4.375"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.125 1.75H0.875V4.375H13.125V1.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.6875 7H8.3125"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "error":
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
            d="M7 4.375V7.4375"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="7" cy="9.625" r="0.75" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * StatusBadge Component
 *
 * Displays a status indicator badge with an icon and label.
 * Used to show campaign set and campaign status throughout the UI.
 */
export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const label = getStatusLabel(status);

  return (
    <div
      className={styles.badge}
      data-status={status}
      data-size={size}
      role="status"
      aria-label={label}
    >
      <span className={styles.icon}>{getStatusIcon(status)}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
