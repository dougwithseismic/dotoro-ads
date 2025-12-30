/**
 * Sync Validation Module
 *
 * Pre-sync validation layer that catches all data issues before
 * making Reddit API calls.
 */

// Types
export {
  ValidationErrorCode,
  ValidationFailedError,
  KNOWN_PLATFORMS,
  type Platform,
  type KnownPlatform,
  type SupportedPlatform,
  type ValidationEntityType,
  type ValidationError,
  type EntityValidationResult,
  type CampaignValidationResult,
  type AdGroupValidationResult,
  type ValidationSummary,
  type ValidationResult,
  type ValidationOptions,
} from "./types.js";

// Validators
export {
  CampaignValidator,
  AdGroupValidator,
  AdValidator,
  type CampaignValidationContext,
  type AdGroupValidationContext,
  type AdValidationContext,
} from "./validators/index.js";

// Validation Service
export {
  SyncValidationService,
  getSyncValidationService,
} from "./sync-validation-service.js";

// Utilities
export {
  isValidRedditDateTime,
  validateDateTimeField,
  validateDateTimeRange,
  isValidUrl,
  validateUrlField,
  validateRequiredString,
  validateStringLength,
  validateEnumValue,
  validateRequiredArray,
  validateEnumArray,
} from "./utils/index.js";

// Platform Defaults Resolver
export {
  PlatformDefaultsResolver,
  type EntityType,
  type PlatformDefaults,
} from "./platform-defaults-resolver.js";
