"use client";

import Link from "next/link";
import type { Transform } from "../types";
import styles from "./TransformsTable.module.css";

type SortableColumn = "name" | "updatedAt";
type SortDirection = "asc" | "desc";

interface TransformsTableProps {
  transforms: Transform[];
  onRowClick: (id: string) => void;
  onDelete: (id: string) => void;
  onExecute: (id: string) => void;
  onToggleEnabled: (transform: Transform) => void;
  executingId: string | null;
  deleteConfirmId: string | null;
  onDeleteConfirm: (id: string | null) => void;
  sortColumn?: SortableColumn;
  sortDirection?: SortDirection;
  onSort?: (column: SortableColumn) => void;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getGroupByDisplay(groupBy: string | string[]): string {
  if (Array.isArray(groupBy)) {
    return groupBy.join(", ");
  }
  return groupBy;
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

export function TransformsTable({
  transforms,
  onRowClick,
  onDelete,
  onExecute,
  onToggleEnabled,
  executingId,
  deleteConfirmId,
  onDeleteConfirm,
  sortColumn,
  sortDirection,
  onSort,
}: TransformsTableProps) {
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

  if (transforms.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No transforms found.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th role="columnheader" className={styles.statusHeader}>
              Status
            </th>
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
            <th role="columnheader">Group By</th>
            <th role="columnheader">Aggregations</th>
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
            <th className={styles.actionsHeader} role="columnheader">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {transforms.map((transform) => (
            <tr
              key={transform.id}
              onClick={() => onRowClick(transform.id)}
              className={styles.row}
            >
              <td className={styles.statusCell}>
                <button
                  className={`${styles.toggleButton} ${transform.enabled ? styles.toggleEnabled : styles.toggleDisabled}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleEnabled(transform);
                  }}
                  title={transform.enabled ? "Disable transform" : "Enable transform"}
                  aria-label={transform.enabled ? "Disable transform" : "Enable transform"}
                >
                  <span className={styles.toggleKnob} />
                </button>
              </td>
              <td className={styles.nameCell}>
                <span className={styles.nameContent}>
                  <span className={styles.transformName}>{transform.name}</span>
                  {transform.description && (
                    <span className={styles.transformDescription}>
                      {transform.description}
                    </span>
                  )}
                </span>
              </td>
              <td className={styles.groupByCell}>
                <span className={styles.groupByBadge}>
                  {getGroupByDisplay(transform.config.groupBy)}
                </span>
              </td>
              <td className={styles.aggregationsCell}>
                <span className={styles.countBadge}>
                  {transform.config.aggregations.length}
                </span>
              </td>
              <td className={styles.dateCell}>{formatDate(transform.updatedAt)}</td>
              <td className={styles.actionsCell}>
                <Link
                  href={`/transforms/builder/${transform.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className={styles.editButton}
                  aria-label={`Edit ${transform.name}`}
                >
                  Edit
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExecute(transform.id);
                  }}
                  className={styles.executeButton}
                  disabled={executingId === transform.id}
                  aria-label={`Execute ${transform.name}`}
                >
                  {executingId === transform.id ? "Running..." : "Execute"}
                </button>
                {deleteConfirmId === transform.id ? (
                  <span className={styles.deleteConfirm}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(transform.id);
                      }}
                      className={styles.deleteConfirmYes}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConfirm(null);
                      }}
                      className={styles.deleteConfirmNo}
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConfirm(transform.id);
                    }}
                    className={styles.deleteButton}
                    aria-label={`Delete ${transform.name}`}
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
