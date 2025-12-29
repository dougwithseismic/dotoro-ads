'use client';

import { useCallback, useMemo, useState } from 'react';
import type { CarouselPlatformConstraints } from '@repo/core';
import styles from './DataRowSelector.module.css';

export interface DataRow {
  /** Unique identifier for the row */
  id: string;
  /** Row data as key-value pairs */
  data: Record<string, string | number | null>;
}

export interface DataRowSelectorProps {
  /** Available data rows */
  rows: DataRow[];
  /** Currently selected row IDs */
  selectedRowIds: string[];
  /** Callback when selection changes */
  onSelectionChange: (selectedIds: string[]) => void;
  /** Platform constraints for max card limit */
  constraints: CarouselPlatformConstraints;
  /** Columns to display in preview (first 3 by default) */
  previewColumns?: string[];
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * DataRowSelector - Select data source rows for data-driven carousel
 *
 * Displays a checkbox list of available data rows with preview of
 * first variable values. Enforces platform max card limit.
 */
export function DataRowSelector({
  rows,
  selectedRowIds,
  onSelectionChange,
  constraints,
  previewColumns,
  title = 'Select Data Rows',
  description = 'Each selected row will generate one carousel card.',
  disabled = false,
}: DataRowSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Determine which columns to show in preview
  const displayColumns = useMemo(() => {
    if (previewColumns && previewColumns.length > 0) {
      return previewColumns;
    }
    const firstRow = rows[0];
    if (rows.length > 0 && firstRow) {
      return Object.keys(firstRow.data).slice(0, 3);
    }
    return [];
  }, [rows, previewColumns]);

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) {
      return rows;
    }
    const query = searchQuery.toLowerCase();
    return rows.filter((row) =>
      Object.values(row.data).some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      )
    );
  }, [rows, searchQuery]);

  const selectedCount = selectedRowIds.length;
  const maxCards = constraints.maxCards;
  const canSelectMore = selectedCount < maxCards;

  const handleToggleRow = useCallback(
    (rowId: string) => {
      if (disabled) return;

      const isSelected = selectedRowIds.includes(rowId);
      if (isSelected) {
        onSelectionChange(selectedRowIds.filter((id) => id !== rowId));
      } else if (canSelectMore) {
        onSelectionChange([...selectedRowIds, rowId]);
      }
    },
    [selectedRowIds, onSelectionChange, canSelectMore, disabled]
  );

  const handleSelectAll = useCallback(() => {
    if (disabled) return;

    const allSelected = filteredRows.every((row) =>
      selectedRowIds.includes(row.id)
    );
    if (allSelected) {
      // Deselect all filtered rows
      onSelectionChange(
        selectedRowIds.filter(
          (id) => !filteredRows.some((row) => row.id === id)
        )
      );
    } else {
      // Select all filtered rows up to max limit
      const availableSlots = maxCards - selectedCount;
      const toSelect = filteredRows
        .filter((row) => !selectedRowIds.includes(row.id))
        .slice(0, availableSlots)
        .map((row) => row.id);
      onSelectionChange([...selectedRowIds, ...toSelect]);
    }
  }, [filteredRows, selectedRowIds, onSelectionChange, maxCards, selectedCount, disabled]);

  const allFilteredSelected = filteredRows.every((row) =>
    selectedRowIds.includes(row.id)
  );
  const someFilteredSelected = filteredRows.some((row) =>
    selectedRowIds.includes(row.id)
  );

  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>
        </div>
        <div className={styles.counter}>
          <span className={selectedCount > 0 ? styles.counterActive : ''}>
            {selectedCount}
          </span>
          /{maxCards}
        </div>
      </div>

      <div className={styles.search}>
        <SearchIcon />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search rows..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCell}>
                <input
                  type="checkbox"
                  checked={allFilteredSelected && filteredRows.length > 0}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = someFilteredSelected && !allFilteredSelected;
                    }
                  }}
                  onChange={handleSelectAll}
                  disabled={disabled || filteredRows.length === 0}
                  aria-label="Select all rows"
                />
              </th>
              {displayColumns.map((col) => (
                <th key={col} className={styles.columnHeader}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={displayColumns.length + 1}
                  className={styles.emptyState}
                >
                  {searchQuery ? 'No matching rows found' : 'No data available'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const isSelected = selectedRowIds.includes(row.id);
                const isDisabledRow = !isSelected && !canSelectMore;

                return (
                  <tr
                    key={row.id}
                    className={`${styles.row} ${isSelected ? styles.selected : ''} ${isDisabledRow ? styles.disabledRow : ''}`}
                    onClick={() => !isDisabledRow && handleToggleRow(row.id)}
                  >
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRow(row.id)}
                        disabled={disabled || isDisabledRow}
                        aria-label={`Select row ${row.id}`}
                      />
                    </td>
                    {displayColumns.map((col) => (
                      <td key={col} className={styles.cell}>
                        {formatCellValue(row.data[col])}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!canSelectMore && selectedCount > 0 && (
        <p className={styles.limitWarning}>
          Maximum {maxCards} cards reached. Deselect a row to add more.
        </p>
      )}
    </div>
  );
}

function formatCellValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }
  const str = String(value);
  if (str.length > 40) {
    return str.substring(0, 40) + '...';
  }
  return str;
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={styles.searchIcon}
    >
      <circle
        cx="7"
        cy="7"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10.5 10.5L14 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default DataRowSelector;
