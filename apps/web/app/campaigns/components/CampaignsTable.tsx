"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { GeneratedCampaign } from "../types";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { PlatformBadge } from "./PlatformBadge";
import { ErrorTooltip } from "./ErrorTooltip";
import { CampaignRowActions } from "./CampaignRowActions";
import styles from "./CampaignsTable.module.css";

interface CampaignsTableProps {
  campaigns: GeneratedCampaign[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onSync?: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onViewDiff?: (id: string) => void;
  onDelete?: (id: string) => void;
  syncingIds?: string[];
}

export function CampaignsTable({
  campaigns,
  selectedIds,
  onSelectionChange,
  onSync,
  onPause,
  onResume,
  onViewDiff,
  onDelete,
  syncingIds = [],
}: CampaignsTableProps) {
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const allSelected = campaigns.length > 0 && selectedIds.length === campaigns.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < campaigns.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(campaigns.map((c) => c.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
  };

  if (campaigns.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect
              x="8"
              y="8"
              width="32"
              height="32"
              rx="4"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <path
              d="M24 18V30M18 24H30"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h2>No campaigns found</h2>
        <p>Create a campaign set to see your campaigns here.</p>
        <Link href="/templates" className={styles.ctaButton}>
          Go to Templates
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.checkboxCell}>
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                aria-label="Select all campaigns"
              />
            </th>
            <th className={styles.expandCell}></th>
            <th>Name</th>
            <th>Platform</th>
            <th>Template</th>
            <th>Ad Count</th>
            <th>Status</th>
            <th>Last Synced</th>
            <th className={styles.actionsHeader}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => {
            const isExpanded = expandedIds.includes(campaign.id);
            const isSyncing = syncingIds.includes(campaign.id);
            const hasAdGroups = campaign.adGroups && campaign.adGroups.length > 0;

            return (
              <React.Fragment key={campaign.id}>
                <tr
                  className={`${selectedIds.includes(campaign.id) ? styles.selected : ""} ${campaign.paused ? styles.paused : ""}`}
                  data-status={campaign.status}
                >
                  <td className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(campaign.id)}
                      onChange={() => handleSelectRow(campaign.id)}
                      aria-label={`Select ${campaign.name}`}
                    />
                  </td>
                  <td className={styles.expandCell}>
                    {hasAdGroups && (
                      <button
                        type="button"
                        className={styles.expandButton}
                        onClick={() => handleToggleExpand(campaign.id)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Collapse ad groups" : "Expand ad groups"}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={isExpanded ? styles.expanded : ""}
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
                      </button>
                    )}
                  </td>
                  <td className={styles.nameCell}>
                    <span className={styles.name}>{campaign.name}</span>
                    {campaign.platformId && (
                      <span className={styles.platformId}>ID: {campaign.platformId}</span>
                    )}
                    {campaign.paused && (
                      <span className={styles.pausedBadge}>Paused</span>
                    )}
                  </td>
                  <td className={styles.platformCell}>
                    <PlatformBadge platform={campaign.platform} />
                  </td>
                  <td className={styles.templateCell}>
                    <span className={styles.templateName}>{campaign.templateName}</span>
                  </td>
                  <td className={styles.adCountCell}>
                    <span className={styles.adCount}>{campaign.adCount}</span>
                    <span className={styles.adCountLabel}>ads</span>
                  </td>
                  <td className={styles.statusCell}>
                    {campaign.status === "sync_error" && campaign.errorMessage ? (
                      <ErrorTooltip message={campaign.errorMessage}>
                        <SyncStatusBadge status={campaign.status} />
                      </ErrorTooltip>
                    ) : (
                      <SyncStatusBadge status={campaign.status} />
                    )}
                  </td>
                  <td className={styles.dateCell}>
                    {campaign.lastSyncedAt ? (
                      <>
                        <span className={styles.relativeTime}>
                          {formatRelativeTime(campaign.lastSyncedAt)}
                        </span>
                        <span className={styles.date}>
                          {formatDate(campaign.lastSyncedAt)}
                        </span>
                      </>
                    ) : (
                      <span className={styles.neverSynced}>Never synced</span>
                    )}
                  </td>
                  <td className={styles.actionsCell}>
                    <CampaignRowActions
                      campaign={campaign}
                      onSync={onSync || (() => {})}
                      onPause={onPause || (() => {})}
                      onResume={onResume || (() => {})}
                      onViewDiff={onViewDiff || (() => {})}
                      onDelete={onDelete || (() => {})}
                      isSyncing={isSyncing}
                    />
                  </td>
                </tr>
                {isExpanded && hasAdGroups && (
                  <tr key={`${campaign.id}-expanded`} className={styles.expandedRow}>
                    <td colSpan={9}>
                      <div className={styles.adGroupsContainer}>
                        <div className={styles.adGroupsHeader}>Ad Groups</div>
                        <div className={styles.adGroupsList}>
                          {campaign.adGroups?.map((adGroup) => (
                            <div key={adGroup.id} className={styles.adGroupItem}>
                              <span className={styles.adGroupName}>{adGroup.name}</span>
                              <span className={styles.adGroupCount}>
                                {adGroup.adCount} {adGroup.adCount === 1 ? "ad" : "ads"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
