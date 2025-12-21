/**
 * Regex safety validation to prevent ReDoS attacks
 */

// Patterns that indicate potential catastrophic backtracking
const NESTED_QUANTIFIERS = /\([^)]*[+*][^)]*\)[+*?]/;
const MAX_PATTERN_LENGTH = 100;

/**
 * Result type for regex validation with specific error messages
 */
export type RegexValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Validates a regex pattern for safety against ReDoS attacks.
 * Returns specific error messages for each type of validation failure.
 *
 * @param pattern - The regex pattern to validate
 * @returns Object with valid: true or valid: false with reason
 */
export function validateRegex(pattern: string): RegexValidationResult {
  // Check length
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return { valid: false, reason: "Pattern exceeds maximum length of 100 characters" };
  }

  // Check for nested quantifiers (ReDoS risk)
  if (NESTED_QUANTIFIERS.test(pattern)) {
    return { valid: false, reason: "Pattern contains nested quantifiers which could cause performance issues" };
  }

  // Try to compile
  try {
    new RegExp(pattern);
    return { valid: true };
  } catch (err) {
    return { valid: false, reason: `Invalid regex syntax: ${err instanceof Error ? err.message : "unknown error"}` };
  }
}

/**
 * Validates a regex pattern for safety against ReDoS attacks.
 * Rejects patterns with:
 * - Nested quantifiers (e.g., (a+)+, (a*)*) that can cause catastrophic backtracking
 * - Patterns longer than 100 characters
 * - Invalid regex syntax
 *
 * @param pattern - The regex pattern to validate
 * @returns true if the pattern is safe, false otherwise
 */
export function isSafeRegex(pattern: string): boolean {
  return validateRegex(pattern).valid;
}
