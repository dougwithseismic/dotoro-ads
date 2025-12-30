"use client";

import { useCallback, useMemo } from "react";
import styles from "./FallbackAdForm.module.css";

/**
 * Static fallback ad definition (no variables allowed).
 */
export interface FallbackAdDefinition {
  headline: string;
  description: string;
  displayUrl?: string;
  finalUrl: string;
  callToAction?: string;
}

export interface FallbackAdFormProps {
  /** Current fallback ad value */
  value: Partial<FallbackAdDefinition>;
  /** Callback when fallback ad changes */
  onChange: (value: Partial<FallbackAdDefinition>) => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Platform for character limits */
  platform?: "reddit" | "google";
  /** Additional class name */
  className?: string;
}

interface FieldConfig {
  name: keyof FallbackAdDefinition;
  label: string;
  placeholder: string;
  maxLength: number;
  required: boolean;
  multiline?: boolean;
  type?: "text" | "url";
}

const FIELD_CONFIGS: Record<string, FieldConfig[]> = {
  reddit: [
    {
      name: "headline",
      label: "Headline",
      placeholder: "Enter a static headline (no variables)",
      maxLength: 300,
      required: true,
    },
    {
      name: "description",
      label: "Description",
      placeholder: "Enter a static description (no variables)",
      maxLength: 500,
      required: true,
      multiline: true,
    },
    {
      name: "displayUrl",
      label: "Display URL",
      placeholder: "example.com",
      maxLength: 25,
      required: false,
    },
    {
      name: "finalUrl",
      label: "Final URL",
      placeholder: "https://example.com/landing-page",
      maxLength: 2048,
      required: true,
      type: "url",
    },
    {
      name: "callToAction",
      label: "Call to Action",
      placeholder: "Learn More",
      maxLength: 20,
      required: false,
    },
  ],
  google: [
    {
      name: "headline",
      label: "Headline",
      placeholder: "Enter a static headline (no variables)",
      maxLength: 30,
      required: true,
    },
    {
      name: "description",
      label: "Description",
      placeholder: "Enter a static description (no variables)",
      maxLength: 90,
      required: true,
      multiline: true,
    },
    {
      name: "displayUrl",
      label: "Display URL",
      placeholder: "example.com",
      maxLength: 15,
      required: false,
    },
    {
      name: "finalUrl",
      label: "Final URL",
      placeholder: "https://example.com/landing-page",
      maxLength: 2048,
      required: true,
      type: "url",
    },
  ],
};

/**
 * Detect if text contains variable patterns like {variable_name}
 */
function hasVariables(text: string): boolean {
  return /\{[^}]+\}/.test(text);
}

/**
 * FallbackAdForm - Form for configuring a static fallback ad
 *
 * Used when the "use_fallback" strategy is selected. All fields must be
 * static text without any variables.
 */
export function FallbackAdForm({
  value,
  onChange,
  disabled = false,
  platform = "reddit",
  className,
}: FallbackAdFormProps) {
  const fields = FIELD_CONFIGS[platform] || FIELD_CONFIGS.reddit;

  const handleChange = useCallback(
    (field: keyof FallbackAdDefinition, fieldValue: string) => {
      onChange({
        ...value,
        [field]: fieldValue,
      });
    },
    [onChange, value]
  );

  const validationErrors = useMemo(() => {
    const errors: Partial<Record<keyof FallbackAdDefinition, string>> = {};

    for (const field of fields) {
      const fieldValue = value[field.name];
      if (fieldValue && hasVariables(fieldValue)) {
        errors[field.name] = "Variables like {name} are not allowed in fallback ads";
      }
      if (field.type === "url" && fieldValue) {
        try {
          new URL(fieldValue);
        } catch {
          errors[field.name] = "Please enter a valid URL";
        }
      }
    }

    return errors;
  }, [fields, value]);

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <div className={styles.header}>
        <h4 className={styles.title}>Fallback Ad Configuration</h4>
        <p className={styles.subtitle}>
          Configure a static ad to use when original ads exceed character limits.
          Variables like {"{product_name}"} are not allowed.
        </p>
      </div>

      <div className={styles.form}>
        {fields.map((field) => {
          const fieldValue = value[field.name] || "";
          const error = validationErrors[field.name];
          const charCount = fieldValue.length;
          const isOverLimit = charCount > field.maxLength;

          return (
            <div key={field.name} className={styles.field}>
              <label className={styles.label}>
                {field.label}
                {field.required && <span className={styles.required}>*</span>}
              </label>

              {field.multiline ? (
                <textarea
                  value={fieldValue}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={disabled}
                  className={`${styles.textarea} ${error || isOverLimit ? styles.error : ""}`}
                  rows={3}
                />
              ) : (
                <input
                  type={field.type || "text"}
                  value={fieldValue}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={disabled}
                  className={`${styles.input} ${error || isOverLimit ? styles.error : ""}`}
                />
              )}

              <div className={styles.fieldFooter}>
                {error && <span className={styles.errorText}>{error}</span>}
                <span
                  className={`${styles.charCount} ${isOverLimit ? styles.overLimit : ""}`}
                >
                  {charCount}/{field.maxLength}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
