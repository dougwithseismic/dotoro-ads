/**
 * ConfirmDialog Component
 *
 * A reusable confirmation dialog for dangerous or important actions.
 * Supports default and danger variants with proper accessibility.
 */

"use client";

import { useEffect, useCallback, useRef, useId } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  /** default: blue, warning: amber, danger: red */
  variant?: "default" | "warning" | "danger";
  isLoading?: boolean;
}

/**
 * ConfirmDialog - Modal dialog for confirming important actions
 *
 * Features:
 * - Focus trapping within dialog
 * - Escape key to close
 * - Click outside to close
 * - Loading state with disabled buttons
 * - Danger variant with red styling
 * - Full accessibility (ARIA attributes)
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={showDeleteDialog}
 *   onClose={() => setShowDeleteDialog(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Account"
 *   message="Are you sure? This cannot be undone."
 *   variant="danger"
 *   confirmLabel="Delete"
 * />
 * ```
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        onClose();
      }
    },
    [onClose, isLoading]
  );

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Focus the cancel button when dialog opens
      cancelButtonRef.current?.focus();

      // Add escape key listener
      document.addEventListener("keydown", handleKeyDown);

      // Prevent body scroll
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !isLoading) {
      onClose();
    }
  };

  // Stop propagation for dialog content clicks
  const handleDialogClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  if (!isOpen) {
    return null;
  }

  const confirmButtonStyles =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
      : variant === "warning"
        ? "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
        : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";

  return (
    <div
      data-testid="dialog-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="dialog-content"
        onClick={handleDialogClick}
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4"
      >
        {/* Title */}
        <h3
          id={titleId}
          className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2"
        >
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
          {message}
        </p>

        {/* Optional Description */}
        {description && (
          <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-4">
            {description}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`
              px-4 py-2 text-sm font-medium text-white rounded-lg
              transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${confirmButtonStyles}
            `}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span
                  data-testid="confirm-loading"
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                />
                {confirmLabel}
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
