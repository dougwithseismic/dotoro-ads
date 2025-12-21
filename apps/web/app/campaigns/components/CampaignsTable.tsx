"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import type { GeneratedCampaign } from "../types";
import { SyncStatusBadge } from "./SyncStatusBadge";
import styles from "./CampaignsTable.module.css";

interface CampaignsTableProps {
  campaigns: GeneratedCampaign[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function CampaignsTable({
  campaigns,
  selectedIds,
  onSelectionChange,
}: CampaignsTableProps) {
  const selectAllRef = useRef<HTMLInputElement>(null);

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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
        <p>Generate campaigns from your templates to see them here.</p>
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
            <th>Name</th>
            <th>Template</th>
            <th>Status</th>
            <th>Created</th>
            <th className={styles.actionsHeader}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr
              key={campaign.id}
              className={selectedIds.includes(campaign.id) ? styles.selected : ""}
              title={campaign.errorMessage || undefined}
            >
              <td className={styles.checkboxCell}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(campaign.id)}
                  onChange={() => handleSelectRow(campaign.id)}
                  aria-label={`Select ${campaign.name}`}
                />
              </td>
              <td className={styles.nameCell}>
                <span className={styles.name}>{campaign.name}</span>
                {campaign.platformId && (
                  <span className={styles.platformId}>ID: {campaign.platformId}</span>
                )}
              </td>
              <td className={styles.templateCell}>
                <span className={styles.templateName}>{campaign.templateName}</span>
              </td>
              <td className={styles.statusCell}>
                <SyncStatusBadge status={campaign.status} />
              </td>
              <td className={styles.dateCell}>
                <span className={styles.date}>{formatDate(campaign.createdAt)}</span>
                {campaign.lastSyncedAt && (
                  <span className={styles.syncDate}>
                    Synced: {formatDate(campaign.lastSyncedAt)}
                  </span>
                )}
              </td>
              <td className={styles.actionsCell}>
                <Link href={`/campaigns/${campaign.id}`} className={styles.viewLink}>
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
