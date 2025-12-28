/**
 * Campaign Generation Service
 *
 * Transforms data source rows into campaign hierarchy records in the database.
 * This service handles:
 * 1. Fetching rows from a data source
 * 2. Grouping rows by interpolated campaign names
 * 3. Creating campaigns, ad groups, ads, and keywords in the database
 * 4. Supporting regeneration (delete and recreate)
 */

import { eq, and, isNotNull } from "drizzle-orm";
import {
  db,
  dataRows,
  generatedCampaigns,
  adGroups,
  ads,
  keywords,
  syncRecords,
} from "./db.js";
import type { CampaignSetConfig } from "../schemas/campaign-sets.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for campaign generation
 */
export interface GenerationConfig {
  /** Campaign set ID to generate campaigns for */
  campaignSetId: string;
  /** Data source ID to fetch rows from */
  dataSourceId: string;
  /** Template ID for campaign structure (optional but required by schema) */
  templateId?: string;
  /** Selected platforms to generate campaigns for */
  selectedPlatforms: string[];
  /** Campaign name configuration */
  campaignConfig: {
    namePattern: string;
    objective?: string;
  };
  /** Ad group and ad structure configuration */
  hierarchyConfig: {
    adGroups: Array<{
      id?: string;
      namePattern: string;
      keywords?: string[];
      ads: Array<{
        id?: string;
        headline?: string;
        description?: string;
        displayUrl?: string;
        finalUrl?: string;
        callToAction?: string;
      }>;
    }>;
  };
  /** Optional budget configuration. "shared" type is converted to "daily" for storage. */
  budgetConfig?: {
    type: "daily" | "lifetime" | "shared";
    amountPattern: string;
    currency: string;
  };
}

/**
 * Options for campaign generation
 */
export interface GenerationOptions {
  /** Delete existing campaigns before generating new ones */
  regenerate?: boolean;
  /** Force regeneration even if campaigns have been synced to platforms */
  force?: boolean;
}

/**
 * Result of campaign generation
 */
export interface GenerationResult {
  /** List of created campaigns with basic info */
  campaigns: Array<{
    id: string;
    name: string;
    platform: string;
  }>;
  /** Number of campaigns created */
  created: number;
  /** Number of campaigns updated (0 for new generation) */
  updated: number;
}

/**
 * Internal type for grouped campaign data
 */
interface CampaignGroup {
  name: string;
  rows: Array<{
    id: string;
    rowData: Record<string, unknown>;
  }>;
}

/**
 * Internal type for grouped ad group data
 */
interface AdGroupGroup {
  name: string;
  adGroupDefinition: GenerationConfig["hierarchyConfig"]["adGroups"][0];
  rows: Array<{
    id: string;
    rowData: Record<string, unknown>;
  }>;
}

// ============================================================================
// Pattern Interpolation
// ============================================================================

/**
 * Variable pattern regex: matches {variable_name}
 * Supports alphanumeric characters and underscores
 */
const VARIABLE_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

/**
 * Interpolates variables in a pattern string using values from a data row.
 *
 * @param pattern - The pattern string with {variable} placeholders
 * @param row - A data row object with variable values
 * @returns The interpolated string with variables replaced by their values
 *
 * @example
 * interpolatePattern("{brand} - {category}", { brand: "Nike", category: "Shoes" })
 * // Returns: "Nike - Shoes"
 */
