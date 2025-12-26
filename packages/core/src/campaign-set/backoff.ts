/**
 * Exponential Backoff Utility
 *
 * Calculates delay times for retry operations using exponential backoff.
 * This prevents overwhelming a recovering service with immediate retries.
 *
 * Formula: delay = min(baseDelay * 2^retryCount, maxDelay) + random(0, jitter)
 *
 * The jitter component helps prevent the "thundering herd" problem where
 * many clients retry at exactly the same time after a service recovers.
 *
 * @example
 * ```typescript
 * // Simple usage with defaults
 * const delay = calculateBackoffDelay(retryCount);
 * await sleep(delay);
 *
 * // Custom configuration
 * const delay = calculateBackoffDelay(retryCount, {
 *   baseDelayMs: 500,
 *   maxDelayMs: 60000,
 *   jitterMs: 500,
 * });
 * ```
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration options for exponential backoff calculation
 */
export interface BackoffConfig {
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds (default: 300000 = 5 minutes) */
  maxDelayMs?: number;
  /** Random jitter added to delay in milliseconds (default: 1000) */
  jitterMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default backoff configuration
 * - Base delay of 1 second
 * - Maximum delay of 5 minutes
 * - Jitter up to 1 second
 */
export const DEFAULT_BACKOFF_CONFIG: Required<BackoffConfig> = {
  baseDelayMs: 1000,
  maxDelayMs: 300000, // 5 minutes
  jitterMs: 1000,
};

// ─────────────────────────────────────────────────────────────────────────────
// Backoff Calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the delay before the next retry attempt using exponential backoff
 *
 * The delay doubles with each retry attempt, up to the maximum delay.
 * A random jitter is added to prevent synchronized retries.
 *
 * @param retryCount - The current retry attempt number (0-based)
 * @param config - Optional configuration overrides
 * @returns The delay in milliseconds before the next retry
 *
 * @example
 * ```typescript
 * // Retry 0: ~1000-2000ms
 * // Retry 1: ~2000-3000ms
 * // Retry 2: ~4000-5000ms
 * // Retry 3: ~8000-9000ms
 * // Retry 4: ~16000-17000ms
 * const delay = calculateBackoffDelay(retryCount);
 * ```
 */
export function calculateBackoffDelay(
  retryCount: number,
  config?: BackoffConfig
): number {
  const {
    baseDelayMs,
    maxDelayMs,
    jitterMs,
  } = {
    ...DEFAULT_BACKOFF_CONFIG,
    ...config,
  };

  // Handle negative retry counts by treating them as 0
  const safeRetryCount = Math.max(0, retryCount);

  // Calculate exponential delay: baseDelay * 2^retryCount
  const exponentialDelay = baseDelayMs * Math.pow(2, safeRetryCount);

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add random jitter
  const jitter = Math.random() * jitterMs;

  // Return integer milliseconds
  return Math.floor(cappedDelay + jitter);
}
