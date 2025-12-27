"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { DataSource, SortDirection, SyncStatus, SyncFrequency } from "../types";
import { SyncButton, type SyncButtonStatus } from "./SyncButton";
import styles from "./DataSourcesTable.module.css";

type SortableColumn = "name" | "updatedAt";

interface DataSourcesTableProps {
  dataSources: DataSource[];
  onRowClick: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateTransform?: (id: string) => void;
  onSync?: (id: string) => Promise<void>;
  sortColumn?: SortableColumn;
  sortDirection?: SortDirection;
  onSort?: (column: SortableColumn) => void;
  /** Map of data source IDs to their current sync button status (for optimistic UI) */
  syncButtonStatuses?: Record<string, SyncButtonStatus>;
}

/**
 * Check if a data source is virtual (created by a transform)
 */
function isVirtualSource(ds: DataSource): boolean {
  return ds.config?.isVirtual === true;
}

/**
 * Check if a data source type supports syncing
 */
function isSyncableType(type: DataSource["type"]): boolean {
  return type === "api" || type === "google-sheets";
}

const STATUS_LABELS: Record<DataSource["status"], string> = {
  ready: "Ready",
  processing: "Processing",
  error: "Error",
};

const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  synced: "Synced",
  syncing: "Syncing",
  error: "Error",
  success: "Success",
};

const SYNC_FREQUENCY_LABELS: Record<SyncFrequency, string> = {
  manual: "Manual",
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  "1h": "Every 1h",
  "6h": "Every 6h",
  "24h": "Every 24h",
  "7d": "Every 7d",
};

const TYPE_LABELS: Record<DataSource["type"], string> = {
  csv: "CSV",
  api: "API",
  manual: "MANUAL",
  "google-sheets": "Sheets",
};

