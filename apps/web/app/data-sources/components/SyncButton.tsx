"use client";

import styles from "./SyncButton.module.css";

export type SyncButtonStatus = "idle" | "syncing" | "success" | "error";
export type SyncableDataSourceType = "api" | "google-sheets";

export interface SyncButtonProps {
  /** ID of the data source (used for identification, not currently used in component logic) */
  dataSourceId?: string;
  status: SyncButtonStatus;
  dataSourceType: SyncableDataSourceType;
  onSync: () => Promise<void>;
}

/**
 * Refresh icon for idle state
 */
function RefreshIcon() {
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
        d="M1.75 7C1.75 4.10051 4.10051 1.75 7 1.75C8.92157 1.75 10.5898 2.8069 11.4619 4.375M12.25 7C12.25 9.89949 9.89949 12.25 7 12.25C5.07843 12.25 3.41018 11.1931 2.53809 9.625"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.375 1.75V4.375H8.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.625 12.25V9.625H5.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Spinner icon for syncing state
 */
function SpinnerIcon() {
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
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="22"
        strokeDashoffset="11"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Checkmark icon for success state
 */
function CheckmarkIcon() {
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
        d="M11.375 3.5L5.25 10.5L2.625 7.875"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Warning icon for error state
 */
function WarningIcon() {
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
        d="M7 4.375V7M7 9.625H7.00583"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.06218 1.97485L1.23718 10.4998C1.14607 10.6578 1.09823 10.8364 1.09823 11.0182C1.09823 11.1999 1.14607 11.3785 1.23718 11.5365C1.32829 11.6945 1.45955 11.8266 1.61695 11.9185C1.77435 12.0104 1.9527 12.0589 2.13427 12.0593H11.7843C11.9658 12.0589 12.1442 12.0104 12.3016 11.9185C12.459 11.8266 12.5902 11.6945 12.6814 11.5365C12.7725 11.3785 12.8203 11.1999 12.8203 11.0182C12.8203 10.8364 12.7725 10.6578 12.6814 10.4998L7.85635 1.97485C7.76523 1.81685 7.63397 1.6848 7.47657 1.5929C7.31917 1.50099 7.14082 1.45251 6.95927 1.45251C6.77771 1.45251 6.59936 1.50099 6.44196 1.5929C6.28456 1.6848 6.1533 1.81685 6.06218 1.97485Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * SyncButton component for triggering manual syncs on API and Google Sheets data sources.
 *
 * This component is only rendered for syncable data source types (api, google-sheets).
 * The type system enforces that only syncable types can be passed to this component.
 *
 * @example
 * ```tsx
 * <SyncButton
 *   status="idle"
 *   dataSourceType="api"
 *   onSync={async () => { await triggerSync("123"); }}
 * />
 * ```
 */
export function SyncButton({
  status,
  dataSourceType: _dataSourceType,
  onSync,
}: SyncButtonProps) {
  // dataSourceType is kept in props for potential future use (e.g., type-specific labels)
  // but the type system now enforces only syncable types can be passed

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (status === "syncing") {
      return; // Don't trigger if already syncing
    }
    await onSync();
  };

  const getIcon = () => {
    switch (status) {
      case "idle":
        return <RefreshIcon />;
      case "syncing":
        return <SpinnerIcon />;
      case "success":
        return <CheckmarkIcon />;
      case "error":
        return <WarningIcon />;
    }
  };

  const getText = () => {
    switch (status) {
      case "idle":
        return "Sync";
      case "syncing":
        return "Syncing...";
      case "success":
        return "Synced";
      case "error":
        return "Retry";
    }
  };

  const getAriaLabel = () => {
    switch (status) {
      case "idle":
        return "Sync data source";
      case "syncing":
        return "Syncing data source";
      case "success":
        return "Synced successfully";
      case "error":
        return "Retry sync";
    }
  };

  const isDisabled = status === "syncing";
  const isAutoRevert = status === "success";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`${styles.syncButton} ${styles[`status-${status}`]}`}
      aria-label={getAriaLabel()}
      aria-busy={status === "syncing"}
      data-status={status}
      data-auto-revert={isAutoRevert ? "true" : undefined}
    >
      <span className={styles.icon}>{getIcon()}</span>
      <span className={styles.text}>{getText()}</span>
    </button>
  );
}
