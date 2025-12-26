/**
 * Exponential Backoff Tests
 *
 * Tests for the exponential backoff delay calculation utility.
 * Used to calculate retry delays that increase exponentially with each attempt.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateBackoffDelay,
  DEFAULT_BACKOFF_CONFIG,
  type BackoffConfig,
} from "../backoff.js";

describe("calculateBackoffDelay", () => {
  beforeEach(() => {
    // Mock Math.random for predictable jitter
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("exponential growth", () => {
    it("should calculate delay for retry 0 (first retry)", () => {
      const delay = calculateBackoffDelay(0, { baseDelayMs: 1000 });
      // 1000 * 2^0 = 1000, plus jitter of 500 (0.5 * 1000)
      expect(delay).toBe(1500);
    });

    it("should calculate delay for retry 1", () => {
      const delay = calculateBackoffDelay(1, { baseDelayMs: 1000 });
      // 1000 * 2^1 = 2000, plus jitter of 500
      expect(delay).toBe(2500);
    });

    it("should calculate delay for retry 2", () => {
      const delay = calculateBackoffDelay(2, { baseDelayMs: 1000 });
      // 1000 * 2^2 = 4000, plus jitter of 500
      expect(delay).toBe(4500);
    });

    it("should calculate delay for retry 3", () => {
      const delay = calculateBackoffDelay(3, { baseDelayMs: 1000 });
      // 1000 * 2^3 = 8000, plus jitter of 500
      expect(delay).toBe(8500);
    });

    it("should calculate delay for retry 4", () => {
      const delay = calculateBackoffDelay(4, { baseDelayMs: 1000 });
      // 1000 * 2^4 = 16000, plus jitter of 500
      expect(delay).toBe(16500);
    });

    it("should double the delay with each retry", () => {
      vi.spyOn(Math, "random").mockReturnValue(0); // No jitter for clean test

      const delay0 = calculateBackoffDelay(0, { baseDelayMs: 1000 });
      const delay1 = calculateBackoffDelay(1, { baseDelayMs: 1000 });
      const delay2 = calculateBackoffDelay(2, { baseDelayMs: 1000 });
      const delay3 = calculateBackoffDelay(3, { baseDelayMs: 1000 });

      expect(delay0).toBe(1000);
      expect(delay1).toBe(2000);
      expect(delay2).toBe(4000);
      expect(delay3).toBe(8000);
    });
  });

  describe("max delay cap", () => {
    it("should cap delay at maxDelayMs", () => {
      const delay = calculateBackoffDelay(10, {
        baseDelayMs: 1000,
        maxDelayMs: 30000,
      });
      // 1000 * 2^10 = 1024000, but capped at 30000 + jitter
      // Max of (30000, 30000) = 30000, plus jitter of 500
      expect(delay).toBe(30500);
    });

    it("should not exceed 5 minutes (300000ms) by default", () => {
      const delay = calculateBackoffDelay(20); // Would be huge without cap
      // Should be capped at 300000 + jitter
      expect(delay).toBeLessThanOrEqual(301000);
    });

    it("should apply cap before adding jitter", () => {
      vi.spyOn(Math, "random").mockReturnValue(1); // Max jitter

      const delay = calculateBackoffDelay(15, {
        baseDelayMs: 1000,
        maxDelayMs: 10000,
      });

      // Capped at 10000, plus max jitter of 1000
      expect(delay).toBe(11000);
    });
  });

  describe("jitter", () => {
    it("should add random jitter to prevent thundering herd", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.25);

      const delay = calculateBackoffDelay(0, {
        baseDelayMs: 1000,
        jitterMs: 2000,
      });

      // 1000 + (0.25 * 2000) = 1000 + 500 = 1500
      expect(delay).toBe(1500);
    });

    it("should use default jitter of 1000ms", () => {
      vi.spyOn(Math, "random").mockReturnValue(1);

      const delay = calculateBackoffDelay(0, { baseDelayMs: 1000 });

      // 1000 + (1 * 1000) = 2000
      expect(delay).toBe(2000);
    });

    it("should handle zero jitter", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const delay = calculateBackoffDelay(0, {
        baseDelayMs: 1000,
        jitterMs: 0,
      });

      expect(delay).toBe(1000);
    });

    it("should vary delay based on random value", () => {
      const config: BackoffConfig = { baseDelayMs: 1000 };

      vi.spyOn(Math, "random").mockReturnValue(0);
      const delayNoJitter = calculateBackoffDelay(0, config);

      vi.spyOn(Math, "random").mockReturnValue(1);
      const delayMaxJitter = calculateBackoffDelay(0, config);

      expect(delayMaxJitter - delayNoJitter).toBe(1000);
    });
  });

  describe("custom base delay", () => {
    it("should use custom base delay", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      const delay = calculateBackoffDelay(0, { baseDelayMs: 500 });

      expect(delay).toBe(500);
    });

    it("should scale exponentially from custom base", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      const delay = calculateBackoffDelay(3, { baseDelayMs: 500 });

      // 500 * 2^3 = 4000
      expect(delay).toBe(4000);
    });
  });

  describe("default configuration", () => {
    it("should export default configuration", () => {
      expect(DEFAULT_BACKOFF_CONFIG).toEqual({
        baseDelayMs: 1000,
        maxDelayMs: 300000,
        jitterMs: 1000,
      });
    });

    it("should use defaults when no config provided", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      const delay = calculateBackoffDelay(0);

      expect(delay).toBe(1000);
    });
  });

  describe("edge cases", () => {
    it("should handle negative retry count as 0", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      const delay = calculateBackoffDelay(-1, { baseDelayMs: 1000 });

      // Should treat as retry 0
      expect(delay).toBe(1000);
    });

    it("should return integer milliseconds", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.333);

      const delay = calculateBackoffDelay(0, { baseDelayMs: 1000 });

      expect(Number.isInteger(delay)).toBe(true);
    });

    it("should handle very large retry counts gracefully", () => {
      const delay = calculateBackoffDelay(100, {
        baseDelayMs: 1000,
        maxDelayMs: 300000,
      });

      // Should be capped at max + jitter
      expect(delay).toBeLessThanOrEqual(301000);
    });
  });
});