function formatRowCount(count: number | undefined): string {
  return count?.toLocaleString() ?? "0";
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format the last synced time as a relative timestamp
 */
function formatLastSynced(date: Date | undefined): string {
  if (!date) {
    return "Never";
  }
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Format sync frequency for display
 */
function formatSyncFrequency(
  frequency: SyncFrequency | undefined,
  type: DataSource["type"]
): string {
  // CSV sources don't have sync frequency
  if (!isSyncableType(type)) {
    return "--";
  }
  if (!frequency) {
    return "--";
  }
  return SYNC_FREQUENCY_LABELS[frequency];
}

/**
 * Get the sync button status from sync status
 */
function getSyncButtonStatus(
  syncStatus: SyncStatus | undefined,
  overrideStatus?: SyncButtonStatus
): SyncButtonStatus {
  if (overrideStatus) {
    return overrideStatus;
  }
  if (!syncStatus) {
    return "idle";
  }
  switch (syncStatus) {
    case "synced":
    case "success":
      return "idle"; // Synced sources can be synced again
    case "syncing":
      return "syncing";
    case "error":
      return "error";
    default:
      return "idle";
  }
}

function SortIcon({ direction }: { direction?: SortDirection }) {
  if (!direction) {
    return (
      <svg
        className={styles.sortIcon}
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 2L9 5H3L6 2ZM6 10L3 7H9L6 10Z"
          fill="currentColor"
          opacity="0.3"
        />
      </svg>
    );
  }
  return (
    <svg
      className={styles.sortIcon}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      {direction === "asc" ? (
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
      ) : (
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      )}
    </svg>
  );
}

export function DataSourcesTable({
  dataSources,
  onRowClick,
  onDelete,
  onCreateTransform,
  onSync,
  sortColumn,
  sortDirection,
  onSort,
  syncButtonStatuses = {},
}: DataSourcesTableProps) {
  const getAriaSort = (
    column: SortableColumn
  ): "ascending" | "descending" | "none" | undefined => {
    if (!onSort) return undefined;
    if (sortColumn !== column) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  };

  const handleSort = (column: SortableColumn) => {
    if (onSort) {
      onSort(column);
    }
  };

  if (dataSources.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No data sources found. Upload a CSV file to get started.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th
              className={onSort ? styles.sortable : undefined}
              aria-sort={getAriaSort("name")}
              onClick={() => handleSort("name")}
              role="columnheader"
            >
              <span className={styles.headerContent}>
                Name
                {onSort && (
                  <SortIcon
                    direction={sortColumn === "name" ? sortDirection : undefined}
                  />
                )}
              </span>
            </th>
            <th role="columnheader">Type</th>
            <th role="columnheader">Rows</th>
            <th role="columnheader">Last Synced</th>
            <th role="columnheader">Sync Status</th>
            <th role="columnheader">Sync Freq</th>
            <th role="columnheader">Status</th>
            <th
              className={onSort ? styles.sortable : undefined}
              aria-sort={getAriaSort("updatedAt")}
              onClick={() => handleSort("updatedAt")}
              role="columnheader"
            >
              <span className={styles.headerContent}>
                Last Updated
                {onSort && (
                  <SortIcon
                    direction={sortColumn === "updatedAt" ? sortDirection : undefined}
                  />
                )}
              </span>
            </th>
            <th className={styles.actionsHeader} role="columnheader">Actions</th>
          </tr>
        </thead>
        <tbody>
          {dataSources.map((ds) => {
            const isVirtual = isVirtualSource(ds);
            const canSync = isSyncableType(ds.type) && !isVirtual;
            const syncButtonStatus = getSyncButtonStatus(
              ds.syncStatus,
              syncButtonStatuses[ds.id]
            );

            return (
              <tr
                key={ds.id}
                onClick={() => onRowClick(ds.id)}
                className={styles.row}
              >
                <td className={styles.nameCell}>
                  <span className={styles.nameContent}>
                    {ds.name}
                    {isVirtual && (
                      <span className={styles.virtualBadge} title="Created by a transform">
                        Virtual
                      </span>
                    )}
                  </span>
                </td>
                <td>
                  <span className={`${styles.typeBadge} ${styles[ds.type.replace("-", "")]} ${isVirtual ? styles.virtual : ""}`}>
                    {isVirtual ? "VIRTUAL" : TYPE_LABELS[ds.type]}
                  </span>
                </td>
                <td className={styles.rowCountCell}>
                  {formatRowCount(ds.rowCount)}
                </td>
                <td className={styles.lastSyncedCell}>
                  {canSync ? formatLastSynced(ds.lastSyncedAt) : "--"}
                </td>
                <td>
                  {canSync && ds.syncStatus ? (
                    <span
                      className={`${styles.syncStatusBadge} ${styles[`syncStatus-${ds.syncStatus}`]}`}
                    >
                      {SYNC_STATUS_LABELS[ds.syncStatus]}
                    </span>
                  ) : (
                    <span className={styles.noSync}>--</span>
                  )}
                </td>
                <td className={styles.syncFreqCell}>
                  {formatSyncFrequency(ds.syncFrequency, ds.type)}
                </td>
                <td>
                  <span
                    className={`${styles.statusBadge} ${styles[`status-${ds.status}`]}`}
                  >
                    {STATUS_LABELS[ds.status]}
                  </span>
                </td>
                <td className={styles.dateCell}>{formatDate(ds.updatedAt)}</td>
                <td className={styles.actionsCell}>
                  {canSync && onSync && (
                    <SyncButton
                      status={syncButtonStatus}
                      dataSourceType={ds.type as "api" | "google-sheets"}
                      onSync={async () => {
                        await onSync(ds.id);
                      }}
                    />
                  )}
                  {!isVirtual && (
                    <Link
                      href={`/transforms/builder?sourceId=${ds.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={styles.transformButton}
                      aria-label={`Create transform from ${ds.name}`}
                    >
                      Transform
                    </Link>
                  )}
                  {isVirtual && ds.config?.sourceDataSourceId && (
                    <Link
                      href={`/transforms?outputId=${ds.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={styles.viewTransformButton}
                      aria-label={`View transform for ${ds.name}`}
                    >
                      View Transform
                    </Link>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(ds.id);
                    }}
                    className={styles.deleteButton}
                    aria-label={`Delete ${ds.name}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
