"use client";

import { useEffect, useState, useCallback, useRef, useId } from "react";
import { AlertTriangle, X, ArrowRight, AlertCircle } from "lucide-react";
import { useDeletionPreview, useDeleteAccount } from "@/lib/hooks/useAccountDeletion";
import type { TeamToDelete, TeamToTransfer, TeamToLeave } from "@/lib/api/users";
import styles from "./DeleteAccountModal.module.css";

interface DeleteAccountModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Current user's email for confirmation */
  userEmail: string;
}

/**
 * DeleteAccountModal Component
 *
 * Modal dialog for confirming account deletion. Shows:
 * - Warning about permanent deletion
 * - Teams that will be deleted (user is sole member)
 * - Teams where ownership will be transferred
 * - Teams user will leave
 * - Email confirmation input
 *
 * Features:
 * - Fetches deletion preview when opened
 * - Email validation before enabling delete
 * - Loading and error states
 * - Proper accessibility (ARIA, focus management, keyboard, focus trapping)
 *
 * @example
 * ```tsx
 * <DeleteAccountModal
 *   isOpen={showDeleteModal}
 *   onClose={() => setShowDeleteModal(false)}
 *   userEmail={user.email}
 * />
 * ```
 */
export function DeleteAccountModal({
  isOpen,
  onClose,
  userEmail,
}: DeleteAccountModalProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [confirmEmail, setConfirmEmail] = useState("");
  const [showEmailError, setShowEmailError] = useState(false);

  const {
    data: preview,
    isLoading: isLoadingPreview,
    error: previewError,
    fetchPreview,
  } = useDeletionPreview();

  const {
    deleteAccount,
    isLoading: isDeleting,
    error: deleteError,
    reset: resetDeleteError,
  } = useDeleteAccount();

  // Check if email matches (case-insensitive)
  const emailMatches =
    confirmEmail.toLowerCase().trim() === userEmail.toLowerCase().trim();

  // Fetch preview when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPreview();
      setConfirmEmail("");
      setShowEmailError(false);
      resetDeleteError();
    }
  }, [isOpen, fetchPreview, resetDeleteError]);

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen && !isLoadingPreview && !previewError) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen, isLoadingPreview, previewError]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && !isDeleting) {
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
  }, [isOpen, isDeleting, onClose]);

  // Focus trap - keep focus within the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleFocusTrap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab on first element: move to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      // Tab on last element: move to first
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleFocusTrap);
    return () => document.removeEventListener("keydown", handleFocusTrap);
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget && !isDeleting) {
        onClose();
      }
    },
    [isDeleting, onClose]
  );

  // Handle close button click
  const handleClose = useCallback(() => {
    if (!isDeleting) {
      onClose();
    }
  }, [isDeleting, onClose]);

  // Handle email input blur
  const handleEmailBlur = useCallback(() => {
    if (confirmEmail && !emailMatches) {
      setShowEmailError(true);
    } else {
      setShowEmailError(false);
    }
  }, [confirmEmail, emailMatches]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (emailMatches) {
      await deleteAccount(confirmEmail);
    }
  }, [emailMatches, confirmEmail, deleteAccount]);

  if (!isOpen) {
    return null;
  }

  const hasTeamsToDelete = preview?.teamsToDelete && preview.teamsToDelete.length > 0;
  const hasTeamsToTransfer = preview?.teamsToTransfer && preview.teamsToTransfer.length > 0;
  const hasTeamsToLeave = preview?.teamsToLeave && preview.teamsToLeave.length > 0;

  return (
    <div
      data-testid="modal-overlay"
      className={styles.overlay}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            <AlertTriangle className={styles.titleIcon} aria-hidden="true" />
            Delete Your Account
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isDeleting}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Loading state */}
          {isLoadingPreview && (
            <div className={styles.loading}>
              <div data-testid="loading-spinner" className={styles.spinner} />
              <p className={styles.loadingText}>Loading account information...</p>
            </div>
          )}

          {/* Error state */}
          {previewError && !isLoadingPreview && (
            <div className={styles.error}>
              <AlertCircle className={styles.errorIcon} />
              <p className={styles.errorText}>{previewError}</p>
              <button
                type="button"
                className={styles.retryButton}
                onClick={fetchPreview}
              >
                Retry
              </button>
            </div>
          )}

          {/* Content when loaded */}
          {preview && !isLoadingPreview && !previewError && (
            <>
              {/* Warning message */}
              <div className={styles.warning}>
                <AlertCircle className={styles.warningIcon} aria-hidden="true" />
                <p className={styles.warningText}>
                  This action is permanent and cannot be undone. Your account and all
                  associated data will be permanently deleted.
                </p>
              </div>

              {/* Teams to delete */}
              {hasTeamsToDelete && (
                <div className={styles.teamSection}>
                  <h3 className={styles.teamSectionTitle}>
                    Teams that will be deleted
                  </h3>
                  <ul className={styles.teamList}>
                    {preview.teamsToDelete.map((team: TeamToDelete) => (
                      <li key={team.id} className={`${styles.teamItem} ${styles.teamDelete}`}>
                        <span className={styles.teamName}>{team.name}</span>
                        <span className={styles.teamMeta}>{team.memberCount} member</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Teams to transfer */}
              {hasTeamsToTransfer && (
                <div className={styles.teamSection}>
                  <h3 className={styles.teamSectionTitle}>
                    Ownership will be transferred
                  </h3>
                  <ul className={styles.teamList}>
                    {preview.teamsToTransfer.map((team: TeamToTransfer) => (
                      <li key={team.id} className={`${styles.teamItem} ${styles.teamTransfer}`}>
                        <div>
                          <span className={styles.teamName}>{team.name}</span>
                          <span className={styles.teamMeta}> ({team.memberCount} members)</span>
                        </div>
                        <span className={styles.transferTo}>
                          <ArrowRight size={12} aria-hidden="true" />
                          {team.newOwner.email}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Teams to leave */}
              {hasTeamsToLeave && (
                <div className={styles.teamSection}>
                  <h3 className={styles.teamSectionTitle}>Teams you will leave</h3>
                  <ul className={styles.teamList}>
                    {preview.teamsToLeave.map((team: TeamToLeave) => (
                      <li key={team.id} className={styles.teamItem}>
                        <span className={styles.teamName}>{team.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Email confirmation */}
              <div className={styles.confirmSection}>
                <label htmlFor="confirm-email" className={styles.confirmLabel}>
                  To confirm, type your email: <strong>{userEmail}</strong>
                </label>
                <input
                  id="confirm-email"
                  type="email"
                  className={styles.confirmInput}
                  value={confirmEmail}
                  onChange={(e) => {
                    setConfirmEmail(e.target.value);
                    setShowEmailError(false);
                  }}
                  onBlur={handleEmailBlur}
                  placeholder={userEmail}
                  disabled={isDeleting}
                  autoComplete="off"
                />
                {showEmailError && (
                  <p className={styles.confirmError}>Email does not match your account email</p>
                )}
              </div>

              {/* Delete error */}
              {deleteError && (
                <div className={styles.deleteError}>{deleteError}</div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {preview && !isLoadingPreview && !previewError && (
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={handleDelete}
              disabled={!emailMatches || isDeleting}
            >
              {isDeleting ? (
                <>
                  <span className={styles.buttonSpinner} />
                  Deleting...
                </>
              ) : (
                "Delete My Account"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
