import styles from "../CampaignSetDetail.module.css";

/**
 * Loading state for Campaign Set edit page.
 * Displayed while fetching campaign set data for editing.
 */
export default function Loading() {
  return (
    <div className={styles.page}>
      <div className={styles.loading} role="status" aria-live="polite">
        <div className={styles.spinner} />
        <span>Loading campaign set for editing...</span>
      </div>
    </div>
  );
}
