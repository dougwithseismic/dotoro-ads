"use client";

import type { CampaignSet } from "../types";
import { StatusBadge } from "./StatusBadge";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import styles from "./CampaignSetHeader.module.css";

interface CampaignSetHeaderProps {
  /** The campaign set to display */
  set: CampaignSet;
  /** Handler for sync all action */
  onSync: () => void;
  /** Handler for pause all action */
  onPause: () => void;
  /** Handler for resume all action */
  onResume: () => void;
  /** Handler for edit action */
  onEdit: () => void;
  /** Handler for archive action */
  onArchive: () => void;
  /** Whether a sync operation is in progress */
  isSyncing: boolean;
}

/**
 * CampaignSetHeader Component
 *
 * Header section for the campaign set detail page.
 * Shows name, description, status, and action buttons.
 */
export function CampaignSetHeader({
  set,
  onSync,
  onPause,
  onResume,
  onEdit,
  onArchive,
  isSyncing,
}: CampaignSetHeaderProps) {
  const isPaused = set.status === "paused";
  const canPauseResume = set.status === "active" || set.status === "paused";

  return (
    <header className={styles.header} role="banner">
      <div className={styles.content}>
        <div className={styles.titleSection}>
          <div className={styles.titleRow}>
            <h1 className={styles.name}>{set.name}</h1>
            <StatusBadge status={set.status} />
          </div>
          {set.description && (
            <p className={styles.description}>{set.description}</p>
          )}
          <div className={styles.syncStatus}>
            <SyncStatusIndicator
              syncStatus={isSyncing ? "syncing" : set.syncStatus}
              lastSyncedAt={set.lastSyncedAt ?? undefined}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={onSync}
            disabled={isSyncing}
            type="button"
          >
            {isSyncing ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                Syncing...
              </>
            ) : (
              <>
                <SyncIcon />
                Sync All
              </>
            )}
          </button>

          {canPauseResume && (
            isPaused ? (
              <button
                className={styles.secondaryButton}
                onClick={onResume}
                disabled={isSyncing}
                type="button"
              >
                <PlayIcon />
                Resume All
              </button>
            ) : (
              <button
                className={styles.secondaryButton}
                onClick={onPause}
                disabled={isSyncing}
                type="button"
              >
                <PauseIcon />
                Pause All
              </button>
            )
          )}

          <button
            className={styles.secondaryButton}
            onClick={onEdit}
            type="button"
          >
            <EditIcon />
            Edit
          </button>

          <button
            className={styles.dangerButton}
            onClick={onArchive}
            type="button"
          >
            <ArchiveIcon />
            Archive
          </button>
        </div>
      </div>
    </header>
  );
}

// Icon components
function SyncIcon() {
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
        d="M2 8C2 4.68629 4.68629 2 8 2C10.6 2 12.8 3.6 13.6 5.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 8C14 11.3137 11.3137 14 8 14C5.4 14 3.2 12.4 2.4 10.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11 6H14V3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 10H2V13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="3"
        width="3"
        height="10"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="9"
        y="3"
        width="3"
        height="10"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function PlayIcon() {
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
        d="M4 3L13 8L4 13V3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon() {
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
        d="M11.5 2.5L13.5 4.5L6 12H4V10L11.5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 4.5L11.5 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArchiveIcon() {
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
        d="M14 5V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 2H1V5H15V2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 8H9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
