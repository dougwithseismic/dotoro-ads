/**
 * Hierarchical Grouper Service
 *
 * Transforms flat, denormalized rows into hierarchical campaign structures
 * using variable interpolation patterns for campaign names, ad group names, and ad fields.
 *
 * Algorithm:
 * 1. For each row, interpolate the campaign name pattern to get a campaign key
 * 2. Group rows by campaign key
 * 3. Within each campaign group, interpolate ad group pattern to get ad group key
 * 4. Group rows within campaign by ad group key
 * 5. For each row in ad group, create an ad with interpolated fields
 * 6. Collect warnings for missing variables or empty interpolations
 *
 * Usage:
 * ```typescript
 * const grouper = new HierarchicalGrouper();
 * const result = grouper.groupRows(rows, {
 *   campaignNamePattern: "{brand}-performance",
 *   adGroupNamePattern: "{product}",
 *   adMapping: {
 *     headline: "{headline}",
 *     description: "{description}",
 *   },
 * });
 * ```
 */

import { VariableEngine } from "../services/variable-engine.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Mapping of ad fields to variable patterns
 */
export interface AdFieldMapping {
  headline: string;
  description: string;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
}

/**
 * Configuration for hierarchical grouping
 */
export interface GroupingConfig {
  /** Pattern for campaign names, e.g., "{brand}-performance" */
  campaignNamePattern: string;
  /** Pattern for ad group names, e.g., "{product}" */
  adGroupNamePattern: string;
  /** Mapping of ad fields to variable patterns */
  adMapping: AdFieldMapping;
}

/**
 * A grouped campaign with its ad groups
 */
export interface GroupedCampaign {
  /** Interpolated campaign name */
  name: string;
  /** Raw key used for grouping (same as name if no issues) */
  groupingKey: string;
  /** All source rows that belong to this campaign */
  sourceRows: Record<string, unknown>[];
  /** Ad groups within this campaign */
  adGroups: GroupedAdGroup[];
}

/**
 * A grouped ad group with its ads
 */
export interface GroupedAdGroup {
  /** Interpolated ad group name */
  name: string;
  /** Raw key used for grouping */
  groupingKey: string;
  /** All source rows that belong to this ad group */
  sourceRows: Record<string, unknown>[];
  /** Ads within this ad group */
  ads: GroupedAd[];
}

/**
 * A grouped ad with its field values
 */
export interface GroupedAd {
  /** Interpolated headline */
  headline: string;
  /** Interpolated description */
  description: string;
  /** Optional display URL */
  displayUrl?: string;
  /** Optional final URL */
  finalUrl?: string;
  /** Optional call to action */
  callToAction?: string;
  /** The source row this ad was created from */
  sourceRow: Record<string, unknown>;
}

/**
 * Warning types for grouping issues
 */
export interface GroupingWarning {
  /** Type of warning */
  type: "missing_variable" | "empty_value" | "duplicate_ad";
  /** Human-readable warning message */
  message: string;
  /** Index of the row that caused the warning (0-based) */
  rowIndex?: number;
  /** Name of the variable that caused the warning */
  variableName?: string;
}

/**
 * Statistics about the grouping result
 */
export interface GroupingStats {
  /** Total number of input rows processed */
  totalRows: number;
  /** Total number of campaigns created */
  totalCampaigns: number;
  /** Total number of ad groups created */
  totalAdGroups: number;
  /** Total number of ads created */
  totalAds: number;
  /** Number of rows that had missing variables */
  rowsWithMissingVariables: number;
}

/**
 * Result of the grouping operation
 */
export interface GroupingResult {
  /** Grouped campaigns */
  campaigns: GroupedCampaign[];
  /** Statistics about the grouping */
  stats: GroupingStats;
  /** Warnings collected during grouping */
  warnings: GroupingWarning[];
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Hierarchical Grouper for transforming flat rows into campaign structures
 */
export class HierarchicalGrouper {
  private variableEngine: VariableEngine;

  constructor() {
    this.variableEngine = new VariableEngine();
  }

  /**
   * Validates inputs before grouping
   * @throws Error if inputs are invalid
   */
  private validateInputs(rows: Record<string, unknown>[], config: GroupingConfig): void {
    // Validate rows
    if (rows === null || rows === undefined || !Array.isArray(rows)) {
      throw new Error("rows must be a non-null array");
    }

    // Validate config
    if (config === null || config === undefined || typeof config !== "object") {
      throw new Error("config must be a non-null object");
    }

    // Validate required config properties
    if (!config.campaignNamePattern && config.campaignNamePattern !== "") {
      throw new Error("config.campaignNamePattern is required");
    }

    if (!config.adGroupNamePattern && config.adGroupNamePattern !== "") {
      throw new Error("config.adGroupNamePattern is required");
    }

    if (!config.adMapping || typeof config.adMapping !== "object") {
      throw new Error("config.adMapping is required");
    }

    if (!config.adMapping.headline && config.adMapping.headline !== "") {
      throw new Error("config.adMapping.headline is required");
    }

    if (!config.adMapping.description && config.adMapping.description !== "") {
      throw new Error("config.adMapping.description is required");
    }
  }

  /**
   * Group flat rows into hierarchical campaign structure
   */
  groupRows(rows: Record<string, unknown>[], config: GroupingConfig): GroupingResult {
    // Validate inputs before processing
    this.validateInputs(rows, config);

    const warnings: GroupingWarning[] = [];
    const rowsWithMissingVars = new Set<number>();

    // Step 1: Group rows by campaign key
    const campaignGroups = new Map<string, { rows: Array<{ row: Record<string, unknown>; index: number }> }>();

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex]!;
      const campaignKey = this.interpolatePattern(
        config.campaignNamePattern,
        row,
        rowIndex,
        warnings,
        rowsWithMissingVars
      );

