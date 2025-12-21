"use client";

import styles from "./BatchActions.module.css";

interface BatchActionsProps {
  selectedCount: number;
  onSync: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isSyncing?: boolean;
}

export function BatchActions({
  selectedCount,
  onSync,
  onDelete,
  onClearSelection,
  isSyncing = false,
}: BatchActionsProps) {
  if (selectedCount === 0) {
    return null;
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

        <button
          type="button"
          className={styles.deleteButton}
          onClick={onDelete}
          disabled={isSyncing}
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
