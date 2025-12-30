"use client";

import styles from "./CharacterCounter.module.css";

interface CharacterCounterProps {
  /** The current text value to count */
  value: string;
  /** Maximum allowed characters */
  limit: number;
  /** Field name for accessibility and context */
  fieldName: string;
  /** Warning threshold as percentage (default 0.8 = 80%) */
  warningThreshold?: number;
  /** Error threshold as percentage (default 0.95 = 95%) */
  errorThreshold?: number;
  /** Whether to show overflow message when limit exceeded */
  showOverflowMessage?: boolean;
}

type CounterStatus = "ok" | "warning" | "error";

/**
 * CharacterCounter - Real-time character count display with color-coded feedback.
 *
 * Color states:
 * - Green (ok): 0-79% usage - Normal state
 * - Yellow (warning): 80-94% usage - Approaching limit
 * - Red (error): 95%+ usage - At or exceeding limit
 *
 * Platform-specific limits should be passed via the `limit` prop based on
 * the selected platform(s):
 * - Reddit: headline 100, description 500, displayUrl 25
 * - Google: headline 30, description 90, displayUrl 30
 *
 * @example
 * // For Reddit headline
 * <CharacterCounter value={headline} limit={100} fieldName="headline" />
 *
 * @example
 * // For Google headline (more restrictive)
 * <CharacterCounter value={headline} limit={30} fieldName="headline" showOverflowMessage />
 */
export function CharacterCounter({
  value,
  limit,
  fieldName,
  warningThreshold = 0.8,
  errorThreshold = 0.95,
  showOverflowMessage = false,
}: CharacterCounterProps) {
  const currentLength = value.length;
  const percentage = limit > 0 ? currentLength / limit : 0;
  const overflow = currentLength > limit ? currentLength - limit : 0;

  const getStatus = (): CounterStatus => {
    if (percentage >= errorThreshold || currentLength > limit) {
      return "error";
    }
    if (percentage >= warningThreshold) {
      return "warning";
    }
    return "ok";
  };

  const status = getStatus();
  const ariaLabel = `${fieldName} character count: ${currentLength} of ${limit}${
    overflow > 0 ? `, ${overflow} over limit` : ""
  }`;

  return (
    <div
      className={styles.container}
      data-status={status}
      data-testid="character-counter"
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <span className={styles.count}>
        {currentLength}/{limit}
      </span>
      {showOverflowMessage && overflow > 0 && (
        <span className={styles.overflowMessage}>
          {overflow} character{overflow !== 1 ? "s" : ""} over
        </span>
      )}
    </div>
  );
}

export default CharacterCounter;
