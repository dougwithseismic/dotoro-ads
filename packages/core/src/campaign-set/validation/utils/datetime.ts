/**
 * DateTime Validation Utilities
 *
 * Utilities for validating datetime fields against Reddit API requirements.
 * Reddit API requires ISO 8601 format with timezone offset.
 *
 * Valid formats:
 * - "2025-01-15T09:00:00+00:00"
 * - "2025-01-15T09:00:00-05:00"
 * - "2025-01-15T09:00:00Z" (also accepted, Z is UTC)
 *
 * Invalid formats:
 * - "2025-01-15" (date only)
 * - "2025-01-15T09:00:00" (no timezone)
 * - "January 15, 2025" (non-ISO format)
 */

import { ValidationError, ValidationErrorCode } from "../types.js";

/**
 * Regular expression for ISO 8601 datetime with timezone offset.
 * Matches:
 * - "2025-01-15T09:00:00+00:00" (offset format)
 * - "2025-01-15T09:00:00-05:00" (negative offset)
 * - "2025-01-15T09:00:00+12:30" (non-hour offsets)
 * - "2025-01-15T09:00:00Z" (UTC shorthand)
 *
 * Optionally allows milliseconds: "2025-01-15T09:00:00.000Z"
 */
const ISO_8601_WITH_TIMEZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Check if a datetime string is valid for Reddit API.
 *
 * Must be:
 * 1. ISO 8601 format
 * 2. Include timezone offset or Z
 * 3. Represent a valid date (not Feb 30, etc.)
 *
 * @param value - The datetime string to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidRedditDateTime("2025-01-15T09:00:00+00:00") // true
 * isValidRedditDateTime("2025-01-15T09:00:00Z") // true
 * isValidRedditDateTime("2025-01-15") // false - no time
 * isValidRedditDateTime("2025-01-15T09:00:00") // false - no timezone
 * ```
 */
export function isValidRedditDateTime(value: string): boolean {
  // Check format first
  if (!ISO_8601_WITH_TIMEZONE.test(value)) {
    return false;
  }

  // Parse and check if it's a valid date
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return false;
  }

  return true;
}

/**
 * Validate a datetime field and create a ValidationError if invalid.
 *
 * Returns null if the field is valid or undefined/empty (optional fields).
 * Returns a ValidationError if the field is present but invalid.
 *
 * @param value - The datetime value to validate
 * @param fieldName - Name of the field for error messages
 * @param entityType - Type of entity being validated
 * @param entityId - ID of the entity
 * @param entityName - Name of the entity for display
 * @returns ValidationError or null
 *
 * @example
 * ```typescript
 * const error = validateDateTimeField(
 *   "2025-01-15",
 *   "start_time",
 *   "adGroup",
 *   "ag-123",
 *   "Product Targeting"
 * );
 * // Returns error because "2025-01-15" lacks time and timezone
 * ```
 */
export function validateDateTimeField(
  value: string | undefined | null,
  fieldName: string,
  entityType: "campaign" | "adGroup" | "ad" | "keyword",
  entityId: string,
  entityName: string
): ValidationError | null {
  // Optional field - undefined/null/empty is valid
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (!isValidRedditDateTime(value)) {
    return {
      entityType,
      entityId,
      entityName,
      field: fieldName,
      code: ValidationErrorCode.INVALID_DATETIME,
      message: `${fieldName} must be ISO 8601 format with timezone (e.g., "2025-01-15T09:00:00+00:00" or "2025-01-15T09:00:00Z")`,
      value,
      expected: "ISO 8601 datetime with timezone (e.g., 2025-01-15T09:00:00+00:00)",
    };
  }

  return null;
}

/**
 * Validate that end time is after start time.
 *
 * Only validates if both times are present. Returns null if either is missing.
 *
 * @param startTime - Start time string
 * @param endTime - End time string
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @param entityName - Name of the entity
 * @returns ValidationError or null
 */
export function validateDateTimeRange(
  startTime: string | undefined | null,
  endTime: string | undefined | null,
  entityType: "campaign" | "adGroup" | "ad" | "keyword",
  entityId: string,
  entityName: string
): ValidationError | null {
  // Both must be present for range validation
  if (!startTime || !endTime) {
    return null;
  }

  // Both must be valid datetime strings
  if (!isValidRedditDateTime(startTime) || !isValidRedditDateTime(endTime)) {
    // Individual format errors are caught by validateDateTimeField
    return null;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return {
      entityType,
      entityId,
      entityName,
      field: "end_time",
      code: ValidationErrorCode.CONSTRAINT_VIOLATION,
      message: "end_time must be after start_time",
      value: endTime,
      expected: `A datetime after ${startTime}`,
    };
  }

  return null;
}
