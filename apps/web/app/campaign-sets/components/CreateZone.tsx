"use client";

import Link from "next/link";
import styles from "./CreateZone.module.css";

interface CreateZoneProps {
  onCreateClick?: () => void;
}

export function CreateZone({ onCreateClick }: CreateZoneProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCreateClick?.();
    }
  };

  const content = (
    <>
      <div className={styles.icon}>
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="20"
            cy="20"
            r="14"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M20 13V27M13 20H27"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className={styles.primaryText}>Create a new campaign set</p>
      <p className={styles.secondaryText}>
        Generate ad campaigns from your data sources
      </p>
    </>
  );

  if (onCreateClick) {
    return (
      <div className={styles.container}>
        <button
          type="button"
          className={styles.zone}
          onClick={onCreateClick}
          onKeyDown={handleKeyDown}
        >
          {content}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/campaign-sets/new" className={styles.zone}>
        {content}
      </Link>
    </div>
  );
}
