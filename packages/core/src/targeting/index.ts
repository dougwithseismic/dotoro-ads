/**
 * Targeting Module
 *
 * Provides types, validation, and utilities for ad targeting configuration.
 */

// Export types
export type {
  TargetingType,
  LocationTargetType,
  LocationTarget,
  LocationOption,
  Gender,
  DemographicTarget,
  InterestCategory,
  AudienceType,
  AudienceTarget,
  DeviceType,
  OperatingSystem,
  Browser,
  DeviceTarget,
  PlacementTarget,
  TargetingConfig,
  PlatformTargetingOverrides,
  TargetingWithOverrides,
  TargetingReachEstimate,
} from "./types.js";

// Export validation functions
export {
  validateTargetingConfig,
  validateLocationTarget,
  validateLocationTargets,
  validateDemographicTarget,
  validateDeviceTarget,
  validateAudienceTarget,
  validateAudienceTargets,
  validatePlacementTarget,
} from "./validation.js";

// Export location data and utilities
export {
  COUNTRIES,
  US_STATES,
  CA_PROVINCES,
  UK_REGIONS,
  COMMON_LANGUAGES,
  searchLocations,
  getCountryByCode,
  getStatesByCountry,
  getLanguageByCode,
  isValidCountryCode,
  isValidLanguageCode,
} from "./locations.js";

export type { LanguageOption } from "./locations.js";
