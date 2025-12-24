"use client";

import { useMemo } from "react";
import type {
  WizardStep,
  WizardState,
  CampaignConfig,
  HierarchyConfig,
  Platform,
  BudgetConfig,
} from "../types";
import { interpolatePattern, PLATFORM_LIMITS } from "../types";
import styles from "./WizardSidePanel.module.css";

interface WizardSidePanelProps {
  currentStep: WizardStep;
  state: WizardState;
  sampleData: Record<string, unknown>[];
}

// Platform display config
const PLATFORM_CONFIG: Record<Platform, { label: string; color: string }> = {
  google: { label: "Google Ads", color: "#4285f4" },
  reddit: { label: "Reddit", color: "#ff4500" },
  facebook: { label: "Facebook", color: "#1877f2" },
};

export function WizardSidePanel({
  currentStep,
  state,
  sampleData,
}: WizardSidePanelProps) {
  // Compute preview data based on sample rows
  const previewData = useMemo(() => {
    if (!sampleData || sampleData.length === 0) return null;

    const firstRow = sampleData[0];
    if (!firstRow) return null;

    // Campaign name preview
    const campaignName = state.campaignConfig
      ? interpolatePattern(state.campaignConfig.namePattern, firstRow)
      : null;

    // Ad group previews
    const adGroups =
      state.hierarchyConfig?.adGroups.map((ag) => ({
        name: interpolatePattern(ag.namePattern, firstRow),
        adCount: ag.ads.length,
        keywordCount: ag.keywords?.length ?? 0,
        ads: ag.ads.map((ad) => ({
          headline: interpolatePattern(ad.headline, firstRow),
          description: interpolatePattern(ad.description, firstRow),
        })),
      })) ?? [];

    return {
      campaignName,
      adGroups,
      sampleCount: sampleData.length,
    };
  }, [sampleData, state.campaignConfig, state.hierarchyConfig]);

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
      {previewData?.campaignName ? (
        <>
          <div className={styles.previewCard}>
            <span className={styles.previewCardLabel}>Campaign Name</span>
            <span className={styles.previewCardValue}>{previewData.campaignName}</span>
          </div>
          <p className={styles.previewNote}>
            Based on first row of {previewData.sampleCount} sample rows
          </p>
        </>
      ) : (
        <p className={styles.emptyHint}>Enter a name pattern to see preview</p>
      )}
    </div>
  );

  const renderHierarchyPreview = () => (
    <div className={styles.previewSection}>
      <h4 className={styles.sectionTitle}>Structure Summary</h4>
      {previewData && previewData.adGroups.length > 0 ? (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statBoxValue}>{previewData.adGroups.length}</span>
              <span className={styles.statBoxLabel}>Ad Groups</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statBoxValue}>
                {previewData.adGroups.reduce((sum, ag) => sum + ag.adCount, 0)}
              </span>
              <span className={styles.statBoxLabel}>Ads</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statBoxValue}>
                {previewData.adGroups.reduce((sum, ag) => sum + ag.keywordCount, 0)}
              </span>
              <span className={styles.statBoxLabel}>Keywords</span>
            </div>
          </div>
          <div className={styles.adGroupList}>
            {previewData.adGroups.slice(0, 3).map((ag, idx) => (
              <div key={idx} className={styles.adGroupItem}>
                <span className={styles.adGroupName}>{ag.name || "(empty name)"}</span>
                <span className={styles.adGroupMeta}>
                  {ag.adCount} ad{ag.adCount !== 1 ? "s" : ""}
                  {ag.keywordCount > 0 && `, ${ag.keywordCount} keywords`}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className={styles.emptyHint}>Configure ad groups to see summary</p>
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
      <h4 className={styles.sectionTitle}>Generation Summary</h4>
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
