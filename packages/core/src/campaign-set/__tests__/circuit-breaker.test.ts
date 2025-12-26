/**
 * Circuit Breaker Tests
 *
 * Tests for the circuit breaker pattern implementation.
 * The circuit breaker prevents overwhelming a failing service by:
 * - Tracking failures and opening when threshold is reached
 * - Allowing limited requests in half-open state to test recovery
 * - Resetting to closed state on successful requests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  CircuitBreaker,
  getCircuitBreaker,
  resetCircuitBreakers,
  type CircuitBreakerConfig,
  type CircuitState,
} from "../circuit-breaker.js";

describe("CircuitBreaker", () => {
  const defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    halfOpenMaxAttempts: 3,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    resetCircuitBreakers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("should start in closed state", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);
      expect(breaker.getState()).toBe("closed");
    });

    it("should allow execution in closed state", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);
      expect(breaker.canExecute()).toBe(true);
    });

    it("should have zero failure count initially", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);
      expect(breaker.getFailureCount()).toBe(0);
    });
  });

  describe("failure tracking", () => {
    it("should increment failure count on recordFailure", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);

      breaker.recordFailure();
      expect(breaker.getFailureCount()).toBe(1);

      breaker.recordFailure();
      expect(breaker.getFailureCount()).toBe(2);
    });

    it("should remain closed below failure threshold", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);

      // Record 4 failures (threshold is 5)
      for (let i = 0; i < 4; i++) {
        breaker.recordFailure();
      }

      expect(breaker.getState()).toBe("closed");
      expect(breaker.canExecute()).toBe(true);
    });

    it("should open after reaching failure threshold", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);

      // Record 5 failures (threshold is 5)
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      expect(breaker.getState()).toBe("open");
      expect(breaker.canExecute()).toBe(false);
    });

    it("should block execution in open state", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);

      // Trip the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      expect(breaker.canExecute()).toBe(false);
    });
  });

  describe("success handling", () => {
    it("should reset failure count on success", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);

      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getFailureCount()).toBe(2);

      breaker.recordSuccess();
      expect(breaker.getFailureCount()).toBe(0);
    });

    it("should keep state closed on success", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);

      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordSuccess();

      expect(breaker.getState()).toBe("closed");
    });
  });

  describe("half-open state", () => {
    it("should transition to half-open after reset timeout", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);

      // Trip the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe("open");
      expect(breaker.canExecute()).toBe(false);

      // Advance time past the reset timeout
      vi.advanceTimersByTime(60001);

      // The state transitions when canExecute is checked
      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getState()).toBe("half-open");
    });

    it("should allow limited attempts in half-open state", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);

      // Trip the circuit and advance to half-open
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      vi.advanceTimersByTime(60001);

      // First 3 attempts should be allowed (halfOpenMaxAttempts)
      expect(breaker.canExecute()).toBe(true);
      breaker.recordFailure();
      expect(breaker.canExecute()).toBe(true);
      breaker.recordFailure();
      expect(breaker.canExecute()).toBe(true);
      breaker.recordFailure();

      // After max attempts with failures, should reopen
      expect(breaker.getState()).toBe("open");
      expect(breaker.canExecute()).toBe(false);
    });

    it("should close on success in half-open state", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);

      // Trip the circuit and advance to half-open
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      vi.advanceTimersByTime(60001);

      // Trigger half-open state
      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getState()).toBe("half-open");

      // Record success
      breaker.recordSuccess();

      expect(breaker.getState()).toBe("closed");
      expect(breaker.getFailureCount()).toBe(0);
    });

    it("should reopen on failure in half-open after max attempts", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);

      // Trip the circuit and advance to half-open
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      vi.advanceTimersByTime(60001);

      // Trigger half-open state
      breaker.canExecute();

      // All attempts fail
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }

      expect(breaker.getState()).toBe("open");
    });
  });

  describe("state transitions", () => {
    it("should follow correct state transition: closed -> open -> half-open -> closed", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);

      // Start: closed
      expect(breaker.getState()).toBe("closed");

      // Trip to open
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe("open");

      // Wait for timeout -> half-open
      vi.advanceTimersByTime(60001);
      breaker.canExecute();
      expect(breaker.getState()).toBe("half-open");

      // Success -> closed
      breaker.recordSuccess();
      expect(breaker.getState()).toBe("closed");
    });

    it("should follow correct state transition: closed -> open -> half-open -> open", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);

      // Start: closed
      expect(breaker.getState()).toBe("closed");

      // Trip to open
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe("open");

      // Wait for timeout -> half-open
      vi.advanceTimersByTime(60001);
      breaker.canExecute();
      expect(breaker.getState()).toBe("half-open");

      // All half-open attempts fail -> back to open
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe("open");
    });
  });

  describe("getName", () => {
    it("should return the breaker name", () => {
      const breaker = new CircuitBreaker("reddit-api", defaultConfig);
      expect(breaker.getName()).toBe("reddit-api");
    });
  });

  describe("getStats", () => {
    it("should return current stats", () => {
      const breaker = new CircuitBreaker("test", defaultConfig);

      breaker.recordFailure();
      breaker.recordFailure();

      const stats = breaker.getStats();

      expect(stats).toEqual({
        name: "test",
        state: "closed",
        failures: 2,
        halfOpenAttempts: 0,
        lastFailureTime: expect.any(Number),
      });
    });
  });
});

describe("getCircuitBreaker", () => {
  beforeEach(() => {
    resetCircuitBreakers();
  });

  it("should return a circuit breaker for a platform", () => {
    const breaker = getCircuitBreaker("reddit");
    expect(breaker).toBeInstanceOf(CircuitBreaker);
    expect(breaker.getName()).toBe("reddit");
  });

  it("should return the same instance for the same platform", () => {
    const breaker1 = getCircuitBreaker("reddit");
    const breaker2 = getCircuitBreaker("reddit");
    expect(breaker1).toBe(breaker2);
  });

  it("should return different instances for different platforms", () => {
    const redditBreaker = getCircuitBreaker("reddit");
    const googleBreaker = getCircuitBreaker("google");

    expect(redditBreaker).not.toBe(googleBreaker);
    expect(redditBreaker.getName()).toBe("reddit");
    expect(googleBreaker.getName()).toBe("google");
  });

  it("should use default configuration", () => {
    const breaker = getCircuitBreaker("reddit");

    // Trip the circuit with default threshold (5)
    for (let i = 0; i < 5; i++) {
      breaker.recordFailure();
    }
    expect(breaker.getState()).toBe("open");
  });

  it("should allow custom configuration", () => {
    const breaker = getCircuitBreaker("reddit", {
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      halfOpenMaxAttempts: 2,
    });

    // Trip with custom threshold (3)
    for (let i = 0; i < 3; i++) {
      breaker.recordFailure();
    }
    expect(breaker.getState()).toBe("open");
  });
});

describe("resetCircuitBreakers", () => {
  it("should clear all circuit breakers", () => {
    const breaker1 = getCircuitBreaker("reddit");
    const breaker2 = getCircuitBreaker("google");

    // Cause some failures
    breaker1.recordFailure();
    breaker2.recordFailure();

    // Reset
    resetCircuitBreakers();

    // New breakers should have clean state
    const newBreaker1 = getCircuitBreaker("reddit");
    expect(newBreaker1.getFailureCount()).toBe(0);
    expect(newBreaker1).not.toBe(breaker1);
  });
});
