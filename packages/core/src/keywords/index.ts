/**
 * Keywords Module
 *
 * Exports for keyword generation in the campaign generation system.
 */

// Export types
export type {
  KeywordRule,
  GeneratedKeyword,
  KeywordGenerationContext,
  KeywordGenerationResult,
  KeywordGenerationRow,
  MatchType,
} from "./types.js";

// Export resolver types
export type {
  AdGroupRuleOverride,
  KeywordInheritance,
  ResolvedKeywordRules,
  AdGroupOverride,
} from "./keyword-resolver.js";

// Export generator
export { KeywordGenerator, MAX_KEYWORDS_PER_RULE } from "./keyword-generator.js";
export type { KeywordWarningCallback } from "./keyword-generator.js";

// Export resolver
export { KeywordInheritanceResolver } from "./keyword-resolver.js";
