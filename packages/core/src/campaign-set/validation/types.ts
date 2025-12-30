/**
 * Sync Validation Types
 *
 * Type definitions for the pre-sync validation layer that catches
 * all data issues before making Reddit API calls.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Validation Error Codes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enumeration of validation error codes for programmatic handling.
 * Each code maps to a specific type of validation failure.
 */
export enum ValidationErrorCode {
  /** Required field is missing or empty */
  REQUIRED_FIELD = "REQUIRED_FIELD",
  /** Datetime format is invalid (must be ISO 8601 with timezone) */
  INVALID_DATETIME = "INVALID_DATETIME",
  /** URL format is invalid */
  INVALID_URL = "INVALID_URL",
  /** Field value exceeds maximum length */
  FIELD_TOO_LONG = "FIELD_TOO_LONG",
  /** Field value is not a valid enum value */
  INVALID_ENUM_VALUE = "INVALID_ENUM_VALUE",
  /** Budget value is invalid (negative or wrong format) */
  INVALID_BUDGET = "INVALID_BUDGET",
  /** Entity references a parent that doesn't exist */
  MISSING_DEPENDENCY = "MISSING_DEPENDENCY",
  /** Business rule constraint violation */
  CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION",
  /** Value is outside acceptable range */
  VALUE_OUT_OF_RANGE = "VALUE_OUT_OF_RANGE",
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity Types for Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Entity types that can be validated
 */
export type ValidationEntityType = "campaign" | "adGroup" | "ad" | "keyword";

// ─────────────────────────────────────────────────────────────────────────────
// Validation Error Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Individual validation error
 *
 * Contains all information needed to identify and fix the issue.
 */
export interface ValidationError {
  /** Type of entity with the error */
  entityType: ValidationEntityType;
  /** ID of the entity with the error */
  entityId: string;
  /** Name of the entity for display purposes */
  entityName: string;
  /** Field that has the error */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Error code for programmatic handling */
  code: ValidationErrorCode;
  /** The invalid value (for debugging) */
  value?: unknown;
  /** Expected format or value (for guidance) */
  expected?: string;
}

/**
 * Validation result for a single entity
 */
export interface EntityValidationResult {
  /** ID of the validated entity */
  entityId: string;
  /** Name of the entity for display */
  entityName: string;
  /** Whether the entity passed validation */
  isValid: boolean;
  /** List of validation errors for this entity */
  errors: ValidationError[];
}

/**
 * Campaign validation result with nested ad group results
 */
export interface CampaignValidationResult extends EntityValidationResult {
  /** Validation results for ad groups within this campaign */
  adGroups: AdGroupValidationResult[];
}

/**
 * Ad group validation result with nested ad and keyword results
 */
export interface AdGroupValidationResult extends EntityValidationResult {
  /** Validation results for ads within this ad group */
  ads: EntityValidationResult[];
  /** Validation results for keywords within this ad group */
  keywords: EntityValidationResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-Level Validation Result
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Summary statistics for validation
 */
export interface ValidationSummary {
  /** Number of campaigns validated */
  campaignsValidated: number;
  /** Number of ad groups validated */
  adGroupsValidated: number;
  /** Number of ads validated */
  adsValidated: number;
  /** Number of keywords validated */
  keywordsValidated: number;
  /** Number of campaigns with errors */
  campaignsWithErrors: number;
  /** Number of ad groups with errors */
  adGroupsWithErrors: number;
  /** Number of ads with errors */
  adsWithErrors: number;
  /** Number of keywords with errors */
  keywordsWithErrors: number;
}

/**
 * Complete validation result for a campaign set
 *
 * Contains structured results for all entities in the hierarchy,
 * plus summary statistics for quick assessment.
 */
export interface ValidationResult {
  /** Whether the entire campaign set is valid */
  isValid: boolean;
  /** ID of the validated campaign set */
  campaignSetId: string;
  /** Total number of errors across all entities */
  totalErrors: number;
  /** Validation results for each campaign */
  campaigns: CampaignValidationResult[];
  /** Summary statistics */
  summary: ValidationSummary;
  /** Time taken to validate (milliseconds) */
  validationTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Known platform identifiers with pre-configured defaults
 *
 * These platforms have built-in validation rules and default values.
 * Use these for type-safe access to known platform features.
 */
export const KNOWN_PLATFORMS = [
  "reddit",
  "google",
  "meta",
  "tiktok",
  "snapchat",
] as const;

/**
 * Type representing a known platform with pre-configured defaults.
 *
 * Known platforms have special handling in validation and default resolution.
 */
export type KnownPlatform = (typeof KNOWN_PLATFORMS)[number];

/**
 * Platform identifier - can be any string to support extensibility.
 *
 * While known platforms (reddit, google, meta, etc.) have pre-configured
 * defaults and validation rules, any string can be used as a platform
 * identifier for custom integrations.
 *
 * Unknown platforms will receive empty defaults and pass through validation
 * without platform-specific rules.
 *
 * @example
 * ```typescript
 * // Known platforms with built-in defaults
 * const reddit: Platform = "reddit";
 * const google: Platform = "google";
 *
 * // Custom platforms work too
 * const custom: Platform = "my-custom-platform";
 * ```
 */
export type Platform = string;

/**
 * @deprecated Use `Platform` instead. This alias is kept for backwards compatibility.
 */
export type SupportedPlatform = Platform;

// ─────────────────────────────────────────────────────────────────────────────
// Validation Options
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for validation
 */
export interface ValidationOptions {
  /**
   * Platform to validate for.
   *
   * Known platforms (reddit, google, meta, etc.) have pre-configured defaults
   * and validation rules. Unknown platforms receive empty defaults.
   */
  platform?: Platform;
  /** Whether to validate dependency chains */
  validateDependencies?: boolean;
  /** Whether to validate business rules */
  validateBusinessRules?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Exception
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exception thrown when validation fails and sync should not proceed
 */
export class ValidationFailedError extends Error {
  public readonly validation: ValidationResult;
  public readonly validationId?: string;

  constructor(validation: ValidationResult, validationId?: string) {
    const idSuffix = validationId ? ` (ID: ${validationId})` : "";
    super(`Validation failed with ${validation.totalErrors} error(s)${idSuffix}`);
    this.name = "ValidationFailedError";
    this.validation = validation;
    this.validationId = validationId;
  }
}
