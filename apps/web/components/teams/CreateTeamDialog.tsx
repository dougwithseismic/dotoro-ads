/**
 * CreateTeamDialog Component
 *
 * Modal dialog for creating a new team with name, slug, and description fields.
 * Features:
 * - Automatic slug generation from team name
 * - Form validation with error messages
 * - Loading state during submission
 * - Accessible with proper ARIA attributes and keyboard navigation
 */

"use client";

import { useState, useEffect, useCallback, useRef, useId, type FormEvent } from "react";
import { useCreateTeam } from "@/lib/hooks/useCreateTeam";
import type { TeamDetail } from "@/lib/teams/types";
import styles from "./CreateTeamDialog.module.css";

interface CreateTeamDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when team is successfully created */
  onSuccess?: (team: TeamDetail) => void;
}

/** Maximum character limits for form fields */
const MAX_NAME_LENGTH = 255;
const MAX_SLUG_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;

/** Character count threshold to show the counter */
const CHAR_COUNT_THRESHOLD = 200;

/**
 * Generate a URL-safe slug from a string
 * - Converts to lowercase
 * - Replaces non-alphanumeric characters with hyphens
 * - Removes consecutive hyphens
 * - Trims leading/trailing hyphens
 */
function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/-+/g, "-") // Remove consecutive hyphens
    .replace(/^-|-$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Normalize a slug input to valid format (during typing)
 * - Converts to lowercase
 * - Only allows letters, numbers, and hyphens
 * - Preserves hyphens during input (we don't trim during typing)
 */
function normalizeSlug(input: string): string {
  // Only remove truly invalid characters, keep hyphens the user typed
  // Don't trim hyphens during typing - they might be in the middle of input
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, ""); // Remove invalid chars only
}

/**
 * Clean a slug for final use (trims hyphens)
 */
function cleanSlug(input: string): string {
  return input.replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
}

/**
 * CreateTeamDialog - Modal for creating a new team
 *
 * @example
 * ```tsx
 * <CreateTeamDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onSuccess={(team) => router.push(`/settings/team?teamId=${team.id}`)}
 * />
 * ```
 */
export function CreateTeamDialog({
  isOpen,
  onClose,
  onSuccess,
}: CreateTeamDialogProps) {
  const titleId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const { createTeam, isLoading, error: apiError, reset: resetHook } = useCreateTeam();

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setSlug("");
      setDescription("");
      setSlugManuallyEdited(false);
      setNameError(null);
      setFormError(null);
      resetHook();
    }
  }, [isOpen, resetHook]);

  // Reference to the dialog container for focus trapping
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus first input when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure dialog is rendered
      const timeoutId = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Focus trap - keep focus within the dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleFocusTrap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

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

  // Handle name change with auto-slug generation
  const handleNameChange = useCallback((value: string) => {
    const truncated = value.slice(0, MAX_NAME_LENGTH);
    setName(truncated);
    setNameError(null);
    setFormError(null);

    // Auto-generate slug if not manually edited
    if (!slugManuallyEdited) {
      setSlug(generateSlug(truncated));
    }
  }, [slugManuallyEdited]);

  // Handle slug change
  const handleSlugChange = useCallback((value: string) => {
    const normalized = normalizeSlug(value.slice(0, MAX_SLUG_LENGTH));
    setSlug(normalized);
    setSlugManuallyEdited(true);
    setFormError(null);
  }, []);

  // Handle description change
  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value.slice(0, MAX_DESCRIPTION_LENGTH));
    setFormError(null);
  }, []);


  // Validate form
  const validateForm = (): boolean => {
    if (!name.trim()) {
      setNameError("Team name is required");
      return false;
    }
    setNameError(null);
    return true;
  };

  // Handle form submission
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Clean the slug before submission (trim leading/trailing hyphens)
      const cleanedSlug = cleanSlug(slug);
      const team = await createTeam({
        name: name.trim(),
        slug: cleanedSlug || undefined,
        description: description.trim() || undefined,
      });

      onSuccess?.(team);
      onClose();
    } catch (err) {
      // Error is handled by the hook and displayed via apiError
      // Check if it's a slug-specific error
      const errorMessage = err instanceof Error ? err.message : "Failed to create team";
      if (errorMessage.toLowerCase().includes("slug")) {
        // Keep error in form error area to show near slug field
        setFormError(errorMessage);
      } else {
        setFormError(errorMessage);
      }
    }
  };

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  // Determine if slug error should show
  const isSlugError = formError?.toLowerCase().includes("slug") || apiError?.toLowerCase().includes("slug");
  const displayError = formError || apiError;

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
        {/* Header */}
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Create Team
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close dialog"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.content}>
            {/* Team Name Field */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="team-name" className={styles.label}>
                  Team Name
                </label>
                {name.length >= CHAR_COUNT_THRESHOLD && (
                  <span
                    className={`${styles.charCount} ${name.length >= MAX_NAME_LENGTH - 15 ? styles.charCountWarning : ""}`}
                  >
                    {name.length}/{MAX_NAME_LENGTH}
                  </span>
                )}
              </div>
              <input
                ref={nameInputRef}
                id="team-name"
                type="text"
                className={`${styles.input} ${nameError ? styles.inputError : ""}`}
                placeholder="Enter team name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={isLoading}
                maxLength={MAX_NAME_LENGTH}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "name-error" : undefined}
              />
              {nameError && (
                <p id="name-error" className={styles.errorMessage} role="alert">
                  {nameError}
                </p>
              )}
            </div>

            {/* Slug Field */}
            <div className={styles.field}>
              <label htmlFor="team-slug" className={styles.label}>
                URL Slug
              </label>
              <input
                id="team-slug"
                type="text"
                className={`${styles.input} ${isSlugError ? styles.inputError : ""}`}
                placeholder="team-slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                disabled={isLoading}
                maxLength={MAX_SLUG_LENGTH}
                aria-invalid={!!isSlugError}
                aria-describedby="slug-hint"
              />
              <p id="slug-hint" className={styles.hint}>
                Used in URLs. Only lowercase letters, numbers, and hyphens.
              </p>
              {isSlugError && (
                <p className={styles.errorMessage} role="alert">
                  {displayError}
                </p>
              )}
            </div>

            {/* Description Field */}
            <div className={styles.field}>
              <label htmlFor="team-description" className={styles.label}>
                Description
              </label>
              <textarea
                id="team-description"
                className={styles.textarea}
                placeholder="Optional team description"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                disabled={isLoading}
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
            </div>

            {/* Form-level error (non-slug errors) */}
            {displayError && !isSlugError && (
              <p className={styles.formError} role="alert">
                {displayError}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className={styles.spinner} data-testid="loading-spinner" />
                  Creating...
                </>
              ) : (
                "Create Team"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
