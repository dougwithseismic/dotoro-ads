/**
 * Platform Constraints Module
 *
 * Defines character limits per platform and field, and provides utilities
 * for checking and truncating text to meet platform requirements.
 */

/**
 * Character limits for different advertising platforms.
 * These are approximate limits - actual limits may vary by ad type.
 * IMPORTANT: Keep in sync with apps/web/app/campaigns/generate/types.ts
 */
export const PLATFORM_LIMITS = {
  google: {
    headline: 30,
    description: 90,
    displayUrl: 30, // path1 (15) + path2 (15) = 30 total
  },
  facebook: {
    headline: 40,
    primaryText: 125,
    description: 30,
  },
  reddit: {
    title: 300,
    text: 500, // Recommended display limit - actual max is 40,000 chars
  },
} as const;

export type Platform = keyof typeof PLATFORM_LIMITS;

export type FallbackStrategy = "truncate" | "truncate_word" | "error";

export interface FieldConstraint {
  maxLength: number;
  fallback?: FallbackStrategy;
}

export interface FieldLengthResult {
  valid: boolean;
  overflow: number;
  length: number;
  limit: number | undefined;
}

export interface AllFieldsLengthResult {
  allValid: boolean;
  totalOverflow: number;
  invalidFields: string[];
  fields: Record<string, FieldLengthResult>;
}

/**
 * Truncates text to a maximum length, adding ellipsis if truncated.
 * This is a simple character-based truncation.
 *
 * @param text - The text to truncate
 * @param maxLength - The maximum length including ellipsis
 * @returns The truncated text with ellipsis if it was shortened
 *
 * @example
 * truncateText("Hello world", 8) // "Hello..."
 * truncateText("Hi", 8) // "Hi"
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // Handle very short limits
  if (maxLength <= 3) {
    return text.slice(0, maxLength);
  }

  // Leave room for ellipsis
  const truncated = text.slice(0, maxLength - 3);
  return truncated + "...";
}

/**
 * Truncates text to a maximum length, preserving word boundaries.
 * Adds ellipsis if truncated.
 *
 * @param text - The text to truncate
 * @param maxLength - The maximum length including ellipsis
 * @returns The truncated text at a word boundary with ellipsis
 *
 * @example
 * truncateToWordBoundary("Hello world today", 12) // "Hello..."
 * truncateToWordBoundary("Hi there", 20) // "Hi there"
 */
export function truncateToWordBoundary(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // Handle very short limits
  if (maxLength <= 3) {
    return text.slice(0, maxLength);
  }

  // Leave room for ellipsis
  const targetLength = maxLength - 3;

  // Find the last space before the target length
  const truncated = text.slice(0, targetLength);
  const lastSpaceIndex = truncated.lastIndexOf(" ");

  if (lastSpaceIndex === -1) {
    // No space found - fall back to character truncation
    return truncated + "...";
  }

  // Truncate at word boundary
  return text.slice(0, lastSpaceIndex) + "...";
}

/**
 * Gets the character limit for a specific field on a platform.
 *
 * @param platform - The advertising platform (google, facebook, reddit)
 * @param field - The field name (headline, description, etc.)
 * @returns The character limit or undefined if not defined
 */
export function getFieldLimit(platform: Platform | string, field: string): number | undefined {
  const platformLimits = PLATFORM_LIMITS[platform as Platform];
  if (!platformLimits) {
    return undefined;
  }
  return platformLimits[field as keyof typeof platformLimits] as number | undefined;
}

/**
 * Maps common ad field names to platform-specific field names.
 * This helps normalize field names across different platforms.
 */
const FIELD_MAPPING: Record<Platform, Record<string, string>> = {
  google: {
    headline: "headline",
    description: "description",
    displayUrl: "displayUrl",
  },
  facebook: {
    headline: "headline",
    description: "description",
    primaryText: "primaryText",
  },
  reddit: {
    headline: "title",
    description: "text",
    title: "title",
    text: "text",
  },
};

/**
 * Gets the platform-specific field name for a common field name.
 */
function getPlatformFieldName(platform: Platform, field: string): string {
  return FIELD_MAPPING[platform]?.[field] ?? field;
}

/**
 * Checks if a text value exceeds the character limit for a platform field.
 *
 * @param value - The text value to check
 * @param platform - The advertising platform
 * @param field - The field name
 * @returns An object with validation result and overflow amount
 */
export function checkFieldLength(
  value: string,
  platform: Platform | string,
  field: string
): FieldLengthResult {
  const platformFieldName = getPlatformFieldName(platform as Platform, field);
  const limit = getFieldLimit(platform, platformFieldName);

  const length = value?.length ?? 0;

  if (limit === undefined) {
    // No limit defined for this field/platform combination
    return {
      valid: true,
      overflow: 0,
      length,
      limit: undefined,
    };
  }

  const overflow = Math.max(0, length - limit);

  return {
    valid: overflow === 0,
    overflow,
    length,
    limit,
  };
}

/**
 * Ad fields to check for length constraints.
 */
const AD_FIELDS_TO_CHECK = ["headline", "description", "displayUrl", "finalUrl", "primaryText"];

/**
 * Checks all fields of an ad against platform character limits.
 *
 * @param ad - The ad object with headline, description, etc.
 * @param platform - The advertising platform
 * @returns A comprehensive result with all field validations
 */
export function checkAllFieldLengths(
  ad: {
    headline?: string;
    description?: string;
    displayUrl?: string;
    finalUrl?: string;
    primaryText?: string;
  },
  platform: Platform | string
): AllFieldsLengthResult {
  const fields: Record<string, FieldLengthResult> = {};
  const invalidFields: string[] = [];
  let totalOverflow = 0;

  for (const field of AD_FIELDS_TO_CHECK) {
    const value = ad[field as keyof typeof ad];

    // Skip undefined fields
    if (value === undefined) {
      continue;
    }

    const result = checkFieldLength(value, platform, field);
    fields[field] = result;

    if (!result.valid) {
      invalidFields.push(field);
      totalOverflow += result.overflow;
    }
  }

  return {
    allValid: invalidFields.length === 0,
    totalOverflow,
    invalidFields,
    fields,
  };
}

/**
 * Applies truncation to an ad's fields based on platform limits.
 * Returns a new ad object with truncated values.
 *
 * @param ad - The ad object to truncate
 * @param platform - The advertising platform
 * @param strategy - The truncation strategy to use
 * @returns A new ad object with truncated values
 */
export function applyTruncation<T extends Record<string, string | undefined>>(
  ad: T,
  platform: Platform | string,
  strategy: FallbackStrategy = "truncate_word"
): T {
  const result = { ...ad };
  const truncateFn = strategy === "truncate_word" ? truncateToWordBoundary : truncateText;

  for (const field of AD_FIELDS_TO_CHECK) {
    const value = result[field as keyof T] as string | undefined;
    if (value === undefined) {
      continue;
    }

    const platformFieldName = getPlatformFieldName(platform as Platform, field);
    const limit = getFieldLimit(platform, platformFieldName);

    if (limit !== undefined && value.length > limit) {
      (result as Record<string, string | undefined>)[field] = truncateFn(value, limit);
    }
  }

  return result;
}
