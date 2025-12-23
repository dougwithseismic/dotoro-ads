"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { HierarchyPreview, type PreviewWarning } from "./HierarchyPreview";
import {
  interpolatePattern,
  type GenerateResponse,
  type CampaignConfig,
  type HierarchyConfig,
  type Platform,
  type BudgetConfig,
} from "../types";
import styles from "../GenerateWizard.module.css";

export interface GenerationPreviewProps {
  dataSourceId: string;
  ruleIds: string[];
  campaignConfig: CampaignConfig;
  hierarchyConfig: HierarchyConfig;
  selectedPlatforms: Platform[];
  platformBudgets: Record<Platform, BudgetConfig | null>;
  sampleData: Record<string, unknown>[];
  warnings?: PreviewWarning[];
  onGenerateComplete: (result: GenerateResponse) => void;
}

/**
 * Creates a stable key for warning strings
 */
function createWarningKey(prefix: string, content: string, index: number): string {
  const contentHash = content.substring(0, 30).replace(/\s+/g, "-").toLowerCase();
  return `${prefix}-${contentHash}-${index}`;
}

export function GenerationPreview(props: GenerationPreviewProps) {
  const {
    dataSourceId,
    ruleIds,
    campaignConfig,
    hierarchyConfig,
    selectedPlatforms,
    platformBudgets,
    sampleData,
    warnings,
    onGenerateComplete,
  } = props;

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateResult, setGenerateResult] = useState<{
    campaigns: { id: string; name: string }[];
    stats: { totalCampaigns: number; totalAdGroups: number; totalAds: number };
    warnings: string[];
  } | null>(null);

  // Compute campaign count from sample data using new structure
  const stats = useMemo(() => {
    if (!sampleData || sampleData.length === 0) {
      return { campaignCount: 0, adGroupCount: 0, adCount: 0, rowsProcessed: 0 };
    }

    // Handle empty adGroups
    if (!hierarchyConfig.adGroups || hierarchyConfig.adGroups.length === 0) {
      return { campaignCount: 0, adGroupCount: 0, adCount: 0, rowsProcessed: sampleData.length };
    }

    const campaignMap = new Map<string, Map<string, number>>();

    for (const row of sampleData) {
      const campaignName = interpolatePattern(campaignConfig.namePattern, row);

      // Process each ad group definition
      for (const adGroupDef of hierarchyConfig.adGroups) {
        const adGroupName = interpolatePattern(adGroupDef.namePattern, row);

        if (!campaignMap.has(campaignName)) {
          campaignMap.set(campaignName, new Map());
        }
        const adGroupMap = campaignMap.get(campaignName)!;
        // Count ads per ad group (number of ads in definition * number of rows with same ad group name)
        const currentCount = adGroupMap.get(adGroupName) || 0;
        adGroupMap.set(adGroupName, currentCount + adGroupDef.ads.length);
      }
    }

    let adGroupCount = 0;
    let adCount = 0;
    for (const adGroupMap of campaignMap.values()) {
      adGroupCount += adGroupMap.size;
      for (const count of adGroupMap.values()) {
        adCount += count;
      }
    }

    return {
      campaignCount: campaignMap.size,
      adGroupCount,
      adCount,
      rowsProcessed: sampleData.length,
    };
  }, [sampleData, campaignConfig.namePattern, hierarchyConfig.adGroups]);

  const hasData = sampleData && sampleData.length > 0;

  // Generate campaigns
  const handleGenerate = useCallback(async () => {
    try {
      setGenerating(true);
      setGenerateError(null);

      // Filter out null budgets for the request
      const budgetsForRequest: Record<string, BudgetConfig> = {};
      for (const platform of selectedPlatforms) {
        const budget = platformBudgets[platform];
        if (budget) {
          budgetsForRequest[platform] = budget;
        }
      }

      const request = {
        dataSourceId,
        campaignConfig: {
          namePattern: campaignConfig.namePattern,
          objective: campaignConfig.objective,
        },
        hierarchyConfig: {
          adGroups: hierarchyConfig.adGroups.map(ag => ({
            id: ag.id,
            namePattern: ag.namePattern,
            ads: ag.ads.map(ad => ({
              id: ad.id,
              headline: ad.headline,
              description: ad.description,
              displayUrl: ad.displayUrl,
              finalUrl: ad.finalUrl,
              callToAction: ad.callToAction,
            })),
          })),
        },
        selectedPlatforms,
        platformBudgets: Object.keys(budgetsForRequest).length > 0 ? budgetsForRequest : undefined,
        ruleIds: ruleIds.length > 0 ? ruleIds : undefined,
      };

      const response = await api.post<{
        campaigns: { id: string; name: string }[];
        stats: { totalCampaigns: number; totalAdGroups: number; totalAds: number; totalRows: number };
        warnings: string[];
      }>("/api/v1/campaigns/generate-from-config", request);

      setGenerateResult(response);

      // Call onGenerateComplete with a compatible response format
      onGenerateComplete({
        generatedCount: response.stats.totalCampaigns,
        campaigns: response.campaigns.map((c) => ({ id: c.id, name: c.name, status: "draft" })),
        warnings: response.warnings,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate campaigns";
      setGenerateError(errorMessage);
      console.error("[GenerationPreview] Config generation failed:", {
        dataSourceId,
        error: err,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setGenerating(false);
    }
  }, [dataSourceId, campaignConfig, hierarchyConfig, selectedPlatforms, platformBudgets, ruleIds, onGenerateComplete]);

  // Success state after generation
  if (generateResult) {
    return (
      <div className={styles.successState} data-testid="config-generate-success">
        <div className={styles.successIcon} aria-hidden="true">&#10004;</div>
        <div className={styles.successTitle}>
          {generateResult.stats.totalCampaigns} Campaign{generateResult.stats.totalCampaigns !== 1 ? "s" : ""} Generated!
        </div>
        <div className={styles.successMessage}>
          Your campaigns have been created and are ready for review.
        </div>
        {generateResult.warnings.length > 0 && (
          <div className={styles.warningsBox} style={{ textAlign: "left", marginBottom: "16px" }}>
            <div className={styles.warningsTitle}>Warnings</div>
            <ul className={styles.warningsList}>
              {generateResult.warnings.map((warning, index) => (
                <li key={createWarningKey("config-result", warning, index)} className={styles.warningItem}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        <Link href="/campaigns" className={styles.viewCampaignsLink}>
          View Campaigns
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="generation-preview-config">
      <HierarchyPreview
        campaignConfig={campaignConfig}
        hierarchyConfig={hierarchyConfig}
        sampleData={sampleData || []}
        selectedPlatforms={selectedPlatforms}
        warnings={warnings}
      />

      {/* Generate Section */}
      <div className={styles.generateSection} style={{ marginTop: "24px" }}>
        {generateError && (
          <div className={styles.generateErrorBox} data-testid="config-generate-error">
            <p>Failed to generate campaigns: {generateError}</p>
            <button
              type="button"
              onClick={handleGenerate}
              className={styles.retryButton}
            >
              Retry Generation
            </button>
          </div>
        )}
        {!generateError && (
          <button
            type="button"
            className={styles.generateButton}
            onClick={handleGenerate}
            disabled={!hasData || generating}
            data-testid="config-generate-button"
          >
            {generating ? (
              <span className={styles.generating}>
                <span>Generating...</span>
              </span>
            ) : (
              `Generate ${stats.campaignCount} Campaign${stats.campaignCount !== 1 ? "s" : ""}`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
