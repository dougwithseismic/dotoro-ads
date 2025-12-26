import styles from "./CampaignSetsList.module.css";

/**
 * Loading state for Campaign Sets listing page
 */
export default function Loading() {
  return (
    <div className={styles.page}>
      <div className={styles.loading} role="status" aria-live="polite">
        <div className={styles.spinner} />
        <span>Loading campaign sets...</span>
      </div>
    </div>
  );
}
