import { useEffect, useRef } from "react";
import type { SyncHistoryEntry } from "../types";
import styles from "./SyncHistoryModal.module.css";

interface SyncHistoryModalProps {
  isOpen: boolean;
  accountName: string;
  history: SyncHistoryEntry[];
  onClose: () => void;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SyncEntry({ entry }: { entry: SyncHistoryEntry }) {
  const { timestamp, status, campaignsSynced, errorMessage } = entry;

  return (
    <div className={styles.entry} data-status={status}>
      <div className={styles.entryHeader}>
        <span className={styles.timestamp}>{formatTimestamp(timestamp)}</span>
        <span className={styles.statusBadge} data-status={status}>
          {status === "success" ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 6L5 8.5L9.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Success
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3.5 3.5L8.5 8.5M8.5 3.5L3.5 8.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Failed
            </>
          )}
        </span>
      </div>

      {status === "success" && campaignsSynced !== undefined && (
        <p className={styles.entryDetail}>
          {campaignsSynced} campaign{campaignsSynced === 1 ? "" : "s"} synced
        </p>
      )}

      {status === "failed" && errorMessage && (
        <p className={styles.errorMessage}>{errorMessage}</p>
      )}
    </div>
  );
}

export function SyncHistoryModal({
  isOpen,
  accountName,
  history,
  onClose,
}: SyncHistoryModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-history-title"
        className={styles.modal}
      >
        <div className={styles.header}>
          <h2 id="sync-history-title" className={styles.title}>
            Sync History: {accountName}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          {history.length === 0 ? (
            <div className={styles.empty}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2" />
                <path d="M20 12V20L26 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p>No sync history available</p>
            </div>
          ) : (
            <div className={styles.list}>
              {history.map((entry) => (
                <SyncEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
