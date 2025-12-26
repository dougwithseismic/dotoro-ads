"use client";

import { useState, useCallback, useMemo } from "react";
import styles from "./CampaignSetName.module.css";

interface CampaignSetNameProps {
  name: string;
  description: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onNext: () => void;
  errors?: string[];
}

const MAX_NAME_LENGTH = 255;
const MIN_NAME_LENGTH = 3;

/**
 * First step of the campaign generation wizard.
 * Allows users to name and describe their campaign set.
 */
export function CampaignSetName({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onNext,
  errors = [],
}: CampaignSetNameProps) {
  // Track whether the name input has been touched (blurred) for showing validation
  const [nameTouched, setNameTouched] = useState(false);

  // Validate the name
  const nameValidation = useMemo(() => {
    const trimmedName = name.trim();
    const validationErrors: string[] = [];

    if (!trimmedName) {
      validationErrors.push("Campaign set name is required");
    } else if (trimmedName.length < MIN_NAME_LENGTH) {
      validationErrors.push(`Campaign set name must be at least ${MIN_NAME_LENGTH} characters`);
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      validationErrors.push(`Campaign set name must be at most ${MAX_NAME_LENGTH} characters`);
    }

    return {
      valid: validationErrors.length === 0,
      errors: validationErrors,
    };
  }, [name]);

  // Combine internal validation errors with external errors
  const allErrors = useMemo(() => {
    // Only show internal errors if the field has been touched or has external errors
    const internalErrors = nameTouched || errors.length > 0 ? nameValidation.errors : [];
    return [...internalErrors, ...errors];
  }, [nameValidation.errors, errors, nameTouched]);

  // Always show length errors (for too long) even before touch
  const showLengthError = name.trim().length > MAX_NAME_LENGTH;
  const displayErrors = useMemo(() => {
    if (showLengthError) {
      return nameValidation.errors.filter(e => e.includes("at most"));
    }
    return allErrors;
  }, [showLengthError, nameValidation.errors, allErrors]);

  // Handle name input blur for validation
  const handleNameBlur = useCallback(() => {
    setNameTouched(true);
  }, []);

  // Handle name input change
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onNameChange(e.target.value);
    },
    [onNameChange]
  );

  // Handle description input change
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onDescriptionChange(e.target.value);
    },
    [onDescriptionChange]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (nameValidation.valid) {
        onNext();
      }
    },
    [nameValidation.valid, onNext]
  );

  // Handle Enter key in name field
  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && nameValidation.valid) {
        e.preventDefault();
        onNext();
      }
    },
    [nameValidation.valid, onNext]
  );

  const isNextDisabled = !nameValidation.valid;
  const hasErrors = displayErrors.length > 0;

  return (
    <form className={styles.container} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>Name Your Campaign Set</h2>
        <p className={styles.subtitle}>
          Give your campaign set a descriptive name to help you identify it later.
        </p>
      </div>

      {/* Campaign Set Name Field */}
      <div className={styles.fieldGroup}>
        <label htmlFor="campaign-set-name" className={styles.label}>
          Campaign Set Name
          <span className={styles.required}>*</span>
        </label>
        <input
          id="campaign-set-name"
          type="text"
          className={`${styles.input} ${hasErrors ? styles.inputInvalid : ""}`}
          value={name}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          placeholder="e.g., Q4 Holiday Campaign Set"
          required
          aria-describedby="name-hint name-errors"
          aria-invalid={hasErrors}
        />
        <div className={styles.inputMeta}>
          <span id="name-hint" className={styles.hint}>
            A clear, descriptive name for your campaign set
          </span>
          <span className={styles.charCount}>
            {name.length} / {MAX_NAME_LENGTH}
          </span>
        </div>

        {/* Error Messages */}
        {hasErrors && (
          <div id="name-errors" className={styles.errorList} role="alert">
            {displayErrors.map((error, index) => (
              <p key={index} className={styles.error}>
                {error}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Description Field */}
      <div className={styles.fieldGroup}>
        <label htmlFor="campaign-set-description" className={styles.label}>
          Description
          <span className={styles.optional}>(optional)</span>
        </label>
        <textarea
          id="campaign-set-description"
          className={styles.textarea}
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Describe the purpose of this campaign set..."
          rows={4}
          aria-describedby="description-hint"
        />
        <span id="description-hint" className={styles.hint}>
          Optional notes about this campaign set for your team
        </span>
      </div>

      {/* Next Button */}
      <div className={styles.actions}>
        <button
          type="submit"
          className={`${styles.button} ${styles.buttonPrimary} ${isNextDisabled ? styles.buttonDisabled : ""}`}
          disabled={isNextDisabled}
        >
          Next
        </button>
      </div>
    </form>
  );
}
