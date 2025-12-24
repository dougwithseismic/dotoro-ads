/**
 * Targeting Validation Functions
 *
 * Validates targeting configurations including locations, demographics,
 * interests, audiences, devices, and placements.
 */

import type { ValidationResult } from "../shared/validation-types.js";
import type {
  TargetingConfig,
  LocationTarget,
  LocationTargetType,
  DemographicTarget,
  Gender,
  DeviceTarget,
  DeviceType,
  OperatingSystem,
  Browser,
  AudienceTarget,
  AudienceType,
  PlacementTarget,
} from "./types.js";

// Re-export ValidationResult for convenience
export type { ValidationResult };

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const VALID_LOCATION_TYPES: LocationTargetType[] = [
  "country",
  "region",
  "city",
  "postal",
  "radius",
];

const VALID_GENDERS: Gender[] = ["male", "female", "other"];

const VALID_DEVICE_TYPES: DeviceType[] = ["desktop", "mobile", "tablet"];

const VALID_OPERATING_SYSTEMS: OperatingSystem[] = [
  "windows",
  "macos",
  "linux",
  "ios",
  "android",
  "chrome_os",
];

const VALID_BROWSERS: Browser[] = [
  "chrome",
  "firefox",
  "safari",
  "edge",
  "opera",
];

const VALID_AUDIENCE_TYPES: AudienceType[] = [
  "custom",
  "lookalike",
  "saved",
  "retargeting",
];

// Age constraints
const MIN_AGE = 13;
const MAX_AGE = 120;
const NARROW_AGE_RANGE_THRESHOLD = 5;

// Radius constraints (in kilometers)
const MAX_RADIUS_KM = 500;

// Audience size thresholds
const SMALL_AUDIENCE_THRESHOLD = 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Location Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a location target configuration
 */
