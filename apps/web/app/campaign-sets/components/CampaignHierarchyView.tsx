"use client";

import { useState } from "react";
import type { Campaign, AdGroup, Ad, Keyword, Platform } from "../types";
import { StatusBadge } from "./StatusBadge";
import styles from "./CampaignHierarchyView.module.css";

interface CampaignHierarchyViewProps {
  /** List of campaigns to display in the hierarchy */
  campaigns: Campaign[];
}

/**
 * Get display name for a platform
 */
function getPlatformDisplayName(platform: Platform): string {
  const names: Record<Platform, string> = {
    google: "Google",
    meta: "Meta",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
    reddit: "Reddit",
  };
  return names[platform] || platform;
}

/**
 * Get match type display format for keywords
 */
function getMatchTypeFormat(matchType: Keyword["matchType"]): string {
  return `[${matchType}]`;
}

/**
 * Chevron icon component
 */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${styles.chevron} ${expanded ? styles.expanded : ""}`}
      aria-hidden="true"
    >
      <path
        d="M6 4L10 8L6 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * AdItem Component - Renders a single ad
 */
function AdItem({ ad }: { ad: Ad }) {
  return (
    <div className={styles.adItem}>
      <div className={styles.adHeader}>
        {ad.headline && <span className={styles.adHeadline}>{ad.headline}</span>}
        <span className={styles.adStatus} data-status={ad.status}>
          {ad.status}
        </span>
      </div>
      {ad.description && (
        <p className={styles.adDescription}>{ad.description}</p>
      )}
      {ad.finalUrl && (
        <span className={styles.adUrl}>{ad.finalUrl}</span>
      )}
    </div>
  );
}

/**
 * KeywordItem Component - Renders a single keyword
 */
function KeywordItem({ keyword }: { keyword: Keyword }) {
  return (
    <div className={styles.keywordItem}>
      <span className={styles.keywordText}>{keyword.keyword}</span>
      <span className={styles.matchType}>{getMatchTypeFormat(keyword.matchType)}</span>
      <span className={styles.keywordStatus} data-status={keyword.status}>
        {keyword.status}
      </span>
    </div>
  );
}

/**
 * AdGroupItem Component - Renders an ad group with expandable ads/keywords
 */
function AdGroupItem({ adGroup }: { adGroup: AdGroup }) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = adGroup.ads.length > 0 || adGroup.keywords.length > 0;

  return (
    <div className={styles.adGroupItem} role="treeitem" aria-expanded={expanded}>
      <button
        className={styles.adGroupToggle}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        type="button"
      >
        <ChevronIcon expanded={expanded} />
        <span className={styles.adGroupName}>{adGroup.name}</span>
        <span className={styles.adGroupMeta}>
          {adGroup.ads.length} ad{adGroup.ads.length !== 1 ? "s" : ""}
          {adGroup.keywords.length > 0 && (
            <>, {adGroup.keywords.length} keyword{adGroup.keywords.length !== 1 ? "s" : ""}</>
          )}
        </span>
        <span className={styles.entityStatus} data-status={adGroup.status}>
          {adGroup.status}
        </span>
      </button>

      {expanded && (
        <div className={styles.adGroupContent}>
          {!hasContent ? (
            <p className={styles.emptyMessage}>No ads or keywords in this ad group</p>
          ) : (
            <>
              {adGroup.ads.length > 0 && (
                <div className={styles.adsSection}>
                  <h5 className={styles.sectionTitle}>Ads</h5>
                  <div className={styles.adsList}>
                    {adGroup.ads.map((ad) => (
                      <AdItem key={ad.id} ad={ad} />
                    ))}
                  </div>
                </div>
              )}
              {adGroup.keywords.length > 0 && (
                <div className={styles.keywordsSection}>
                  <h5 className={styles.sectionTitle}>Keywords</h5>
                  <div className={styles.keywordsList}>
                    {adGroup.keywords.map((keyword) => (
                      <KeywordItem key={keyword.id} keyword={keyword} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * CampaignItem Component - Renders a campaign with expandable ad groups
 */
function CampaignItem({ campaign }: { campaign: Campaign }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.campaignItem} role="treeitem" aria-expanded={expanded}>
      <button
        className={styles.campaignToggle}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        type="button"
      >
        <ChevronIcon expanded={expanded} />
        <span className={styles.campaignName}>{campaign.name}</span>
        <span className={styles.platformBadge} data-platform={campaign.platform}>
          {getPlatformDisplayName(campaign.platform)}
        </span>
        <span className={styles.campaignMeta}>
          {campaign.adGroups.length} ad group{campaign.adGroups.length !== 1 ? "s" : ""}
        </span>
        <StatusBadge status={campaign.status} size="sm" />
      </button>

      {expanded && (
        <div className={styles.campaignContent} role="group">
          {campaign.adGroups.length === 0 ? (
            <p className={styles.emptyMessage}>No ad groups in this campaign</p>
          ) : (
            <div className={styles.adGroupsList}>
              {campaign.adGroups.map((adGroup) => (
                <AdGroupItem key={adGroup.id} adGroup={adGroup} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * CampaignHierarchyView Component
 *
 * Displays an expandable tree view of campaigns, ad groups, ads, and keywords.
 * Used in the campaign set detail page to show the full hierarchy.
 */
export function CampaignHierarchyView({ campaigns }: CampaignHierarchyViewProps) {
  if (campaigns.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No campaigns in this set</p>
      </div>
    );
  }

  return (
    <div className={styles.hierarchy} role="tree" aria-label="Campaign hierarchy">
      {campaigns.map((campaign) => (
        <CampaignItem key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}
