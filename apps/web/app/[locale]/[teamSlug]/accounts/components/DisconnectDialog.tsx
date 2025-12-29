import { useEffect, useRef } from "react";
import styles from "./DisconnectDialog.module.css";

interface DisconnectDialogProps {
  isOpen: boolean;
  accountName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DisconnectDialog({
  isOpen,
  accountName,
  onConfirm,
  onCancel,
  isLoading = false,
}: DisconnectDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onCancel();
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
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="disconnect-dialog-title"
        aria-describedby="disconnect-dialog-description"
        className={styles.dialog}
      >
        <div className={styles.content}>
          <div className={styles.iconWrapper}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M12 8V12M12 16V16.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h2 id="disconnect-dialog-title" className={styles.title}>
            Disconnect Account
          </h2>

          <p id="disconnect-dialog-description" className={styles.description}>
            Are you sure you want to disconnect <strong>{accountName}</strong>?
          </p>

          <p className={styles.warning}>
            This action cannot be undone. All synced data and campaigns associated
            with this account will be removed.
          </p>

          <div className={styles.actions}>
            <button
              ref={cancelButtonRef}
              type="button"
              className={styles.cancelButton}
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.disconnectButton}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
