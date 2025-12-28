"use client";

import { AlertTriangle } from "lucide-react";
import styles from "./DeleteAccountSection.module.css";

interface DeleteAccountSectionProps {
  /** Callback when delete button is clicked - should open confirmation modal */
  onDeleteClick: () => void;
}

/**
 * DeleteAccountSection Component
 *
 * Danger zone section displayed at the bottom of the profile settings page.
 * Contains a warning message and delete button that opens the confirmation modal.
 *
 * Styling:
 * - Red border and subtle red background to indicate danger zone
 * - Warning icon and clear messaging about permanent deletion
 * - Destructive button styling
 *
 * @example
 * ```tsx
 * <DeleteAccountSection
 *   onDeleteClick={() => setShowDeleteModal(true)}
 * />
 * ```
 */
export function DeleteAccountSection({ onDeleteClick }: DeleteAccountSectionProps) {
  return (
    <section
      data-testid="delete-account-section"
      className={styles.section}
      aria-labelledby="danger-zone-title"
    >
      <div className={styles.header}>
        <AlertTriangle
          data-testid="warning-icon"
          className={styles.warningIcon}
          aria-hidden="true"
        />
        <h3 id="danger-zone-title" className={styles.title}>
          Danger Zone
        </h3>
      </div>

      <p className={styles.description}>
        Once you delete your account, there is no going back. This action cannot be undone
        and will permanently delete your account, including all associated data.
      </p>

      <button
        type="button"
        className={styles.button}
        onClick={onDeleteClick}
        aria-describedby="danger-zone-title"
      >
        Delete Account
      </button>
    </section>
  );
}
