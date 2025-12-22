/**
 * Preview Service
 *
 * Orchestrates the campaign preview generation process:
 * 1. Fetches template by ID
 * 2. Fetches data source rows
 * 3. Applies rules to filter/transform rows
 * 4. Generates campaign variations
 * 5. Validates against platform constraints
 * 6. Returns paginated preview with warnings
 */

import {
  GenerationOrchestrator,
  RuleEngine,
  type CampaignTemplate,
  type Rule,
  type OrchestratorGeneratedCampaign,
} from "@repo/core";
import type {
  PreviewRequest,
  PreviewResponse,
  PreviewMetadata,
} from "../schemas/campaigns.js";

/**
 * Template data structure (from database)
 */
export interface TemplateData {
  id: string;
  name: string;
  platform: "reddit" | "google" | "facebook";
  structure: {
    objective?: string;
    budget?: {
      type: "daily" | "lifetime";
      amount: number;
      currency: string;
    };
    targeting?: Record<string, unknown>;
  } | null;
}

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
 * Dependencies for the preview service (supports async callbacks)
 */
export interface PreviewServiceDependencies {
  getTemplate: (id: string) => TemplateData | undefined | Promise<TemplateData | undefined>;
  getDataSource: (id: string) => DataSourceData | undefined | Promise<DataSourceData | undefined>;
  getDataRows: (dataSourceId: string) => Record<string, unknown>[] | Promise<Record<string, unknown>[]>;
  getRule: (id: string) => RuleData | undefined | Promise<RuleData | undefined>;
}

export class PreviewService {
  private orchestrator: GenerationOrchestrator;
  private deps: PreviewServiceDependencies;

  constructor(deps: PreviewServiceDependencies) {
    this.orchestrator = new GenerationOrchestrator();
    this.deps = deps;
  }

  /**
   * Generate a campaign preview
   */
  async generatePreview(request: PreviewRequest): Promise<PreviewResponse> {
    const { template_id, data_source_id, rules: ruleIds, limit } = request;

    // Fetch template
    const template = await this.deps.getTemplate(template_id);
    if (!template) {
      throw new PreviewError("TEMPLATE_NOT_FOUND", `Template with id '${template_id}' not found`);
    }

    // Fetch data source
    const dataSource = await this.deps.getDataSource(data_source_id);
    if (!dataSource) {
      throw new PreviewError(
        "DATA_SOURCE_NOT_FOUND",
        `Data source with id '${data_source_id}' not found`
      );
    }

    // Fetch data rows
    const dataRows = await this.deps.getDataRows(data_source_id);
    if (dataRows.length === 0) {
      // Return empty preview for empty data source
      return {
        campaign_count: 0,
        ad_group_count: 0,
        ad_count: 0,
        preview: [],
        warnings: ["Data source contains no rows"],
        metadata: {
          template_name: template.name,
          data_source_name: dataSource.name,
          generated_at: new Date().toISOString(),
        },
      };
    }

    // Fetch and convert rules
    const { rules, missingRuleIds } = await this.fetchAndConvertRules(ruleIds || []);

    // Convert template to orchestrator format
    const campaignTemplate = this.convertToCampaignTemplate(template);

    // Generate preview using orchestrator
    const previewResult = this.orchestrator.preview(
      {
        template: campaignTemplate,
        dataRows,
        rules,
      },
      { limit }
    );

    // Convert to response format
    const preview = this.convertToPreviewCampaigns(previewResult.preview);

    // Collect all warnings
    const warnings: string[] = [];

    // Add warnings for missing rules
    for (const ruleId of missingRuleIds) {
      warnings.push(`Rule '${ruleId}' not found`);
    }

    // Add orchestrator warnings
    warnings.push(...previewResult.warnings);

    // Add validation warnings
    warnings.push(
      ...previewResult.validationWarnings.map((w) => {
        const parts = [w.message];
        if (w.limit !== undefined && w.actual !== undefined) {
          parts.push(`(${w.actual}/${w.limit})`);
        }
        return parts.join(" ");
      })
    );

    // Build metadata
    const metadata: PreviewMetadata = {
      template_name: template.name,
      data_source_name: dataSource.name,
      generated_at: new Date().toISOString(),
    };

    return {
      campaign_count: previewResult.statistics.totalCampaigns,
      ad_group_count: previewResult.statistics.totalAdGroups,
      ad_count: previewResult.statistics.totalAds,
      preview,
      warnings,
      metadata,
    };
  }

