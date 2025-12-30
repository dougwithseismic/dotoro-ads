/**
 * URL Validation Utilities
 *
 * Utilities for validating URL fields against Reddit API requirements.
 */

import { ValidationError, ValidationErrorCode } from "../types.js";

/**
 * Check if a string is a valid HTTP/HTTPS URL.
 *
 * @param value - The URL string to validate
 * @returns true if valid URL, false otherwise
 *
 * @example
 * ```typescript
 * isValidUrl("https://example.com") // true
 * isValidUrl("http://example.com/path?query=1") // true
 * isValidUrl("ftp://example.com") // false - not HTTP/HTTPS
 * isValidUrl("not-a-url") // false
 * ```
 */
export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate a URL field and create a ValidationError if invalid.
 *
 * @param value - The URL value to validate
 * @param fieldName - Name of the field for error messages
 * @param entityType - Type of entity being validated
 * @param entityId - ID of the entity
 * @param entityName - Name of the entity
 * @param required - Whether the field is required (default: false)
 * @returns ValidationError or null
 */
export function validateUrlField(
  value: string | undefined | null,
  fieldName: string,
  entityType: "campaign" | "adGroup" | "ad" | "keyword",
  entityId: string,
  entityName: string,
  required = false
): ValidationError | null {
  // Handle missing values
  if (value === undefined || value === null || value === "") {
    if (required) {
      return {
        entityType,
        entityId,
        entityName,
        field: fieldName,
        code: ValidationErrorCode.REQUIRED_FIELD,
        message: `${fieldName} is required`,
        value: undefined,
      };
    }
    return null;
  }

  if (!isValidUrl(value)) {
    return {
      entityType,
      entityId,
      entityName,
      field: fieldName,
      code: ValidationErrorCode.INVALID_URL,
      message: `${fieldName} must be a valid HTTP or HTTPS URL`,
      value,
      expected: "A valid URL starting with http:// or https://",
    };
  }

  return null;
}
