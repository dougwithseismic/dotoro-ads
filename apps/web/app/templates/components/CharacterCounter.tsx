"use client";

import styles from "./CharacterCounter.module.css";

interface CharacterCounterProps {
  /** Current character count */
  current: number;
  /** Maximum allowed characters */
  max: number;
  /** Optional label to display */
  label?: string;
  /** Show warning threshold (percentage of max) */
  warningThreshold?: number;
}

/**
 * Displays a character count with visual feedback.
 * Colors:
 * - Green: below warning threshold
 * - Yellow: between warning threshold and limit
 * - Red: at or over limit
 */
export function CharacterCounter({
  current,
  max,
  label,
  warningThreshold = 0.8,
}: CharacterCounterProps) {
  const percentage = max > 0 ? current / max : 0;
  const isWarning = percentage >= warningThreshold && percentage < 1;
  const isError = percentage >= 1;

  const getStatus = (): "ok" | "warning" | "error" => {
    if (isError) return "error";
    if (isWarning) return "warning";
    return "ok";
  };

  const status = getStatus();

  return (
    <div
      className={styles.container}
      data-status={status}
      role="status"
      aria-live="polite"
    >
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.count}>
        <span className={styles.current}>{current}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.max}>{max}</span>
      </span>
    </div>
  );
}
