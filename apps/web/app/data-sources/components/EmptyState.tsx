"use client";

import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.illustration} role="img" aria-hidden="true">
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="12"
            y="20"
            width="56"
            height="44"
            rx="4"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M12 28H68"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="18" cy="24" r="2" fill="currentColor" opacity="0.5" />
          <circle cx="24" cy="24" r="2" fill="currentColor" opacity="0.5" />
          <circle cx="30" cy="24" r="2" fill="currentColor" opacity="0.5" />
          <path
            d="M20 40H36"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M20 48H52"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M20 56H44"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.4"
          />
          <circle
            cx="58"
            cy="52"
            r="14"
            fill="var(--background)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M58 46V58M52 52H64"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h3 className={styles.title}>No data sources yet</h3>

      <p className={styles.description}>
        Upload a CSV file to get started with your ad campaigns.
        Your data will be used to generate personalized ad variations.
      </p>

      <button onClick={onUploadClick} className={styles.ctaButton}>
        Upload Your First File
      </button>
    </div>
  );
}
