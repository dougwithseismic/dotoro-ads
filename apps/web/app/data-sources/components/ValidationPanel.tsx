"use client";

import { useMemo } from "react";
import type { ValidationError } from "../types";
import styles from "./ValidationPanel.module.css";

interface ValidationPanelProps {
  errors: ValidationError[];
  onErrorClick: (error: ValidationError) => void;
}

interface ColumnSummary {
  column: string;
  errorCount: number;
  warningCount: number;
}

export function ValidationPanel({ errors, onErrorClick }: ValidationPanelProps) {
  const { columnSummaries, totalErrors, totalWarnings } = useMemo(() => {
    const summaryMap = new Map<string, ColumnSummary>();

    errors.forEach((error) => {
      const existing = summaryMap.get(error.column) || {
        column: error.column,
        errorCount: 0,
        warningCount: 0,
      };

      if (error.severity === "error") {
        existing.errorCount++;
      } else {
        existing.warningCount++;
      }

      summaryMap.set(error.column, existing);
    });

    const summaries = Array.from(summaryMap.values()).sort((a, b) => {
      const aTotal = a.errorCount + a.warningCount;
      const bTotal = b.errorCount + b.warningCount;
      return bTotal - aTotal;
    });

    const totalErrors = errors.filter((e) => e.severity === "error").length;
    const totalWarnings = errors.filter((e) => e.severity === "warning").length;

    return { columnSummaries: summaries, totalErrors, totalWarnings };
  }, [errors]);

  if (errors.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <svg
            className={styles.emptyIcon}
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
            <path
              d="M16 24L22 30L32 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h3 className={styles.emptyTitle}>No Validation Issues</h3>
          <p className={styles.emptyText}>
            All data passed validation checks. Your data source is ready to use.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Summary Header */}
      <div className={styles.summaryHeader}>
        <h3 className={styles.title}>Validation Issues</h3>
        <div className={styles.totalCounts}>
          {totalErrors > 0 && (
            <span className={styles.errorCount}>
              {totalErrors} {totalErrors === 1 ? "error" : "errors"}
            </span>
          )}
          {totalWarnings > 0 && (
            <span className={styles.warningCount}>
              {totalWarnings} {totalWarnings === 1 ? "warning" : "warnings"}
            </span>
          )}
        </div>
      </div>

      {/* Column Summary */}
      <div className={styles.columnSummary}>
        <h4 className={styles.sectionTitle}>Summary by Column</h4>
        <div className={styles.columnList}>
          {columnSummaries.map((summary) => (
            <div key={summary.column} className={styles.columnItem}>
              <code className={styles.columnName}>{summary.column}</code>
              <div className={styles.columnCounts}>
                {summary.errorCount > 0 && (
                  <span className={styles.columnErrorCount}>
                    {summary.errorCount} {summary.errorCount === 1 ? "error" : "errors"}
                  </span>
                )}
                {summary.warningCount > 0 && (
                  <span className={styles.columnWarningCount}>
                    {summary.warningCount} {summary.warningCount === 1 ? "warning" : "warnings"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error List */}
      <div className={styles.errorList}>
        <h4 className={styles.sectionTitle}>All Issues</h4>
        <ul className={styles.list} role="list">
          {errors.map((error, index) => (
            <li key={`${error.column}-${error.row}-${index}`} className={styles.listItem}>
              <button
                className={styles.errorButton}
                onClick={() => onErrorClick(error)}
                aria-label={`Go to row ${error.row}`}
              >
                <div className={styles.errorHeader}>
                  <span
                    className={`${styles.severityBadge} ${
                      error.severity === "error" ? styles.errorBadge : styles.warningBadge
                    }`}
                  >
                    {error.severity}
                  </span>
                  <code className={styles.errorColumn}>{error.column}</code>
                  <span className={styles.errorRow}>Row {error.row}</span>
                </div>
                <p className={styles.errorMessage}>{error.message}</p>
                {error.suggestion && (
                  <div className={styles.suggestionBox}>
                    <span className={styles.suggestionLabel}>Suggestion:</span>
                    <span className={styles.suggestionText}>{error.suggestion}</span>
                  </div>
                )}
                <span className={styles.goToRow}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5.5 10.5L9 7L5.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
