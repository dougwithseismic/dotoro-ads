"use client";

import Link from "next/link";
import type { CampaignSetSummary, Platform } from "../types";
import { StatusBadge } from "./StatusBadge";
import styles from "./CampaignSetsTable.module.css";

interface CampaignSetsTableProps {
  campaignSets: CampaignSetSummary[];
  onRowClick: (id: string) => void;
  onDelete?: (id: string) => void;
}

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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CampaignSetsTable({
  campaignSets,
  onRowClick,
  onDelete,
}: CampaignSetsTableProps) {
  if (campaignSets.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No campaign sets found.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th role="columnheader">Name</th>
            <th role="columnheader">Status</th>
            <th role="columnheader">Campaigns</th>
            <th role="columnheader">Ad Groups</th>
            <th role="columnheader">Ads</th>
            <th role="columnheader">Platforms</th>
            <th role="columnheader">Created</th>
            <th className={styles.actionsHeader} role="columnheader">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {campaignSets.map((set) => (
            <tr
              key={set.id}
              onClick={() => onRowClick(set.id)}
              className={styles.row}
            >
              <td className={styles.nameCell}>
                <span className={styles.nameContent}>
                  <span className={styles.name}>{set.name}</span>
                  {set.description && (
                    <span className={styles.description}>{set.description}</span>
                  )}
                </span>
              </td>
              <td>
                <StatusBadge status={set.status} size="sm" />
              </td>
              <td className={styles.countCell}>
                {set.campaignCount.toLocaleString()}
              </td>
              <td className={styles.countCell}>
                {set.adGroupCount.toLocaleString()}
              </td>
              <td className={styles.countCell}>
                {set.adCount.toLocaleString()}
              </td>
              <td className={styles.platformsCell}>
                <div className={styles.platforms}>
                  {set.platforms.slice(0, 3).map((platform) => (
                    <span
                      key={platform}
                      className={styles.platformBadge}
                      data-platform={platform}
                    >
                      {getPlatformDisplayName(platform)}
                    </span>
                  ))}
                  {set.platforms.length > 3 && (
                    <span className={styles.platformMore}>
                      +{set.platforms.length - 3}
                    </span>
                  )}
                </div>
              </td>
              <td className={styles.dateCell}>{formatDate(set.createdAt)}</td>
              <td className={styles.actionsCell}>
                <Link
                  href={`/campaign-sets/${set.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className={styles.viewButton}
                  aria-label={`View ${set.name}`}
                >
                  View
                </Link>
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(set.id);
                    }}
                    className={styles.deleteButton}
                    aria-label={`Delete ${set.name}`}
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
