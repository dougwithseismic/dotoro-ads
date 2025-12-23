import { describe, it, expect } from "vitest";
import {
  PLATFORM_LIMITS,
  truncateText,
  truncateToWordBoundary,
  getFieldLimit,
  checkFieldLength,
  checkAllFieldLengths,
  type Platform,
  type FallbackStrategy,
  type FieldLengthResult,
  type AllFieldsLengthResult,
} from "../platform-constraints.js";

describe("platform-constraints", () => {
  describe("PLATFORM_LIMITS", () => {
    it("defines limits for google platform", () => {
      expect(PLATFORM_LIMITS.google).toBeDefined();
      expect(PLATFORM_LIMITS.google.headline).toBe(30);
      expect(PLATFORM_LIMITS.google.description).toBe(90);
      expect(PLATFORM_LIMITS.google.displayUrl).toBe(30); // path1 (15) + path2 (15)
    });

    it("defines limits for facebook platform", () => {
      expect(PLATFORM_LIMITS.facebook).toBeDefined();
      expect(PLATFORM_LIMITS.facebook.headline).toBe(40);
      expect(PLATFORM_LIMITS.facebook.primaryText).toBe(125);
      expect(PLATFORM_LIMITS.facebook.description).toBe(30);
    });

    it("defines limits for reddit platform", () => {
      expect(PLATFORM_LIMITS.reddit).toBeDefined();
      expect(PLATFORM_LIMITS.reddit.title).toBe(300);
      expect(PLATFORM_LIMITS.reddit.text).toBe(500);
    });
  });

  describe("truncateText", () => {
    it("returns original text if within limit", () => {
      const text = "Short text";
      expect(truncateText(text, 30)).toBe("Short text");
    });

    it("truncates text and adds ellipsis when exceeding limit", () => {
      const text = "This is a very long headline that exceeds the limit";
      const result = truncateText(text, 30);
      expect(result.length).toBe(30);
      expect(result.endsWith("...")).toBe(true);
      expect(result).toBe("This is a very long headlin...");
    });

    it("handles empty string", () => {
      expect(truncateText("", 30)).toBe("");
    });

    it("handles text exactly at the limit", () => {
      const text = "Exactly thirty characters ok!";
      expect(text.length).toBe(29); // less than 30
      expect(truncateText(text, 30)).toBe(text);
    });

    it("handles very short limits", () => {
      const text = "Hello world";
      const result = truncateText(text, 5);
      expect(result.length).toBe(5);
      expect(result).toBe("He...");
    });

    it("handles limit less than ellipsis length", () => {
      const text = "Hello";
      const result = truncateText(text, 2);
      // When limit is less than 3, we still need to fit something
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it("handles unicode characters correctly", () => {
      const text = "This is a test with emoji: hey there nice work";
      const result = truncateText(text, 25);
      expect(result.length).toBe(25);
      expect(result.endsWith("...")).toBe(true);
    });
  });

  describe("truncateToWordBoundary", () => {
    it("returns original text if within limit", () => {
      const text = "Short text";
      expect(truncateToWordBoundary(text, 30)).toBe("Short text");
    });

    it("truncates at word boundary", () => {
      const text = "This is a very long headline that exceeds the limit";
      const result = truncateToWordBoundary(text, 30);
      // Should break at a word boundary + ellipsis
      expect(result.length).toBeLessThanOrEqual(30);
      expect(result.endsWith("...")).toBe(true);
      // Should not cut mid-word
      expect(result).toBe("This is a very long...");
    });

    it("handles single long word", () => {
      const text = "Supercalifragilisticexpialidocious";
      const result = truncateToWordBoundary(text, 15);
      // When a single word is too long, fall back to character truncation
      expect(result.length).toBeLessThanOrEqual(15);
      expect(result.endsWith("...")).toBe(true);
    });

    it("handles empty string", () => {
      expect(truncateToWordBoundary("", 30)).toBe("");
    });

    it("handles text with multiple spaces", () => {
      const text = "Word1  Word2   Word3 Word4 Word5";
      const result = truncateToWordBoundary(text, 15);
      expect(result.length).toBeLessThanOrEqual(15);
      expect(result.endsWith("...")).toBe(true);
    });

    it("preserves text exactly at limit if it ends at word boundary", () => {
      const text = "Hello world";
      expect(truncateToWordBoundary(text, 11)).toBe("Hello world");
    });
  });

  describe("getFieldLimit", () => {
    it("returns correct limit for google headline", () => {
      expect(getFieldLimit("google", "headline")).toBe(30);
    });

    it("returns correct limit for google description", () => {
      expect(getFieldLimit("google", "description")).toBe(90);
    });

    it("returns correct limit for google displayUrl", () => {
      expect(getFieldLimit("google", "displayUrl")).toBe(30); // path1 (15) + path2 (15)
    });

    it("returns correct limit for facebook headline", () => {
      expect(getFieldLimit("facebook", "headline")).toBe(40);
    });

    it("returns correct limit for facebook primaryText", () => {
      expect(getFieldLimit("facebook", "primaryText")).toBe(125);
    });

    it("returns correct limit for facebook description", () => {
      expect(getFieldLimit("facebook", "description")).toBe(30);
    });

    it("returns correct limit for reddit title", () => {
      expect(getFieldLimit("reddit", "title")).toBe(300);
    });

    it("returns correct limit for reddit text", () => {
      expect(getFieldLimit("reddit", "text")).toBe(500);
    });

    it("returns undefined for unknown field", () => {
      expect(getFieldLimit("google", "unknownField")).toBeUndefined();
    });

    it("returns undefined for unknown platform", () => {
      expect(getFieldLimit("unknownPlatform" as Platform, "headline")).toBeUndefined();
    });
  });

  describe("checkFieldLength", () => {
    it("returns valid when text is within limit", () => {
      const result = checkFieldLength("Short headline", "google", "headline");
      expect(result.valid).toBe(true);
      expect(result.overflow).toBe(0);
      expect(result.length).toBe(14);
      expect(result.limit).toBe(30);
    });

    it("returns invalid with overflow when text exceeds limit", () => {
      const longText = "This is a very long headline that exceeds the thirty character limit";
      const result = checkFieldLength(longText, "google", "headline");
      expect(result.valid).toBe(false);
      expect(result.overflow).toBe(longText.length - 30);
      expect(result.length).toBe(longText.length);
      expect(result.limit).toBe(30);
    });

    it("returns valid for unknown field (no limit)", () => {
      const result = checkFieldLength("Any text", "google", "unknownField");
      expect(result.valid).toBe(true);
      expect(result.overflow).toBe(0);
      expect(result.limit).toBeUndefined();
    });

    it("returns valid for unknown platform (no limit)", () => {
      const result = checkFieldLength("Any text", "unknownPlatform" as Platform, "headline");
      expect(result.valid).toBe(true);
      expect(result.overflow).toBe(0);
      expect(result.limit).toBeUndefined();
    });

    it("handles empty string", () => {
      const result = checkFieldLength("", "google", "headline");
      expect(result.valid).toBe(true);
      expect(result.overflow).toBe(0);
      expect(result.length).toBe(0);
    });

    it("handles text exactly at limit", () => {
      const text = "A".repeat(30);
      const result = checkFieldLength(text, "google", "headline");
      expect(result.valid).toBe(true);
      expect(result.overflow).toBe(0);
      expect(result.length).toBe(30);
    });
  });

  describe("checkAllFieldLengths", () => {
    it("returns all valid when all fields are within limits", () => {
      const ad = {
        headline: "Short headline",
        description: "A short description",
      };

      const result = checkAllFieldLengths(ad, "google");
      expect(result.allValid).toBe(true);
      expect(result.totalOverflow).toBe(0);
      expect(result.invalidFields).toHaveLength(0);
      expect(result.fields.headline.valid).toBe(true);
      expect(result.fields.description.valid).toBe(true);
    });

    it("returns invalid when headline exceeds limit", () => {
      const ad = {
        headline: "This is a very long headline that exceeds the thirty character limit for Google Ads",
        description: "A short description",
      };

      const result = checkAllFieldLengths(ad, "google");
      expect(result.allValid).toBe(false);
      expect(result.totalOverflow).toBeGreaterThan(0);
      expect(result.invalidFields).toContain("headline");
      expect(result.fields.headline.valid).toBe(false);
      expect(result.fields.description.valid).toBe(true);
    });

    it("returns invalid when description exceeds limit", () => {
      const ad = {
        headline: "Short headline",
        description: "A".repeat(100), // Exceeds 90 character limit for Google
      };

      const result = checkAllFieldLengths(ad, "google");
      expect(result.allValid).toBe(false);
      expect(result.totalOverflow).toBe(10); // 100 - 90
      expect(result.invalidFields).toContain("description");
    });

    it("returns invalid when multiple fields exceed limits", () => {
      const ad = {
        headline: "A".repeat(40), // Exceeds 30 limit
        description: "B".repeat(100), // Exceeds 90 limit
      };

      const result = checkAllFieldLengths(ad, "google");
      expect(result.allValid).toBe(false);
      expect(result.totalOverflow).toBe(10 + 10); // 10 + 10
      expect(result.invalidFields).toHaveLength(2);
      expect(result.invalidFields).toContain("headline");
      expect(result.invalidFields).toContain("description");
    });

    it("handles optional displayUrl field", () => {
      const ad = {
        headline: "Short headline",
        description: "Description",
        displayUrl: "A".repeat(50), // Exceeds 35 limit
      };

      const result = checkAllFieldLengths(ad, "google");
      expect(result.allValid).toBe(false);
      expect(result.invalidFields).toContain("displayUrl");
    });

    it("handles facebook platform with different limits", () => {
      const ad = {
        headline: "A".repeat(45), // Exceeds 40 limit for Facebook
        description: "Short",
      };

      const result = checkAllFieldLengths(ad, "facebook");
      expect(result.allValid).toBe(false);
      expect(result.invalidFields).toContain("headline");
      expect(result.fields.headline.limit).toBe(40);
    });

    it("handles reddit platform with larger limits", () => {
      const ad = {
        headline: "A".repeat(250), // Within 300 limit for Reddit title
        description: "Short description",
      };

      // Reddit uses "title" not "headline", but our interface maps it
      const result = checkAllFieldLengths(ad, "reddit");
      // For reddit, headline maps to title (300 char limit)
      expect(result.fields.headline.valid).toBe(true);
    });

    it("handles empty ad object", () => {
      const ad = {
        headline: "",
        description: "",
      };

      const result = checkAllFieldLengths(ad, "google");
      expect(result.allValid).toBe(true);
      expect(result.totalOverflow).toBe(0);
    });

    it("skips undefined optional fields", () => {
      const ad = {
        headline: "Short",
        description: "Description",
        displayUrl: undefined,
        finalUrl: undefined,
      };

      const result = checkAllFieldLengths(ad, "google");
      expect(result.allValid).toBe(true);
      // Should only check defined fields
      expect(result.fields.displayUrl).toBeUndefined();
    });
  });

  describe("integration scenarios", () => {
    it("validates a typical Google Ads campaign", () => {
      const ads = [
        { headline: "Buy Nike Shoes Today", description: "Get the best deals on Nike Air Max. Free shipping on orders over $50." },
        { headline: "Premium Running Gear", description: "Shop our collection of top-rated running shoes and apparel." },
      ];

      for (const ad of ads) {
        const result = checkAllFieldLengths(ad, "google");
        expect(result.allValid).toBe(true);
      }
    });

    it("identifies problematic ads in a campaign", () => {
      const ads = [
        { headline: "OK", description: "Fine" },
        { headline: "This headline is way too long for any platform", description: "OK" },
        { headline: "Good", description: "This description is incredibly long and will definitely exceed the ninety character limit set for Google Ads descriptions." },
      ];

      const results = ads.map((ad, index) => ({
        index,
        ...checkAllFieldLengths(ad, "google"),
      }));

      expect(results[0]?.allValid).toBe(true);
      expect(results[1]?.allValid).toBe(false);
      expect(results[1]?.invalidFields).toContain("headline");
      expect(results[2]?.allValid).toBe(false);
      expect(results[2]?.invalidFields).toContain("description");
    });

    it("truncates long text with word boundary preservation", () => {
      const longHeadline = "Get Amazing Deals on Premium Products Today";
      const truncated = truncateToWordBoundary(longHeadline, 30);

      expect(truncated.length).toBeLessThanOrEqual(30);
      expect(truncated.endsWith("...")).toBe(true);
      // Should break at word boundary
      expect(truncated).toBe("Get Amazing Deals on...");
    });

    it("provides accurate overflow counts for reporting", () => {
      const ad = {
        headline: "X".repeat(35), // 5 over limit (30)
        description: "Y".repeat(95), // 5 over limit (90)
        displayUrl: "Z".repeat(40), // 10 over limit (30)
      };

      const result = checkAllFieldLengths(ad, "google");
      expect(result.totalOverflow).toBe(20); // 5 + 5 + 10
      expect(result.fields.headline.overflow).toBe(5);
      expect(result.fields.description.overflow).toBe(5);
      expect(result.fields.displayUrl?.overflow).toBe(10);
    });
  });
});
