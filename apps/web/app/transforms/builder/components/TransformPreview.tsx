"use client";

import styles from "./TransformPreview.module.css";
import type { PreviewResponse, TransformWarning } from "../../types";

interface TransformPreviewProps {
  preview: PreviewResponse | null;
  loading: boolean;
  error: string | null;
}

export function TransformPreview({
  preview,
  loading,
  error,
}: TransformPreviewProps) {
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Preview</h3>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Generating preview...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Preview</h3>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Preview</h3>
        </div>
        <div className={styles.empty}>
          <p>Configure your transform to see a preview</p>
        </div>
      </div>
    );
  }

  const firstRow = preview.rows[0];
  const columns = firstRow ? Object.keys(firstRow) : [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Preview</h3>
        <div className={styles.stats}>
          <span className={styles.stat}>
            {preview.sourceRowCount.toLocaleString()} source rows
          </span>
          <span className={styles.statArrow}>-&gt;</span>
          <span className={styles.stat}>
            {preview.groupCount.toLocaleString()} groups
          </span>
        </div>
      </div>

      {preview.warnings.length > 0 && (
        <div className={styles.warnings}>
          {preview.warnings.map((warning: TransformWarning, index: number) => (
            <div key={index} className={styles.warning}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 5V8M8 11H8.01M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      )}

      {preview.rows.length === 0 ? (
        <div className={styles.noData}>
          <p>No data to display</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((col) => (
                    <td key={col}>
                      <CellValue value={row[col]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.footerNote}>
          Showing {preview.rows.length} of {preview.groupCount} groups
        </span>
      </div>
    </div>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className={styles.nullValue}>null</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className={styles.emptyArray}>[]</span>;
    }
    return (
      <span className={styles.arrayValue} title={JSON.stringify(value)}>
        [{value.length} items]
      </span>
    );
  }

  if (typeof value === "object") {
    return (
      <span className={styles.objectValue} title={JSON.stringify(value)}>
        {"{...}"}
      </span>
    );
  }

  if (typeof value === "number") {
    return (
      <span className={styles.numberValue}>
        {Number.isInteger(value) ? value : value.toFixed(2)}
      </span>
    );
  }

  if (typeof value === "boolean") {
    return (
      <span className={styles.booleanValue}>{value ? "true" : "false"}</span>
    );
  }

  const stringValue = String(value);
  if (stringValue.length > 50) {
    return (
      <span className={styles.truncatedValue} title={stringValue}>
        {stringValue.slice(0, 50)}...
      </span>
    );
  }

  return <span>{stringValue}</span>;
}
