/**
 * Variation Generator
 *
 * Generates campaign variations from templates and data rows.
 * Supports:
 * - Variable substitution in campaign, ad group, and ad names
 * - Multiple ad groups per campaign
 * - Multiple ads per ad group
 * - Cartesian product generation for variation sources
 * - Deduplication of identical ads (skips ads with duplicate headline+description)
 * - Preview mode with limits
 */

import { VariableEngine } from "../services/variable-engine.js";
import { RedditValidator } from "../validators/reddit-validator.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Ad template definition
 */
export interface AdTemplate {
  id: string;
  headline?: string;
  description?: string;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
}

/**
 * Ad group template definition
 */
export interface AdGroupTemplate {
  id: string;
  name?: string;
  targeting?: Record<string, unknown>;
  bidStrategy?: string;
  bidAmount?: number;
  adTemplates: AdTemplate[];
}

/**
 * Variation source for cartesian product generation
 */
export interface VariationSource {
  field: string;
  values: string[];
}

/**
 * Campaign template definition
 */
export interface CampaignTemplate {
  id: string;
  name: string;
  platform: "reddit" | "google" | "facebook";
  objective?: string;
  budget?: {
    type: "daily" | "lifetime";
    amount: number;
    currency: string;
  };
  targeting?: Record<string, unknown>;
  adGroupTemplates: AdGroupTemplate[];
  variationSources?: VariationSource[];
}

/**
 * Generated ad (after variable substitution)
 */
export interface GeneratedAd {
  id: string;
  templateId: string;
  headline: string;
  description: string;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
  sourceRowId: string;
  warnings: string[];
}

/**
 * Generated ad group
 */
export interface GeneratedAdGroup {
  id: string;
  templateId: string;
  name: string;
  targeting?: Record<string, unknown>;
  bidStrategy?: string;
  bidAmount?: number;
  ads: GeneratedAd[];
}

/**
 * Generated campaign
 */
export interface GeneratedCampaign {
  id: string;
  templateId: string;
  name: string;
  platform: "reddit" | "google" | "facebook";
  objective?: string;
  budget?: {
    type: "daily" | "lifetime";
    amount: number;
    currency: string;
  };
  targeting?: Record<string, unknown>;
  adGroups: GeneratedAdGroup[];
  sourceRowId: string;
}

/**
 * Validation warning for platform-specific limits
 */
export interface ValidationWarning {
  campaignId: string;
  adGroupId?: string;
  adId?: string;
  field: string;
  message: string;
  limit?: number;
  actual?: number;
}

/**
 * Generation result
 */
export interface GenerationResult {
  campaigns: GeneratedCampaign[];
  totalCampaigns: number;
  totalAdGroups: number;
  totalAds: number;
  warnings: string[];
  validationWarnings: ValidationWarning[];
  duplicateAdsRemoved: number;
  duplicateCampaignsRemoved: number;
}

/**
 * Generation options
 */
