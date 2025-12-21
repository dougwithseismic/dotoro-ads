"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { DataSourceRow } from "../types";
import styles from "./DataPreview.module.css";

interface DataPreviewProps {
  columns: string[];
  data: DataSourceRow[];
  maxHeight?: number;
}

const ROW_HEIGHT = 40;
const OVERSCAN = 5;

export function DataPreview({
  columns,
  data,
  maxHeight = 500,
}: DataPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(maxHeight);

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

  const totalHeight = data.length * ROW_HEIGHT;
  const visibleRowCount = Math.ceil(containerHeight / ROW_HEIGHT);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    data.length,
    startIndex + visibleRowCount + OVERSCAN * 2
  );

  const visibleData = data.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No data to preview</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Data Preview</h3>
        <span className={styles.rowCount}>
          {data.length.toLocaleString()} rows
        </span>
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
              <th className={styles.rowNumber}>#</th>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
        </table>

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
                return (
                  <tr key={actualIndex} style={{ height: ROW_HEIGHT }}>
                    <td className={styles.rowNumber}>{actualIndex + 1}</td>
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
      </div>
    </div>
  );
}
