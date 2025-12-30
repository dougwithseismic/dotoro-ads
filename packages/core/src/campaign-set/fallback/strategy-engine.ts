/**
 * Fallback Strategy Engine
 *
 * Handles ads that exceed platform character limits during sync.
 * Applies configurable strategies: skip, truncate, or use fallback.
 */

import type { Ad } from "../types.js";
import type { ValidationError } from "../validation/types.js";
import { ValidationErrorCode } from "../validation/types.js";
import {
  PLATFORM_LIMITS,
  truncateText,
  truncateToWordBoundary,
} from "../../generation/platform-constraints.js";
import type {
  CampaignSetFallbackStrategy,
  FallbackAdDefinition,
  TruncationConfig,
  SkippedAdRecord,
  StrategyResult,
  StrategyContext,
  DEFAULT_TRUNCATION_CONFIG,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Platform Limit Mappings
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Field to platform limit key mappings.
 * Maps our internal field names to platform-specific limits.
 */
const FIELD_LIMIT_MAPPING: Record<string, Record<string, keyof typeof PLATFORM_LIMITS.google | keyof typeof PLATFORM_LIMITS.reddit>> = {
  google: {
    headline: "headline",
    description: "description",
    displayUrl: "displayUrl",
  },
  reddit: {
    headline: "title",
    description: "text",
  },
};

/**
 * Fields that can be truncated (finalUrl and callToAction cannot be truncated).
 */
const TRUNCATABLE_FIELDS = new Set(["headline", "description", "displayUrl"]);

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Engine Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for the FallbackStrategyEngine.
 */
export interface StrategyEngineConfig {
  /** The fallback strategy to use */
  strategy: CampaignSetFallbackStrategy;
  /** Fallback ad definition (required when strategy is "use_fallback") */
  fallbackAd?: FallbackAdDefinition;
  /** Truncation configuration (used when strategy is "truncate") */
  truncationConfig?: TruncationConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Engine Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FallbackStrategyEngine
 *
 * Applies configurable strategies to handle ads that exceed platform limits.
 *
 * @example
 * ```typescript
 * const engine = new FallbackStrategyEngine({
 *   strategy: "truncate",
 *   truncationConfig: {
 *     truncateHeadline: true,
 *     truncateDescription: true,
 *     preserveWordBoundary: true,
 *   },
 * });
 *
 * const result = engine.applyStrategy(ad, errors, context);
 * if (result.action === "sync") {
 *   // Sync the (possibly truncated) ad
 * } else if (result.action === "skip") {
 *   // Record the skip and continue
 * }
 * ```
 */
export class FallbackStrategyEngine {
  private readonly strategy: CampaignSetFallbackStrategy;
  private readonly fallbackAd?: FallbackAdDefinition;
  private readonly truncationConfig: TruncationConfig;

  constructor(config: StrategyEngineConfig) {
    this.strategy = config.strategy;
    this.fallbackAd = config.fallbackAd;
    this.truncationConfig = config.truncationConfig ?? {
      truncateHeadline: true,
      truncateDescription: true,
      preserveWordBoundary: true,
    };

    // Validate configuration
    if (this.strategy === "use_fallback" && !this.fallbackAd) {
      throw new Error("Fallback ad must be provided when using 'use_fallback' strategy");
    }
  }

  /**
   * Apply the configured strategy to an ad with validation errors.
   *
   * @param ad - The ad to process
   * @param errors - Validation errors for this ad
   * @param context - Context including campaign/adGroup IDs and platform
   * @returns Strategy result with action to take and processed ad
   */
  applyStrategy(ad: Ad, errors: ValidationError[], context: StrategyContext): StrategyResult {
    // Filter to only FIELD_TOO_LONG errors
    const lengthErrors = this.getLengthErrors(errors);

    // If no length errors, sync as-is
    if (lengthErrors.length === 0) {
      return {
        action: "sync",
        ad,
      };
    }

    // Apply strategy based on configuration
    switch (this.strategy) {
      case "skip":
        return this.applySkipStrategy(ad, lengthErrors, context);

      case "truncate":
        return this.applyTruncateStrategy(ad, lengthErrors, context);

      case "use_fallback":
        return this.applyFallbackStrategy(ad, lengthErrors, context);

      default:
        // Exhaustive check
        const _exhaustive: never = this.strategy;
        throw new Error(`Unknown strategy: ${this.strategy}`);
    }
  }

  /**
   * Check if any errors are FIELD_TOO_LONG errors.
   */
  hasLengthErrors(errors: ValidationError[]): boolean {
    return errors.some((e) => e.code === ValidationErrorCode.FIELD_TOO_LONG);
  }

  /**
   * Get only FIELD_TOO_LONG errors from an error array.
   */
  getLengthErrors(errors: ValidationError[]): ValidationError[] {
    return errors.filter((e) => e.code === ValidationErrorCode.FIELD_TOO_LONG);
  }

  // ─── Private Strategy Implementations ─────────────────────────────────────

  /**
   * Apply skip strategy - mark ad as skipped with full context.
   */
  private applySkipStrategy(
    ad: Ad,
    lengthErrors: ValidationError[],
    context: StrategyContext
  ): StrategyResult {
    const fields = lengthErrors.map((e) => e.field);
    const overflow: Record<string, number> = {};

    for (const error of lengthErrors) {
      // Extract overflow from error message or calculate from value
      if (typeof error.value === "string" && error.expected) {
        const limit = parseInt(error.expected, 10);
        if (!isNaN(limit)) {
          overflow[error.field] = error.value.length - limit;
        }
      }
    }

    const skippedRecord: SkippedAdRecord = {
      adId: ad.id,
      adGroupId: context.adGroupId,
      campaignId: context.campaignId,
      reason: `Fields exceed platform limits: ${fields.join(", ")}`,
      fields,
      overflow,
      originalAd: {
        headline: ad.headline,
        description: ad.description,
        displayUrl: ad.displayUrl,
        finalUrl: ad.finalUrl,
      },
      skippedAt: new Date().toISOString(),
    };

    return {
      action: "skip",
      ad,
      skippedRecord,
    };
  }

  /**
   * Apply truncate strategy - truncate fields to fit within limits.
   */
  private applyTruncateStrategy(
    ad: Ad,
    lengthErrors: ValidationError[],
    context: StrategyContext
  ): StrategyResult {
    // Check if all failing fields can be truncated
    for (const error of lengthErrors) {
      if (!TRUNCATABLE_FIELDS.has(error.field)) {
        // Can't truncate this field (e.g., finalUrl) - must skip
        return this.applySkipStrategy(ad, lengthErrors, context);
      }

      // Check if truncation is enabled for this field
      if (error.field === "headline" && !this.truncationConfig.truncateHeadline) {
        return this.applySkipStrategy(ad, lengthErrors, context);
      }
      if (error.field === "description" && !this.truncationConfig.truncateDescription) {
        return this.applySkipStrategy(ad, lengthErrors, context);
      }
    }

    // Create truncated copy of the ad
    const truncatedAd: Ad = { ...ad };
    const truncateFn = this.truncationConfig.preserveWordBoundary
      ? truncateToWordBoundary
      : truncateText;

    // Get platform-specific limits
    const platformLimits = this.getPlatformLimits(context.platform);

    // Truncate each failing field
    for (const error of lengthErrors) {
      const limit = platformLimits[error.field];
      if (!limit) continue;

      const fieldKey = error.field as keyof Ad;
      const value = truncatedAd[fieldKey] as string | undefined;
      if (value) {
        // Use type-safe field assignment
        if (fieldKey === "headline") {
          truncatedAd.headline = truncateFn(value, limit);
        } else if (fieldKey === "description") {
          truncatedAd.description = truncateFn(value, limit);
        } else if (fieldKey === "displayUrl") {
          truncatedAd.displayUrl = truncateFn(value, limit);
        }
      }
    }

    return {
      action: "sync",
      ad: truncatedAd,
      wasTruncated: true,
    };
  }

  /**
   * Apply fallback strategy - replace ad content with fallback ad.
   */
  private applyFallbackStrategy(
    ad: Ad,
    _lengthErrors: ValidationError[],
    _context: StrategyContext
  ): StrategyResult {
    if (!this.fallbackAd) {
      throw new Error("Fallback ad not configured");
    }

    // Create new ad with fallback content but original metadata
    const fallbackAdResult: Ad = {
      ...ad,
      headline: this.fallbackAd.headline,
      description: this.fallbackAd.description,
      displayUrl: this.fallbackAd.displayUrl,
      finalUrl: this.fallbackAd.finalUrl,
      callToAction: this.fallbackAd.callToAction,
    };

    return {
      action: "fallback",
      ad: fallbackAdResult,
      usedFallback: true,
    };
  }

  /**
   * Get platform-specific field limits.
   */
  private getPlatformLimits(platform: "reddit" | "google"): Record<string, number> {
    const limits = PLATFORM_LIMITS[platform] as Record<string, number>;
    const fieldMapping = FIELD_LIMIT_MAPPING[platform] || {};

    // Map our field names to platform limits
    const result: Record<string, number> = {};
    for (const [ourField, platformField] of Object.entries(fieldMapping)) {
      const limit = limits[platformField as string];
      if (limit !== undefined) {
        result[ourField] = limit;
      }
    }

    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a FallbackStrategyEngine from campaign set config.
 */
export function createStrategyEngine(
  strategy: CampaignSetFallbackStrategy,
  fallbackAd?: FallbackAdDefinition,
  truncationConfig?: TruncationConfig
): FallbackStrategyEngine {
  return new FallbackStrategyEngine({
    strategy,
    fallbackAd,
    truncationConfig,
  });
}
