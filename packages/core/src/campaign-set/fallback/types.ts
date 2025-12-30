/**
 * Fallback Ad System Types
 *
 * Types for handling ads that exceed platform character limits during sync.
 * Provides configurable strategies: skip, truncate, or use fallback.
 */

import type { Ad } from "../types.js";
import type { ValidationError } from "../validation/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Strategy Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strategy for handling ads that fail validation due to field length limits.
 *
 * - "skip": Skip the ad entirely (safest, no invalid data sent to platform)
 * - "truncate": Truncate fields to fit within limits
 * - "use_fallback": Replace with a pre-defined fallback ad
 */
export type CampaignSetFallbackStrategy = "skip" | "truncate" | "use_fallback";

/**
 * Static fallback ad definition (no variables allowed).
 * Used when fallbackStrategy is "use_fallback".
 */
export interface FallbackAdDefinition {
  /** Headline text - max 100 chars for Reddit, 30 for Google */
  headline: string;
  /** Description text - max 500 chars for Reddit, 90 for Google */
  description: string;
  /** Display URL - max 25 chars */
  displayUrl?: string;
  /** Final URL - must be valid, no truncation allowed */
  finalUrl: string;
  /** Call to action - must be valid enum value */
  callToAction?: string;
}

/**
 * Configuration for truncation behavior.
 */
export interface TruncationConfig {
  /** Whether to allow truncating headlines */
  truncateHeadline: boolean;
  /** Whether to allow truncating descriptions */
  truncateDescription: boolean;
  /** Whether to preserve word boundaries when truncating */
  preserveWordBoundary: boolean;
}

/**
 * Default truncation configuration.
 */
export const DEFAULT_TRUNCATION_CONFIG: TruncationConfig = {
  truncateHeadline: true,
  truncateDescription: true,
  preserveWordBoundary: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Skipped Ad Record Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record of an ad that was skipped during sync.
 * Contains full context for debugging and user review.
 */
export interface SkippedAdRecord {
  /** ID of the skipped ad */
  adId: string;
  /** ID of the ad group containing this ad */
  adGroupId: string;
  /** ID of the campaign containing this ad */
  campaignId: string;
  /** Reason for skipping */
  reason: string;
  /** Field(s) that caused the skip */
  fields: string[];
  /** Overflow amounts per field */
  overflow: Record<string, number>;
  /** Original ad content snapshot */
  originalAd: {
    headline?: string;
    description?: string;
    displayUrl?: string;
    finalUrl?: string;
  };
  /** Timestamp when the ad was skipped */
  skippedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Engine Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result action from the strategy engine.
 */
export type StrategyAction = "sync" | "skip" | "fallback";

/**
 * Result of applying a fallback strategy to an ad.
 */
export interface StrategyResult {
  /** Action to take */
  action: StrategyAction;
  /** The ad to sync (original, truncated, or fallback) */
  ad: Ad;
  /** If skipped, the record for tracking */
  skippedRecord?: SkippedAdRecord;
  /** Whether truncation was applied */
  wasTruncated?: boolean;
  /** Whether fallback was used */
  usedFallback?: boolean;
}

/**
 * Context for strategy application.
 */
export interface StrategyContext {
  /** Campaign ID containing the ad */
  campaignId: string;
  /** Ad Group ID containing the ad */
  adGroupId: string;
  /** Target platform */
  platform: "reddit" | "google";
}

// ─────────────────────────────────────────────────────────────────────────────
// Extended Sync Result Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extended sync result that includes fallback/skip tracking.
 */
export interface ExtendedSyncResult {
  /** Number of campaigns successfully synced */
  synced: number;
  /** Number of campaigns that failed to sync */
  failed: number;
  /** Number of campaigns skipped (including ads skipped by fallback strategy) */
  skipped: number;
  /** Number of ads that were skipped due to validation */
  skippedAds: number;
  /** Number of ads that used fallback content */
  fallbacksUsed: number;
  /** Number of ads that were truncated */
  truncated: number;
  /** Detailed records of skipped ads */
  skippedAdRecords: SkippedAdRecord[];
  /** Array of error details for failed campaigns */
  errors: Array<{
    campaignId: string;
    message: string;
  }>;
}