  /**
   * Fetch rules by IDs and convert to core Rule format
   * Returns both the converted rules and any rule IDs that were not found
   */
  private async fetchAndConvertRules(ruleIds: string[]): Promise<{
    rules: Rule[];
    missingRuleIds: string[];
  }> {
    const rules: Rule[] = [];
    const missingRuleIds: string[] = [];

    for (const ruleId of ruleIds) {
      const ruleData = await this.deps.getRule(ruleId);
      if (!ruleData) {
        missingRuleIds.push(ruleId);
      } else if (ruleData.enabled) {
        // Convert API rule format to core Rule format
        rules.push({
          id: ruleData.id,
          name: ruleData.name,
          description: ruleData.description,
          enabled: ruleData.enabled,
          priority: ruleData.priority,
          conditionGroup: ruleData.conditionGroup as Rule["conditionGroup"],
          actions: ruleData.actions as Rule["actions"],
          createdAt: new Date(ruleData.createdAt),
          updatedAt: new Date(ruleData.updatedAt),
        });
      }
    }

    // Sort by priority
    rules.sort((a, b) => a.priority - b.priority);

    return { rules, missingRuleIds };
  }

  /**
   * Convert template data to CampaignTemplate format for orchestrator
   */
  private convertToCampaignTemplate(template: TemplateData): CampaignTemplate {
    // Create a minimal ad template since the stored template doesn't have ad-level details
    const defaultAdTemplate = {
      id: "default-ad",
      headline: "{product_name}",
      description: "{description}",
    };

    const defaultAdGroupTemplate = {
      id: "default-ad-group",
      name: "{product_name} Ad Group",
      adTemplates: [defaultAdTemplate],
    };

    return {
      id: template.id,
      name: template.name,
      platform: template.platform,
      objective: template.structure?.objective,
      budget: template.structure?.budget,
      targeting: template.structure?.targeting,
      adGroupTemplates: [defaultAdGroupTemplate],
    };
  }

  /**
   * Convert OrchestratorGeneratedCampaign[] to preview campaign format
   */
  private convertToPreviewCampaigns(campaigns: OrchestratorGeneratedCampaign[]) {
    return campaigns.map((campaign) => ({
      id: campaign.id,
      templateId: campaign.templateId,
      name: campaign.name,
      platform: campaign.platform,
      objective: campaign.objective,
      budget: campaign.budget,
      targeting: campaign.targeting,
      adGroups: campaign.adGroups.map((adGroup) => ({
        id: adGroup.id,
        templateId: adGroup.templateId,
        name: adGroup.name,
        targeting: adGroup.targeting,
        bidStrategy: adGroup.bidStrategy,
        bidAmount: adGroup.bidAmount,
        ads: adGroup.ads.map((ad) => ({
          id: ad.id,
          templateId: ad.templateId,
          headline: ad.headline,
          description: ad.description,
          displayUrl: ad.displayUrl,
          finalUrl: ad.finalUrl,
          callToAction: ad.callToAction,
          sourceRowId: ad.sourceRowId,
          warnings: ad.warnings,
        })),
      })),
      sourceRowId: campaign.sourceRowId,
      groups: campaign.groups,
      tags: campaign.tags,
    }));
  }
}

/**
 * Custom error class for preview-specific errors
 */
export class PreviewError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "PreviewError";
  }
}
