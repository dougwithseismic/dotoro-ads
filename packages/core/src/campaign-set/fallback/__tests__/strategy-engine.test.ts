/**
 * Fallback Strategy Engine Tests
 *
 * Tests for the FallbackStrategyEngine that handles ads exceeding platform limits.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { FallbackStrategyEngine } from "../strategy-engine.js";
import type { Ad } from "../../types.js";
import type { ValidationError } from "../../validation/types.js";
import { ValidationErrorCode } from "../../validation/types.js";
import type {
  FallbackAdDefinition,
  TruncationConfig,
  StrategyContext,
} from "../types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function createMockAd(overrides: Partial<Ad> = {}): Ad {
  return {
    id: "ad-1",
    adGroupId: "adgroup-1",
    orderIndex: 0,
    headline: "Test Headline",
    description: "Test Description",
    displayUrl: "example.com",
    finalUrl: "https://example.com",
    callToAction: "Learn More",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockContext(): StrategyContext {
  return {
    campaignId: "campaign-1",
    adGroupId: "adgroup-1",
    platform: "reddit",
  };
}

function createFieldTooLongError(
  field: string,
  overflow: number,
  value: string
): ValidationError {
  return {
    entityType: "ad",
    entityId: "ad-1",
    entityName: "Test Ad",
    field,
    message: `${field} exceeds maximum length by ${overflow} characters`,
    code: ValidationErrorCode.FIELD_TOO_LONG,
    value,
    expected: field === "headline" ? "100" : field === "description" ? "500" : "25",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe("FallbackStrategyEngine", () => {
  describe("Skip Strategy", () => {
    it("should skip ad and return skip record when FIELD_TOO_LONG error exists", () => {
      const engine = new FallbackStrategyEngine({
        strategy: "skip",
      });

      const ad = createMockAd({ headline: "A".repeat(150) });
      const errors = [createFieldTooLongError("headline", 50, "A".repeat(150))];
      const context = createMockContext();

      const result = engine.applyStrategy(ad, errors, context);

      expect(result.action).toBe("skip");
      expect(result.skippedRecord).toBeDefined();
      expect(result.skippedRecord?.adId).toBe("ad-1");
      expect(result.skippedRecord?.fields).toContain("headline");
      expect(result.skippedRecord?.overflow.headline).toBe(50);
      expect(result.skippedRecord?.reason).toContain("headline");
    });

    it("should skip ad with multiple field errors", () => {
      const engine = new FallbackStrategyEngine({
        strategy: "skip",
      });

      const ad = createMockAd({
        headline: "A".repeat(150),
        description: "B".repeat(600),
      });
      const errors = [
        createFieldTooLongError("headline", 50, "A".repeat(150)),
        createFieldTooLongError("description", 100, "B".repeat(600)),
      ];
      const context = createMockContext();

      const result = engine.applyStrategy(ad, errors, context);

      expect(result.action).toBe("skip");
      expect(result.skippedRecord?.fields).toContain("headline");
      expect(result.skippedRecord?.fields).toContain("description");
    });

    it("should sync ad when no FIELD_TOO_LONG errors exist", () => {
      const engine = new FallbackStrategyEngine({
        strategy: "skip",
      });

      const ad = createMockAd();
      const errors: ValidationError[] = [];
      const context = createMockContext();

      const result = engine.applyStrategy(ad, errors, context);

      expect(result.action).toBe("sync");
      expect(result.ad).toBe(ad);
      expect(result.skippedRecord).toBeUndefined();
    });

    it("should not skip for non-length errors", () => {
      const engine = new FallbackStrategyEngine({
        strategy: "skip",
      });

      const ad = createMockAd();
      const errors: ValidationError[] = [
        {
          entityType: "ad",
          entityId: "ad-1",
          entityName: "Test Ad",
          field: "finalUrl",
          message: "Invalid URL format",
          code: ValidationErrorCode.INVALID_URL,
        },
      ];
      const context = createMockContext();

      const result = engine.applyStrategy(ad, errors, context);

      // Non-length errors are passed through to sync (will fail at platform level)
      expect(result.action).toBe("sync");
    });
  });

  describe("Truncate Strategy", () => {
    it("should truncate headline to fit within Reddit limits", () => {
      const engine = new FallbackStrategyEngine({
        strategy: "truncate",
        truncationConfig: {
          truncateHeadline: true,
          truncateDescription: true,
          preserveWordBoundary: false,
        },
      });

      const longHeadline = "A".repeat(150);
      const ad = createMockAd({ headline: longHeadline });
      const errors = [createFieldTooLongError("headline", 50, longHeadline)];
      const context = createMockContext();

      const result = engine.applyStrategy(ad, errors, context);

      expect(result.action).toBe("sync");
      expect(result.wasTruncated).toBe(true);
      // Reddit title limit is 300, but we're using headline field which maps to title
      expect(result.ad.headline!.length).toBeLessThanOrEqual(300);
    });

    it("should truncate description to fit within limits", () => {
      const engine = new FallbackStrategyEngine({
        strategy: "truncate",
        truncationConfig: {
          truncateHeadline: true,
          truncateDescription: true,
          preserveWordBoundary: false,
        },
      });

      const longDescription = "B".repeat(600);
      const ad = createMockAd({ description: longDescription });
      const errors = [createFieldTooLongError("description", 100, longDescription)];
      const context = createMockContext();

      const result = engine.applyStrategy(ad, errors, context);

      expect(result.action).toBe("sync");
      expect(result.wasTruncated).toBe(true);
      // Reddit text limit is 500
      expect(result.ad.description!.length).toBeLessThanOrEqual(500);
    });

    it("should preserve word boundaries when configured", () => {
      const engine = new FallbackStrategyEngine({
        strategy: "truncate",
        truncationConfig: {
          truncateHeadline: true,
          truncateDescription: true,
          preserveWordBoundary: true,
        },
      });

      // Create a headline that exceeds Reddit's 300 char limit
      // and ends mid-word at the limit point
      const headline = "Hello world this is a test headline " + "word ".repeat(60);
      expect(headline.length).toBeGreaterThan(300); // Verify it exceeds limit
      const ad = createMockAd({ headline });
      const errors = [createFieldTooLongError("headline", headline.length - 300, headline)];
      const context = createMockContext();

      const result = engine.applyStrategy(ad, errors, context);

      expect(result.action).toBe("sync");
      expect(result.wasTruncated).toBe(true);
      // Should end with ellipsis (...)
      expect(result.ad.headline).toMatch(/\.\.\.$/);
      // And the total length should be at or under limit
      expect(result.ad.headline!.length).toBeLessThanOrEqual(300);
    });

    it("should not truncate finalUrl (must remain valid)", () => {
      const engine = new FallbackStrategyEngine({
        strategy: "truncate",
        truncationConfig: {
          truncateHeadline: true,
          truncateDescription: true,
          preserveWordBoundary: true,
        },
      });

      const ad = createMockAd({ finalUrl: "https://example.com/very/long/path" });
      const errors: ValidationError[] = [
        {
          entityType: "ad",
          entityId: "ad-1",
          entityName: "Test Ad",
          field: "finalUrl",
          message: "finalUrl exceeds maximum length",
          code: ValidationErrorCode.FIELD_TOO_LONG,
          value: ad.finalUrl,
        },
      ];
      const context = createMockContext();

      // finalUrl cannot be truncated, so should skip
      const result = engine.applyStrategy(ad, errors, context);

      expect(result.action).toBe("skip");
    });

    it("should skip if truncation is disabled for the failing field", () => {
      const engine = new FallbackStrategyEngine({
        strategy: "truncate",
        truncationConfig: {
          truncateHeadline: false, // Disabled
          truncateDescription: true,
          preserveWordBoundary: true,
        },
      });

      const ad = createMockAd({ headline: "A".repeat(150) });
      const errors = [createFieldTooLongError("headline", 50, "A".repeat(150))];
      const context = createMockContext();

      const result = engine.applyStrategy(ad, errors, context);

      expect(result.action).toBe("skip");
    });
  });

  describe("Use Fallback Strategy", () => {
    const fallbackAd: FallbackAdDefinition = {
      headline: "Default Headline",
      description: "Default description for fallback.",
      displayUrl: "example.com",
      finalUrl: "https://example.com/fallback",
      callToAction: "Learn More",
    };

    it("should use fallback ad when FIELD_TOO_LONG error exists", () => {
      const engine = new FallbackStrategyEngine({
        strategy: "use_fallback",
        fallbackAd,
      });

      const ad = createMockAd({ headline: "A".repeat(150) });
      const errors = [createFieldTooLongError("headline", 50, "A".repeat(150))];
      const context = createMockContext();

      const result = engine.applyStrategy(ad, errors, context);

      expect(result.action).toBe("fallback");
      expect(result.usedFallback).toBe(true);
      expect(result.ad.headline).toBe(fallbackAd.headline);
      expect(result.ad.description).toBe(fallbackAd.description);
      expect(result.ad.finalUrl).toBe(fallbackAd.finalUrl);
      // Should preserve original ad's IDs and metadata
      expect(result.ad.id).toBe(ad.id);
      expect(result.ad.adGroupId).toBe(ad.adGroupId);
    });

    it("should throw error if fallback strategy selected without fallback ad", () => {
      expect(() => {
        new FallbackStrategyEngine({
          strategy: "use_fallback",
          // No fallbackAd provided
        });
      }).toThrow("Fallback ad must be provided when using 'use_fallback' strategy");
    });

    it("should sync original ad when no errors exist", () => {
      const engine = new FallbackStrategyEngine({
        strategy: "use_fallback",
        fallbackAd,
      });

      const ad = createMockAd();
      const errors: ValidationError[] = [];
      const context = createMockContext();

      const result = engine.applyStrategy(ad, errors, context);

      expect(result.action).toBe("sync");
      expect(result.usedFallback).toBeFalsy();
      expect(result.ad).toBe(ad);
    });
  });

  describe("Platform-Specific Limits", () => {
    it("should use Google Ads limits when platform is google", () => {
      const engine = new FallbackStrategyEngine({
        strategy: "truncate",
        truncationConfig: {
          truncateHeadline: true,
          truncateDescription: true,
          preserveWordBoundary: false,
        },
      });

      const longHeadline = "A".repeat(50);
      const ad = createMockAd({ headline: longHeadline });
      const errors = [createFieldTooLongError("headline", 20, longHeadline)];
      const context: StrategyContext = {
        ...createMockContext(),
        platform: "google",
      };

      const result = engine.applyStrategy(ad, errors, context);

      expect(result.action).toBe("sync");
      expect(result.wasTruncated).toBe(true);
      // Google Ads headline limit is 30
      expect(result.ad.headline!.length).toBeLessThanOrEqual(30);
    });
  });

  describe("hasLengthErrors helper", () => {
    it("should return true when FIELD_TOO_LONG errors exist", () => {
      const engine = new FallbackStrategyEngine({ strategy: "skip" });
      const errors = [createFieldTooLongError("headline", 50, "A".repeat(150))];

      expect(engine.hasLengthErrors(errors)).toBe(true);
    });

    it("should return false when no FIELD_TOO_LONG errors exist", () => {
      const engine = new FallbackStrategyEngine({ strategy: "skip" });
      const errors: ValidationError[] = [
        {
          entityType: "ad",
          entityId: "ad-1",
          entityName: "Test Ad",
          field: "finalUrl",
          message: "Invalid URL format",
          code: ValidationErrorCode.INVALID_URL,
        },
      ];

      expect(engine.hasLengthErrors(errors)).toBe(false);
    });

    it("should return false for empty errors array", () => {
      const engine = new FallbackStrategyEngine({ strategy: "skip" });

      expect(engine.hasLengthErrors([])).toBe(false);
    });
  });

  describe("getLengthErrors helper", () => {
    it("should filter to only FIELD_TOO_LONG errors", () => {
      const engine = new FallbackStrategyEngine({ strategy: "skip" });
      const lengthError = createFieldTooLongError("headline", 50, "A".repeat(150));
      const urlError: ValidationError = {
        entityType: "ad",
        entityId: "ad-1",
        entityName: "Test Ad",
        field: "finalUrl",
        message: "Invalid URL format",
        code: ValidationErrorCode.INVALID_URL,
      };

      const errors = [lengthError, urlError];
      const lengthErrors = engine.getLengthErrors(errors);

      expect(lengthErrors).toHaveLength(1);
      expect(lengthErrors[0]).toBe(lengthError);
    });
  });
});

describe("FallbackStrategyEngine - Edge Cases", () => {
  it("should handle ad with undefined headline", () => {
    const engine = new FallbackStrategyEngine({
      strategy: "truncate",
      truncationConfig: {
        truncateHeadline: true,
        truncateDescription: true,
        preserveWordBoundary: false,
      },
    });

    const ad = createMockAd({ headline: undefined });
    const errors: ValidationError[] = [];
    const context = createMockContext();

    const result = engine.applyStrategy(ad, errors, context);

    expect(result.action).toBe("sync");
    expect(result.ad.headline).toBeUndefined();
  });

  it("should handle ad with empty string fields", () => {
    const engine = new FallbackStrategyEngine({
      strategy: "skip",
    });

    const ad = createMockAd({ headline: "", description: "" });
    const errors: ValidationError[] = [];
    const context = createMockContext();

    const result = engine.applyStrategy(ad, errors, context);

    expect(result.action).toBe("sync");
  });
});
