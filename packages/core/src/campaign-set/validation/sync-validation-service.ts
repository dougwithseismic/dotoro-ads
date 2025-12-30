/**
 * Sync Validation Service
 *
 * Validates entire campaign set hierarchies before sync operations.
 * Collects ALL errors across all entities - does not fail fast.
 *
 * Features:
 * - Validates campaigns, ad groups, and ads against Reddit v3 API requirements
 * - Validates dependency chains (ad groups reference valid campaigns, etc.)
 * - Collects all errors for a complete validation report
 * - Performance target: < 100ms for typical campaign sets
 */

import type { CampaignSet, Campaign, AdGroup, Ad } from "../types.js";
import type {
  ValidationResult,
  ValidationError,
  CampaignValidationResult,
  AdGroupValidationResult,
  EntityValidationResult,
  ValidationSummary,
  ValidationOptions,
} from "./types.js";
import {
  CampaignValidator,
  type CampaignValidationContext,
} from "./validators/campaign-validator.js";
import {
  AdGroupValidator,
  type AdGroupValidationContext,
} from "./validators/ad-group-validator.js";
import { AdValidator, type AdValidationContext } from "./validators/ad-validator.js";

// ─────────────────────────────────────────────────────────────────────────────
// Sync Validation Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SyncValidationService
 *
 * Validates campaign sets for Reddit API compatibility before sync.
 * Performs comprehensive validation including:
 * - Field-level validation (required fields, formats, lengths)
 * - Enum value validation (objectives, bid strategies, etc.)
 * - Dependency chain validation (entity references)
 * - Business rule validation (budget consistency, etc.)
 */
export class SyncValidationService {
  private readonly campaignValidator: CampaignValidator;
  private readonly adGroupValidator: AdGroupValidator;
  private readonly adValidator: AdValidator;

  constructor() {
    this.campaignValidator = new CampaignValidator();
    this.adGroupValidator = new AdGroupValidator();
    this.adValidator = new AdValidator();
  }

  /**
   * Validate an entire campaign set.
   *
   * Traverses the complete hierarchy and collects all validation errors.
   * Does not fail fast - collects ALL errors for a complete report.
   *
   * @param campaignSet - The campaign set to validate
   * @param options - Optional validation options
   * @returns Complete validation result with all errors
   *
   * @example
   * ```typescript
   * const service = new SyncValidationService();
   * const result = await service.validateCampaignSet(campaignSet);
   *
   * if (!result.isValid) {
   *   console.log(`Found ${result.totalErrors} errors`);
   *   for (const campaign of result.campaigns) {
   *     for (const error of campaign.errors) {
   *       console.log(`${error.field}: ${error.message}`);
   *     }
   *   }
   * }
   * ```
   */
  validateCampaignSet(
    campaignSet: CampaignSet,
    options?: ValidationOptions
  ): ValidationResult {
    const startTime = performance.now();

    // Build ID sets for dependency validation
    const campaignIds = new Set<string>(
      campaignSet.campaigns.map((c) => c.id)
    );
    const adGroupIds = new Set<string>();
    for (const campaign of campaignSet.campaigns) {
      for (const adGroup of campaign.adGroups) {
        adGroupIds.add(adGroup.id);
      }
    }

    // Initialize summary counters
    const summary: ValidationSummary = {
      campaignsValidated: 0,
      adGroupsValidated: 0,
      adsValidated: 0,
      keywordsValidated: 0,
      campaignsWithErrors: 0,
      adGroupsWithErrors: 0,
      adsWithErrors: 0,
      keywordsWithErrors: 0,
    };

    // Validate all campaigns and their children
    const campaignResults: CampaignValidationResult[] = [];
    let totalErrors = 0;

    for (const campaign of campaignSet.campaigns) {
      const campaignResult = this.validateCampaignWithChildren(
        campaign,
        campaignIds,
        adGroupIds,
        options
      );

      campaignResults.push(campaignResult);

      // Update summary
      summary.campaignsValidated++;
      if (!campaignResult.isValid) {
        summary.campaignsWithErrors++;
      }

      // Count campaign-level errors
      totalErrors += campaignResult.errors.length;

      // Process ad groups
      for (const adGroupResult of campaignResult.adGroups) {
        summary.adGroupsValidated++;
        if (!adGroupResult.isValid) {
          summary.adGroupsWithErrors++;
        }
        totalErrors += adGroupResult.errors.length;

        // Process ads
        for (const adResult of adGroupResult.ads) {
          summary.adsValidated++;
          if (!adResult.isValid) {
            summary.adsWithErrors++;
          }
          totalErrors += adResult.errors.length;
        }

        // Process keywords
        for (const keywordResult of adGroupResult.keywords) {
          summary.keywordsValidated++;
          if (!keywordResult.isValid) {
            summary.keywordsWithErrors++;
          }
          totalErrors += keywordResult.errors.length;
        }
      }
    }

    const endTime = performance.now();

    return {
      isValid: totalErrors === 0,
      campaignSetId: campaignSet.id,
      totalErrors,
      campaigns: campaignResults,
      summary,
      validationTimeMs: Math.round(endTime - startTime),
    };
  }

