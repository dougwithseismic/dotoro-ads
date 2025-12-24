/**
 * Ad Types Module
 *
 * Central module for the ad type system. Exports the registry and all types.
 */

// Export the registry and its class
export { AdTypeRegistry, adTypeRegistry } from "./registry.js";

// Export all types
export type {
  Platform,
  ContentCategory,
  ValidationResult,
  AdData,
  FieldType,
  FieldOption,
  AdFieldDefinition,
  CreativeType,
  CreativeSpecs,
  CreativeRequirement,
  AdConstraints,
  AdTypeFeatures,
  AdTypeDefinition,
} from "./types.js";

// Export platform-specific ad types (readonly arrays)
export { GOOGLE_AD_TYPES } from "./platforms/google.js";
export { REDDIT_AD_TYPES } from "./platforms/reddit.js";
export { FACEBOOK_AD_TYPES } from "./platforms/facebook.js";

// Export validation functions
export {
  validateAdData,
  validateField,
  validateAdType,
  getCharacterCount,
  extractVariables,
} from "./validation.js";

// Import and register all ad types
import { adTypeRegistry } from "./registry.js";
import { GOOGLE_AD_TYPES } from "./platforms/google.js";
import { REDDIT_AD_TYPES } from "./platforms/reddit.js";
import { FACEBOOK_AD_TYPES } from "./platforms/facebook.js";

/** Flag to track if registry has been initialized */
let isInitialized = false;

/**
 * Initialize the ad type registry with all platform ad types.
 * This function is idempotent - calling it multiple times is safe.
 *
 * @param options - Initialization options
 * @param options.reset - If true, clears existing registrations before re-registering
 * @returns The initialized registry instance
 *
 * @example
 * // Initialize registry (safe to call multiple times)
 * initializeAdTypeRegistry();
 *
 * @example
 * // Reset and reinitialize (useful for tests)
 * initializeAdTypeRegistry({ reset: true });
 */
export function initializeAdTypeRegistry(
  options: { reset?: boolean } = {}
): typeof adTypeRegistry {
  if (options.reset) {
    adTypeRegistry.clear();
    isInitialized = false;
  }

  if (!isInitialized) {
    [...GOOGLE_AD_TYPES, ...REDDIT_AD_TYPES, ...FACEBOOK_AD_TYPES].forEach(
      (adType) => adTypeRegistry.register(adType)
    );
    isInitialized = true;
  }

  return adTypeRegistry;
}

/**
 * Check if the registry has been initialized
 */
export function isAdTypeRegistryInitialized(): boolean {
  return isInitialized;
}

// Auto-register all ad types on module load for convenience
// This maintains backwards compatibility while allowing explicit initialization
initializeAdTypeRegistry();
