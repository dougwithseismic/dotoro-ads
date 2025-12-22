"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./BatchActions.module.css";

interface BatchActionsProps {
  selectedCount: number;
  pendingCount: number;
  onSync: () => void;
  onSyncAllPending: () => void;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isSyncing?: boolean;
}

export function BatchActions({
  selectedCount,
  pendingCount,
  onSync,
  onSyncAllPending,
  onPause,
  onResume,
  onDelete,
  onClearSelection,
  isSyncing = false,
}: BatchActionsProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsDropdownOpen(false);
  };

  // Show compact version when nothing selected but pending count > 0
  if (selectedCount === 0) {
    if (pendingCount === 0) return null;

    return (
      <div className={styles.toolbar} role="toolbar" aria-label="Batch actions">
        <span className={styles.pendingInfo}>
          {pendingCount} campaign{pendingCount === 1 ? "" : "s"} pending sync
        </span>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.syncAllButton}
            onClick={onSyncAllPending}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
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
                Syncing...
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 4L14 2M14 2L14 5M14 2L11 2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Sync All Pending
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Batch actions">
      <span className={styles.count}>{selectedCount} selected</span>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.syncButton}
          onClick={onSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
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
              Syncing...
            </>
          ) : (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 4L14 2M14 2L14 5M14 2L11 2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Sync Selected
            </>
          )}
        </button>

        <div className={styles.dropdownContainer}>
          <button
            ref={buttonRef}
            type="button"
            className={styles.moreButton}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isSyncing}
            aria-expanded={isDropdownOpen}
            aria-haspopup="menu"
            aria-label="More actions"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="3" cy="8" r="1.5" fill="currentColor" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
              <circle cx="13" cy="8" r="1.5" fill="currentColor" />
            </svg>
            More
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className={isDropdownOpen ? styles.rotated : ""}
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {isDropdownOpen && (
            <div ref={dropdownRef} className={styles.dropdown} role="menu">
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => handleAction(onPause)}
                role="menuitem"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <rect x="4" y="3" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="9" y="3" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                Pause Selected
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => handleAction(onResume)}
                role="menuitem"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M5 3L13 8L5 13V3Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Resume Selected
              </button>
              <div className={styles.dropdownDivider} />
              <button
                type="button"
                className={`${styles.dropdownItem} ${styles.danger}`}
                onClick={() => handleAction(onDelete)}
                role="menuitem"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M2 4H14M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Delete Selected
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className={styles.clearButton}
          onClick={onClearSelection}
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
}
