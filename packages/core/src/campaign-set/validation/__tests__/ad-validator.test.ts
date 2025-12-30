/**
 * Ad Validator Tests
 */

import { describe, it, expect } from "vitest";
import { AdValidator } from "../validators/ad-validator.js";
import { ValidationErrorCode } from "../types.js";
import type { Ad } from "../../types.js";

// Helper to create a valid ad for testing
function createValidAd(overrides: Partial<Ad> = {}): Ad {
  return {
    id: "ad-1",
    adGroupId: "ag-1",
    orderIndex: 0,
    headline: "Test Headline",
    description: "Test description for the ad",
    displayUrl: "example.com",
    finalUrl: "https://example.com/landing",
    callToAction: "LEARN_MORE",
    assets: null,
    platformAdId: null,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("AdValidator", () => {
  const validator = new AdValidator();

  describe("valid ads", () => {
    it("passes validation for a complete valid ad", () => {
      const ad = createValidAd();
      const errors = validator.validate(ad);
      expect(errors).toHaveLength(0);
    });

    it("passes validation with all call-to-action values", () => {
      const ctaValues = [
        "LEARN_MORE",
        "SIGN_UP",
        "SHOP_NOW",
        "DOWNLOAD",
        "INSTALL",
        "GET_QUOTE",
        "CONTACT_US",
        "BOOK_NOW",
        "APPLY_NOW",
        "WATCH_MORE",
        "GET_STARTED",
        "SUBSCRIBE",
        "ORDER_NOW",
        "SEE_MORE",
        "VIEW_MORE",
        "PLAY_NOW",
      ];

      for (const cta of ctaValues) {
        const ad = createValidAd({ callToAction: cta });
        const errors = validator.validate(ad);
        const ctaErrors = errors.filter((e) => e.field === "call_to_action");
        expect(ctaErrors).toHaveLength(0);
      }
    });
  });

  describe("click_url validation", () => {
    it("fails when click_url (finalUrl) is missing", () => {
      const ad = createValidAd({ finalUrl: null });
      const errors = validator.validate(ad);

      const urlError = errors.find((e) => e.field === "click_url");
      expect(urlError).toBeDefined();
      expect(urlError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("fails when click_url is empty", () => {
      const ad = createValidAd({ finalUrl: "" });
      const errors = validator.validate(ad);

      const urlError = errors.find((e) => e.field === "click_url");
      expect(urlError).toBeDefined();
      expect(urlError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("fails for invalid URL format", () => {
      const ad = createValidAd({ finalUrl: "not-a-url" });
      const errors = validator.validate(ad);

      const urlError = errors.find((e) => e.field === "click_url");
      expect(urlError).toBeDefined();
      expect(urlError!.code).toBe(ValidationErrorCode.INVALID_URL);
    });

    it("fails for FTP URL (not HTTP/HTTPS)", () => {
      const ad = createValidAd({ finalUrl: "ftp://example.com/file" });
      const errors = validator.validate(ad);

      const urlError = errors.find((e) => e.field === "click_url");
      expect(urlError).toBeDefined();
      expect(urlError!.code).toBe(ValidationErrorCode.INVALID_URL);
    });

    it("passes for valid HTTP URL", () => {
      const ad = createValidAd({ finalUrl: "http://example.com/path" });
      const errors = validator.validate(ad);

      const urlError = errors.find((e) => e.field === "click_url");
      expect(urlError).toBeUndefined();
    });

    it("passes for valid HTTPS URL with query params", () => {
      const ad = createValidAd({
        finalUrl: "https://example.com/landing?utm_source=reddit&utm_campaign=test",
      });
      const errors = validator.validate(ad);

      const urlError = errors.find((e) => e.field === "click_url");
      expect(urlError).toBeUndefined();
    });
  });

  describe("headline validation", () => {
    it("fails when headline exceeds 100 characters", () => {
      const ad = createValidAd({ headline: "a".repeat(101) });
      const errors = validator.validate(ad);

      const headlineError = errors.find((e) => e.field === "headline");
      expect(headlineError).toBeDefined();
      expect(headlineError!.code).toBe(ValidationErrorCode.FIELD_TOO_LONG);
    });

    it("passes with exactly 100 characters", () => {
      const ad = createValidAd({ headline: "a".repeat(100) });
      const errors = validator.validate(ad);

      const headlineError = errors.find((e) => e.field === "headline");
      expect(headlineError).toBeUndefined();
    });

    it("passes when headline is not set", () => {
      const ad = createValidAd({ headline: null });
      const errors = validator.validate(ad);

      const headlineError = errors.find((e) => e.field === "headline");
      expect(headlineError).toBeUndefined();
    });
  });

  describe("body (description) validation", () => {
    it("fails when body exceeds 500 characters", () => {
      const ad = createValidAd({ description: "a".repeat(501) });
      const errors = validator.validate(ad);

      const bodyError = errors.find((e) => e.field === "body");
      expect(bodyError).toBeDefined();
      expect(bodyError!.code).toBe(ValidationErrorCode.FIELD_TOO_LONG);
    });

    it("passes with exactly 500 characters", () => {
      const ad = createValidAd({ description: "a".repeat(500) });
      const errors = validator.validate(ad);

      const bodyError = errors.find((e) => e.field === "body");
      expect(bodyError).toBeUndefined();
    });

    it("passes when body is not set", () => {
      const ad = createValidAd({ description: null });
      const errors = validator.validate(ad);

      const bodyError = errors.find((e) => e.field === "body");
      expect(bodyError).toBeUndefined();
    });
  });

  describe("display_url validation", () => {
    it("fails when display_url exceeds 25 characters", () => {
      const ad = createValidAd({ displayUrl: "a".repeat(26) });
      const errors = validator.validate(ad);

      const displayError = errors.find((e) => e.field === "display_url");
      expect(displayError).toBeDefined();
      expect(displayError!.code).toBe(ValidationErrorCode.FIELD_TOO_LONG);
    });

    it("passes with exactly 25 characters", () => {
      const ad = createValidAd({ displayUrl: "a".repeat(25) });
      const errors = validator.validate(ad);

      const displayError = errors.find((e) => e.field === "display_url");
      expect(displayError).toBeUndefined();
    });
  });

  describe("call_to_action validation", () => {
    it("fails for invalid call_to_action", () => {
      const ad = createValidAd({ callToAction: "INVALID_CTA" });
      const errors = validator.validate(ad);

      const ctaError = errors.find((e) => e.field === "call_to_action");
      expect(ctaError).toBeDefined();
      expect(ctaError!.code).toBe(ValidationErrorCode.INVALID_ENUM_VALUE);
    });

    it("normalizes hyphenated and lowercase CTA values", () => {
      const ad = createValidAd({ callToAction: "learn-more" });
      const errors = validator.validate(ad);

      const ctaError = errors.find((e) => e.field === "call_to_action");
      expect(ctaError).toBeUndefined();
    });

    it("passes when call_to_action is not set", () => {
      const ad = createValidAd({ callToAction: null });
      const errors = validator.validate(ad);

      const ctaError = errors.find((e) => e.field === "call_to_action");
      expect(ctaError).toBeUndefined();
    });
  });

  describe("dependency validation", () => {
    it("fails when referencing non-existent ad group", () => {
      const ad = createValidAd({ adGroupId: "non-existent-ag" });
      const context = {
        validAdGroupIds: new Set(["ag-1", "ag-2"]),
      };
      const errors = validator.validate(ad, context);

      const depError = errors.find((e) => e.field === "ad_group_id");
      expect(depError).toBeDefined();
      expect(depError!.code).toBe(ValidationErrorCode.MISSING_DEPENDENCY);
    });

    it("passes when referencing existing ad group", () => {
      const ad = createValidAd({ adGroupId: "ag-1" });
      const context = {
        validAdGroupIds: new Set(["ag-1", "ag-2"]),
      };
      const errors = validator.validate(ad, context);

      const depError = errors.find((e) => e.field === "ad_group_id");
      expect(depError).toBeUndefined();
    });
  });

  describe("collects all errors", () => {
    it("collects multiple errors in a single pass", () => {
      const ad = createValidAd({
        finalUrl: "invalid-url",
        headline: "a".repeat(101),
        description: "a".repeat(501),
        displayUrl: "a".repeat(26),
        callToAction: "INVALID",
      });
      const errors = validator.validate(ad);

      // Should have 5 errors
      expect(errors.length).toBe(5);

      expect(errors.some((e) => e.field === "click_url")).toBe(true);
      expect(errors.some((e) => e.field === "headline")).toBe(true);
      expect(errors.some((e) => e.field === "body")).toBe(true);
      expect(errors.some((e) => e.field === "display_url")).toBe(true);
      expect(errors.some((e) => e.field === "call_to_action")).toBe(true);
    });
  });
});
