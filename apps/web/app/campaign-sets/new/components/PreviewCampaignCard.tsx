"use client";

import type { PreviewCampaign, Platform } from "../types";
import styles from "../GenerateWizard.module.css";

export interface PreviewCampaignCardProps {
  campaign: PreviewCampaign;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

function getPlatformBadgeClass(platform: Platform): string {
  const badgeBase = styles.badge ?? "";
  switch (platform) {
    case "reddit":
      return `${badgeBase} ${styles.badgeReddit ?? ""}`;
    case "google":
      return `${badgeBase} ${styles.badgeGoogle ?? ""}`;
    case "facebook":
      return `${badgeBase} ${styles.badgeFacebook ?? ""}`;
    default:
      return badgeBase;
  }
}

function formatBudget(budget: PreviewCampaign["budget"]): string {
  if (!budget) return "";
  const amount = budget.amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${budget.currency} ${amount}/${budget.type}`;
}

export function PreviewCampaignCard({
  campaign,
  isExpanded = false,
  onToggleExpand,
}: PreviewCampaignCardProps) {
  const totalAdGroups = campaign.adGroups.length;
  const totalAds = campaign.adGroups.reduce((sum, ag) => sum + ag.ads.length, 0);

  return (
    <div className={styles.previewCard} data-testid={`preview-card-${campaign.sourceRowId}`}>
      <button
        type="button"
        className={styles.previewCardHeader}
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        data-testid={`preview-card-header-${campaign.sourceRowId}`}
      >
        <div>
          <div className={styles.previewCardTitle}>{campaign.name}</div>
          <div className={styles.previewCardMeta}>
            <span className={getPlatformBadgeClass(campaign.platform)}>
              {campaign.platform}
            </span>
            {campaign.objective && <span>{campaign.objective}</span>}
            {campaign.budget && <span>{formatBudget(campaign.budget)}</span>}
          </div>
        </div>
        <div className={styles.previewCardMeta}>
          <span data-testid="adgroup-count">{totalAdGroups} ad group{totalAdGroups !== 1 ? "s" : ""}</span>
          <span data-testid="ad-count">{totalAds} ad{totalAds !== 1 ? "s" : ""}</span>
          <span
            className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ""}`}
            aria-hidden="true"
          >
            &#9660;
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className={styles.previewCardBody} data-testid={`preview-card-body-${campaign.sourceRowId}`}>
          {(campaign.tags?.length || campaign.groups?.length) && (
            <div className={styles.previewCardMeta} style={{ marginBottom: "12px" }}>
              {campaign.groups?.map((group) => (
                <span key={group} className={styles.badge}>
                  {group}
                </span>
              ))}
              {campaign.tags?.map((tag) => (
                <span key={tag} className={styles.badge} style={{ opacity: 0.7 }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {campaign.adGroups.map((adGroup, agIndex) => (
            <div key={`${campaign.sourceRowId}-ag-${agIndex}`} className={styles.adGroupSection}>
              <div className={styles.adGroupTitle}>{adGroup.name}</div>
              {adGroup.ads.map((ad, adIndex) => (
                <div key={`${campaign.sourceRowId}-ag-${agIndex}-ad-${adIndex}`} className={styles.adItem}>
                  {ad.headline && (
                    <div className={styles.adHeadline}>{ad.headline}</div>
                  )}
                  {ad.description && (
                    <div className={styles.adDescription}>{ad.description}</div>
                  )}
                  {ad.callToAction && (
                    <div className={styles.adDescription}>CTA: {ad.callToAction}</div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
