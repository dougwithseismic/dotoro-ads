"use client";

import { useTeam } from "@/lib/teams";
import { CampaignHealthOverview } from "./CampaignHealthOverview";
import styles from "./CampaignHealthOverview.module.css";

/**
 * CampaignHealthContainer
 *
 * Container component that provides team context to CampaignHealthOverview.
 * Handles:
 * - Getting current team from context
 * - Loading state while team is loading
 * - Graceful handling when no team is selected
 */
export function CampaignHealthContainer() {
  const { currentTeam, isLoading: teamLoading } = useTeam();

  // Show loading skeleton while team is loading
  if (teamLoading) {
    return (
      <section
        className={styles.container}
        data-testid="campaign-health-loading"
        aria-label="Loading campaign health"
      >
        <div className={styles.header}>
          <div
            className={`${styles.skeletonLine} ${styles.pulse}`}
            style={{ width: "150px", height: "24px" }}
          />
        </div>
        <div className={styles.skeleton}>
          <div className={`${styles.skeletonBar} ${styles.pulse}`} />
          <div className={styles.skeletonGrid}>
            <div className={`${styles.skeletonCircle} ${styles.pulse}`} />
            <div className={styles.skeletonList}>
              <div className={`${styles.skeletonLine} ${styles.pulse}`} />
              <div className={`${styles.skeletonLine} ${styles.pulse}`} />
              <div className={`${styles.skeletonLine} ${styles.pulse}`} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Don't render if no team selected
  if (!currentTeam) {
    return null;
  }

  return <CampaignHealthOverview teamId={currentTeam.id} />;
}
