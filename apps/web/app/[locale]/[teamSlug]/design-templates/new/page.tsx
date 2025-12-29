"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTeam } from "@/lib/teams/context";
import { useDesignTemplates } from "@/lib/hooks/useDesignTemplates";
import { ASPECT_RATIOS, type AspectRatioKey } from "@/components/canvas-editor/types";
import styles from "./page.module.css";

/**
 * Create Template Page
 *
 * Simple form to create a new design template:
 * - Template name input
 * - Optional description
 * - Primary aspect ratio selection
 * - Create button -> redirects to edit page
 */
export default function CreateTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const { currentTeam } = useTeam();
  const teamSlug = params.teamSlug as string;
  const locale = params.locale as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatioKey>("1:1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createTemplate } = useDesignTemplates(currentTeam?.id);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        setError("Template name is required");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const config = ASPECT_RATIOS[aspectRatio];
        const template = await createTemplate({
          name: name.trim(),
          description: description.trim() || undefined,
          primaryAspectRatio: aspectRatio,
          canvasJson: {
            version: "6.0.0",
            objects: [],
            width: config.width,
            height: config.height,
            background: "#ffffff",
          },
        });

        // Navigate to edit page
        try {
          await router.push(`/${locale}/${teamSlug}/design-templates/${template.id}/edit`);
        } catch (error) {
          console.error('Navigation failed:', error);
        }
      } catch (err) {
        console.error("Failed to create template:", err);
        setError(err instanceof Error ? err.message : "Failed to create template");
        setIsSubmitting(false);
      }
    },
    [name, description, aspectRatio, createTemplate, router, locale, teamSlug]
  );

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  // Loading state
  if (!currentTeam) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Create New Template</h1>
          <p className={styles.subtitle}>
            Set up a new design template for your ads
          </p>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Error message */}
          {error && (
            <div className={styles.errorBanner}>
              <ErrorIcon />
              <span>{error}</span>
            </div>
          )}

          {/* Name field */}
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Template Name
              <span className={styles.required}>*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Product Showcase, Sale Banner"
              className={styles.input}
              autoFocus
              required
            />
          </div>

          {/* Description field */}
          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              Description
              <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this template is for..."
              className={styles.textarea}
              rows={3}
            />
          </div>

          {/* Aspect ratio selection */}
          <div className={styles.field}>
            <label className={styles.label}>Primary Aspect Ratio</label>
            <p className={styles.fieldHint}>
              Choose the main size for your template. You can add variants for other sizes later.
            </p>
            <div className={styles.ratioOptions}>
              {(
                Object.entries(ASPECT_RATIOS) as [
                  AspectRatioKey,
                  (typeof ASPECT_RATIOS)[AspectRatioKey]
                ][]
              ).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.ratioOption} ${
                    aspectRatio === key ? styles.ratioOptionSelected : ""
                  }`}
                  onClick={() => setAspectRatio(key)}
                >
                  <div
                    className={styles.ratioPreview}
                    style={{ aspectRatio: key.replace(":", "/") }}
                  />
                  <div className={styles.ratioInfo}>
                    <span className={styles.ratioLabel}>{config.label}</span>
                    <span className={styles.ratioValue}>{key}</span>
                    <span className={styles.ratioDimensions}>
                      {config.width} x {config.height}
                    </span>
                  </div>
                  {aspectRatio === key && (
                    <div className={styles.checkmark}>
                      <CheckIcon />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className={styles.buttonSpinner} />
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon />
                  Create Template
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Icon Components
// ============================================================================

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 7.5l3 3 6-6" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3M8 10.5v.5" />
    </svg>
  );
}
