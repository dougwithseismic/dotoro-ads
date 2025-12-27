"use client";

import styles from "./KeywordsTable.module.css";

interface KeywordsTableProps {
  /** Array of keyword strings to display */
  keywords: string[];
  /** Callback when a keyword is deleted */
  onDelete: (index: number) => void;
  /** Maximum number of rows to show before truncating (0 = no limit) */
  maxRows?: number;
  /** Label for the table header */
  headerLabel?: string;
}

export function KeywordsTable({
  keywords,
  onDelete,
  maxRows = 0,
  headerLabel = "Generated Keywords",
}: KeywordsTableProps) {
  if (keywords.length === 0) {
    return null;
  }

  const displayKeywords = maxRows > 0 ? keywords.slice(0, maxRows) : keywords;
  const hiddenCount = maxRows > 0 ? Math.max(0, keywords.length - maxRows) : 0;

  return (
    <div className={styles.container}>
      <div className={styles.tableHeader}>
        <span className={styles.headerTitle}>{headerLabel}</span>
        <span className={styles.headerCount}>
          {keywords.length} keyword{keywords.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.indexCol}>#</th>
              <th className={styles.keywordCol}>Keyword</th>
              <th className={styles.actionsCol}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayKeywords.map((keyword, index) => (
              <tr key={`${keyword}-${index}`} className={styles.row}>
                <td className={styles.indexCell}>{index + 1}</td>
                <td className={styles.keywordCell}>{keyword}</td>
                <td className={styles.actionsCell}>
                  <button
                    type="button"
                    onClick={() => onDelete(index)}
                    className={styles.deleteButton}
                    aria-label={`Delete keyword: ${keyword}`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hiddenCount > 0 && (
        <div className={styles.moreIndicator}>
          +{hiddenCount} more keyword{hiddenCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
