/**
 * LoadingSkeleton Component
 *
 * Shared loading skeleton for the invitation page.
 * Used by both loading.tsx and InvitationPageClient.tsx.
 */
import styles from "../InvitationPage.module.css";

export function LoadingSkeleton() {
  return (
    <div className={styles.container} data-testid="invitation-loading">
      <div className={styles.loadingCard}>
        <div className={styles.loadingHeader}>
          <div className={styles.loadingAvatar} />
          <div className={styles.loadingHeaderContent}>
            <div className={styles.loadingTitle} />
            <div className={styles.loadingSubtitle} />
          </div>
        </div>
        <div className={styles.loadingDetails}>
          <div className={styles.loadingRow} />
          <div className={styles.loadingRow} />
        </div>
        <div className={styles.loadingActions}>
          <div className={styles.loadingButton} />
          <div className={styles.loadingButton} />
        </div>
      </div>
    </div>
  );
}

export default LoadingSkeleton;