export function interpolatePattern(
  pattern: string,
  row: Record<string, unknown>
): string {
  if (!pattern) return "";

  return pattern.replace(VARIABLE_PATTERN, (match, varName: string) => {
    const value = row[varName];

    // Handle various value types
    if (value === undefined) {
      return match; // Keep placeholder for missing variables
    }
    if (value === null) {
      return ""; // Null becomes empty string
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (typeof value === "string") {
      return value;
    }

    // For other types (arrays, objects), convert to string
    return String(value);
  });
}

// ============================================================================
// Campaign Generation Service
// ============================================================================

/**
 * Service for generating campaign hierarchies from data source rows
 */
export class CampaignGenerationService {
  /**
   * Generates campaigns from a campaign set configuration
   *
   * @param config - Generation configuration
   * @param options - Generation options (e.g., regenerate)
   * @returns Result with created campaign count and info
   */
  async generateCampaigns(
    config: GenerationConfig,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    // Validate configuration
    this.validateConfig(config);

    const { regenerate = false, force = false } = options;

    // Use transaction for atomicity
    return await db.transaction(async (tx) => {
      // Check for synced campaigns before regenerating
      if (regenerate && !force) {
        // Check if any campaigns have been synced to platforms via sync_records
        const syncedCampaigns = await tx
          .select({ id: generatedCampaigns.id })
          .from(generatedCampaigns)
          .innerJoin(
            syncRecords,
            eq(syncRecords.generatedCampaignId, generatedCampaigns.id)
          )
          .where(
            and(
              eq(generatedCampaigns.campaignSetId, config.campaignSetId),
              isNotNull(syncRecords.platformId)
            )
          )
          .limit(1);

        if (syncedCampaigns.length > 0) {
          throw new Error(
            "Cannot regenerate: some campaigns have been synced to platforms. Use force=true to override."
          );
        }
      }

      // Delete existing campaigns if regenerating
      if (regenerate) {
        await tx
          .delete(generatedCampaigns)
          .where(eq(generatedCampaigns.campaignSetId, config.campaignSetId));
      }

      // Fetch data rows from data source
      const rows = await tx
        .select()
        .from(dataRows)
        .where(eq(dataRows.dataSourceId, config.dataSourceId));

      if (rows.length === 0) {
        return {
          campaigns: [],
          created: 0,
          updated: 0,
        };
      }

      // Group rows by campaign name
      const campaignGroups = this.groupRowsByCampaignName(
        rows,
        config.campaignConfig.namePattern
      );

      const createdCampaigns: GenerationResult["campaigns"] = [];

      // Generate campaigns for each platform
      for (const platform of config.selectedPlatforms) {
        let orderIndex = 0;

        for (const campaignGroup of campaignGroups) {
          // Create the campaign record
          const [campaign] = await tx
            .insert(generatedCampaigns)
            .values({
              campaignSetId: config.campaignSetId,
              templateId: config.templateId || null, // Nullable - campaigns can be generated without templates
              dataRowId: campaignGroup.rows[0]?.id || null, // Nullable - campaigns can be generated from in-memory data
              campaignData: {
                name: campaignGroup.name,
                platform,
                objective: config.campaignConfig.objective,
                budget: config.budgetConfig
                  ? {
                      // "shared" budget type is converted to "daily" for database storage
                      // as the schema only supports "daily" | "lifetime"
                      type: config.budgetConfig.type === "shared" ? "daily" : config.budgetConfig.type,
                      amount: this.parseBudgetAmount(
                        config.budgetConfig.amountPattern,
                        campaignGroup.rows[0]?.rowData || {}
                      ),
                      currency: config.budgetConfig.currency,
                    }
                  : undefined,
              },
              status: "draft",
              orderIndex: orderIndex++,
            })
            .returning();

          if (!campaign) continue;

          createdCampaigns.push({
            id: campaign.id,
            name: campaignGroup.name,
            platform,
          });

          // Create ad groups for this campaign
          await this.createAdGroups(
            tx,
            campaign.id,
            campaignGroup,
            config.hierarchyConfig.adGroups
          );
        }
      }

      return {
        campaigns: createdCampaigns,
        created: createdCampaigns.length,
        updated: 0,
      };
    });
  }

  /**
   * Validates the generation configuration
   */
  private validateConfig(config: GenerationConfig): void {
    if (!config.campaignSetId) {
      throw new Error("campaignSetId is required");
    }
    if (!config.dataSourceId) {
      throw new Error("dataSourceId is required");
    }
    if (!config.selectedPlatforms || config.selectedPlatforms.length === 0) {
      throw new Error("At least one platform must be selected");
    }
    if (!config.campaignConfig) {
      throw new Error("campaignConfig is required");
    }
    if (!config.campaignConfig.namePattern) {
      throw new Error("campaignConfig.namePattern is required");
    }
    if (!config.hierarchyConfig) {
      throw new Error("hierarchyConfig is required");
    }
  }

  /**
   * Groups rows by interpolated campaign name.
   * Skips rows that produce empty or whitespace-only campaign names.
   */
  private groupRowsByCampaignName(
    rows: Array<{ id: string; rowData: Record<string, unknown> }>,
    namePattern: string
  ): CampaignGroup[] {
    const groups = new Map<string, CampaignGroup>();

    for (const row of rows) {
      const campaignName = interpolatePattern(
        namePattern,
        row.rowData as Record<string, unknown>
      ).trim();

      // Skip rows that produce empty campaign names
      if (!campaignName) {
        continue;
      }

      if (!groups.has(campaignName)) {
        groups.set(campaignName, {
          name: campaignName,
          rows: [],
        });
      }

      groups.get(campaignName)!.rows.push({
        id: row.id,
        rowData: row.rowData as Record<string, unknown>,
      });
    }

    return Array.from(groups.values());
  }

  /**
   * Creates ad groups for a campaign
   */
  private async createAdGroups(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    campaignId: string,
    campaignGroup: CampaignGroup,
    adGroupDefinitions: GenerationConfig["hierarchyConfig"]["adGroups"]
  ): Promise<void> {
    // For each ad group definition, group rows by ad group name pattern
    for (let defIndex = 0; defIndex < adGroupDefinitions.length; defIndex++) {
      const adGroupDef = adGroupDefinitions[defIndex];
      if (!adGroupDef) continue;

      // Group the campaign's rows by ad group name
      const adGroupGroups = this.groupRowsByAdGroupName(
        campaignGroup.rows,
        adGroupDef
      );

      let orderIndex = 0;
      for (const adGroupGroup of adGroupGroups) {
        // Create the ad group
        const [adGroup] = await tx
          .insert(adGroups)
          .values({
            campaignId,
            name: adGroupGroup.name,
            orderIndex: orderIndex++,
            status: "active",
          })
          .returning();

        if (!adGroup) continue;

        // Create ads for this ad group (one per row)
        await this.createAds(tx, adGroup.id, adGroupGroup, adGroupDef.ads);

        // Create keywords for this ad group
        if (adGroupDef.keywords && adGroupDef.keywords.length > 0) {
          await this.createKeywords(tx, adGroup.id, adGroupGroup, adGroupDef.keywords);
        }
      }
    }
  }

  /**
   * Groups rows by interpolated ad group name
   */
  private groupRowsByAdGroupName(
    rows: Array<{ id: string; rowData: Record<string, unknown> }>,
    adGroupDef: GenerationConfig["hierarchyConfig"]["adGroups"][0]
  ): AdGroupGroup[] {
    const groups = new Map<string, AdGroupGroup>();

    for (const row of rows) {
      const adGroupName = interpolatePattern(
        adGroupDef.namePattern,
        row.rowData
      );

      if (!groups.has(adGroupName)) {
        groups.set(adGroupName, {
          name: adGroupName,
          adGroupDefinition: adGroupDef,
          rows: [],
        });
      }

      groups.get(adGroupName)!.rows.push(row);
    }

    return Array.from(groups.values());
  }

  /**
   * Creates ads for an ad group
   */
  private async createAds(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    adGroupId: string,
    adGroupGroup: AdGroupGroup,
    adDefinitions: GenerationConfig["hierarchyConfig"]["adGroups"][0]["ads"]
  ): Promise<void> {
    const adsToInsert: Array<{
      adGroupId: string;
      headline: string | null;
      description: string | null;
      displayUrl: string | null;
      finalUrl: string | null;
      callToAction: string | null;
      orderIndex: number;
      status: "active" | "paused" | "removed";
    }> = [];

    let orderIndex = 0;

    // For each row in the ad group, create ads from each ad definition
    for (const row of adGroupGroup.rows) {
      for (const adDef of adDefinitions) {
        adsToInsert.push({
          adGroupId,
          headline: adDef.headline
            ? interpolatePattern(adDef.headline, row.rowData)
            : null,
          description: adDef.description
            ? interpolatePattern(adDef.description, row.rowData)
            : null,
          displayUrl: adDef.displayUrl
            ? interpolatePattern(adDef.displayUrl, row.rowData)
            : null,
          finalUrl: adDef.finalUrl
            ? interpolatePattern(adDef.finalUrl, row.rowData)
            : null,
          callToAction: adDef.callToAction
            ? interpolatePattern(adDef.callToAction, row.rowData)
            : null,
          orderIndex: orderIndex++,
          status: "active",
        });
      }
    }

    if (adsToInsert.length > 0) {
      await tx.insert(ads).values(adsToInsert);
    }
  }

  /**
   * Creates keywords for an ad group
   */
  private async createKeywords(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    adGroupId: string,
    adGroupGroup: AdGroupGroup,
    keywordPatterns: string[]
  ): Promise<void> {
    const keywordsToInsert: Array<{
      adGroupId: string;
      keyword: string;
      matchType: "broad" | "phrase" | "exact";
      status: "active" | "paused" | "removed";
    }> = [];

    // Create unique keywords from all rows
    const uniqueKeywords = new Set<string>();

    for (const row of adGroupGroup.rows) {
      for (const pattern of keywordPatterns) {
        const keyword = interpolatePattern(pattern, row.rowData);
        if (keyword && !uniqueKeywords.has(keyword)) {
          uniqueKeywords.add(keyword);
          keywordsToInsert.push({
            adGroupId,
            keyword,
            matchType: "broad", // Default match type
            status: "active",
          });
        }
      }
    }

    if (keywordsToInsert.length > 0) {
      await tx.insert(keywords).values(keywordsToInsert);
    }
  }

  /**
   * Parses a budget amount pattern
   * Can be a fixed number or a variable pattern
   */
  private parseBudgetAmount(
    amountPattern: string,
    rowData: Record<string, unknown>
  ): number {
    const interpolated = interpolatePattern(amountPattern, rowData);
    const parsed = parseFloat(interpolated);
    return isNaN(parsed) ? 0 : parsed;
  }
}

// ============================================================================
// Singleton Instance Export
// ============================================================================

/**
 * Singleton instance of CampaignGenerationService
 */
export const campaignGenerationService = new CampaignGenerationService();

/**
 * Extracts GenerationConfig from CampaignSetConfig
 *
 * This helper function converts the stored campaign set config
 * into the format needed by the generation service.
 */
export function extractGenerationConfig(
  campaignSetId: string,
  config: CampaignSetConfig
): GenerationConfig {
  return {
    campaignSetId,
    dataSourceId: config.dataSourceId,
    selectedPlatforms: config.selectedPlatforms,
    campaignConfig: config.campaignConfig,
    hierarchyConfig: config.hierarchyConfig,
    budgetConfig: config.budgetConfig,
  };
}
