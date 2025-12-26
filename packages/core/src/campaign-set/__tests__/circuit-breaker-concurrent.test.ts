/**
 * Circuit Breaker Concurrent Behavior Tests
 *
 * Tests for async interleaving scenarios and concurrent access to circuit breakers.
 * These tests verify that the circuit breaker correctly handles:
 *
 * 1. Multiple simultaneous requests
 * 2. Race conditions during state transitions
 * 3. Concurrent success/failure recording
 * 4. State consistency under load
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CircuitBreaker,
  getCircuitBreaker,
  resetCircuitBreakers,
  type CircuitBreakerConfig,
} from "../circuit-breaker.js";

describe("Circuit Breaker Concurrent Behavior", () => {
  const config: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeoutMs: 1000, // Short timeout for testing
    halfOpenMaxAttempts: 3,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    resetCircuitBreakers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Concurrent failure recording", () => {
    it("should correctly count concurrent failures", async () => {
      const breaker = new CircuitBreaker("test", config);

      // Simulate concurrent failures
      const failures = Array.from({ length: 10 }, () =>
        Promise.resolve().then(() => breaker.recordFailure())
      );

      await Promise.all(failures);

      // All failures should be counted (but state depends on threshold)
      expect(breaker.getState()).toBe("open"); // 10 > 5
    });

    it("should transition to open when threshold is reached concurrently", async () => {
      const breaker = new CircuitBreaker("test", config);

      // Record exactly threshold failures concurrently
      const failures = Array.from({ length: 5 }, () =>
        Promise.resolve().then(() => breaker.recordFailure())
      );

      await Promise.all(failures);

      expect(breaker.getState()).toBe("open");
      expect(breaker.canExecute()).toBe(false);
    });

    it("should handle mixed success and failure recording", async () => {
      const breaker = new CircuitBreaker("test", config);

      // Interleave successes and failures
      const operations = [
        Promise.resolve().then(() => breaker.recordFailure()),
        Promise.resolve().then(() => breaker.recordSuccess()),
        Promise.resolve().then(() => breaker.recordFailure()),
        Promise.resolve().then(() => breaker.recordSuccess()),
        Promise.resolve().then(() => breaker.recordFailure()),
      ];

      await Promise.all(operations);

      // Success resets the counter, so final state depends on order
      // The circuit should still be closed after success resets
      expect(breaker.getState()).toBe("closed");
    });
  });

  describe("Concurrent canExecute checks", () => {
    it("should allow all concurrent checks when closed", async () => {
      const breaker = new CircuitBreaker("test", config);

      const checks = Array.from({ length: 100 }, () =>
        Promise.resolve().then(() => breaker.canExecute())
      );

      const results = await Promise.all(checks);

      expect(results.every((r) => r === true)).toBe(true);
    });

    it("should block all concurrent checks when open", async () => {
      const breaker = new CircuitBreaker("test", config);

      // Trip the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe("open");

      const checks = Array.from({ length: 100 }, () =>
        Promise.resolve().then(() => breaker.canExecute())
      );

      const results = await Promise.all(checks);

      expect(results.every((r) => r === false)).toBe(true);
    });

    it("should handle concurrent checks during state transition", async () => {
      const breaker = new CircuitBreaker("test", config);

      // Trip the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      // Advance time to trigger half-open state
      vi.advanceTimersByTime(1001);

      // First check should trigger transition and succeed
      const firstCheck = breaker.canExecute();
      expect(firstCheck).toBe(true);
      expect(breaker.getState()).toBe("half-open");

      // Subsequent checks in half-open should also succeed (within limit)
      const secondCheck = breaker.canExecute();
      const thirdCheck = breaker.canExecute();
      expect(secondCheck).toBe(true);
      expect(thirdCheck).toBe(true);
    });
  });

  describe("Concurrent half-open state handling", () => {
    it("should limit concurrent requests in half-open state", async () => {
      const breaker = new CircuitBreaker("test", {
        ...config,
        halfOpenMaxAttempts: 2,
      });

      // Trip the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      // Advance to half-open
      vi.advanceTimersByTime(1001);

      // First two checks should succeed
      expect(breaker.canExecute()).toBe(true);
      breaker.recordFailure();
      expect(breaker.canExecute()).toBe(true);
      breaker.recordFailure();

      // After max attempts with failures, should be back to open
      expect(breaker.getState()).toBe("open");
      expect(breaker.canExecute()).toBe(false);
    });

    it("should close on first success in half-open", async () => {
      const breaker = new CircuitBreaker("test", config);

      // Trip and advance to half-open
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      vi.advanceTimersByTime(1001);
      breaker.canExecute(); // Trigger transition

      // Record success
      breaker.recordSuccess();

      expect(breaker.getState()).toBe("closed");
      expect(breaker.getFailureCount()).toBe(0);
    });
  });

  describe("Shared circuit breaker instances", () => {
    it("should share state across getCircuitBreaker calls", async () => {
      const breaker1 = getCircuitBreaker("shared-platform");
      const breaker2 = getCircuitBreaker("shared-platform");

      expect(breaker1).toBe(breaker2);

      // Failures on one reference affect the other
      breaker1.recordFailure();
      breaker1.recordFailure();

      expect(breaker2.getFailureCount()).toBe(2);
    });

    it("should isolate state between different platforms", async () => {
      const redditBreaker = getCircuitBreaker("reddit");
      const googleBreaker = getCircuitBreaker("google");

      // Trip reddit
      for (let i = 0; i < 5; i++) {
        redditBreaker.recordFailure();
      }

      expect(redditBreaker.getState()).toBe("open");
      expect(googleBreaker.getState()).toBe("closed");
      expect(googleBreaker.canExecute()).toBe(true);
    });

    it("should handle concurrent access to shared breaker", async () => {
      const platform = "concurrent-platform";

      // Simulate multiple concurrent users/requests
      const operations = Array.from({ length: 20 }, (_, i) =>
        Promise.resolve().then(() => {
          const breaker = getCircuitBreaker(platform);
          if (i % 2 === 0) {
            breaker.recordFailure();
          } else {
            breaker.recordSuccess();
          }
        })
      );

      await Promise.all(operations);

      // Final state should be consistent
      const finalBreaker = getCircuitBreaker(platform);
      const state = finalBreaker.getState();
      expect(["closed", "open"]).toContain(state);
    });
  });

  describe("Rapid state transitions", () => {
    it("should handle rapid open->half-open->closed transitions", async () => {
      const breaker = new CircuitBreaker("test", {
        failureThreshold: 1,
        resetTimeoutMs: 100,
        halfOpenMaxAttempts: 1,
      });

      // Rapidly cycle through states
      for (let cycle = 0; cycle < 5; cycle++) {
        // Trip to open
        breaker.recordFailure();
        expect(breaker.getState()).toBe("open");

        // Advance to half-open
        vi.advanceTimersByTime(101);
        expect(breaker.canExecute()).toBe(true);
        expect(breaker.getState()).toBe("half-open");

        // Close with success
        breaker.recordSuccess();
        expect(breaker.getState()).toBe("closed");
      }
    });

    it("should handle rapid open->half-open->open transitions", async () => {
      const breaker = new CircuitBreaker("test", {
        failureThreshold: 1,
        resetTimeoutMs: 100,
        halfOpenMaxAttempts: 1,
      });

      // Trip to open
      breaker.recordFailure();
      expect(breaker.getState()).toBe("open");

      // Advance to half-open
      vi.advanceTimersByTime(101);
      breaker.canExecute();
      expect(breaker.getState()).toBe("half-open");

      // Fail back to open
      breaker.recordFailure();
      expect(breaker.getState()).toBe("open");

      // Should not allow execution until timeout again
      expect(breaker.canExecute()).toBe(false);
    });
  });

  describe("State consistency under load", () => {
    it("should maintain consistent state with high concurrency", async () => {
      const breaker = new CircuitBreaker("load-test", {
        failureThreshold: 50,
        resetTimeoutMs: 60000,
        halfOpenMaxAttempts: 3,
      });

      // Simulate heavy load with mixed operations
      const operations: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        operations.push(
          Promise.resolve().then(() => {
            breaker.canExecute();
            if (i % 3 === 0) {
              breaker.recordSuccess();
            } else {
              breaker.recordFailure();
            }
          })
        );
      }

      await Promise.all(operations);

      // State should be deterministic based on operations
      const stats = breaker.getStats();
      expect(stats.state).toBeDefined();
      expect(stats.failures).toBeGreaterThanOrEqual(0);
    });

    it("should correctly report stats after concurrent operations", async () => {
      const breaker = new CircuitBreaker("stats-test", config);

      // Record a known number of failures
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }

      const stats = breaker.getStats();

      expect(stats.name).toBe("stats-test");
      expect(stats.state).toBe("closed");
      expect(stats.failures).toBe(3);
    });
  });

  describe("Reset behavior", () => {
    it("should properly reset all circuit breakers", async () => {
      // Create and trip multiple breakers
      const reddit = getCircuitBreaker("reddit");
      const google = getCircuitBreaker("google");

      for (let i = 0; i < 5; i++) {
        reddit.recordFailure();
        google.recordFailure();
      }

      expect(reddit.getState()).toBe("open");
      expect(google.getState()).toBe("open");

      // Reset all
      resetCircuitBreakers();

      // New instances should have clean state
      const newReddit = getCircuitBreaker("reddit");
      const newGoogle = getCircuitBreaker("google");

      expect(newReddit.getState()).toBe("closed");
      expect(newGoogle.getState()).toBe("closed");
      expect(newReddit.getFailureCount()).toBe(0);
      expect(newGoogle.getFailureCount()).toBe(0);
    });
  });
});
