"use client";

import { useState, useCallback } from "react";
import styles from "./SkippedAdsPanel.module.css";

/**
 * Record of an ad that was skipped during sync.
 */
export interface SkippedAdRecord {
  adId: string;
  adGroupId: string;
  campaignId: string;
  reason: string;
  fields: string[];
  overflow: Record<string, number>;
  originalAd: {
    headline?: string;
    description?: string;
    displayUrl?: string;
    finalUrl?: string;
  };
  skippedAt: string;
}

export interface SkippedAdsPanelProps {
  /** Array of skipped ad records */
  skippedAds: SkippedAdRecord[];
  /** Whether the panel should be collapsed by default */
  defaultCollapsed?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * SkippedAdsPanel - Expandable panel showing skipped ads with reasons
 *
 * Displays a list of ads that were skipped during sync due to validation
 * errors, with full context for debugging.
 */
export function SkippedAdsPanel({
  skippedAds,
  defaultCollapsed = true,
  className,
}: SkippedAdsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [expandedAdIds, setExpandedAdIds] = useState<Set<string>>(new Set());

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const toggleAdExpanded = useCallback((adId: string) => {
    setExpandedAdIds((prev) => {
      const next = new Set(prev);
      if (next.has(adId)) {
        next.delete(adId);
      } else {
        next.add(adId);
      }
      return next;
    });
  }, []);

  if (skippedAds.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <button
        className={styles.header}
        onClick={toggleCollapsed}
        aria-expanded={!isCollapsed}
      >
        <div className={styles.headerContent}>
          <span className={styles.warningIcon} aria-hidden="true">
            !
          </span>
          <span className={styles.title}>
            {skippedAds.length} ad{skippedAds.length !== 1 ? "s" : ""} skipped
          </span>
        </div>
        <span className={`${styles.chevron} ${isCollapsed ? "" : styles.expanded}`}>
          {">"}
        </span>
      </button>

      {!isCollapsed && (
        <div className={styles.content}>
          <p className={styles.description}>
            The following ads were skipped because they exceeded platform character
            limits. Review and adjust your templates to prevent skipping.
          </p>

          <div className={styles.adList}>
            {skippedAds.map((record) => (
              <div key={record.adId} className={styles.adItem}>
                <button
                  className={styles.adHeader}
                  onClick={() => toggleAdExpanded(record.adId)}
                  aria-expanded={expandedAdIds.has(record.adId)}
                >
                  <div className={styles.adInfo}>
                    <span className={styles.adId}>Ad: {record.adId.slice(0, 8)}...</span>
                    <span className={styles.fields}>
                      Fields: {record.fields.join(", ")}
                    </span>
                  </div>
                  <span
                    className={`${styles.itemChevron} ${
                      expandedAdIds.has(record.adId) ? styles.expanded : ""
                    }`}
                  >
                    {">"}
                  </span>
                </button>

                {expandedAdIds.has(record.adId) && (
                  <div className={styles.adDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Reason:</span>
                      <span className={styles.detailValue}>{record.reason}</span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Overflow:</span>
                      <span className={styles.detailValue}>
                        {Object.entries(record.overflow)
                          .map(([field, chars]) => `${field}: +${chars} chars`)
                          .join(", ")}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Skipped at:</span>
                      <span className={styles.detailValue}>
                        {new Date(record.skippedAt).toLocaleString()}
                      </span>
                    </div>

                    {record.originalAd.headline && (
                      <div className={styles.originalContent}>
                        <span className={styles.detailLabel}>Original headline:</span>
                        <span className={styles.originalText}>
                          {record.originalAd.headline}
                        </span>
                      </div>
                    )}

                    {record.originalAd.description && (
                      <div className={styles.originalContent}>
                        <span className={styles.detailLabel}>Original description:</span>
                        <span className={styles.originalText}>
                          {record.originalAd.description}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
