/**
 * Generation Orchestrator
 *
 * Orchestrates the campaign generation process by:
 * 1. Accepting template, data source, and rules
 * 2. Executing rules to filter/transform data
 * 3. Generating all campaign variations
 * 4. Returning preview with estimated counts
 */

import { RuleEngine, type ProcessedRow } from "../rules/rule-engine.js";
import type { Rule } from "../rules/condition-schema.js";
import {
  VariationGenerator,
  type CampaignTemplate as VariationCampaignTemplate,
  type GeneratedCampaign as VariationGeneratedCampaign,
  type GeneratedAdGroup,
  type GeneratedAd,
  type GenerationOptions as VariationOptions,
  type ValidationWarning,
  type AdTemplate,
  type AdGroupTemplate,
} from "./variation-generator.js";

// Re-export types from variation-generator for convenience
export type { AdTemplate, AdGroupTemplate, ValidationWarning };

// ============================================================================
// Types
// ============================================================================

/**
 * Campaign template (mirrors variation-generator types)
 */
export interface CampaignTemplate extends VariationCampaignTemplate {}

/**
 * Input for generation
 */
export interface GenerationInput {
  template: CampaignTemplate;
  dataRows: Record<string, unknown>[];
  rules: Rule[];
}

/**
 * Generated campaign with additional metadata from rules
 */
export interface GeneratedCampaign extends VariationGeneratedCampaign {
  groups?: string[];
  tags?: string[];
  targeting?: Record<string, unknown>;
}

/**
 * Statistics for generation
 */
export interface GenerationStatistics {
  totalCampaigns: number;
  totalAdGroups: number;
  totalAds: number;
  rowsProcessed: number;
  rowsSkipped: number;
  rulesApplied: number;
}

/**
 * Output from generation
 */
export interface GenerationOutput {
  campaigns: GeneratedCampaign[];
  statistics: GenerationStatistics;
  warnings: string[];
  validationWarnings: ValidationWarning[];
}

/**
 * Options for generation
 */
export interface GenerationOrchestratorOptions {
  /** Validate against platform-specific limits */
  validatePlatformLimits?: boolean;
  /** Enable deduplication of campaigns */
  deduplicateCampaigns?: boolean;
  /** Enable deduplication of ads */
  deduplicateAds?: boolean;
}

/**
 * Preview options
 */
export interface PreviewOptions {
  /** Maximum number of campaigns to return in preview */
  limit?: number;
  /** Validate against platform-specific limits */
  validatePlatformLimits?: boolean;
}

/**
 * Preview output
 */
export interface PreviewOutput {
  preview: GeneratedCampaign[];
  statistics: GenerationStatistics;
  warnings: string[];
  validationWarnings: ValidationWarning[];
}

/**
 * Estimated counts output
 */
