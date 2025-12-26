"use client";

import { useState, useCallback, useMemo, useRef } from "react";
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

// Platform display names for the UI
const PLATFORM_DISPLAY_NAMES: Record<Platform, string> = {
  google: "Google",
  reddit: "Reddit",
  facebook: "Facebook",
};

export interface GenerationPreviewProps {
  campaignSetName: string;
  campaignSetDescription: string;
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
    campaignSetName,
    campaignSetDescription,
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
    campaignSetId: string;
  } | null>(null);

  // Track active platform tab for multi-platform preview
  const [activePlatformIndex, setActivePlatformIndex] = useState(0);
  const tabListRef = useRef<HTMLDivElement>(null);

  // Determine if we should show tabs (only when 2+ platforms)
  const showPlatformTabs = selectedPlatforms.length >= 2;
  // Ensure activePlatform is always defined (fallback to 'google' if no platforms selected)
  const activePlatform: Platform = selectedPlatforms[activePlatformIndex] ?? selectedPlatforms[0] ?? 'google';

  // Handle keyboard navigation for tabs
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, currentIndex: number) => {
    const platformCount = selectedPlatforms.length;
    let newIndex = currentIndex;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      newIndex = (currentIndex + 1) % platformCount;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      newIndex = (currentIndex - 1 + platformCount) % platformCount;
    } else if (e.key === "Home") {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      newIndex = platformCount - 1;
    }

    if (newIndex !== currentIndex) {
      setActivePlatformIndex(newIndex);
      // Focus the new tab
      const tabs = tabListRef.current?.querySelectorAll('[role="tab"]');
      if (tabs && tabs[newIndex]) {
        (tabs[newIndex] as HTMLElement).focus();
      }
    }
  }, [selectedPlatforms.length]);

  // Compute campaign count from sample data using new structure
  // For multi-platform, multiply by number of platforms
  const stats = useMemo(() => {
    if (!sampleData || sampleData.length === 0) {
      return { campaignCount: 0, adGroupCount: 0, adCount: 0, rowsProcessed: 0, perPlatformCampaigns: 0 };
    }

    // Handle empty adGroups
    if (!hierarchyConfig.adGroups || hierarchyConfig.adGroups.length === 0) {
      return { campaignCount: 0, adGroupCount: 0, adCount: 0, rowsProcessed: sampleData.length, perPlatformCampaigns: 0 };
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

    const perPlatformCampaigns = campaignMap.size;
    const platformMultiplier = selectedPlatforms.length;

    return {
      campaignCount: perPlatformCampaigns * platformMultiplier,
      adGroupCount: adGroupCount * platformMultiplier,
      adCount: adCount * platformMultiplier,
      rowsProcessed: sampleData.length,
      perPlatformCampaigns,
    };
  }, [sampleData, campaignConfig.namePattern, hierarchyConfig.adGroups, selectedPlatforms.length]);

  const hasData = sampleData && sampleData.length > 0;

  // Create campaign set with all configured campaigns, ad groups, and ads
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

      // Build the campaign set config that matches the database schema
      const campaignSetConfig = {
        dataSourceId,
        availableColumns: [], // Will be populated by the API from the data source
        selectedPlatforms,
        selectedAdTypes: {}, // TODO: Add ad type selection to wizard
        campaignConfig: {
          namePattern: campaignConfig.namePattern,
        },
        budgetConfig: Object.keys(budgetsForRequest).length > 0 && selectedPlatforms[0]
          ? {
              type: "daily" as const,
              amountPattern: String(budgetsForRequest[selectedPlatforms[0] as keyof typeof budgetsForRequest]?.amountPattern || "0"),
              currency: budgetsForRequest[selectedPlatforms[0] as keyof typeof budgetsForRequest]?.currency || "USD",
            }
          : undefined,
        hierarchyConfig: {
          adGroups: hierarchyConfig.adGroups.map(ag => ({
            namePattern: ag.namePattern,
            keywords: ag.keywords || [],
            ads: ag.ads.map(ad => ({
              headline: ad.headline,
              description: ad.description,
              displayUrl: ad.displayUrl,
              finalUrl: ad.finalUrl,
              callToAction: ad.callToAction,
            })),
          })),
        },
        generatedAt: new Date().toISOString(),
        rowCount: sampleData.length,
        campaignCount: stats.campaignCount,
      };

      // Step 1: Create the campaign set
      const createResponse = await api.post<{
        id: string;
        name: string;
        status: string;
      }>("/api/v1/campaign-sets", {
        name: campaignSetName,
        description: campaignSetDescription || undefined,
        dataSourceId,
        config: campaignSetConfig,
        status: "draft",
        syncStatus: "pending",
      });

      const campaignSetId = createResponse.id;

      // Step 2: Trigger campaign generation
      const generateResponse = await api.post<{
        campaigns: { id: string; name: string }[];
        created: number;
        updated: number;
      }>(`/api/v1/campaign-sets/${campaignSetId}/generate`, {
        regenerate: false,
      });

      setGenerateResult({
        campaigns: generateResponse.campaigns,
        stats: {
          totalCampaigns: generateResponse.created,
          totalAdGroups: stats.adGroupCount,
          totalAds: stats.adCount,
        },
        warnings: [],
        campaignSetId,
      });

      // Call onGenerateComplete with the campaign set ID for navigation
      onGenerateComplete({
        generatedCount: generateResponse.created,
        campaigns: generateResponse.campaigns.map((c) => ({ id: c.id, name: c.name, status: "draft" })),
        warnings: [],
        campaignSetId, // Pass the campaign set ID for navigation
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create campaign set";
      setGenerateError(errorMessage);
      console.error("[GenerationPreview] Campaign set creation failed:", {
        dataSourceId,
        error: err,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setGenerating(false);
    }
  }, [campaignSetName, campaignSetDescription, dataSourceId, campaignConfig, hierarchyConfig, selectedPlatforms, platformBudgets, sampleData.length, stats, onGenerateComplete]);

  // Generate button text based on platform count
  // NOTE: This useMemo must be defined BEFORE any conditional returns to follow React hooks rules
  const generateButtonText = useMemo(() => {
    if (generating) {
      return "Creating...";
    }
    return "Create Campaign Set";
  }, [generating]);

  // Success state after generation
  if (generateResult) {
    return (
      <div className={styles.successState} data-testid="config-generate-success">
        <div className={styles.successIcon} aria-hidden="true">&#10004;</div>
        <div className={styles.successTitle}>
          Campaign Set Created with {generateResult.stats.totalCampaigns} Campaign{generateResult.stats.totalCampaigns !== 1 ? "s" : ""}!
        </div>
        <div className={styles.successMessage}>
          Your campaign set has been created and is ready for review.
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
        <Link href={`/campaign-sets/${generateResult.campaignSetId}`} className={styles.viewCampaignsLink}>
          View Campaign Set
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="generation-preview-config">
      {/* Preview Section Title */}
      <p className={styles.previewDescription} data-testid="preview-description">
        Preview of campaigns that will be generated from this set
      </p>

      {/* Platform Tabs - only shown when 2+ platforms selected */}
      {showPlatformTabs && (
        <div className={styles.platformTabsContainer} data-testid="platform-tabs">
          <div
            className={styles.platformTabList}
            role="tablist"
            aria-label="Platform preview tabs"
            ref={tabListRef}
          >
            {selectedPlatforms.map((platform, index) => (
              <button
                key={platform}
                type="button"
                role="tab"
                aria-selected={index === activePlatformIndex}
                aria-controls={`platform-panel-${platform}`}
                id={`platform-tab-${platform}`}
                className={`${styles.platformTab} ${index === activePlatformIndex ? styles.platformTabActive : ""}`}
                onClick={() => setActivePlatformIndex(index)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                tabIndex={index === activePlatformIndex ? 0 : -1}
              >
                <span className={`${styles.platformTabBadge} ${styles[`badge${PLATFORM_DISPLAY_NAMES[platform]}`]}`}>
                  {PLATFORM_DISPLAY_NAMES[platform]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Platform Indicator */}
      {showPlatformTabs && (
        <div className={styles.activePlatformIndicator} data-testid="active-platform-indicator">
          Previewing for: <strong>{PLATFORM_DISPLAY_NAMES[activePlatform]}</strong>
        </div>
      )}

      {/* Platform Tab Panel */}
      <div
        role={showPlatformTabs ? "tabpanel" : undefined}
        id={showPlatformTabs ? `platform-panel-${activePlatform}` : undefined}
        aria-labelledby={showPlatformTabs ? `platform-tab-${activePlatform}` : undefined}
      >
        <HierarchyPreview
          campaignConfig={campaignConfig}
          hierarchyConfig={hierarchyConfig}
          sampleData={sampleData || []}
          selectedPlatforms={[activePlatform]}
          warnings={warnings}
        />
      </div>

      {/* Generate Section */}
      <div className={styles.generateSection} style={{ marginTop: "24px" }}>
        {generateError && (
          <div className={styles.generateErrorBox} data-testid="config-generate-error">
            <p>Failed to create campaign set: {generateError}</p>
            <button
              type="button"
              onClick={handleGenerate}
              className={styles.retryButton}
            >
              Retry
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
                <span>Creating...</span>
              </span>
            ) : (
              generateButtonText
            )}
          </button>
        )}
      </div>
    </div>
  );
}
