/**
 * generateStaticParams Tests
 *
 * Tests that verify the generateStaticParams function returns
 * correct locale params for static generation.
 */

import { describe, it, expect } from "vitest";
import { locales } from "../config";

describe("generateStaticParams", () => {
  // Simulates the function exported from [locale]/layout.tsx
  function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
  }

  it("should return an array of locale params", () => {
    const params = generateStaticParams();
    expect(Array.isArray(params)).toBe(true);
    expect(params).toHaveLength(1);
  });

  it("should include English as the only locale", () => {
    const params = generateStaticParams();
    const localeValues = params.map((p) => p.locale);

    expect(localeValues).toContain("en");
    expect(localeValues).toHaveLength(1);
  });

  it("should have correct param structure for each locale", () => {
    const params = generateStaticParams();

    params.forEach((param) => {
      expect(param).toHaveProperty("locale");
      expect(typeof param.locale).toBe("string");
      expect(locales).toContain(param.locale);
    });
  });

  it("should be usable for Next.js static generation", () => {
    const params = generateStaticParams();

    // Verify the structure matches what Next.js expects
    // Currently English-only
    expect(params).toEqual([{ locale: "en" }]);
  });
});
