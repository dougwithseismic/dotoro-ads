/**
 * Shared Validation Types
 *
 * Common validation result interface used across all modules.
 * This provides a consistent structure for validation operations.
 */

/**
 * Result from validation operations
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
}
