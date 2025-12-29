"use client";

import { useState, useEffect, useRef, useId } from "react";
import { AlertTriangle } from "lucide-react";
import type { Team } from "@/lib/teams/types";
import styles from "./LeaveTeamDialog.module.css";

export interface LeaveTeamDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Team to leave */
  team: Team;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when user confirms leaving the team */
  onConfirm: () => Promise<void>;
}

/**
 * LeaveTeamDialog Component
 *
 * Confirmation dialog for leaving a team.
 * Shows warning about losing access and handles loading/error states.
 */
export function LeaveTeamDialog({
  isOpen,
  team,
  onClose,
  onConfirm,
}: LeaveTeamDialogProps) {
  const titleId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus cancel button when dialog opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      const timeoutId = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleFocusTrap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleFocusTrap);
    return () => document.removeEventListener("keydown", handleFocusTrap);
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, isLoading, onClose]);

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError("Failed to leave team. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !isLoading) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
      data-testid="dialog-overlay"
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon */}
        <div className={styles.iconContainer}>
          <AlertTriangle className={styles.warningIcon} aria-hidden="true" />
        </div>

        {/* Title */}
        <h2 id={titleId} className={styles.title}>
          Leave {team.name}?
        </h2>

        {/* Message */}
        <p className={styles.message}>
          You will lose access to all resources in <strong>{team.name}</strong>.
          This action cannot be undone. You will need to be re-invited to rejoin this team.
        </p>

        {/* Error Message */}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button
            ref={cancelButtonRef}
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Leaving..." : "Leave Team"}
          </button>
        </div>
      </div>
    </div>
  );
}
