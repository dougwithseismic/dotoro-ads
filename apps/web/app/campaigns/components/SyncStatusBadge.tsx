"use client";

import type { CampaignSyncStatus } from "../types";
import styles from "./SyncStatusBadge.module.css";

interface SyncStatusBadgeProps {
  status: CampaignSyncStatus;
  message?: string;
  compact?: boolean;
}

export function SyncStatusBadge({
  status,
  message,
  compact = false,
}: SyncStatusBadgeProps) {
  const getIcon = () => {
    switch (status) {
      case "draft":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 2L14 4L6 12H4V10L12 2Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "pending_sync":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className={styles.spinner}
          >
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="25.1327"
              strokeDashoffset="12.5664"
              strokeLinecap="round"
            />
          </svg>
        );
      case "synced":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M13.5 4.5L6 12L2.5 8.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "sync_error":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
    }
  };

  const getDefaultMessage = () => {
    switch (status) {
      case "draft":
        return "Draft";
      case "pending_sync":
        return "Pending Sync";
      case "synced":
        return "Synced";
      case "sync_error":
        return "Sync Error";
    }
  };

  return (
    <div
      className={styles.badge}
      data-status={status}
      role="status"
      aria-label={message || getDefaultMessage()}
    >
      <span className={styles.icon}>{getIcon()}</span>
      {!compact && (
        <span className={styles.message}>{message || getDefaultMessage()}</span>
      )}
    </div>
  );
}
