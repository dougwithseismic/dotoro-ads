/**
 * Keyword Types
 *
 * Types for keyword rules and generated keywords in the campaign generation system.
 */

/**
 * Match type for keyword targeting
 */
export type MatchType = "broad" | "phrase" | "exact";

/**
 * Keyword rule definition
 *
 * Defines how keywords should be generated from data rows.
 */
export interface KeywordRule {
  /** Unique identifier for the rule */
  id: string;

  /** Human-readable name for the rule */
  name: string;

  /** Where the rule is defined - campaign level or ad group level */
  scope: "campaign" | "ad-group";

  /**
   * Core term pattern with variable interpolation
   * Example: "{product_name}" or "{brand} {model}"
   */
  coreTermPattern: string;

  /**
   * Prefixes to prepend to the core term
   * Use empty string "" to include the core term without prefix
   * Example: ["buy", "cheap", "best", ""]
   */
  prefixes: string[];

  /**
   * Suffixes to append to the core term
   * Use empty string "" to include the core term without suffix
   * Example: ["online", "sale", "near me", ""]
   */
  suffixes: string[];

  /** Match types to generate for each keyword variation */
  matchTypes: MatchType[];

  /**
   * Optional negative keywords
   * Supports variable interpolation like core term pattern
   */
  negativeKeywords?: string[];
}

/**
 * Generated keyword output
 */
export interface GeneratedKeyword {
  /** The actual keyword text */
  keyword: string;

  /** Match type for this keyword */
  matchType: MatchType;

  /** ID of the ad group this keyword belongs to */
  adGroupId: string;

  /** ID of the rule that generated this keyword */
  sourceRuleId: string;
}

/**
 * Context for keyword generation
 */
export interface KeywordGenerationContext {
  /** ID of the ad group being generated */
  adGroupId: string;

  /** Row data for variable interpolation */
  rowData: Record<string, unknown>;
}

/**
 * Result from generating keywords with negative keywords
 */
export interface KeywordGenerationResult {
  /** Positive keywords */
  keywords: GeneratedKeyword[];

  /** Negative keywords (interpolated) */
  negativeKeywords: string[];
}

/**
 * Row data with ad group ID for batch processing
 */
export interface KeywordGenerationRow extends Record<string, unknown> {
  /** Ad group ID for this row */
  _adGroupId: string;
}
