"use client";

import { useMemo, useState, useCallback } from "react";
import type { CampaignConfig, HierarchyConfig, Platform, CharacterLimitSummary } from "../types";
import { interpolatePattern, checkCharacterLimits, PLATFORM_LIMITS, getFieldLimit } from "../types";
import styles from "./HierarchyPreview.module.css";

// Types for the preview
export interface PreviewStats {
  totalCampaigns: number;
  totalAdGroups: number;
  totalAds: number;
  rowsProcessed: number;
  rowsSkipped: number;
}

export interface PreviewWarning {
  type: string;
  message: string;
  rowIndex?: number;
}

interface GroupedAd {
  headline: string;
  description: string;
  displayUrl?: string;
  finalUrl?: string;
}

interface GroupedAdGroup {
  name: string;
  ads: GroupedAd[];
}

interface GroupedCampaign {
  name: string;
  adGroups: GroupedAdGroup[];
}

export interface HierarchyPreviewProps {
  campaignConfig: CampaignConfig;
  hierarchyConfig: HierarchyConfig;
  sampleData: Record<string, unknown>[];
  selectedPlatforms?: Platform[];
  loading?: boolean;
  error?: string;
  warnings?: PreviewWarning[];
  rowsSkipped?: number;
  onRetry?: () => void;
}