      if (!campaignGroups.has(campaignKey)) {
        campaignGroups.set(campaignKey, { rows: [] });
      }
      campaignGroups.get(campaignKey)!.rows.push({ row, index: rowIndex });
    }

    // Step 2: For each campaign, group by ad group key
    const campaigns: GroupedCampaign[] = [];
    let totalAdGroups = 0;
    let totalAds = 0;

    for (const [campaignKey, campaignData] of campaignGroups) {
      const adGroupGroups = new Map<string, { rows: Array<{ row: Record<string, unknown>; index: number }> }>();

      for (const { row, index } of campaignData.rows) {
        const adGroupKey = this.interpolatePattern(
          config.adGroupNamePattern,
          row,
          index,
          warnings,
          rowsWithMissingVars
        );

        if (!adGroupGroups.has(adGroupKey)) {
          adGroupGroups.set(adGroupKey, { rows: [] });
        }
        adGroupGroups.get(adGroupKey)!.rows.push({ row, index });
      }

      // Step 3: For each ad group, create ads
      const adGroups: GroupedAdGroup[] = [];

      for (const [adGroupKey, adGroupData] of adGroupGroups) {
        const ads: GroupedAd[] = [];

        for (const { row, index } of adGroupData.rows) {
          const ad = this.createAd(row, index, config.adMapping, warnings, rowsWithMissingVars);
          ads.push(ad);
        }

        adGroups.push({
          name: adGroupKey,
          groupingKey: adGroupKey,
          sourceRows: adGroupData.rows.map(({ row }) => row),
          ads,
        });

        totalAds += ads.length;
      }

      campaigns.push({
        name: campaignKey,
        groupingKey: campaignKey,
        sourceRows: campaignData.rows.map(({ row }) => row),
        adGroups,
      });

      totalAdGroups += adGroups.length;
    }

    return {
      campaigns,
      stats: {
        totalRows: rows.length,
        totalCampaigns: campaigns.length,
        totalAdGroups,
        totalAds,
        rowsWithMissingVariables: rowsWithMissingVars.size,
      },
      warnings,
    };
  }

  /**
   * Interpolate a pattern with row data, collecting warnings
   */
  private interpolatePattern(
    pattern: string,
    row: Record<string, unknown>,
    rowIndex: number,
    warnings: GroupingWarning[],
    rowsWithMissingVars: Set<number>
  ): string {
    const result = this.variableEngine.substitute(pattern, row);

    // Check for warnings about missing variables
    for (const warning of result.warnings) {
      if (warning.message.includes("missing")) {
        warnings.push({
          type: "missing_variable",
          message: warning.message,
          rowIndex,
          variableName: warning.variable,
        });
        rowsWithMissingVars.add(rowIndex);
      }
    }

    // Check for empty value result
    if (result.text === "" && pattern !== "") {
      // Only warn if the pattern had variables that resolved to empty
      const extractedVars = this.variableEngine.extractVariables(pattern);
      for (const v of extractedVars) {
        const value = row[v.name];
        if (value === "" || value === null || value === undefined) {
          // Don't add duplicate warning if already added as missing
          const alreadyWarned = warnings.some(
            (w) =>
              w.rowIndex === rowIndex &&
              w.variableName === v.name &&
              w.type === "missing_variable"
          );
          if (!alreadyWarned && value === "") {
            warnings.push({
              type: "empty_value",
              message: `Variable "${v.name}" resolved to empty string`,
              rowIndex,
              variableName: v.name,
            });
          }
        }
      }
    }

    return result.text;
  }

  /**
   * Create an ad from a row using the ad field mapping
   */
  private createAd(
    row: Record<string, unknown>,
    rowIndex: number,
    adMapping: AdFieldMapping,
    warnings: GroupingWarning[],
    rowsWithMissingVars: Set<number>
  ): GroupedAd {
    const headline = this.interpolatePattern(
      adMapping.headline,
      row,
      rowIndex,
      warnings,
      rowsWithMissingVars
    );

    const description = this.interpolatePattern(
      adMapping.description,
      row,
      rowIndex,
      warnings,
      rowsWithMissingVars
    );

    const ad: GroupedAd = {
      headline,
      description,
      sourceRow: row,
    };

    // Handle optional fields
    if (adMapping.displayUrl) {
      ad.displayUrl = this.interpolatePattern(
        adMapping.displayUrl,
        row,
        rowIndex,
        warnings,
        rowsWithMissingVars
      );
    }

    if (adMapping.finalUrl) {
      ad.finalUrl = this.interpolatePattern(
        adMapping.finalUrl,
        row,
        rowIndex,
        warnings,
        rowsWithMissingVars
      );
    }

    if (adMapping.callToAction) {
      ad.callToAction = this.interpolatePattern(
        adMapping.callToAction,
        row,
        rowIndex,
        warnings,
        rowsWithMissingVars
      );
    }

    return ad;
  }
}

// ============================================================================
// Functional API
// ============================================================================

/**
 * Standalone function to group rows into campaigns
 *
 * This is a convenience wrapper around HierarchicalGrouper for functional usage.
 */
export function groupRowsIntoCampaigns(
  rows: Record<string, unknown>[],
  config: GroupingConfig
): GroupingResult {
  const grouper = new HierarchicalGrouper();
  return grouper.groupRows(rows, config);
}
