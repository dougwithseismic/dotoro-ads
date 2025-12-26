"use client";

import type { CampaignSetSummary, Platform } from "../types";
import { StatusBadge } from "./StatusBadge";
import styles from "./CampaignSetCard.module.css";

interface CampaignSetCardProps {
  /** The campaign set summary data */
  set: CampaignSetSummary;
  /** Click handler for card interaction */
  onClick: () => void;
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
 * Format a date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * CampaignSetCard Component
 *
 * Displays a summary card for a campaign set in the listing view.
 * Shows key metrics, status, and platforms.
 */
export function CampaignSetCard({ set, onClick }: CampaignSetCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      className={styles.card}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="article"
      aria-label={`${set.name} campaign set`}
      tabIndex={0}
      style={{ cursor: "pointer" }}
    >
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.name}>{set.name}</h3>
          <StatusBadge status={set.status} size="sm" />
        </div>
        {set.description && (
          <p className={styles.description}>{set.description}</p>
        )}
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {set.campaignCount.toLocaleString()}
          </span>
          <span className={styles.statLabel}>Campaigns</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {set.adGroupCount.toLocaleString()}
          </span>
          <span className={styles.statLabel}>Ad Groups</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {set.adCount.toLocaleString()}
          </span>
          <span className={styles.statLabel}>Ads</span>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.platforms}>
          {set.platforms.map((platform) => (
            <span key={platform} className={styles.platform} data-platform={platform}>
              {getPlatformDisplayName(platform)}
            </span>
          ))}
        </div>
        <span className={styles.date}>{formatDate(set.createdAt)}</span>
      </div>
    </article>
  );
}
