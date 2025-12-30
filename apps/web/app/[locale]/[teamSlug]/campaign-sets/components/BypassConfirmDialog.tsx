"use client";

import { useId, useEffect, useRef } from "react";
import styles from "./BypassConfirmDialog.module.css";

/**
 * Props for BypassConfirmDialog component
 */
interface BypassConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when the dialog should be closed */
  onClose: () => void;
  /** Called when user confirms bypass */
  onConfirm: () => void;
  /** Number of ads that will be skipped */
  skippedCount: number;
  /** Total number of ads */
  totalCount: number;
}

/**
 * BypassConfirmDialog Component
 *
 * Confirmation dialog shown when user chooses to sync anyway despite skipped ads.
 * Warns about the impact of bypassing validation.
 */
export function BypassConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  skippedCount,
  totalCount,
}: BypassConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement;
    dialogRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const skipRate = totalCount > 0 ? Math.round((skippedCount / totalCount) * 100) : 0;
  const syncCount = totalCount - skippedCount;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon */}
        <div className={styles.iconContainer}>
          <WarningIcon />
        </div>

        {/* Content */}
        <h2 id={titleId} className={styles.title}>
          Sync with Skipped Ads?
        </h2>

        <p id={descriptionId} className={styles.description}>
          {skippedCount} of {totalCount} ads ({skipRate}%) will be skipped due to validation errors.
          Only {syncCount} ads will be synced to the platform.
        </p>

        <div className={styles.warningBox}>
          <p className={styles.warningText}>
            <strong>Important:</strong> Skipped ads will not be created in your ad account.
            You may want to fix the validation errors first for a complete sync.
          </p>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className={styles.confirmButton}
            onClick={onConfirm}
            type="button"
          >
            Sync {syncCount} Ads Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
