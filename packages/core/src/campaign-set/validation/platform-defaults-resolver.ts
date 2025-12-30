/**
 * Platform Defaults Resolver
 *
 * Provides platform-specific default values for campaign, ad group, and ad fields.
 * This allows validators to check if a missing field has a platform default before
 * flagging it as a validation error.
 *
 * The defaults are sourced from the platform adapters and represent the values
 * that will be applied when creating entities on the platform.
 *
 * Supports extensible platforms - any string can be used as a platform identifier.
 * Known platforms (reddit, google, meta, etc.) have pre-configured defaults,
 * while unknown platforms receive empty defaults.
 *
 * @example
 * ```typescript
 * const resolver = new PlatformDefaultsResolver();
 *
 * // Check if a field has a default (known platform)
 * if (resolver.hasDefault("reddit", "campaign", "objective")) {
 *   // Don't flag as missing required field
 * }
 *
 * // Get the default value
 * const defaultObjective = resolver.getDefault("reddit", "campaign", "objective");
 * // Returns "IMPRESSIONS"
 *
 * // Register defaults for a custom platform
 * resolver.registerDefaults("tiktok", {
 *   campaign: { objective: "REACH" },
 *   adGroup: { placementType: "AUTOMATIC" },
 *   ad: {},
 * });
 * ```
 */

import {
  type Platform,
  type KnownPlatform,
  type SupportedPlatform,
  KNOWN_PLATFORMS,
} from "./types.js";

// Re-export for convenience
export { KNOWN_PLATFORMS };
export type { Platform, KnownPlatform, SupportedPlatform };

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Entity types within a campaign hierarchy
 */
export type EntityType = "campaign" | "adGroup" | "ad";

/**
 * Default values for each entity type within a platform
 */
export interface PlatformDefaults {
  /** Default values for campaign-level fields */
  campaign: Record<string, unknown>;
  /** Default values for ad group-level fields */
  adGroup: Record<string, unknown>;
  /** Default values for ad-level fields */
  ad: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform-Specific Default Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reddit platform defaults
 *
 * These values are sourced from the RedditAdsAdapter and represent the
 * fallback values used when fields are not explicitly provided.
 */
const REDDIT_DEFAULTS: PlatformDefaults = {
  campaign: {
    /**
     * Default objective for Reddit campaigns
     * @see RedditAdsAdapter.mapObjective - defaults to IMPRESSIONS
     */
    objective: "IMPRESSIONS",
    /**
     * Default special ad categories for Reddit campaigns
     * @see RedditAdsAdapter.transformCampaign - defaults to ["NONE"]
     */
    specialAdCategories: ["NONE"],
  },
  adGroup: {
    /**
     * Default bid strategy for Reddit ad groups
     * @see RedditAdsAdapter.mapBidStrategy - defaults to MAXIMIZE_VOLUME
     */
    bidStrategy: "MAXIMIZE_VOLUME",
    /**
     * Default bid type for Reddit ad groups
     * @see RedditAdsAdapter.mapBidType - defaults to CPC
     */
    bidType: "CPC",
  },
  ad: {
    // Note: callToAction is optional in AdValidator and not enforced as required.
    // The adapter applies "LEARN_MORE" default but we don't need to skip validation for it.
  },
};

/**
 * Google platform defaults
 *
 * Currently empty - to be implemented when Google-specific validation is added.
 */
const GOOGLE_DEFAULTS: PlatformDefaults = {
  campaign: {},
  adGroup: {},
  ad: {},
};

/**
 * Empty defaults for unknown platforms
 */
const EMPTY_DEFAULTS: PlatformDefaults = {
  campaign: {},
  adGroup: {},
  ad: {},
};

/**
 * Built-in defaults for known platforms
 *
 * This is used to initialize the resolver's internal defaults map.
 */
const BUILT_IN_DEFAULTS: Partial<Record<KnownPlatform, PlatformDefaults>> = {
  reddit: REDDIT_DEFAULTS,
  google: GOOGLE_DEFAULTS,
};

// ─────────────────────────────────────────────────────────────────────────────
// PlatformDefaultsResolver Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolver for platform-specific default values
 *
 * Use this class in validators to determine if a missing field has a
 * platform default, allowing validation to pass for fields that will
 * be filled in by the adapter during sync.
 *
 * Supports extensible platforms - any string can be used as a platform
 * identifier. Known platforms have built-in defaults, while custom
 * platforms can have defaults registered at runtime.
 *
 * @example
 * ```typescript
 * const resolver = new PlatformDefaultsResolver();
 *
 * // Known platforms work out of the box
 * resolver.hasDefault("reddit", "campaign", "objective"); // true
 *
 * // Unknown platforms return empty defaults
 * resolver.getDefaults("pinterest"); // { campaign: {}, adGroup: {}, ad: {} }
 *
 * // Register custom platform defaults
 * resolver.registerDefaults("tiktok", {
 *   campaign: { objective: "REACH" },
 *   adGroup: {},
 *   ad: {},
 * });
 * ```
 */
export class PlatformDefaultsResolver {
  /**
   * Instance-specific platform defaults map
   *
   * Initialized with built-in defaults and can be extended at runtime.
   */
  private readonly platformDefaults: Map<Platform, PlatformDefaults>;

