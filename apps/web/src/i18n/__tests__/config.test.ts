/**
 * i18n Configuration Tests
 *
 * Tests for the i18n configuration module ensuring:
 * - Correct locale definitions
 * - Default locale handling
 * - Locale validation utilities
 */

import { describe, it, expect } from "vitest";
import {
  locales,
  defaultLocale,
  localePrefix,
  isValidLocale,
  type Locale,
} from "../config";

describe("i18n config", () => {
  describe("locales", () => {
    it("should include English as the only supported locale", () => {
      expect(locales).toContain("en");
    });

    it("should have exactly 1 supported locale (English only)", () => {
      expect(locales).toHaveLength(1);
    });

    it("should be a readonly array", () => {
      // TypeScript ensures this at compile time, but we verify the structure
      expect(Array.isArray(locales)).toBe(true);
    });
  });

  describe("defaultLocale", () => {
    it("should be 'en'", () => {
      expect(defaultLocale).toBe("en");
    });

    it("should be included in locales array", () => {
      expect(locales).toContain(defaultLocale);
    });
  });

  describe("localePrefix", () => {
    it("should be 'as-needed' (default locale has no URL prefix)", () => {
      expect(localePrefix).toBe("as-needed");
    });
  });

  describe("isValidLocale", () => {
    it("should return true for English locale", () => {
      expect(isValidLocale("en")).toBe(true);
    });

    it("should return false for unsupported locales", () => {
      expect(isValidLocale("es")).toBe(false);
      expect(isValidLocale("fr")).toBe(false);
      expect(isValidLocale("de")).toBe(false);
      expect(isValidLocale("ja")).toBe(false);
      expect(isValidLocale("invalid")).toBe(false);
      expect(isValidLocale("zh")).toBe(false);
      expect(isValidLocale("EN")).toBe(false); // Case sensitive
      expect(isValidLocale("")).toBe(false);
    });

    it("should handle null and undefined gracefully", () => {
      expect(isValidLocale(null as unknown as string)).toBe(false);
      expect(isValidLocale(undefined as unknown as string)).toBe(false);
    });
  });

  describe("Locale type", () => {
    it("should type check correctly for English locale", () => {
      // This test verifies TypeScript compilation - if it compiles, the types work
      const en: Locale = "en";
      expect(en).toBe("en");
    });
  });
});
