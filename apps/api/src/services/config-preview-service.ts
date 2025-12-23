/**
 * Config Preview Service
 *
 * Handles config-based campaign generation:
 * 1. Fetches data source rows
 * 2. Applies rules to filter/transform rows
 * 3. Uses HierarchicalGrouper to create campaign structure
 * 4. Returns grouped campaigns with stats
 */

import {
  HierarchicalGrouper,
  RuleEngine,
  type Rule,
  type GroupingConfig,
  type GroupingResult,
  type GroupingWarning,
  type Action,
  conditionGroupSchema,
  actionSchema,
} from "@repo/core";
import type {
  GenerateFromConfigRequest,
  GenerateFromConfigResponse,
  PreviewWithConfigRequest,
  PreviewWithConfigResponse,
  ConfigGeneratedCampaign,
  ConfigWarning,
  PreviewCampaign,
} from "../schemas/campaigns.js";

/**
 * Data source data structure
 */
export interface DataSourceData {
  id: string;
  name: string;
  type: string;
}

/**
 * Rule data structure (from API schema)
 */
export interface RuleData {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditionGroup: {
    id: string;
    logic: "AND" | "OR";
    conditions: unknown[];
  };
  actions: unknown[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Dependencies for the config preview service
 */
export interface ConfigPreviewServiceDependencies {
  getDataSource: (id: string) => DataSourceData | undefined | Promise<DataSourceData | undefined>;
  getDataRows: (dataSourceId: string) => Record<string, unknown>[] | Promise<Record<string, unknown>[]>;
  getRule: (id: string) => RuleData | undefined | Promise<RuleData | undefined>;
}

/**
 * Config Preview Service
 */
export class ConfigPreviewService {
  private grouper: HierarchicalGrouper;
  private ruleEngine: RuleEngine;
  private deps: ConfigPreviewServiceDependencies;

  constructor(deps: ConfigPreviewServiceDependencies) {
    this.grouper = new HierarchicalGrouper();
    this.ruleEngine = new RuleEngine();
    this.deps = deps;
  }

  /**
   * Generate a preview of config-based campaign generation
   */
  async generatePreview(request: PreviewWithConfigRequest): Promise<PreviewWithConfigResponse> {
    const { dataSourceId, campaignConfig, hierarchyConfig, ruleIds, limit } = request;

    // Fetch data source
    const dataSource = await this.deps.getDataSource(dataSourceId);
    if (!dataSource) {
      throw new ConfigPreviewError(
        "DATA_SOURCE_NOT_FOUND",
        `Data source with id '${dataSourceId}' not found`
      );
    }

    // Fetch data rows
    let dataRows = await this.deps.getDataRows(dataSourceId);

    // Handle empty data source
    if (dataRows.length === 0) {
      return {
        campaignCount: 0,
        adGroupCount: 0,
        adCount: 0,
        rowsProcessed: 0,
        preview: [],
        warnings: [{ type: "no_data", message: "Data source contains no rows" }],
        metadata: {
          dataSourceName: dataSource.name,
          generatedAt: new Date().toISOString(),
        },
      };
    }

    const warnings: ConfigWarning[] = [];

    // Fetch and apply rules if provided
    if (ruleIds && ruleIds.length > 0) {
      const { rules, missingRuleIds, invalidRuleIds } = await this.fetchAndConvertRules(ruleIds);

      // Add warnings for missing rules
      for (const ruleId of missingRuleIds) {
        warnings.push({
          type: "rule_not_found",
          message: `Rule '${ruleId}' not found`,
        });
      }

      // Add warnings for invalid rules
      for (const ruleId of invalidRuleIds) {
        warnings.push({
          type: "invalid_rule",
          message: `Rule '${ruleId}' has invalid structure and was skipped`,
        });
      }

      // Apply rules to filter/transform rows
      if (rules.length > 0) {
        const processedRows = this.ruleEngine.processDataset(rules, dataRows);
        // Filter out skipped rows and get the modified rows
        dataRows = processedRows
          .filter((row) => !row.shouldSkip)
          .map((row) => row.modifiedRow);
      }
    }

    // Handle empty after filtering
    if (dataRows.length === 0) {
      return {
        campaignCount: 0,
        adGroupCount: 0,
        adCount: 0,
        rowsProcessed: 0,
        preview: [],
        warnings: [
          ...warnings,
          { type: "all_filtered", message: "All rows were filtered out by rules" },
        ],
        metadata: {
          dataSourceName: dataSource.name,
          generatedAt: new Date().toISOString(),
        },
      };
    }

    // Create grouping config
    const groupingConfig: GroupingConfig = {
      campaignNamePattern: campaignConfig.namePattern,
      adGroupNamePattern: hierarchyConfig.adGroupNamePattern,
      adMapping: hierarchyConfig.adMapping,
    };

    // Group rows into campaigns
    const groupingResult = this.grouper.groupRows(dataRows, groupingConfig);

    // Convert grouping warnings to config warnings
    for (const warning of groupingResult.warnings) {
      warnings.push({
        type: warning.type,
        message: warning.message,
      });
    }

    // Create preview campaigns (limited)
    const previewCampaigns = this.createPreviewCampaigns(
      groupingResult,
      campaignConfig.platform,
      limit || 20
    );

    return {
      campaignCount: groupingResult.stats.totalCampaigns,
      adGroupCount: groupingResult.stats.totalAdGroups,
      adCount: groupingResult.stats.totalAds,
      rowsProcessed: groupingResult.stats.totalRows,
      preview: previewCampaigns,
      warnings,
      metadata: {
        dataSourceName: dataSource.name,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Generate full campaign structure from config
   */
  async generateFromConfig(request: GenerateFromConfigRequest): Promise<GenerateFromConfigResponse> {
    const { dataSourceId, campaignConfig, hierarchyConfig, ruleIds } = request;

    // Fetch data source
    const dataSource = await this.deps.getDataSource(dataSourceId);
    if (!dataSource) {
      throw new ConfigPreviewError(
        "DATA_SOURCE_NOT_FOUND",
        `Data source with id '${dataSourceId}' not found`
      );
    }

    // Fetch data rows
    let dataRows = await this.deps.getDataRows(dataSourceId);

    // Handle empty data source
    if (dataRows.length === 0) {
      return {
        campaigns: [],
        stats: {
          totalCampaigns: 0,
          totalAdGroups: 0,
          totalAds: 0,
          rowsProcessed: 0,
        },
        warnings: [{ type: "no_data", message: "Data source contains no rows" }],
      };
    }

    const warnings: ConfigWarning[] = [];

    // Fetch and apply rules if provided
    if (ruleIds && ruleIds.length > 0) {
      const { rules, missingRuleIds, invalidRuleIds } = await this.fetchAndConvertRules(ruleIds);

      // Add warnings for missing rules
      for (const ruleId of missingRuleIds) {
        warnings.push({
          type: "rule_not_found",
          message: `Rule '${ruleId}' not found`,
        });
      }

      // Add warnings for invalid rules
      for (const ruleId of invalidRuleIds) {
        warnings.push({
          type: "invalid_rule",
          message: `Rule '${ruleId}' has invalid structure and was skipped`,
        });
      }

      // Apply rules to filter/transform rows
      if (rules.length > 0) {
        const processedRows = this.ruleEngine.processDataset(rules, dataRows);
        // Filter out skipped rows and get the modified rows
        dataRows = processedRows
          .filter((row) => !row.shouldSkip)
          .map((row) => row.modifiedRow);
      }
    }

    // Handle empty after filtering
    if (dataRows.length === 0) {
      return {
        campaigns: [],
        stats: {
          totalCampaigns: 0,
          totalAdGroups: 0,
          totalAds: 0,
          rowsProcessed: 0,
        },
        warnings: [
          ...warnings,
          { type: "all_filtered", message: "All rows were filtered out by rules" },
        ],
      };
    }

    // Create grouping config
    const groupingConfig: GroupingConfig = {
      campaignNamePattern: campaignConfig.namePattern,
      adGroupNamePattern: hierarchyConfig.adGroupNamePattern,
      adMapping: hierarchyConfig.adMapping,
    };

    // Group rows into campaigns
    const groupingResult = this.grouper.groupRows(dataRows, groupingConfig);

    // Convert grouping warnings to config warnings
    for (const warning of groupingResult.warnings) {
      warnings.push({
        type: warning.type,
        message: warning.message,
      });
    }

    // Convert to response format with campaign config applied
    const campaigns = this.convertToGeneratedCampaigns(
      groupingResult,
      campaignConfig,
      warnings
    );

    return {
      campaigns,
      stats: {
        totalCampaigns: groupingResult.stats.totalCampaigns,
        totalAdGroups: groupingResult.stats.totalAdGroups,
        totalAds: groupingResult.stats.totalAds,
        rowsProcessed: groupingResult.stats.totalRows,
      },
      warnings,
    };
  }

  /**
   * Fetch rules by IDs and convert to core Rule format
   */
  private async fetchAndConvertRules(ruleIds: string[]): Promise<{
    rules: Rule[];
    missingRuleIds: string[];
    invalidRuleIds: string[];
  }> {
    const rules: Rule[] = [];
    const missingRuleIds: string[] = [];
    const invalidRuleIds: string[] = [];

    for (const ruleId of ruleIds) {
      const ruleData = await this.deps.getRule(ruleId);
      if (!ruleData) {
        missingRuleIds.push(ruleId);
      } else if (ruleData.enabled) {
        // Validate and convert API rule format to core Rule format
        const conditionGroupResult = conditionGroupSchema.safeParse(ruleData.conditionGroup);

        // Validate each action individually and collect valid ones
        const validatedActions: Action[] = [];
        let actionsValid = true;

        if (Array.isArray(ruleData.actions)) {
          for (const action of ruleData.actions) {
            const actionResult = actionSchema.safeParse(action);
            if (actionResult.success) {
              validatedActions.push(actionResult.data);
            } else {
              actionsValid = false;
              break;
            }
          }
        } else {
          actionsValid = false;
        }

        if (!conditionGroupResult.success || !actionsValid) {
          invalidRuleIds.push(ruleId);
          continue;
        }

        rules.push({
          id: ruleData.id,
          name: ruleData.name,
          description: ruleData.description,
          enabled: ruleData.enabled,
          priority: ruleData.priority,
          conditionGroup: conditionGroupResult.data,
          actions: validatedActions,
          createdAt: new Date(ruleData.createdAt),
          updatedAt: new Date(ruleData.updatedAt),
        });
      }
    }

    // Sort by priority
    rules.sort((a, b) => a.priority - b.priority);

    return { rules, missingRuleIds, invalidRuleIds };
  }

  /**
   * Create preview campaigns (limited view)
   */
  private createPreviewCampaigns(
    result: GroupingResult,
    platform: "reddit" | "google" | "facebook",
    limit: number
  ): PreviewCampaign[] {
    return result.campaigns.slice(0, limit).map((campaign) => ({
      name: campaign.name,
      platform,
      adGroupCount: campaign.adGroups.length,
      adGroups: campaign.adGroups.slice(0, 5).map((adGroup) => ({
        name: adGroup.name,
        adCount: adGroup.ads.length,
        sampleAds: adGroup.ads.slice(0, 3).map((ad) => ({
          headline: ad.headline,
          description: ad.description,
        })),
      })),
    }));
  }

  /**
   * Convert grouping result to generated campaigns with config applied
   */
  private convertToGeneratedCampaigns(
    result: GroupingResult,
    campaignConfig: GenerateFromConfigRequest["campaignConfig"],
    warnings: ConfigWarning[]
  ): ConfigGeneratedCampaign[] {
    // Track which patterns have already generated warnings to avoid duplicates
    const warnedPatterns = new Set<string>();

    return result.campaigns.map((campaign) => {
      // Resolve budget amount if pattern contains variables
      let budget: ConfigGeneratedCampaign["budget"] = undefined;
      if (campaignConfig.budget) {
        const { value: amountValue, warning } = this.resolveAmountPattern(
          campaignConfig.budget.amountPattern,
          campaign.sourceRows[0] || {},
          campaign.name
        );

        // Add warning if pattern could not be resolved (only once per unique pattern)
        if (warning && !warnedPatterns.has(campaignConfig.budget.amountPattern)) {
          warnings.push(warning);
          warnedPatterns.add(campaignConfig.budget.amountPattern);
        }

        budget = {
          type: campaignConfig.budget.type,
          amount: amountValue,
          currency: campaignConfig.budget.currency,
        };
      }

      return {
        name: campaign.name,
        platform: campaignConfig.platform,
        objective: campaignConfig.objective,
        budget,
        adGroups: campaign.adGroups.map((adGroup) => ({
          name: adGroup.name,
          ads: adGroup.ads.map((ad) => ({
            headline: ad.headline,
            description: ad.description,
            displayUrl: ad.displayUrl,
            finalUrl: ad.finalUrl,
          })),
        })),
      };
    });
  }

  /**
   * Result of resolving a budget amount pattern
   */
  private resolveAmountPattern(
    pattern: string,
    row: Record<string, unknown>,
    campaignName: string
  ): { value: number; warning?: ConfigWarning } {
    // If pattern is a simple number, return it
    const numericValue = parseFloat(pattern);
    if (!isNaN(numericValue)) {
      return { value: numericValue };
    }

    // If pattern contains variable syntax like {budget}, extract the variable
    const variableMatch = pattern.match(/^\{(\w+)\}$/);
    if (variableMatch) {
      const variableName = variableMatch[1];
      const value = row[variableName!];
      if (typeof value === "number") {
        return { value };
      }
      if (typeof value === "string") {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          return { value: parsed };
        }
      }

      // Variable found but value cannot be parsed as number
      return {
        value: 0,
        warning: {
          type: "invalid_budget_value",
          message: `Budget pattern '${pattern}' resolved to non-numeric value for campaign '${campaignName}', defaulting to 0`,
        },
      };
    }

    // Pattern could not be resolved at all
    return {
      value: 0,
      warning: {
        type: "unresolved_budget_pattern",
        message: `Budget pattern '${pattern}' could not be resolved, defaulting to 0`,
      },
    };
  }
}

/**
 * Custom error class for config preview errors
 */
export class ConfigPreviewError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ConfigPreviewError";
  }
}
