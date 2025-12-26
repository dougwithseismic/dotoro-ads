"use client";

import { useMemo } from "react";
import type {
  WizardStep,
  WizardState,
  Platform,
} from "../types";
import { interpolatePattern, PLATFORM_LIMITS } from "../types";
import styles from "./WizardSidePanel.module.css";

interface WizardSidePanelProps {
  currentStep: WizardStep;
  state: WizardState;
  sampleData: Record<string, unknown>[];
  // Direct props for reactivity - ensures useMemo detects changes
  campaignConfig: WizardState['campaignConfig'];
  hierarchyConfig: WizardState['hierarchyConfig'];
}

// Platform display config
const PLATFORM_CONFIG: Record<Platform, { label: string; color: string }> = {
  google: { label: "Google Ads", color: "#4285f4" },
  reddit: { label: "Reddit", color: "#ff4500" },
  facebook: { label: "Facebook", color: "#1877f2" },
};

// Types for grouped hierarchy
interface GroupedAd {
  headline: string;
  description: string;
}

interface GroupedAdGroup {
  name: string;
  ads: GroupedAd[];
}

interface GroupedCampaign {
  name: string;
  adGroups: GroupedAdGroup[];
}

export function WizardSidePanel({
  currentStep,
  state,
  sampleData,
  campaignConfig,
  hierarchyConfig,
}: WizardSidePanelProps) {
  // Compute preview data with REAL deduplicated hierarchy (same logic as HierarchyPreview)
  // Using direct props (campaignConfig, hierarchyConfig) ensures React detects changes properly
  const previewData = useMemo(() => {
    if (!sampleData || sampleData.length === 0) return null;
    if (!hierarchyConfig?.adGroups?.length) {
      // Return campaign names only if we have campaign config but no ad groups
      if (campaignConfig) {
        const uniqueCampaignNames = new Set<string>();
        for (const row of sampleData) {
          const name = interpolatePattern(campaignConfig.namePattern, row);
          if (name) uniqueCampaignNames.add(name);
        }
        return {
          campaigns: [] as GroupedCampaign[],
          totalCampaigns: uniqueCampaignNames.size,
          totalAdGroups: 0,
          totalAds: 0,
          sampleCount: sampleData.length,
          campaignNames: Array.from(uniqueCampaignNames),
        };
      }
      return null;
    }

    // Build the same hierarchy map as HierarchyPreview
    // Map: campaignName -> adGroupName -> { ads: GroupedAd[], seenAdKeys: Set<string> }
    const campaignMap = new Map<string, Map<string, { ads: GroupedAd[]; seenAdKeys: Set<string> }>>();

    for (const row of sampleData) {
      const campaignName = campaignConfig
        ? interpolatePattern(campaignConfig.namePattern, row)
        : '';

      for (const adGroupDef of hierarchyConfig.adGroups) {
        const adGroupName = interpolatePattern(adGroupDef.namePattern, row);

        if (!campaignMap.has(campaignName)) {
          campaignMap.set(campaignName, new Map());
        }
        const adGroupMap = campaignMap.get(campaignName)!;

        if (!adGroupMap.has(adGroupName)) {
          adGroupMap.set(adGroupName, { ads: [], seenAdKeys: new Set() });
        }
        const adGroupData = adGroupMap.get(adGroupName)!;

        for (const adDef of adGroupDef.ads) {
          const headline = interpolatePattern(adDef.headline, row);
          const description = interpolatePattern(adDef.description, row);
          // Use null character as delimiter to avoid collision with content
          const adKey = `${headline}\0${description}`;

          if (!adGroupData.seenAdKeys.has(adKey)) {
            adGroupData.seenAdKeys.add(adKey);
            adGroupData.ads.push({ headline, description });
          }
        }
      }
    }

    // Convert to array structure
    const campaigns: GroupedCampaign[] = [];
    let totalAdGroups = 0;
    let totalAds = 0;

    for (const [campaignName, adGroupMap] of campaignMap) {
      const adGroups: GroupedAdGroup[] = [];
      for (const [agName, agData] of adGroupMap) {
        adGroups.push({ name: agName, ads: agData.ads });
        totalAdGroups++;
        totalAds += agData.ads.length;
      }
      campaigns.push({ name: campaignName, adGroups });
    }

    return {
      campaigns,
      totalCampaigns: campaigns.length,
      totalAdGroups,
      totalAds,
      sampleCount: sampleData.length,
      campaignNames: campaigns.map(c => c.name),
    };
  }, [sampleData, campaignConfig, hierarchyConfig]);

  const renderDataSourcePreview = () => (
    <div className={styles.previewSection}>
      <h4 className={styles.sectionTitle}>Data Source</h4>
      {state.dataSourceId ? (
        <>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Columns</span>
            <span className={styles.statValue}>{state.availableColumns.length}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Sample Rows</span>
            <span className={styles.statValue}>{sampleData.length}</span>
          </div>
          {state.availableColumns.length > 0 && (
            <div className={styles.columnList}>
              <span className={styles.columnListLabel}>Available Variables:</span>
              <div className={styles.columnTags}>
                {state.availableColumns.slice(0, 8).map((col) => (
                  <span key={col.name} className={styles.columnTag}>
                    {col.name}
                  </span>
                ))}
                {state.availableColumns.length > 8 && (
                  <span className={styles.columnTagMore}>
                    +{state.availableColumns.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className={styles.emptyHint}>Select a data source to see preview</p>
      )}
    </div>
  );

  const renderRulesPreview = () => (
    <div className={styles.previewSection}>
      <h4 className={styles.sectionTitle}>Selected Rules</h4>
      {state.ruleIds.length > 0 ? (
        <div className={styles.rulesList}>
          {state.ruleIds.map((ruleId, index) => (
            <div key={ruleId} className={styles.ruleItem}>
              Rule {index + 1}
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.emptyHint}>No rules selected (optional)</p>
      )}
    </div>
  );

  const renderCampaignPreview = () => (
    <div className={styles.previewSection}>
      <h4 className={styles.sectionTitle}>Campaign Preview</h4>
      {previewData && previewData.campaignNames.length > 0 ? (
        <>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Unique Campaigns</span>
            <span className={styles.statValue}>{previewData.totalCampaigns}</span>
          </div>
          <div className={styles.previewCard}>
            <span className={styles.previewCardLabel}>Campaign Names</span>
            <div className={styles.campaignNamesList}>
              {previewData.campaignNames.slice(0, 5).map((name, idx) => (
                <span key={idx} className={styles.campaignNameItem}>{name}</span>
              ))}
              {previewData.campaignNames.length > 5 && (
                <span className={styles.campaignNameMore}>
                  +{previewData.campaignNames.length - 5} more
                </span>
              )}
            </div>
          </div>
          <p className={styles.previewNote}>
            From {previewData.sampleCount} sample rows
          </p>
        </>
      ) : (
        <p className={styles.emptyHint}>Enter a name pattern to see preview</p>
      )}
    </div>
  );

  const renderHierarchyPreview = () => (
    <div className={styles.previewSection}>
      <h4 className={styles.sectionTitle}>Campaign Structure</h4>
      {previewData && previewData.campaigns.length > 0 ? (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statBoxValue}>{previewData.totalCampaigns}</span>
              <span className={styles.statBoxLabel}>Campaigns</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statBoxValue}>{previewData.totalAdGroups}</span>
              <span className={styles.statBoxLabel}>Ad Groups</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statBoxValue}>{previewData.totalAds}</span>
              <span className={styles.statBoxLabel}>Ads</span>
            </div>
          </div>
          <div className={styles.hierarchyTree}>
            {previewData.campaigns.slice(0, 3).map((campaign, idx) => (
              <div key={idx} className={styles.campaignNode}>
                <div className={styles.campaignHeader}>
                  <span className={styles.nodeIconCampaign}>C</span>
                  <span className={styles.campaignName}>{campaign.name || "(empty)"}</span>
                  <span className={styles.nodeCount}>{campaign.adGroups.length} AG</span>
                </div>
                <div className={styles.adGroupNodes}>
                  {campaign.adGroups.slice(0, 2).map((ag, agIdx) => (
                    <div key={agIdx} className={styles.adGroupNode}>
                      <span className={styles.nodeIconAdGroup}>AG</span>
                      <span className={styles.adGroupNodeName}>{ag.name || "(empty)"}</span>
                      <span className={styles.nodeCount}>{ag.ads.length} ads</span>
                    </div>
                  ))}
                  {campaign.adGroups.length > 2 && (
                    <div className={styles.moreNodes}>+{campaign.adGroups.length - 2} more</div>
                  )}
                </div>
              </div>
            ))}
            {previewData.campaigns.length > 3 && (
              <div className={styles.moreNodes}>+{previewData.campaigns.length - 3} more campaigns</div>
            )}
          </div>
        </>
      ) : (
        <p className={styles.emptyHint}>Configure ad groups to see structure</p>
      )}
    </div>
  );

  const renderPlatformPreview = () => {
    // Helper to get headline limit for a platform
    const getHeadlineLimit = (platform: Platform): number => {
      switch (platform) {
        case 'google':
          return PLATFORM_LIMITS.google.headline;
        case 'facebook':
          return PLATFORM_LIMITS.facebook.headline;
        case 'reddit':
          return PLATFORM_LIMITS.reddit.title;
      }
    };

    // Helper to get description limit for a platform
    const getDescLimit = (platform: Platform): number => {
      switch (platform) {
        case 'google':
          return PLATFORM_LIMITS.google.description;
        case 'facebook':
          return PLATFORM_LIMITS.facebook.primaryText;
        case 'reddit':
          return PLATFORM_LIMITS.reddit.text;
      }
    };

    return (
      <div className={styles.previewSection}>
        <h4 className={styles.sectionTitle}>Selected Platforms</h4>
        {state.selectedPlatforms.length > 0 ? (
          <div className={styles.platformList}>
            {state.selectedPlatforms.map((platform) => {
              const config = PLATFORM_CONFIG[platform];
              const budget = state.platformBudgets[platform];

              return (
                <div key={platform} className={styles.platformItem}>
                  <div className={styles.platformHeader}>
                    <span
                      className={styles.platformBadge}
                      style={{ backgroundColor: config.color }}
                    >
                      {config.label}
                    </span>
                  </div>
                  {budget && (
                    <div className={styles.platformBudget}>
                      {budget.type}: {budget.amountPattern} {budget.currency}
                    </div>
                  )}
                  <div className={styles.platformLimits}>
                    <span>Headline: {getHeadlineLimit(platform)} chars</span>
                    <span>Desc: {getDescLimit(platform)} chars</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyHint}>Select platforms to see limits</p>
        )}
      </div>
    );
  };

  const renderFullPreview = () => (
    <div className={styles.previewSection}>
      <h4 className={styles.sectionTitle}>Campaign Set Summary</h4>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Data Source</span>
          <span className={styles.summaryValue}>
            {state.dataSourceId ? "✓ Selected" : "Not selected"}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Campaign</span>
          <span className={styles.summaryValue}>
            {state.campaignConfig?.namePattern ? "✓ Configured" : "Not configured"}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Ad Groups</span>
          <span className={styles.summaryValue}>
            {state.hierarchyConfig?.adGroups.length ?? 0}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Platforms</span>
          <span className={styles.summaryValue}>{state.selectedPlatforms.length}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Rules</span>
          <span className={styles.summaryValue}>{state.ruleIds.length}</span>
        </div>
      </div>
    </div>
  );

  // Render content based on current step
  const renderContent = () => {
    switch (currentStep) {
      case "data-source":
        return renderDataSourcePreview();
      case "rules":
        return (
          <>
            {renderDataSourcePreview()}
            {renderRulesPreview()}
          </>
        );
      case "campaign-config":
        return (
          <>
            {renderCampaignPreview()}
            {renderDataSourcePreview()}
          </>
        );
      case "hierarchy":
        return (
          <>
            {renderHierarchyPreview()}
            {renderCampaignPreview()}
          </>
        );
      case "platform":
        return (
          <>
            {renderPlatformPreview()}
            {renderHierarchyPreview()}
          </>
        );
      case "preview":
        return renderFullPreview();
      default:
        return null;
    }
  };

  return (
    <aside className={styles.sidePanel} aria-label="Wizard preview">
      <div className={styles.sidePanelHeader}>
        <h3 className={styles.sidePanelTitle}>Preview</h3>
        <span className={styles.sidePanelBadge}>Live</span>
      </div>
      <div className={styles.sidePanelContent}>{renderContent()}</div>
    </aside>
  );
}
