/**
 * Circuit Breaker Pattern Implementation
 *
 * Implements the circuit breaker pattern to prevent overwhelming a failing service.
 * The breaker has three states:
 *
 * - CLOSED: Normal operation, requests pass through. Failures are counted.
 * - OPEN: Service is failing, requests are blocked. Waits for timeout.
 * - HALF-OPEN: Testing recovery, limited requests allowed.
 *
 * State transitions:
 * - CLOSED -> OPEN: When failure count reaches threshold
 * - OPEN -> HALF-OPEN: After reset timeout expires
 * - HALF-OPEN -> CLOSED: On successful request
 * - HALF-OPEN -> OPEN: When max half-open attempts fail
 *
 * ## Concurrency Limitations
 *
 * NOTE: This implementation is suitable for single-process Node.js applications.
 * In concurrent async scenarios, multiple callers may simultaneously transition
 * state from "open" to "half-open" when calling `canExecute()`. This is acceptable
 * for most use cases as it merely allows a few extra probe requests.
 *
 * For distributed systems or high-concurrency environments where strict state
 * control is required, consider:
 * - Using a distributed circuit breaker with Redis or database-based locking
 * - Implementing mutex/semaphore patterns around state transitions
 * - Using libraries like `opossum` that handle these edge cases
 *
 * @example
 * ```typescript
 * const breaker = getCircuitBreaker("reddit");
 *
 * if (!breaker.canExecute()) {
 *   console.log("Circuit is open, skipping request");
 *   return;
 * }
 *
 * try {
 *   const result = await makeApiCall();
 *   breaker.recordSuccess();
 *   return result;
 * } catch (error) {
 *   breaker.recordFailure();
 *   throw error;
 * }
 * ```
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration options for a circuit breaker
 */
export interface CircuitBreakerConfig {
  /** Number of failures before the circuit opens */
  failureThreshold: number;
  /** Time in milliseconds to wait before transitioning to half-open */
  resetTimeoutMs: number;
  /** Maximum number of requests allowed in half-open state */
  halfOpenMaxAttempts: number;
}

/**
 * The three possible states of a circuit breaker
 */
export type CircuitState = "closed" | "open" | "half-open";

/**
 * Statistics about the current state of a circuit breaker
 */
export interface CircuitBreakerStats {
  /** Name of the circuit breaker */
  name: string;
  /** Current state */
  state: CircuitState;
  /** Current failure count */
  failures: number;
  /** Number of attempts made in half-open state */
  halfOpenAttempts: number;
  /** Timestamp of the last failure (0 if no failures) */
  lastFailureTime: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default circuit breaker configuration
 * - Opens after 5 failures
 * - Waits 60 seconds before trying half-open
 * - Allows 3 requests in half-open state
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  halfOpenMaxAttempts: 3,
};

// ─────────────────────────────────────────────────────────────────────────────
// CircuitBreaker Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Circuit Breaker implementation
 *
 * Tracks failures and controls access to a resource to prevent
 * cascading failures when a service is unavailable.
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;

  /**
   * Creates a new circuit breaker
   *
   * @param name - Identifier for this breaker (e.g., "reddit", "google")
   * @param config - Configuration options
   */
  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  /**
   * Check if a request should be allowed through
   *
   * In closed state: Always returns true
   * In open state: Returns false unless reset timeout has passed
   * In half-open state: Returns true if under max attempts
   *
   * NOTE: In concurrent async scenarios, multiple callers may simultaneously
   * see the circuit transition from "open" to "half-open", allowing more than
   * the intended number of probe requests. This is a known limitation of this
   * in-memory implementation. See class-level documentation for alternatives.
   *
   * @returns true if the request can proceed, false if blocked
   */
  canExecute(): boolean {
    if (this.state === "closed") {
      return true;
    }

    if (this.state === "open") {
      // Check if enough time has passed to try half-open
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;

      if (timeSinceLastFailure >= this.config.resetTimeoutMs) {
        // Transition to half-open
        this.state = "half-open";
        this.halfOpenAttempts = 0;
        return true;
      }

      return false;
    }

    // half-open: allow limited attempts
    return this.halfOpenAttempts < this.config.halfOpenMaxAttempts;
  }

  /**
   * Record a successful request
   *
   * Resets the failure count and closes the circuit if it was half-open.
   */
  recordSuccess(): void {
    this.failures = 0;
    this.halfOpenAttempts = 0;
    this.state = "closed";
  }

  /**
   * Record a failed request
   *
   * Increments the failure count and may trigger state transitions:
   * - In closed state: Opens the circuit if threshold is reached
   * - In half-open state: Increments attempts and reopens if max reached
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      this.halfOpenAttempts++;

      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.state = "open";
      }
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = "open";
    }
  }

  /**
   * Get the current circuit state
   *
   * @returns The current state: "closed", "open", or "half-open"
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get the current failure count
   *
   * @returns Number of consecutive failures recorded
   */
  getFailureCount(): number {
    return this.failures;
  }

  /**
   * Get the circuit breaker name
   *
   * @returns The identifier for this breaker
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get statistics about the circuit breaker
   *
   * @returns Object containing current state and metrics
   */
  getStats(): CircuitBreakerStats {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      halfOpenAttempts: this.halfOpenAttempts,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registry of circuit breakers by platform/service name
 */
const breakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker for a platform
 *
 * Returns the same instance for repeated calls with the same platform name.
 * This ensures state is shared across all callers.
 *
 * @param platform - The platform identifier (e.g., "reddit", "google")
 * @param config - Optional custom configuration (only used on first call)
 * @returns The circuit breaker instance for the platform
 */
export function getCircuitBreaker(
  platform: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!breakers.has(platform)) {
    const fullConfig: CircuitBreakerConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    breakers.set(platform, new CircuitBreaker(platform, fullConfig));
  }

  return breakers.get(platform)!;
}

/**
 * Reset all circuit breakers
 *
 * Used for testing to ensure clean state between tests.
 * In production, this should rarely be called.
 */
export function resetCircuitBreakers(): void {
  breakers.clear();
}
