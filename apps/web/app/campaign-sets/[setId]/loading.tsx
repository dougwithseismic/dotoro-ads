import styles from "./CampaignSetDetail.module.css";

/**
 * Loading state for Campaign Set detail page
 */
export default function Loading() {
  return (
    <div className={styles.page}>
      <div className={styles.loading} role="status" aria-live="polite">
        <div className={styles.spinner} />
        <span>Loading campaign set...</span>
      </div>
    </div>
  );
}
