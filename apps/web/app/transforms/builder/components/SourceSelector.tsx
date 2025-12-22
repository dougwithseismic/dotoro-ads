"use client";

import { useMemo } from "react";
import styles from "./SourceSelector.module.css";
import type { DataSource } from "../../types";

interface SourceSelectorProps {
  dataSources: DataSource[];
  selectedId: string | null;
  onChange: (id: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function SourceSelector({
  dataSources,
  selectedId,
  onChange,
  loading = false,
  error = null,
}: SourceSelectorProps) {
  const selectedSource = useMemo(() => {
    return dataSources.find((ds) => ds.id === selectedId);
  }, [dataSources, selectedId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading data sources...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <label htmlFor="source-selector" className={styles.label}>
        Source Data Source *
      </label>
      <select
        id="source-selector"
        className={styles.select}
        value={selectedId || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select a data source...</option>
        {dataSources.map((ds) => (
          <option key={ds.id} value={ds.id}>
            {ds.name} ({ds.rowCount.toLocaleString()} rows)
          </option>
        ))}
      </select>

      {selectedSource && (
        <div className={styles.schemaPreview}>
          <h4 className={styles.schemaTitle}>Schema Preview</h4>
          <div className={styles.schemaInfo}>
            <div className={styles.schemaRow}>
              <span className={styles.schemaLabel}>Type:</span>
              <span className={styles.schemaValue}>{selectedSource.type}</span>
            </div>
            <div className={styles.schemaRow}>
              <span className={styles.schemaLabel}>Rows:</span>
              <span className={styles.schemaValue}>
                {selectedSource.rowCount.toLocaleString()}
              </span>
            </div>
            <div className={styles.schemaRow}>
              <span className={styles.schemaLabel}>Status:</span>
              <span
                className={`${styles.schemaValue} ${styles[`status${selectedSource.status.charAt(0).toUpperCase() + selectedSource.status.slice(1)}`]}`}
              >
                {selectedSource.status}
              </span>
            </div>
          </div>
          {selectedSource.columns && selectedSource.columns.length > 0 && (
            <div className={styles.columns}>
              <span className={styles.columnsLabel}>Columns:</span>
              <div className={styles.columnsList}>
                {selectedSource.columns.map((col) => (
                  <span key={col} className={styles.columnTag}>
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
