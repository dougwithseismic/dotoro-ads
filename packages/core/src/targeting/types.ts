/**
 * Targeting Configuration Types
 *
 * Types for configuring audience targeting across advertising platforms.
 * Supports location, demographic, interest, audience, device, and placement targeting.
 */

import type { Platform } from "../ad-types/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Targeting Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Types of targeting available
 */
export type TargetingType =
  | "location"
  | "demographic"
  | "interest"
  | "audience"
  | "device"
  | "placement";

// ─────────────────────────────────────────────────────────────────────────────
// Location Targeting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Location target type
 * - country: Target entire country
 * - region: Target state/province/region
 * - city: Target specific city
 * - postal: Target postal/zip code
 * - radius: Target radius around a point
 */
export type LocationTargetType =
  | "country"
  | "region"
  | "city"
  | "postal"
  | "radius";

/**
 * Location target configuration
 */
export interface LocationTarget {
  /** Type of location targeting */
  type: LocationTargetType;

  /** Location value (code, name, or coordinates for radius) */
  value: string;

  /** Human-readable name */
  name: string;

  /** Whether to include (true) or exclude (false) this location */
  include: boolean;

  /**
   * Radius in kilometers (only for type: 'radius')
   * The value field should contain coordinates in format "lat,lng"
   */
  radius?: number;
}

/**
 * Location option for dropdowns and search
 */
export interface LocationOption {
  /** Location code (e.g., 'US', 'CA-ON') */
  code: string;

  /** Human-readable name */
  name: string;

  /** Parent location code (e.g., 'US' for 'CA-ON' state) */
  parent?: string;

  /** Location type */
  type?: LocationTargetType;
}

// ─────────────────────────────────────────────────────────────────────────────
// Demographic Targeting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gender options for targeting
 */
export type Gender = "male" | "female" | "other";

/**
 * Demographic target configuration
 */
export interface DemographicTarget {
  /**
   * Minimum age for targeting
   * Must be >= 13 (most platforms) or >= 18 (alcohol, etc.)
   */
  ageMin?: number;

  /**
   * Maximum age for targeting
   * Must be <= 65+ (usually represented as 65 meaning 65+)
   */
  ageMax?: number;

  /** Genders to target */
  genders?: Gender[];

  /**
   * Language codes to target (ISO 639-1)
   * e.g., ['en', 'es', 'fr']
   */
  languages?: string[];

  /**
   * Parental status (platform-specific)
   * e.g., 'parent', 'not_a_parent'
   */
  parentalStatus?: string[];

  /**
   * Household income tiers (platform-specific)
   * e.g., 'top_10_percent', 'top_25_percent'
   */
  householdIncome?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Interest Targeting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interest category for browsing
 */
export interface InterestCategory {
  /** Category ID */
  id: string;

  /** Category name */
  name: string;

  /** Parent category ID */
  parentId?: string;

  /** Child categories */
  children?: InterestCategory[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Audience Targeting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Audience type
 * - custom: User-defined audience from pixel/events
 * - lookalike: Similar to existing audience
 * - saved: Previously saved audience configuration
 * - retargeting: Website visitors, app users
 */
export type AudienceType = "custom" | "lookalike" | "saved" | "retargeting";

/**
 * Audience target configuration
 */
export interface AudienceTarget {
  /** Audience ID from platform */
  id: string;

  /** Audience name */
  name: string;

  /** Type of audience */
  type: AudienceType;

  /** Estimated audience size */
  size?: number;

  /** Whether to include (true) or exclude (false) */
  include?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Device Targeting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Device type for targeting
 */
export type DeviceType = "desktop" | "mobile" | "tablet";

/**
 * Operating system for targeting
 */
export type OperatingSystem =
  | "windows"
  | "macos"
  | "linux"
  | "ios"
  | "android"
  | "chrome_os";

/**
 * Browser for targeting
 */
export type Browser = "chrome" | "firefox" | "safari" | "edge" | "opera";

/**
 * Device target configuration
 */
export interface DeviceTarget {
  /** Device types to target */
  types?: DeviceType[];

  /** Operating systems to target */
  operatingSystems?: OperatingSystem[];

  /** Browsers to target */
  browsers?: Browser[];

  /**
   * Network connection types
   * e.g., 'wifi', 'cellular', '4g', '5g'
   */
  connectionTypes?: string[];

  /**
   * Device models (platform-specific)
   * e.g., 'iPhone', 'Galaxy S21'
   */
  deviceModels?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Placement Targeting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Placement target configuration
 *
 * Specifies where ads should appear within a platform's network
 */
export interface PlacementTarget {
  /**
   * Platform placements to target
   * Platform-specific identifiers for where ads appear
   *
   * Facebook examples:
   * - 'facebook_feed', 'facebook_stories', 'facebook_reels'
   * - 'instagram_feed', 'instagram_stories', 'instagram_reels'
   * - 'messenger_inbox', 'messenger_stories'
   * - 'audience_network'
   *
   * Google examples:
   * - 'google_search', 'google_display'
   * - 'youtube_videos', 'youtube_search'
   * - 'gmail', 'discover'
   *
   * Reddit examples:
   * - 'reddit_feed', 'reddit_conversation'
   */
  platforms?: string[];

  /**
   * Specific positions within placements
   * e.g., 'top', 'sidebar', 'in-article', 'in-feed'
   */
  positions?: string[];

  /**
   * Content categories to target or exclude
   * e.g., 'news', 'sports', 'entertainment'
   */
  contentCategories?: string[];

  /**
   * Specific URLs/domains to target (Display/Video)
   */
  urls?: string[];

  /**
   * URLs/domains to exclude
   */
  excludedUrls?: string[];

  /**
   * Apps to target (mobile advertising)
   */
  apps?: string[];

  /**
   * Apps to exclude
   */
  excludedApps?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined Targeting Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete targeting configuration for a campaign
 *
 * All fields are optional - omitted fields mean no restriction.
 * Multiple targeting types are combined with AND logic.
 */
export interface TargetingConfig {
  /** Location targeting (countries, regions, cities, etc.) */
  locations?: LocationTarget[];

  /** Demographic targeting (age, gender, languages) */
  demographics?: DemographicTarget;

  /**
   * Interest targeting
   * Array of interest IDs or names to target
   */
  interests?: string[];

  /** Audience targeting (custom audiences, lookalikes) */
  audiences?: AudienceTarget[];

  /** Device targeting (device types, OS, browsers) */
  devices?: DeviceTarget;

  /** Placement targeting (where ads appear) */
  placements?: PlacementTarget;
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform-Specific Targeting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Platform-specific targeting overrides
 */
export interface PlatformTargetingOverrides {
  targetingConfig?: Partial<TargetingConfig>;
}

/**
 * Targeting configuration with platform overrides
 */
export interface TargetingWithOverrides extends TargetingConfig {
  platformOverrides?: Partial<Record<Platform, PlatformTargetingOverrides>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Targeting Reach Estimation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimated reach based on targeting configuration
 */
export interface TargetingReachEstimate {
  /** Estimated minimum reach */
  minReach: number;

  /** Estimated maximum reach */
  maxReach: number;

  /** Whether targeting is considered too narrow */
  tooNarrow: boolean;

  /** Whether targeting is considered too broad */
  tooBroad: boolean;

  /**
   * Breakdown by targeting type
   * Shows how each targeting type affects reach
   */
  breakdown?: {
    type: TargetingType;
    impact: "high" | "medium" | "low";
    reductionPercent?: number;
  }[];
}

// Re-export Platform type for convenience
export type { Platform };
