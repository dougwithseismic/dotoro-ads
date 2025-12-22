"use client";

import Link from "next/link";
import type { DataSource, SortDirection } from "../types";
import styles from "./DataSourcesTable.module.css";

type SortableColumn = "name" | "updatedAt";

interface DataSourcesTableProps {
  dataSources: DataSource[];
  onRowClick: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateTransform?: (id: string) => void;
  sortColumn?: SortableColumn;
  sortDirection?: SortDirection;
  onSort?: (column: SortableColumn) => void;
}

/**
 * Check if a data source is virtual (created by a transform)
 */
function isVirtualSource(ds: DataSource): boolean {
  return ds.config?.isVirtual === true;
}

const STATUS_LABELS: Record<DataSource["status"], string> = {
  ready: "Ready",
  processing: "Processing",
  error: "Error",
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
  sortColumn,
  sortDirection,
  onSort,
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
                  <span className={`${styles.typeBadge} ${styles[ds.type]} ${isVirtual ? styles.virtual : ""}`}>
                    {isVirtual ? "VIRTUAL" : ds.type.toUpperCase()}
                  </span>
                </td>
                <td className={styles.rowCountCell}>
                  {formatRowCount(ds.rowCount)}
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
