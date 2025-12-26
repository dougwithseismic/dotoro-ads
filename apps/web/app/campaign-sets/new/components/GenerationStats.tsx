"use client";

import styles from "../GenerateWizard.module.css";

export interface GenerationStatsProps {
  campaignCount: number;
  adGroupCount: number;
  adCount: number;
  rowsProcessed: number;
  rowsSkipped: number;
  dataSourceName?: string;
}

export function GenerationStats({
  campaignCount,
  adGroupCount,
  adCount,
  rowsProcessed,
  rowsSkipped,
  dataSourceName,
}: GenerationStatsProps) {
  return (
    <div data-testid="generation-stats">
      <div className={styles.statsGrid}>
        <div className={styles.statCard} data-testid="stat-campaigns">
          <div className={styles.statNumber}>{campaignCount.toLocaleString()}</div>
          <div className={styles.statLabel}>Campaigns</div>
        </div>
        <div className={styles.statCard} data-testid="stat-adgroups">
          <div className={styles.statNumber}>{adGroupCount.toLocaleString()}</div>
          <div className={styles.statLabel}>Ad Groups</div>
        </div>
        <div className={styles.statCard} data-testid="stat-ads">
          <div className={styles.statNumber}>{adCount.toLocaleString()}</div>
          <div className={styles.statLabel}>Ads</div>
        </div>
      </div>
      <div className={styles.statsMeta} data-testid="stats-meta">
        <span>{rowsProcessed.toLocaleString()} rows processed</span>
        {rowsSkipped > 0 && (
          <span>, {rowsSkipped.toLocaleString()} skipped</span>
        )}
        {dataSourceName && (
          <>
            <br />
            <span>Data Source: {dataSourceName}</span>
          </>
        )}
      </div>
    </div>
  );
}