  constructor() {
    // Initialize with built-in defaults
    this.platformDefaults = new Map();
    for (const [platform, defaults] of Object.entries(BUILT_IN_DEFAULTS)) {
      if (defaults) {
        this.platformDefaults.set(platform, this.deepCopy(defaults));
      }
    }
  }

  /**
   * Get all default values for a platform
   *
   * Returns a deep copy to prevent mutation of the internal defaults.
   *
   * @param platform - The platform to get defaults for (any string)
   * @returns Platform defaults for campaign, adGroup, and ad entities
   */
  getDefaults(platform: Platform): PlatformDefaults {
    const defaults = this.platformDefaults.get(platform) ?? EMPTY_DEFAULTS;
    return this.deepCopy(defaults);
  }

  /**
   * Check if a field has a default value for the given platform and entity type
   *
   * @param platform - The platform to check (any string)
   * @param entityType - The entity type (campaign, adGroup, ad)
   * @param field - The field name to check
   * @returns true if the field has a default value, false otherwise
   */
  hasDefault(platform: Platform, entityType: EntityType, field: string): boolean {
    const defaults = this.platformDefaults.get(platform);
    if (!defaults) return false;

    const entityDefaults = defaults[entityType];
    return field in entityDefaults;
  }

  /**
   * Get the default value for a specific field
   *
   * Returns a copy of array values to prevent mutation.
   *
   * @param platform - The platform to get the default from (any string)
   * @param entityType - The entity type (campaign, adGroup, ad)
   * @param field - The field name to get the default for
   * @returns The default value, or undefined if no default exists
   */
  getDefault(
    platform: Platform,
    entityType: EntityType,
    field: string
  ): unknown | undefined {
    const defaults = this.platformDefaults.get(platform);
    if (!defaults) return undefined;

    const entityDefaults = defaults[entityType];
    const value = entityDefaults[field];

    // Return a copy of arrays to prevent mutation
    if (Array.isArray(value)) {
      return [...value];
    }

    return value;
  }

  /**
   * Register default values for a custom platform
   *
   * This allows extending the resolver with defaults for platforms
   * that are not built-in. Registered defaults are instance-specific
   * and do not affect other resolver instances.
   *
   * @param platform - The platform identifier (any string)
   * @param defaults - The default values for the platform
   *
   * @example
   * ```typescript
   * resolver.registerDefaults("tiktok", {
   *   campaign: { objective: "REACH" },
   *   adGroup: { placementType: "AUTOMATIC" },
   *   ad: {},
   * });
   * ```
   */
  registerDefaults(platform: Platform, defaults: PlatformDefaults): void {
    this.platformDefaults.set(platform, this.deepCopy(defaults));
  }

  /**
   * Check if a platform is a known platform with built-in defaults
   *
   * @param platform - The platform identifier to check
   * @returns true if the platform is a known platform, false otherwise
   */
  isKnownPlatform(platform: Platform): platform is KnownPlatform {
    return (KNOWN_PLATFORMS as readonly string[]).includes(platform);
  }

  /**
   * Create a deep copy of platform defaults
   *
   * This ensures callers cannot mutate the internal default values.
   */
  private deepCopy(defaults: PlatformDefaults): PlatformDefaults {
    return {
      campaign: this.copyRecord(defaults.campaign),
      adGroup: this.copyRecord(defaults.adGroup),
      ad: this.copyRecord(defaults.ad),
    };
  }

  /**
   * Copy a record, ensuring arrays are also copied
   */
  private copyRecord(record: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (Array.isArray(value)) {
        result[key] = [...value];
      } else if (value !== null && typeof value === "object") {
        // Deep copy nested objects if needed
        result[key] = { ...value };
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
