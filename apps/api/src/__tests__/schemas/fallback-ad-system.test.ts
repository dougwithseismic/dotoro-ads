/**
 * Fallback Ad System Schema Tests
 *
 * Tests for the Zod schemas related to the fallback ad system.
 */

import { describe, it, expect } from "vitest";
import {
  campaignSetFallbackStrategySchema,
  fallbackAdDefinitionSchema,
  truncationConfigSchema,
  skippedAdRecordSchema,
} from "../../schemas/campaign-sets.js";

describe("Fallback Ad System Schemas", () => {
  describe("campaignSetFallbackStrategySchema", () => {
    it("should accept 'skip' strategy", () => {
      const result = campaignSetFallbackStrategySchema.safeParse("skip");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("skip");
      }
    });

    it("should accept 'truncate' strategy", () => {
      const result = campaignSetFallbackStrategySchema.safeParse("truncate");
      expect(result.success).toBe(true);
    });

    it("should accept 'use_fallback' strategy", () => {
      const result = campaignSetFallbackStrategySchema.safeParse("use_fallback");
      expect(result.success).toBe(true);
    });

    it("should reject invalid strategies", () => {
      const result = campaignSetFallbackStrategySchema.safeParse("invalid");
      expect(result.success).toBe(false);
    });
  });

  describe("fallbackAdDefinitionSchema", () => {
    it("should accept valid fallback ad", () => {
      const fallbackAd = {
        headline: "Shop Our Best Deals",
        description: "Find great products at amazing prices.",
        displayUrl: "example.com",
        finalUrl: "https://example.com/shop",
        callToAction: "Learn More",
      };

      const result = fallbackAdDefinitionSchema.safeParse(fallbackAd);
      expect(result.success).toBe(true);
    });

    it("should accept fallback ad without optional fields", () => {
      const fallbackAd = {
        headline: "Shop Our Best Deals",
        description: "Find great products at amazing prices.",
        finalUrl: "https://example.com/shop",
      };

      const result = fallbackAdDefinitionSchema.safeParse(fallbackAd);
      expect(result.success).toBe(true);
    });

    it("should reject fallback ad with variables in headline", () => {
      const fallbackAd = {
        headline: "Shop {product_name} Deals",
        description: "Find great products at amazing prices.",
        finalUrl: "https://example.com/shop",
      };

      const result = fallbackAdDefinitionSchema.safeParse(fallbackAd);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("variables");
      }
    });

    it("should reject fallback ad with variables in description", () => {
      const fallbackAd = {
        headline: "Shop Our Best Deals",
        description: "Find {category} at amazing prices.",
        finalUrl: "https://example.com/shop",
      };

      const result = fallbackAdDefinitionSchema.safeParse(fallbackAd);
      expect(result.success).toBe(false);
    });

    it("should reject fallback ad with variables in finalUrl", () => {
      const fallbackAd = {
        headline: "Shop Our Best Deals",
        description: "Find great products.",
        finalUrl: "https://example.com/{product_id}",
      };

      const result = fallbackAdDefinitionSchema.safeParse(fallbackAd);
      expect(result.success).toBe(false);
    });

    it("should reject fallback ad with invalid URL", () => {
      const fallbackAd = {
        headline: "Shop Our Best Deals",
        description: "Find great products.",
        finalUrl: "not-a-valid-url",
      };

      const result = fallbackAdDefinitionSchema.safeParse(fallbackAd);
      expect(result.success).toBe(false);
    });

    it("should reject headline that exceeds max length", () => {
      const fallbackAd = {
        headline: "A".repeat(301), // Max is 300
        description: "Find great products.",
        finalUrl: "https://example.com/shop",
      };

      const result = fallbackAdDefinitionSchema.safeParse(fallbackAd);
      expect(result.success).toBe(false);
    });

    it("should reject description that exceeds max length", () => {
      const fallbackAd = {
        headline: "Shop Now",
        description: "B".repeat(501), // Max is 500
        finalUrl: "https://example.com/shop",
      };

      const result = fallbackAdDefinitionSchema.safeParse(fallbackAd);
      expect(result.success).toBe(false);
    });

    it("should reject displayUrl that exceeds max length", () => {
      const fallbackAd = {
        headline: "Shop Now",
        description: "Great deals.",
        displayUrl: "a".repeat(26), // Max is 25
        finalUrl: "https://example.com/shop",
      };

      const result = fallbackAdDefinitionSchema.safeParse(fallbackAd);
      expect(result.success).toBe(false);
    });
  });

  describe("truncationConfigSchema", () => {
    it("should accept valid truncation config", () => {
      const config = {
        truncateHeadline: true,
        truncateDescription: true,
        preserveWordBoundary: true,
      };

      const result = truncationConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should apply default values", () => {
      const config = {};

      const result = truncationConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.truncateHeadline).toBe(true);
        expect(result.data.truncateDescription).toBe(true);
        expect(result.data.preserveWordBoundary).toBe(true);
      }
    });

    it("should allow disabling truncation for specific fields", () => {
      const config = {
        truncateHeadline: false,
        truncateDescription: true,
        preserveWordBoundary: false,
      };

      const result = truncationConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.truncateHeadline).toBe(false);
      }
    });
  });

  describe("skippedAdRecordSchema", () => {
    it("should accept valid skipped ad record", () => {
      const record = {
        adId: "ad-123",
        adGroupId: "adgroup-456",
        campaignId: "campaign-789",
        reason: "headline exceeds 100 character limit",
        fields: ["headline"],
        overflow: { headline: 50 },
        originalAd: {
          headline: "A".repeat(150),
          description: "Description text",
        },
        skippedAt: new Date().toISOString(),
      };

      const result = skippedAdRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it("should accept record with multiple fields", () => {
      const record = {
        adId: "ad-123",
        adGroupId: "adgroup-456",
        campaignId: "campaign-789",
        reason: "headline and description exceed limits",
        fields: ["headline", "description"],
        overflow: { headline: 50, description: 100 },
        originalAd: {
          headline: "A".repeat(150),
          description: "B".repeat(600),
          displayUrl: "example.com",
          finalUrl: "https://example.com",
        },
        skippedAt: new Date().toISOString(),
      };

      const result = skippedAdRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it("should accept record with optional originalAd fields", () => {
      const record = {
        adId: "ad-123",
        adGroupId: "adgroup-456",
        campaignId: "campaign-789",
        reason: "headline exceeds limit",
        fields: ["headline"],
        overflow: { headline: 50 },
        originalAd: {}, // All fields optional
        skippedAt: new Date().toISOString(),
      };

      const result = skippedAdRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it("should reject record without required fields", () => {
      const record = {
        adId: "ad-123",
        // Missing adGroupId, campaignId, etc.
      };

      const result = skippedAdRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });

    it("should reject record with invalid datetime format", () => {
      const record = {
        adId: "ad-123",
        adGroupId: "adgroup-456",
        campaignId: "campaign-789",
        reason: "headline exceeds limit",
        fields: ["headline"],
        overflow: { headline: 50 },
        originalAd: {},
        skippedAt: "not-a-date", // Invalid datetime
      };

      const result = skippedAdRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });
  });
});
