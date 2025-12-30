"use client";

import styles from "./UrlValidator.module.css";

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a final URL (landing page URL).
 * Requirements:
 * - Must use HTTPS protocol
 * - Must be valid URL format
 * - Empty values are valid (field is optional)
 * - Variable patterns like {url} are valid
 */
export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];

  // Empty is valid (optional field)
  if (!url || url.trim() === "") {
    return { valid: true, errors };
  }

  // Variable patterns are valid - they'll be interpolated at runtime
  if (/^\{[^}]+\}$/.test(url.trim())) {
    return { valid: true, errors };
  }

  // Check for HTTPS protocol
  if (!url.toLowerCase().startsWith("https://")) {
    errors.push("URL must use HTTPS protocol");
  }

  // Try to parse as URL to validate format
  if (!url.includes("{") || url.startsWith("https://")) {
    try {
      // For URLs with variables, we only validate the base structure
      const urlToValidate = url.includes("{")
        ? url.replace(/\{[^}]+\}/g, "placeholder")
        : url;

      new URL(urlToValidate);
    } catch {
      // Only add "Invalid URL format" if we haven't already added HTTPS error
      // and it's actually a malformed URL (not just missing protocol)
      if (url.toLowerCase().startsWith("https://") || !url.includes("://")) {
        errors.push("Invalid URL format");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a display URL.
 * Requirements:
 * - Must not exceed character limit (platform-specific)
 * - Does not require HTTPS prefix (display URLs are short-form)
 * - Empty values are valid (field is optional)
 * - Variable patterns like {display_url} are valid
 */
export function validateDisplayUrl(url: string, limit: number): ValidationResult {
  const errors: string[] = [];

  // Empty is valid (optional field)
  if (!url || url.trim() === "") {
    return { valid: true, errors };
  }

  // Variable patterns are valid - they'll be interpolated at runtime
  if (/^\{[^}]+\}$/.test(url.trim())) {
    return { valid: true, errors };
  }

  // Check character limit
  if (url.length > limit) {
    errors.push(`Display URL exceeds ${limit} character limit (${url.length}/${limit})`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

interface UrlValidatorProps {
  /** The URL value to validate */
  value: string;
  /** Type of URL being validated */
  type: "finalUrl" | "displayUrl";
  /** Character limit for display URLs */
  limit?: number;
}

/**
 * UrlValidator - Inline URL validation display component.
 *
 * For finalUrl (landing page):
 * - Validates HTTPS protocol requirement
 * - Validates URL format
 *
 * For displayUrl:
 * - Validates character limit (platform-specific)
 * - Reddit: 25 characters
 * - Google: 30 characters
 *
 * @example
 * // Final URL validation
 * <UrlValidator value={finalUrl} type="finalUrl" />
 *
 * @example
 * // Display URL with Reddit limit
 * <UrlValidator value={displayUrl} type="displayUrl" limit={25} />
 */
export function UrlValidator({ value, type, limit = 25 }: UrlValidatorProps) {
  const result =
    type === "finalUrl" ? validateUrl(value) : validateDisplayUrl(value, limit);

  if (result.valid || result.errors.length === 0) {
    return null;
  }

  return (
    <div
      className={styles.container}
      role="alert"
      aria-live="polite"
      data-testid="url-validator"
    >
      {result.errors.map((error, index) => (
        <span key={index} className={styles.error}>
          {error}
        </span>
      ))}
    </div>
  );
}

export default UrlValidator;
