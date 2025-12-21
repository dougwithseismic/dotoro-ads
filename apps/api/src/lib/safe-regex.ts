/**
 * Regex safety validation to prevent ReDoS attacks
 */

// Patterns that indicate potential catastrophic backtracking
const NESTED_QUANTIFIERS = /\([^)]*[+*][^)]*\)[+*?]/;
const OVERLAPPING_ALTERNATION = /\([^|)]*\|[^|)]*\)[+*]/;
const OPTIONAL_REPETITION = /\([^)]*\?\)[+*]/;
const LONG_QUANTIFIER_CHAIN = /[+*]{2,}/;
const MAX_PATTERN_LENGTH = 100;

/**
 * Result type for regex validation with specific error messages
 */
export type RegexValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Check if a regex pattern is safe from ReDoS attacks
 */
function checkRegexSafety(pattern: string): { safe: boolean; reason?: string } {
  const checks = [
    { pattern: NESTED_QUANTIFIERS, reason: "Nested quantifiers detected" },
    {
      pattern: OVERLAPPING_ALTERNATION,
      reason: "Overlapping alternation detected",
    },
    {
      pattern: OPTIONAL_REPETITION,
      reason: "Repetition of optional group detected",
    },
    {
      pattern: LONG_QUANTIFIER_CHAIN,
      reason: "Multiple consecutive quantifiers detected",
    },
  ];

  for (const check of checks) {
    if (check.pattern.test(pattern)) {
      return { safe: false, reason: check.reason };
    }
  }
  return { safe: true };
}

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
    return {
      valid: false,
      reason: "Pattern exceeds maximum length of 100 characters",
    };
  }

  // Check for ReDoS patterns
  const safetyCheck = checkRegexSafety(pattern);
  if (!safetyCheck.safe) {
    return {
      valid: false,
      reason: `Pattern contains unsafe patterns: ${safetyCheck.reason}`,
    };
  }

  // Try to compile
  try {
    new RegExp(pattern);
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      reason: `Invalid regex syntax: ${err instanceof Error ? err.message : "unknown error"}`,
    };
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