export interface GenerationOptions {
  /** Enable deduplication of identical campaigns */
  deduplicateCampaigns?: boolean;
  /** Enable deduplication of identical ads */
  deduplicateAds?: boolean;
  /** Enable cartesian product for variation sources */
  enableCartesianProduct?: boolean;
  /** Validate against platform-specific limits */
  validatePlatformLimits?: boolean;
  /** Preview mode - limits output */
  previewMode?: boolean;
  /** Limit for preview mode */
  previewLimit?: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class VariationGenerator {
  private variableEngine: VariableEngine;
  private redditValidator: RedditValidator;

  constructor() {
    this.variableEngine = new VariableEngine();
    this.redditValidator = new RedditValidator();
  }

  /**
   * Generate campaigns from template and data rows
   */
  generateCampaigns(
    template: CampaignTemplate,
    dataRows: Record<string, unknown>[],
    options: GenerationOptions = {}
  ): GenerationResult {
    const warnings: string[] = [];
    const validationWarnings: ValidationWarning[] = [];
    let duplicateAdsRemoved = 0;
    let duplicateCampaignsRemoved = 0;

    // Handle empty data rows
    if (dataRows.length === 0) {
      return {
        campaigns: [],
        totalCampaigns: 0,
        totalAdGroups: 0,
        totalAds: 0,
        warnings: [],
        validationWarnings: [],
        duplicateAdsRemoved: 0,
        duplicateCampaignsRemoved: 0,
      };
    }

    // Expand data rows with cartesian product if variation sources exist
    let expandedRows = dataRows;
    if (options.enableCartesianProduct && template.variationSources?.length) {
      expandedRows = this.expandWithCartesianProduct(
        dataRows,
        template.variationSources
      );
    }

    // Calculate total counts before any limiting
    const totalCampaigns = expandedRows.length;
    const totalAdGroups = totalCampaigns * template.adGroupTemplates.length;
    const totalAds = template.adGroupTemplates.reduce(
      (sum, ag) => sum + ag.adTemplates.length,
      0
    ) * totalCampaigns;

    // Apply preview limit if in preview mode
    let rowsToProcess = expandedRows;
    if (options.previewMode && options.previewLimit) {
      rowsToProcess = expandedRows.slice(0, options.previewLimit);
    }

    // Generate campaigns
    const campaigns: GeneratedCampaign[] = [];
    const seenAdHashes = new Set<string>();
    const duplicateCounter = { count: 0 }; // Track skipped duplicates

    for (const row of rowsToProcess) {
      const rowId = this.getRowId(row);
      const campaign = this.generateCampaign(
        template,
        row,
        rowId,
        warnings,
        validationWarnings,
        options,
        seenAdHashes,
        duplicateCounter
      );

      if (campaign) {
        campaigns.push(campaign);
      }
    }

    // Get count of duplicate ads that were skipped
    duplicateAdsRemoved = duplicateCounter.count;

    return {
      campaigns,
      totalCampaigns,
      totalAdGroups,
      totalAds,
      warnings,
      validationWarnings,
      duplicateAdsRemoved,
      duplicateCampaignsRemoved,
    };
  }

  /**
   * Generate a single campaign from template and data row
   */
  private generateCampaign(
    template: CampaignTemplate,
    row: Record<string, unknown>,
    rowId: string,
    warnings: string[],
    validationWarnings: ValidationWarning[],
    options: GenerationOptions,
    seenAdHashes: Set<string>,
    duplicateCounter: { count: number }
  ): GeneratedCampaign {
    const campaignId = this.generateId();

    // Substitute variables in campaign name
    const nameResult = this.variableEngine.substitute(template.name, row);
    if (nameResult.warnings.length > 0) {
      for (const w of nameResult.warnings) {
        warnings.push(`Campaign name: ${w.variable} - ${w.message}`);
      }
    }

    // Generate ad groups
    const adGroups = this.generateAdGroups(
      template.adGroupTemplates,
      template.platform,
      row,
      rowId,
      campaignId,
      warnings,
      validationWarnings,
      options,
      seenAdHashes,
      duplicateCounter
    );

    return {
      id: campaignId,
      templateId: template.id,
      name: nameResult.text,
      platform: template.platform,
      objective: template.objective,
      budget: template.budget,
      targeting: template.targeting,
      adGroups,
      sourceRowId: rowId,
    };
  }

  /**
   * Generate ad groups for a campaign
   */
  private generateAdGroups(
    adGroupTemplates: AdGroupTemplate[],
    platform: "reddit" | "google" | "facebook",
    row: Record<string, unknown>,
    rowId: string,
    campaignId: string,
    warnings: string[],
    validationWarnings: ValidationWarning[],
    options: GenerationOptions,
    seenAdHashes: Set<string>,
    duplicateCounter: { count: number }
  ): GeneratedAdGroup[] {
    const adGroups: GeneratedAdGroup[] = [];

    for (const agTemplate of adGroupTemplates) {
      const adGroupId = this.generateId();

      // Substitute variables in ad group name
      let name = agTemplate.name || "Ad Group";
      if (agTemplate.name) {
        const nameResult = this.variableEngine.substitute(agTemplate.name, row);
        name = nameResult.text;
        if (nameResult.warnings.length > 0) {
          for (const w of nameResult.warnings) {
            warnings.push(`Ad group name: ${w.variable} - ${w.message}`);
          }
        }
      }

      // Substitute variables in targeting
      let targeting = agTemplate.targeting;
      if (targeting) {
        targeting = this.substituteInObject(targeting, row);
      }

      // Generate ads
      const ads = this.generateAds(
        agTemplate.adTemplates,
        platform,
        row,
        rowId,
        campaignId,
        adGroupId,
        warnings,
        validationWarnings,
        options,
        seenAdHashes,
        duplicateCounter
      );

      adGroups.push({
        id: adGroupId,
        templateId: agTemplate.id,
        name,
        targeting,
        bidStrategy: agTemplate.bidStrategy,
        bidAmount: agTemplate.bidAmount,
        ads,
      });
    }

    return adGroups;
  }

  /**
   * Generate ads for an ad group
   */
  private generateAds(
    adTemplates: AdTemplate[],
    platform: "reddit" | "google" | "facebook",
    row: Record<string, unknown>,
    rowId: string,
    campaignId: string,
    adGroupId: string,
    warnings: string[],
    validationWarnings: ValidationWarning[],
    options: GenerationOptions,
    seenAdHashes: Set<string>,
    duplicateCounter: { count: number }
  ): GeneratedAd[] {
    const ads: GeneratedAd[] = [];

    for (const adTemplate of adTemplates) {
      const adId = this.generateId();
      const adWarnings: string[] = [];

      // Substitute variables in ad fields
      const headline = this.substituteField(
        adTemplate.headline,
        row,
        "headline",
        adWarnings
      );
      const description = this.substituteField(
        adTemplate.description,
        row,
        "description",
        adWarnings
      );
      const displayUrl = this.substituteField(
        adTemplate.displayUrl,
        row,
        "displayUrl",
        adWarnings
      );
      const finalUrl = this.substituteField(
        adTemplate.finalUrl,
        row,
        "finalUrl",
        adWarnings
      );

      // Add any substitution warnings to main warnings
      for (const w of adWarnings) {
        warnings.push(w);
      }

      // Validate against platform limits
      if (options.validatePlatformLimits && platform === "reddit") {
        this.validateRedditAd(
          { headline, description, displayUrl, finalUrl },
          campaignId,
          adGroupId,
          adId,
          validationWarnings
        );
      }

      // Check for duplicate ads if deduplication is enabled
      if (options.deduplicateAds) {
        const adHash = this.hashAd(headline, description);
        if (seenAdHashes.has(adHash)) {
          duplicateCounter.count++; // Track skipped duplicate
          continue; // Skip duplicate ad
        }
        seenAdHashes.add(adHash);
      }

      ads.push({
        id: adId,
        templateId: adTemplate.id,
        headline,
        description,
        displayUrl,
        finalUrl,
        callToAction: adTemplate.callToAction,
        sourceRowId: rowId,
        warnings: adWarnings,
      });
    }

    return ads;
  }

  /**
   * Substitute variables in a template field
   */
  private substituteField(
    template: string | undefined,
    row: Record<string, unknown>,
    fieldName: string,
    warnings: string[]
  ): string {
    if (!template) return "";

    const result = this.variableEngine.substitute(template, row);
    for (const w of result.warnings) {
      warnings.push(`${fieldName}: ${w.variable} - ${w.message}`);
    }
    return result.text;
  }

  /**
   * Substitute variables in an object (for targeting, etc.)
   */
  private substituteInObject(
    obj: Record<string, unknown>,
    row: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        const subResult = this.variableEngine.substitute(value, row);
        result[key] = subResult.text;
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) => {
          if (typeof item === "string") {
            return this.variableEngine.substitute(item, row).text;
          }
          return item;
        });
      } else if (typeof value === "object" && value !== null) {
        result[key] = this.substituteInObject(
          value as Record<string, unknown>,
          row
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Validate a Reddit ad against platform limits
   */
  private validateRedditAd(
    ad: {
      headline: string;
      description: string;
      displayUrl?: string;
      finalUrl?: string;
    },
    campaignId: string,
    adGroupId: string,
    adId: string,
    validationWarnings: ValidationWarning[]
  ): void {
    const limits = this.redditValidator.getLimits();

    // Validate headline length
    if (ad.headline.length > limits.headline.maxLength) {
      validationWarnings.push({
        campaignId,
        adGroupId,
        adId,
        field: "headline",
        message: `Headline exceeds maximum length of ${limits.headline.maxLength} characters`,
        limit: limits.headline.maxLength,
        actual: ad.headline.length,
      });
    }

    // Validate description length
    if (ad.description && ad.description.length > limits.description.maxLength) {
      validationWarnings.push({
        campaignId,
        adGroupId,
        adId,
        field: "description",
        message: `Description exceeds maximum length of ${limits.description.maxLength} characters`,
        limit: limits.description.maxLength,
        actual: ad.description.length,
      });
    }

    // Validate display URL length
    if (ad.displayUrl && ad.displayUrl.length > limits.displayUrl.maxLength) {
      validationWarnings.push({
        campaignId,
        adGroupId,
        adId,
        field: "displayUrl",
        message: `Display URL exceeds maximum length of ${limits.displayUrl.maxLength} characters`,
        limit: limits.displayUrl.maxLength,
        actual: ad.displayUrl.length,
      });
    }
  }

  /**
   * Expand data rows with cartesian product of variation sources
   */
  private expandWithCartesianProduct(
    dataRows: Record<string, unknown>[],
    variationSources: VariationSource[]
  ): Record<string, unknown>[] {
    if (variationSources.length === 0) {
      return dataRows;
    }

    // Generate all combinations of variation source values
    const combinations = this.generateCombinations(variationSources);

    // Expand each data row with all combinations
    const expandedRows: Record<string, unknown>[] = [];
    for (const row of dataRows) {
      for (const combination of combinations) {
        expandedRows.push({
          ...row,
          ...combination,
        });
      }
    }

    return expandedRows;
  }

  /**
   * Generate all combinations of variation source values
   */
  private generateCombinations(
    sources: VariationSource[]
  ): Record<string, string>[] {
    if (sources.length === 0) {
      return [{}];
    }

    const [first, ...rest] = sources;
    if (!first) {
      return [{}];
    }

    const restCombinations = this.generateCombinations(rest);
    const combinations: Record<string, string>[] = [];

    for (const value of first.values) {
      for (const restCombo of restCombinations) {
        combinations.push({
          [first.field]: value,
          ...restCombo,
        });
      }
    }

    return combinations;
  }

  /**
   * Get a row ID from a data row
   */
  private getRowId(row: Record<string, unknown>): string {
    if (typeof row.id === "string") {
      return row.id;
    }
    if (typeof row.id === "number") {
      return String(row.id);
    }
    return this.generateId();
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Hash an ad for deduplication
   */
  private hashAd(headline: string, description: string): string {
    return `${headline}|||${description}`;
  }
}