  /**
   * Validate a single campaign with all its children.
   */
  private validateCampaignWithChildren(
    campaign: Campaign,
    validCampaignIds: Set<string>,
    validAdGroupIds: Set<string>,
    options?: ValidationOptions
  ): CampaignValidationResult {
    // Pass platform context to campaign validator
    const campaignContext: CampaignValidationContext = {
      platform: options?.platform,
    };
    const campaignErrors = this.campaignValidator.validate(campaign, campaignContext);

    // Validate all ad groups with platform context
    const adGroupResults: AdGroupValidationResult[] = [];
    const adGroupContext: AdGroupValidationContext = {
      campaignId: campaign.id,
      validCampaignIds,
      platform: options?.platform,
    };

    for (const adGroup of campaign.adGroups) {
      const adGroupResult = this.validateAdGroupWithChildren(
        adGroup,
        adGroupContext,
        validAdGroupIds
      );
      adGroupResults.push(adGroupResult);
    }

    return {
      entityId: campaign.id,
      entityName: campaign.name,
      isValid:
        campaignErrors.length === 0 &&
        adGroupResults.every((ag) => ag.isValid),
      errors: campaignErrors,
      adGroups: adGroupResults,
    };
  }

  /**
   * Validate an ad group with all its children.
   */
  private validateAdGroupWithChildren(
    adGroup: AdGroup,
    context: AdGroupValidationContext,
    validAdGroupIds: Set<string>
  ): AdGroupValidationResult {
    // Validate ad group itself
    const adGroupErrors = this.adGroupValidator.validate(adGroup, context);

    // Validate all ads
    const adResults: EntityValidationResult[] = [];
    const adContext: AdValidationContext = {
      adGroupId: adGroup.id,
      validAdGroupIds,
    };

    for (const ad of adGroup.ads) {
      const adErrors = this.adValidator.validate(ad, adContext);
      adResults.push({
        entityId: ad.id,
        entityName: ad.headline || `Ad ${ad.id}`,
        isValid: adErrors.length === 0,
        errors: adErrors,
      });
    }

    // Validate keywords (Reddit doesn't use keywords, so we just return empty results)
    // Keywords are validated but Reddit-specific validation is skipped
    const keywordResults: EntityValidationResult[] = [];
    for (const keyword of adGroup.keywords) {
      // No validation needed for Reddit keywords (they're not used)
      keywordResults.push({
        entityId: keyword.id,
        entityName: keyword.keyword,
        isValid: true,
        errors: [],
      });
    }

    return {
      entityId: adGroup.id,
      entityName: adGroup.name,
      isValid:
        adGroupErrors.length === 0 &&
        adResults.every((a) => a.isValid) &&
        keywordResults.every((k) => k.isValid),
      errors: adGroupErrors,
      ads: adResults,
      keywords: keywordResults,
    };
  }

  /**
   * Collect all errors from a validation result into a flat array.
   *
   * Useful for display or logging all errors.
   *
   * @param result - The validation result
   * @returns Flat array of all validation errors
   */
  collectAllErrors(result: ValidationResult): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const campaign of result.campaigns) {
      errors.push(...campaign.errors);

      for (const adGroup of campaign.adGroups) {
        errors.push(...adGroup.errors);

        for (const ad of adGroup.ads) {
          errors.push(...ad.errors);
        }

        for (const keyword of adGroup.keywords) {
          errors.push(...keyword.errors);
        }
      }
    }

    return errors;
  }

  /**
   * Get a human-readable summary of validation errors.
   *
   * @param result - The validation result
   * @returns Multi-line string summarizing errors
   */
  formatValidationSummary(result: ValidationResult): string {
    if (result.isValid) {
      return `Validation passed: ${result.summary.campaignsValidated} campaigns, ${result.summary.adGroupsValidated} ad groups, ${result.summary.adsValidated} ads validated in ${result.validationTimeMs}ms`;
    }

    const lines: string[] = [
      `Validation failed with ${result.totalErrors} error(s):`,
    ];

    if (result.summary.campaignsWithErrors > 0) {
      lines.push(
        `  - ${result.summary.campaignsWithErrors}/${result.summary.campaignsValidated} campaigns have errors`
      );
    }
    if (result.summary.adGroupsWithErrors > 0) {
      lines.push(
        `  - ${result.summary.adGroupsWithErrors}/${result.summary.adGroupsValidated} ad groups have errors`
      );
    }
    if (result.summary.adsWithErrors > 0) {
      lines.push(
        `  - ${result.summary.adsWithErrors}/${result.summary.adsValidated} ads have errors`
      );
    }

    lines.push(`  Completed in ${result.validationTimeMs}ms`);

    return lines.join("\n");
  }
}

// Export a singleton instance for convenience
let defaultInstance: SyncValidationService | null = null;

/**
 * Get the default SyncValidationService instance.
 */
export function getSyncValidationService(): SyncValidationService {
  if (!defaultInstance) {
    defaultInstance = new SyncValidationService();
  }
  return defaultInstance;
}
