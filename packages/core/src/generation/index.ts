/**
 * Generation module exports
 *
 * Exports the orchestrator and variation generator for campaign generation.
 */

// Re-export variation generator types and classes
export {
  VariationGenerator,
  type AdTemplate,
  type AdGroupTemplate,
  type CampaignTemplate as VariationCampaignTemplate,
  type VariationSource,
  type GeneratedAd,
  type GeneratedAdGroup,
  type GeneratedCampaign,
  type GenerationResult,
  type GenerationOptions,
  type ValidationWarning as GenerationValidationWarning,
} from "./variation-generator.js";

// Re-export orchestrator types and classes
export {
  GenerationOrchestrator,
  type CampaignTemplate,
  type GenerationInput,
  type GenerationOutput,
  type GenerationStatistics,
  type GenerationOrchestratorOptions,
  type PreviewOptions,
  type PreviewOutput,
  type EstimatedCounts,
  type GeneratedCampaign as OrchestratorGeneratedCampaign,
} from "./orchestrator.js";

// Re-export inline variation generator for A/B testing and ad variations
export {
  InlineVariationGenerator,
  type AdTemplate as InlineAdTemplate,
  type VariationInput,
  type VariationConfig,
  type VariationContent,
  type VariationMetadata,
  type GeneratedVariation,
  type VariationResult,
} from "./inline-variation-generator.js";

// Re-export hierarchical grouper for campaign structure generation
export {
  HierarchicalGrouper,
  groupRowsIntoCampaigns,
  type GroupingConfig,
  type AdFieldMapping,
  type GroupedCampaign,
  type GroupedAdGroup,
  type GroupedAd,
  type GroupingWarning,
  type GroupingStats,
  type GroupingResult,
} from "./hierarchical-grouper.js";

// Re-export platform constraints for character limit validation
export {
  PLATFORM_LIMITS,
  truncateText,
  truncateToWordBoundary,
  getFieldLimit,
  checkFieldLength,
  checkAllFieldLengths,
  applyTruncation,
  type Platform as ConstraintPlatform,
  type FallbackStrategy,
  type FieldConstraint,
  type FieldLengthResult,
  type AllFieldsLengthResult,
} from "./platform-constraints.js";
