"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { DataSourceRow, ColumnMapping } from "../types";
import styles from "./DataPreviewEnhanced.module.css";

interface DataPreviewEnhancedProps {
  columns: string[];
  data: DataSourceRow[];
  columnMappings: ColumnMapping[];
  maxHeight?: number;
  highlightRow?: number | null;
  onClearHighlight?: () => void;
}

const ROW_HEIGHT = 40;
const OVERSCAN = 5;

const DATA_TYPE_LABELS: Record<string, string> = {
  string: "String",
  number: "Number",
  date: "Date",
  url: "URL",
  currency: "Currency",
};

export function DataPreviewEnhanced({
  columns,
  data,
  columnMappings,
  maxHeight = 500,
  highlightRow,
  onClearHighlight,
}: DataPreviewEnhancedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(maxHeight);
  const [searchTerm, setSearchTerm] = useState("");

  // Create column type lookup
  const columnTypes = useMemo(() => {
    const types: Record<string, string> = {};
    columnMappings.forEach((mapping) => {
      types[mapping.sourceColumn] = mapping.dataType;
    });
    return types;
  }, [columnMappings]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;

    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const value = row[col];
        return value != null && String(value).toLowerCase().includes(term);
      })
    );
  }, [data, columns, searchTerm]);

  // Scroll to highlighted row
  useEffect(() => {
    if (highlightRow != null && containerRef.current) {
      const rowIndex = highlightRow - 1; // Convert 1-based to 0-based
      const scrollPosition = rowIndex * ROW_HEIGHT;
      containerRef.current.scrollTop = scrollPosition - containerHeight / 2 + ROW_HEIGHT;
    }
  }, [highlightRow, containerHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height || maxHeight;
      setContainerHeight(Math.min(height, maxHeight));
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [maxHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const totalHeight = filteredData.length * ROW_HEIGHT;
  const visibleRowCount = Math.ceil(containerHeight / ROW_HEIGHT);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    filteredData.length,
    startIndex + visibleRowCount + OVERSCAN * 2
  );

  const visibleData = filteredData.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No data to preview</p>
      </div>
    );
  }

  const isFiltered = searchTerm.trim().length > 0;
  const hasHighlight = highlightRow != null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Data Preview</h3>
          <span className={styles.rowCount}>
            {isFiltered ? (
              <>
                {filteredData.length} of {data.length} rows
              </>
            ) : (
              <>{data.length.toLocaleString()} rows</>
            )}
          </span>
        </div>

        <div className={styles.headerRight}>
          {hasHighlight && (
            <div className={styles.highlightIndicator}>
              <span>Showing row {highlightRow}</span>
              <button
                onClick={onClearHighlight}
                className={styles.clearHighlightButton}
                aria-label="Clear highlight"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          )}

          <div className={styles.searchWrapper}>
            <svg
              className={styles.searchIcon}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M14 14L10.5 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search data..."
              className={styles.searchInput}
              aria-label="Search data"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className={styles.clearSearchButton}
                aria-label="Clear search"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className={styles.scrollContainer}
        style={{ maxHeight }}
        onScroll={handleScroll}
      >
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.rowNumber} role="columnheader">#</th>
              {columns.map((col) => {
                const dataType = columnTypes[col] || "string";
                return (
                  <th key={col} role="columnheader" aria-label={`${col} ${dataType}`}>
                    <div className={styles.columnHeader}>
                      <span className={styles.columnName}>{col}</span>
                      <span className={`${styles.dataTypeBadge} ${styles[dataType]}`}>
                        {DATA_TYPE_LABELS[dataType] || dataType}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
        </table>

        {filteredData.length === 0 ? (
          <div className={styles.noResults}>
            <p>No results found for &quot;{searchTerm}&quot;</p>
          </div>
        ) : (
          <div
            className={styles.virtualScroller}
            style={{ height: totalHeight }}
          >
            <table
              className={styles.table}
              style={{
                position: "absolute",
                top: offsetY,
                width: "100%",
              }}
            >
              <tbody>
                {visibleData.map((row, idx) => {
                  const actualIndex = startIndex + idx;
                  const originalRowNumber = data.indexOf(row) + 1;
                  const isHighlighted = highlightRow === originalRowNumber;

                  return (
                    <tr
                      key={actualIndex}
                      style={{ height: ROW_HEIGHT }}
                      className={isHighlighted ? styles.highlightedRow : ""}
                    >
                      <td className={styles.rowNumber}>{originalRowNumber}</td>
                      {columns.map((col) => (
                        <td key={col} title={String(row[col] ?? "")}>
                          {row[col] ?? ""}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