export interface EstimatedCounts {
  estimatedCampaigns: number;
  estimatedAdGroups: number;
  estimatedAds: number;
  rowsToBeSkipped: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class GenerationOrchestrator {
  private ruleEngine: RuleEngine;
  private variationGenerator: VariationGenerator;

  constructor() {
    this.ruleEngine = new RuleEngine();
    this.variationGenerator = new VariationGenerator();
  }

  /**
   * Generate campaigns from template, data rows, and rules
   */
  generate(
    input: GenerationInput,
    options: GenerationOrchestratorOptions = {}
  ): GenerationOutput {
    const { template, dataRows, rules } = input;

    // Process data rows through rules
    const processedRows = this.ruleEngine.processDataset(rules, dataRows);

    // Separate skipped and active rows
    const activeRows: ProcessedRow[] = [];
    const skippedRows: ProcessedRow[] = [];

    for (const row of processedRows) {
      if (row.shouldSkip) {
        skippedRows.push(row);
      } else {
        activeRows.push(row);
      }
    }

    // Convert processed rows to data format for variation generator
    // Include the original row data plus rule metadata
    type DataRowWithMetadata = Record<string, unknown> & {
      _groups: string[];
      _tags: string[];
      _targeting: Record<string, unknown>;
    };
    const dataForGeneration: DataRowWithMetadata[] = activeRows.map((row) => ({
      ...row.modifiedRow,
      _groups: row.groups,
      _tags: row.tags,
      _targeting: row.targeting,
    }));

    // Generate campaigns using variation generator
    const generationResult = this.variationGenerator.generateCampaigns(
      template,
      dataForGeneration,
      {
        validatePlatformLimits: options.validatePlatformLimits,
        deduplicateCampaigns: options.deduplicateCampaigns,
        deduplicateAds: options.deduplicateAds,
      }
    );

    // Build a map for O(1) lookup of source data by row ID
    const dataByRowId = new Map<string, DataRowWithMetadata>();
    for (const row of dataForGeneration) {
      const rowId = (row.id as string) || (row._rowId as string);
      if (rowId) {
        dataByRowId.set(rowId, row);
      }
    }

    // Enhance campaigns with rule metadata using sourceRowId for correct mapping
    const campaigns: GeneratedCampaign[] = generationResult.campaigns.map(
      (campaign) => {
        const sourceData = dataByRowId.get(campaign.sourceRowId);
        return {
          ...campaign,
          groups: (sourceData?._groups as string[]) || [],
          tags: (sourceData?._tags as string[]) || [],
          targeting: campaign.targeting || (sourceData?._targeting as Record<string, unknown>),
        };
      }
    );

    // Calculate rule usage
    const rulesApplied = this.countAppliedRules(processedRows);

    return {
      campaigns,
      statistics: {
        totalCampaigns: generationResult.totalCampaigns,
        totalAdGroups: generationResult.totalAdGroups,
        totalAds: generationResult.totalAds,
        rowsProcessed: dataRows.length,
        rowsSkipped: skippedRows.length,
        rulesApplied,
      },
      warnings: generationResult.warnings,
      validationWarnings: generationResult.validationWarnings,
    };
  }

  /**
   * Preview campaign generation with limited output
   *
   * This method processes all data rows through rules to calculate accurate statistics
   * (total campaigns, ad groups, ads), but only generates the limited preview subset.
   *
   * **Performance Note:** For datasets with 10,000+ rows, this method may be slow
   * as it processes all rows through rules. However, only `limit` campaigns are
   * fully generated. For count-only responses, use `estimateCounts()` instead.
   *
   * @param input - Generation input containing template, data rows, and rules
   * @param previewOptions - Options for preview generation (limit, validation settings)
   * @returns Preview output with limited campaigns but accurate full statistics
   */
  preview(
    input: GenerationInput,
    previewOptions: PreviewOptions = {}
  ): PreviewOutput {
    const { template, dataRows, rules } = input;
    const limit = previewOptions.limit ?? 20;

    // Process all data rows through rules to get accurate statistics
    const processedRows = this.ruleEngine.processDataset(rules, dataRows);

    // Separate skipped and active rows
    const activeRows: ProcessedRow[] = [];
    const skippedRows: ProcessedRow[] = [];

    for (const row of processedRows) {
      if (row.shouldSkip) {
        skippedRows.push(row);
      } else {
        activeRows.push(row);
      }
    }

    // Convert all active rows for statistics calculation
    // Include the original row data plus rule metadata
    type DataRowWithMetadata = Record<string, unknown> & {
      _groups: string[];
      _tags: string[];
      _targeting: Record<string, unknown>;
    };
    const allDataForGeneration: DataRowWithMetadata[] = activeRows.map((row) => ({
      ...row.modifiedRow,
      _groups: row.groups,
      _tags: row.tags,
      _targeting: row.targeting,
    }));

    // Generate full statistics first
    const fullResult = this.variationGenerator.generateCampaigns(
      template,
      allDataForGeneration,
      {
        previewMode: true,
        previewLimit: limit,
        validatePlatformLimits: previewOptions.validatePlatformLimits ?? true,
      }
    );

    // Build a map for O(1) lookup of source data by row ID
    const dataByRowId = new Map<string, DataRowWithMetadata>();
    for (const row of allDataForGeneration) {
      const rowId = (row.id as string) || (row._rowId as string);
      if (rowId) {
        dataByRowId.set(rowId, row);
      }
    }

    // Enhance campaigns with rule metadata using sourceRowId for correct mapping
    const preview: GeneratedCampaign[] = fullResult.campaigns.map(
      (campaign) => {
        const sourceData = dataByRowId.get(campaign.sourceRowId);
        return {
          ...campaign,
          groups: (sourceData?._groups as string[]) || [],
          tags: (sourceData?._tags as string[]) || [],
          targeting: campaign.targeting || (sourceData?._targeting as Record<string, unknown>),
        };
      }
    );

    return {
      preview,
      statistics: {
        totalCampaigns: fullResult.totalCampaigns,
        totalAdGroups: fullResult.totalAdGroups,
        totalAds: fullResult.totalAds,
        rowsProcessed: dataRows.length,
        rowsSkipped: skippedRows.length,
        rulesApplied: this.countAppliedRules(processedRows),
      },
      warnings: fullResult.warnings,
      validationWarnings: fullResult.validationWarnings,
    };
  }

  /**
   * Estimate counts without generating full campaigns
   * Useful for quick preview before generation
   */
  estimateCounts(input: GenerationInput): EstimatedCounts {
    const { template, dataRows, rules } = input;

    // Process data rows through rules to count skips
    const processedRows = this.ruleEngine.processDataset(rules, dataRows);

    let activeRowCount = 0;
    let skipCount = 0;

    for (const row of processedRows) {
      if (row.shouldSkip) {
        skipCount++;
      } else {
        activeRowCount++;
      }
    }

    // Calculate estimates based on template structure
    const adGroupsPerCampaign = template.adGroupTemplates.length;
    const adsPerCampaign = template.adGroupTemplates.reduce(
      (sum, ag) => sum + ag.adTemplates.length,
      0
    );

    return {
      estimatedCampaigns: activeRowCount,
      estimatedAdGroups: activeRowCount * adGroupsPerCampaign,
      estimatedAds: activeRowCount * adsPerCampaign,
      rowsToBeSkipped: skipCount,
    };
  }

  /**
   * Count unique rules that were applied
   */
  private countAppliedRules(processedRows: ProcessedRow[]): number {
    const appliedRuleIds = new Set<string>();

    for (const row of processedRows) {
      for (const rule of row.matchedRules) {
        appliedRuleIds.add(rule.id);
      }
    }

    return appliedRuleIds.size;
  }
}