export function validateLocationTarget(
  target: LocationTarget
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate type
  if (!VALID_LOCATION_TYPES.includes(target.type)) {
    errors.push(
      `Invalid location type: ${target.type}. Must be one of: ${VALID_LOCATION_TYPES.join(", ")}`
    );
  }

  // Validate value
  if (!target.value || target.value.trim() === "") {
    errors.push("Location value is required");
  }

  // Validate name
  if (!target.name || target.name.trim() === "") {
    errors.push("Location name is required");
  }

  // Radius-specific validation
  if (target.type === "radius") {
    if (target.radius === undefined || target.radius === null) {
      errors.push("Radius is required for radius targeting");
    } else if (target.radius <= 0) {
      errors.push("Radius must be a positive number");
    } else if (target.radius > MAX_RADIUS_KM) {
      errors.push(`Radius cannot exceed ${MAX_RADIUS_KM} kilometers`);
    }

    // Validate coordinates format
    if (target.value && target.value.trim() !== "") {
      const coords = target.value.split(",").map((s) => s.trim());
      if (coords.length !== 2) {
        errors.push(
          "Radius targeting requires valid coordinates in format 'lat,lng'"
        );
      } else {
        const lat = parseFloat(coords[0] ?? "");
        const lng = parseFloat(coords[1] ?? "");

        if (isNaN(lat) || isNaN(lng)) {
          errors.push(
            "Radius targeting requires valid coordinates in format 'lat,lng'"
          );
        } else {
          if (lat < -90 || lat > 90) {
            errors.push("Latitude must be between -90 and 90");
          }
          if (lng < -180 || lng > 180) {
            errors.push("Longitude must be between -180 and 180");
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate an array of location targets
 */
export function validateLocationTargets(
  targets: LocationTarget[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    if (target) {
      const result = validateLocationTarget(target);
      errors.push(
        ...result.errors.map((e) => `Location ${i + 1}: ${e}`)
      );
      warnings.push(
        ...result.warnings.map((w) => `Location ${i + 1}: ${w}`)
      );
    }
  }

  // Check for conflicting targets (same location both included and excluded)
  const locationMap = new Map<string, boolean>();
  for (const target of targets) {
    const key = `${target.type}:${target.value}`;
    if (locationMap.has(key) && locationMap.get(key) !== target.include) {
      warnings.push(
        `Location "${target.name}" is both included and excluded, which may cause unexpected behavior`
      );
    }
    locationMap.set(key, target.include);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Demographic Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate demographic targeting configuration
 */
export function validateDemographicTarget(
  target: DemographicTarget
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate age range
  if (target.ageMin !== undefined) {
    if (target.ageMin < MIN_AGE) {
      errors.push(`Minimum age must be at least ${MIN_AGE}`);
    }
  }

  if (target.ageMax !== undefined) {
    if (target.ageMax > MAX_AGE) {
      errors.push(`Maximum age cannot exceed ${MAX_AGE}`);
    }
  }

  if (
    target.ageMin !== undefined &&
    target.ageMax !== undefined &&
    target.ageMin > target.ageMax
  ) {
    errors.push("Minimum age cannot exceed maximum age");
  }

  // Warn about narrow age range
  if (
    target.ageMin !== undefined &&
    target.ageMax !== undefined &&
    target.ageMax - target.ageMin < NARROW_AGE_RANGE_THRESHOLD
  ) {
    const range = target.ageMax - target.ageMin;
    warnings.push(
      `Age range is very narrow (${range} years). Consider broadening for better reach.`
    );
  }

  // Validate genders
  if (target.genders) {
    for (const gender of target.genders) {
      if (!VALID_GENDERS.includes(gender)) {
        errors.push(
          `Invalid gender: ${gender}. Must be one of: ${VALID_GENDERS.join(", ")}`
        );
      }
    }
  }

  // Validate language codes (ISO 639-1: 2-letter codes)
  if (target.languages) {
    for (const lang of target.languages) {
      if (!/^[a-z]{2}$/i.test(lang)) {
        errors.push(
          `Invalid language code: ${lang}. Must be a 2-letter ISO 639-1 code`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Device Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate device targeting configuration
 */
export function validateDeviceTarget(target: DeviceTarget): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate device types
  if (target.types) {
    for (const deviceType of target.types) {
      if (!VALID_DEVICE_TYPES.includes(deviceType)) {
        errors.push(
          `Invalid device type: ${deviceType}. Must be one of: ${VALID_DEVICE_TYPES.join(", ")}`
        );
      }
    }
  }

  // Validate operating systems
  if (target.operatingSystems) {
    for (const os of target.operatingSystems) {
      if (!VALID_OPERATING_SYSTEMS.includes(os)) {
        errors.push(
          `Invalid operating system: ${os}. Must be one of: ${VALID_OPERATING_SYSTEMS.join(", ")}`
        );
      }
    }
  }

  // Validate browsers
  if (target.browsers) {
    for (const browser of target.browsers) {
      if (!VALID_BROWSERS.includes(browser)) {
        errors.push(
          `Invalid browser: ${browser}. Must be one of: ${VALID_BROWSERS.join(", ")}`
        );
      }
    }
  }

  // Warn about very restrictive device targeting
  const hasRestrictiveDeviceTypes =
    target.types && target.types.length === 1;
  const hasRestrictiveOS =
    target.operatingSystems && target.operatingSystems.length === 1;
  const hasRestrictiveBrowsers =
    target.browsers && target.browsers.length === 1;

  if (hasRestrictiveDeviceTypes && hasRestrictiveOS && hasRestrictiveBrowsers) {
    warnings.push(
      "Device targeting is very restrictive. This may significantly limit reach."
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Audience Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate audience targeting configuration
 */
export function validateAudienceTarget(
  target: AudienceTarget
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate ID
  if (!target.id || target.id.trim() === "") {
    errors.push("Audience ID is required");
  }

  // Validate name
  if (!target.name || target.name.trim() === "") {
    errors.push("Audience name is required");
  }

  // Validate type
  if (!VALID_AUDIENCE_TYPES.includes(target.type)) {
    errors.push(
      `Invalid audience type: ${target.type}. Must be one of: ${VALID_AUDIENCE_TYPES.join(", ")}`
    );
  }

  // Warn about small audience size
  if (
    target.size !== undefined &&
    target.size > 0 &&
    target.size < SMALL_AUDIENCE_THRESHOLD
  ) {
    warnings.push(
      `Audience size (${target.size}) is very small. Consider using a larger audience for better results.`
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate an array of audience targets
 */
export function validateAudienceTargets(
  targets: AudienceTarget[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    if (target) {
      const result = validateAudienceTarget(target);
      errors.push(
        ...result.errors.map((e) => `Audience ${i + 1}: ${e}`)
      );
      warnings.push(
        ...result.warnings.map((w) => `Audience ${i + 1}: ${w}`)
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Placement Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a string is a valid URL
 */
function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate placement targeting configuration
 */
export function validatePlacementTarget(
  target: PlacementTarget
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate URLs
  if (target.urls) {
    for (const url of target.urls) {
      if (!isValidUrl(url)) {
        errors.push(`Invalid URL: ${url}. Must be a valid URL`);
      }
    }
  }

  // Validate excluded URLs
  if (target.excludedUrls) {
    for (const url of target.excludedUrls) {
      if (!isValidUrl(url)) {
        errors.push(`Invalid excluded URL: ${url}. Must be a valid URL`);
      }
    }
  }

  // Warn about restrictive placement targeting
  if (target.platforms && target.platforms.length > 0 && target.platforms.length < 3) {
    warnings.push(
      `Limiting placements to ${target.platforms.length} platform(s) may reduce reach. Consider adding more placements.`
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined Targeting Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate a targeting restriction score
 * Higher score = more restrictive targeting
 */
function calculateTargetingRestrictionScore(config: TargetingConfig): number {
  let score = 0;

  // Location restrictions
  if (config.locations && config.locations.length > 0) {
    const includedLocations = config.locations.filter((l) => l.include);
    if (includedLocations.length > 0) {
      // Check for narrow location targeting
      const hasCityOrPostal = includedLocations.some(
        (l) => l.type === "city" || l.type === "postal"
      );
      if (hasCityOrPostal) {
        score += 2;
      } else {
        score += 1;
      }
    }
  }

  // Demographic restrictions
  if (config.demographics) {
    const { ageMin, ageMax, genders, languages } = config.demographics;

    // Narrow age range
    if (ageMin !== undefined && ageMax !== undefined) {
      const range = ageMax - ageMin;
      if (range < 10) score += 2;
      else if (range < 20) score += 1;
    }

    // Single gender
    if (genders && genders.length === 1) {
      score += 1;
    }

    // Language restrictions
    if (languages && languages.length > 0 && languages.length < 3) {
      score += 1;
    }
  }

  // Device restrictions
  if (config.devices) {
    const { types, operatingSystems, browsers } = config.devices;

    if (types && types.length === 1) score += 1;
    if (operatingSystems && operatingSystems.length === 1) score += 1;
    if (browsers && browsers.length === 1) score += 1;
  }

  // Placement restrictions
  if (config.placements) {
    if (config.placements.platforms && config.placements.platforms.length === 1) {
      score += 1;
    }
  }

  return score;
}

/**
 * Validate a complete targeting configuration
 */
export function validateTargetingConfig(
  config: TargetingConfig
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate locations
  if (config.locations && config.locations.length > 0) {
    const locationResult = validateLocationTargets(config.locations);
    errors.push(...locationResult.errors);
    warnings.push(...locationResult.warnings);
  }

  // Validate demographics
  if (config.demographics) {
    const demographicResult = validateDemographicTarget(config.demographics);
    errors.push(...demographicResult.errors);
    warnings.push(...demographicResult.warnings);
  }

  // Validate devices
  if (config.devices) {
    const deviceResult = validateDeviceTarget(config.devices);
    errors.push(...deviceResult.errors);
    warnings.push(...deviceResult.warnings);
  }

  // Validate audiences
  if (config.audiences && config.audiences.length > 0) {
    const audienceResult = validateAudienceTargets(config.audiences);
    errors.push(...audienceResult.errors);
    warnings.push(...audienceResult.warnings);
  }

  // Validate placements
  if (config.placements) {
    const placementResult = validatePlacementTarget(config.placements);
    errors.push(...placementResult.errors);
    warnings.push(...placementResult.warnings);
  }

  // Check for overly narrow targeting
  const restrictionScore = calculateTargetingRestrictionScore(config);
  if (restrictionScore >= 5) {
    warnings.push(
      "Targeting may be too narrow. Consider broadening your audience."
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}