export function HierarchyPreview({
  campaignConfig,
  hierarchyConfig,
  sampleData,
  selectedPlatforms = [],
  loading = false,
  error,
  warnings = [],
  rowsSkipped = 0,
  onRetry,
}: HierarchyPreviewProps) {
  // Collapsed state for tree nodes
  const [collapsedCampaigns, setCollapsedCampaigns] = useState<Set<string>>(new Set());
  const [collapsedAdGroups, setCollapsedAdGroups] = useState<Set<string>>(new Set());
  // Show/hide detailed character limit warnings
  const [showCharLimitDetails, setShowCharLimitDetails] = useState(false);

  // Compute hierarchy from sample data using new structure
  const { campaigns, stats } = useMemo(() => {
    if (!sampleData || sampleData.length === 0) {
      return {
        campaigns: [] as GroupedCampaign[],
        stats: {
          totalCampaigns: 0,
          totalAdGroups: 0,
          totalAds: 0,
          rowsProcessed: 0,
          rowsSkipped,
        },
      };
    }

    // Handle empty adGroups
    if (!hierarchyConfig.adGroups || hierarchyConfig.adGroups.length === 0) {
      return {
        campaigns: [] as GroupedCampaign[],
        stats: {
          totalCampaigns: 0,
          totalAdGroups: 0,
          totalAds: 0,
          rowsProcessed: sampleData.length,
          rowsSkipped,
        },
      };
    }

    // Map: campaignName -> adGroupName -> { ads: GroupedAd[], seenAdKeys: Set<string> }
    const campaignMap = new Map<string, Map<string, { ads: GroupedAd[]; seenAdKeys: Set<string> }>>();

    for (const row of sampleData) {
      const campaignName = interpolatePattern(campaignConfig.namePattern, row);

      // Process each ad group definition
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

        // Process each ad in the ad group definition
        for (const adDef of adGroupDef.ads) {
          const headline = interpolatePattern(adDef.headline, row);
          const description = interpolatePattern(adDef.description, row);
          const displayUrl = adDef.displayUrl
            ? interpolatePattern(adDef.displayUrl, row)
            : undefined;
          const finalUrl = adDef.finalUrl
            ? interpolatePattern(adDef.finalUrl, row)
            : undefined;

          // Deduplicate ads by headline+description within each ad group
          // Use null character as delimiter to avoid collision with pipe chars in content
          // (e.g., template filters like {brand|uppercase} use pipes)
          const adKey = `${headline}\0${description}`;
          if (!adGroupData.seenAdKeys.has(adKey)) {
            adGroupData.seenAdKeys.add(adKey);
            adGroupData.ads.push({ headline, description, displayUrl, finalUrl });
          }
        }
      }
    }

    const campaignList: GroupedCampaign[] = [];
    let totalAdGroups = 0;
    let totalAds = 0;

    for (const [campaignName, adGroupMap] of campaignMap) {
      const adGroups: GroupedAdGroup[] = [];
      for (const [adGroupName, adGroupData] of adGroupMap) {
        adGroups.push({ name: adGroupName, ads: adGroupData.ads });
        totalAdGroups++;
        totalAds += adGroupData.ads.length;
      }
      campaignList.push({ name: campaignName, adGroups });
    }

    return {
      campaigns: campaignList,
      stats: {
        totalCampaigns: campaignList.length,
        totalAdGroups,
        totalAds,
        rowsProcessed: sampleData.length,
        rowsSkipped,
      },
    };
  }, [sampleData, campaignConfig, hierarchyConfig, rowsSkipped]);

  // Check character limits per platform
  const charLimitSummaries = useMemo(() => {
    if (!sampleData || sampleData.length === 0 || selectedPlatforms.length === 0) {
      return new Map<Platform, CharacterLimitSummary>();
    }
    if (!hierarchyConfig.adGroups || hierarchyConfig.adGroups.length === 0) {
      return new Map<Platform, CharacterLimitSummary>();
    }

    const summaries = new Map<Platform, CharacterLimitSummary>();
    for (const platform of selectedPlatforms) {
      const summary = checkCharacterLimits(sampleData, hierarchyConfig, platform);
      if (summary.totalOverflows > 0) {
        summaries.set(platform, summary);
      }
    }
    return summaries;
  }, [sampleData, hierarchyConfig, selectedPlatforms]);

  // Combined character limit stats across all platforms
  const totalCharLimitIssues = useMemo(() => {
    let total = 0;
    for (const summary of charLimitSummaries.values()) {
      total += summary.totalOverflows;
    }
    return total;
  }, [charLimitSummaries]);

  // Toggle campaign collapse
  const toggleCampaign = useCallback((name: string) => {
    setCollapsedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  // Toggle ad group collapse
  const toggleAdGroup = useCallback((key: string) => {
    setCollapsedAdGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={styles.container} data-testid="hierarchy-preview-loading">
        <div className={styles.loadingWrapper}>
          <div className={styles.skeletonTree}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeletonNode}>
                <div className={styles.skeletonToggle} />
                <div className={styles.skeletonLabel} />
              </div>
            ))}
          </div>
          <div className={styles.skeletonStats}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonStat} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container} data-testid="hierarchy-preview-error">
        <div className={styles.errorWrapper}>
          <div className={styles.errorIcon}>!</div>
          <p className={styles.errorMessage}>{error}</p>
          {onRetry && (
            <button
              type="button"
              className={styles.retryButton}
              onClick={onRetry}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (!sampleData || sampleData.length === 0) {
    return (
      <div className={styles.container} data-testid="hierarchy-preview-empty">
        <div className={styles.emptyWrapper}>
          <p className={styles.emptyMessage}>
            No data available. Select a data source to see the hierarchy preview.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} data-testid="hierarchy-preview">
      <div className={styles.previewLayout}>
        {/* Tree View */}
        <div className={styles.treeView} data-testid="tree-view">
          {campaigns.length === 0 ? (
            <div className={styles.treeEmpty}>
              No campaigns will be created. Configure the patterns above.
            </div>
          ) : (
            campaigns.map((campaign) => {
              const isCampaignCollapsed = collapsedCampaigns.has(campaign.name);

              return (
                <div
                  key={campaign.name}
                  className={styles.treeNode}
                  data-testid={`tree-campaign-${campaign.name}`}
                >
                  {/* Campaign Header */}
                  <div className={styles.treeNodeHeader}>
                    <button
                      type="button"
                      className={`${styles.toggleButton} ${!isCampaignCollapsed ? styles.toggleButtonExpanded : ""}`}
                      onClick={() => toggleCampaign(campaign.name)}
                      aria-expanded={!isCampaignCollapsed}
                      aria-label={`Toggle ${campaign.name}`}
                      data-testid="toggle-button"
                    >
                      <span className={styles.toggleIcon}>&#9656;</span>
                    </button>
                    <span className={`${styles.nodeIcon} ${styles.nodeIconCampaign}`}>C</span>
                    <span
                      className={`${styles.nodeLabel} ${styles.truncate}`}
                      title={campaign.name}
                      data-testid="node-label"
                    >
                      {campaign.name}
                    </span>
                    <span className={styles.nodeCount}>
                      {campaign.adGroups.length} ad group{campaign.adGroups.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Ad Groups */}
                  {!isCampaignCollapsed && (
                    <div className={styles.treeChildren}>
                      {campaign.adGroups.map((adGroup, agIdx) => {
                        const agKey = `${campaign.name}-${adGroup.name}`;
                        const isAdGroupCollapsed = collapsedAdGroups.has(agKey);

                        return (
                          <div
                            key={`${agKey}-${agIdx}`}
                            className={styles.treeNode}
                            data-testid={`tree-adgroup-${agKey}`}
                          >
                            {/* Ad Group Header */}
                            <div className={styles.treeNodeHeader}>
                              <button
                                type="button"
                                className={`${styles.toggleButton} ${!isAdGroupCollapsed ? styles.toggleButtonExpanded : ""}`}
                                onClick={() => toggleAdGroup(agKey)}
                                aria-expanded={!isAdGroupCollapsed}
                                aria-label={`Toggle ${adGroup.name}`}
                                data-testid="toggle-button"
                              >
                                <span className={styles.toggleIcon}>&#9656;</span>
                              </button>
                              <span className={`${styles.nodeIcon} ${styles.nodeIconAdGroup}`}>AG</span>
                              <span
                                className={`${styles.nodeLabel} ${styles.truncate}`}
                                title={adGroup.name}
                                data-testid="node-label"
                              >
                                {adGroup.name}
                              </span>
                              <span className={styles.nodeCount}>
                                {adGroup.ads.length} ad{adGroup.ads.length !== 1 ? "s" : ""}
                              </span>
                            </div>

                            {/* Ads */}
                            {!isAdGroupCollapsed && (
                              <div className={styles.treeChildren}>
                                {adGroup.ads.slice(0, 5).map((ad, adIdx) => (
                                  <div key={adIdx} className={styles.adNode}>
                                    <span className={`${styles.nodeIcon} ${styles.nodeIconAd}`}>Ad</span>
                                    <div className={styles.adContent}>
                                      <span
                                        className={`${styles.adHeadline} ${styles.truncate}`}
                                        title={ad.headline}
                                      >
                                        {ad.headline || "(no headline)"}
                                      </span>
                                      <span
                                        className={`${styles.adDescription} ${styles.truncate}`}
                                        title={ad.description}
                                      >
                                        {ad.description || "(no description)"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                {adGroup.ads.length > 5 && (
                                  <div className={styles.moreAds}>
                                    ...and {adGroup.ads.length - 5} more ad{adGroup.ads.length - 5 !== 1 ? "s" : ""}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Stats Panel */}
        <div className={styles.statsPanel} data-testid="stats-panel">
          <h4 className={styles.statsPanelTitle}>Statistics</h4>
          <div className={styles.statsGrid}>
            <div className={styles.statItem} data-testid="stat-campaigns">
              <span className={styles.statLabel}>Campaigns</span>
              <span className={`${styles.statValue} ${styles.statValueCampaigns}`}>
                {stats.totalCampaigns}
              </span>
            </div>
            <div className={styles.statItem} data-testid="stat-ad-groups">
              <span className={styles.statLabel}>Ad Groups</span>
              <span className={`${styles.statValue} ${styles.statValueAdGroups}`}>
                {stats.totalAdGroups}
              </span>
            </div>
            <div className={styles.statItem} data-testid="stat-ads">
              <span className={styles.statLabel}>Ads</span>
              <span className={`${styles.statValue} ${styles.statValueAds}`}>
                {stats.totalAds}
              </span>
            </div>
            <div className={styles.statItem} data-testid="stat-rows-processed">
              <span className={styles.statLabel}>Rows Processed</span>
              <span className={styles.statValue}>{stats.rowsProcessed}</span>
            </div>
            {stats.rowsSkipped > 0 && (
              <div className={styles.statItem} data-testid="stat-rows-skipped">
                <span className={styles.statLabel}>Rows Skipped</span>
                <span className={`${styles.statValue} ${styles.statValueWarning}`}>
                  {stats.rowsSkipped}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <div className={styles.warningsSection} data-testid="warnings-section">
          <div className={styles.warningsHeader} data-testid="warnings-header">
            <span className={styles.warningsIcon}>!</span>
            <span>{warnings.length} warning{warnings.length !== 1 ? "s" : ""}</span>
          </div>
          <ul className={styles.warningsList}>
            {warnings.map((warning, idx) => (
              <li key={idx} className={styles.warningItem}>
                {warning.rowIndex !== undefined && (
                  <span className={styles.warningRowIndex}>Row {warning.rowIndex}: </span>
                )}
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Character Limit Warnings Section */}
      {totalCharLimitIssues > 0 && (
        <div className={styles.charLimitSection} data-testid="char-limit-section">
          <div className={styles.charLimitHeader} data-testid="char-limit-header">
            <span className={styles.charLimitIcon}>!</span>
            <span>Character Limit Issues</span>
          </div>
          <div className={styles.charLimitSummary}>
            {Array.from(charLimitSummaries.entries()).map(([platform, summary]) => (
              <div key={platform} data-testid={`char-limit-platform-${platform}`}>
                <span className={styles.charLimitBadge}>
                  <strong>{platform}:</strong>
                  {summary.headlineOverflows > 0 && (
                    <span>{summary.headlineOverflows} headline{summary.headlineOverflows !== 1 ? "s" : ""} exceed {getFieldLimit(platform, 'headline')} chars</span>
                  )}
                  {summary.headlineOverflows > 0 && summary.descriptionOverflows > 0 && ", "}
                  {summary.descriptionOverflows > 0 && (
                    <span>{summary.descriptionOverflows} description{summary.descriptionOverflows !== 1 ? "s" : ""} exceed {getFieldLimit(platform, 'description')} chars</span>
                  )}
                  {(summary.headlineOverflows > 0 || summary.descriptionOverflows > 0) && summary.displayUrlOverflows > 0 && ", "}
                  {summary.displayUrlOverflows > 0 && (
                    <span>{summary.displayUrlOverflows} display URL{summary.displayUrlOverflows !== 1 ? "s" : ""} exceed {getFieldLimit(platform, 'displayUrl')} chars</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          {Array.from(charLimitSummaries.values()).some(s => s.warnings.length > 0) && (
            <div className={styles.charLimitDetails}>
              <button
                type="button"
                className={styles.charLimitToggle}
                onClick={() => setShowCharLimitDetails(!showCharLimitDetails)}
                data-testid="char-limit-toggle"
              >
                {showCharLimitDetails ? "Hide details" : "Show details"}
              </button>
              {showCharLimitDetails && (
                <ul className={styles.charLimitList}>
                  {Array.from(charLimitSummaries.entries()).flatMap(([platform, summary]) =>
                    summary.warnings.slice(0, 10).map((warning, idx) => (
                      <li key={`${platform}-${idx}`} className={styles.charLimitItem}>
                        <span>
                          <span className={styles.charLimitField}>{warning.field}</span>
                          {" "}({platform}) - Row {(warning.rowIndex ?? 0) + 1}:
                          {" "}<span className={styles.charLimitOverflow}>{warning.length}/{warning.limit} chars (+{warning.overflow})</span>
                        </span>
                        <span className={styles.charLimitValue} title={warning.value}>
                          {warning.value}
                        </span>
                      </li>
                    ))
                  )}
                  {Array.from(charLimitSummaries.values()).reduce((acc, s) => acc + s.warnings.length, 0) > 10 && (
                    <li className={styles.charLimitItem}>
                      <span>...and {Array.from(charLimitSummaries.values()).reduce((acc, s) => acc + s.warnings.length, 0) - 10} more issues</span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
          <p style={{ fontSize: '11px', marginTop: '8px', opacity: 0.8 }}>
            Long content will be automatically truncated with "..." during generation.
          </p>
        </div>
      )}
    </div>
  );
}
