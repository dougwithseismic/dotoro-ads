/**
 * i18n Middleware Tests
 *
 * Tests for locale detection and routing middleware behavior.
 * Note: These are unit tests for middleware configuration.
 * Integration tests for actual request handling would need a test server.
 */

import { describe, it, expect } from "vitest";
import { middlewareConfig } from "../middleware-config";
import { locales, defaultLocale } from "../config";

describe("i18n middleware configuration", () => {
  describe("locales", () => {
    it("should use the same locales as config", () => {
      expect(middlewareConfig.locales).toEqual(locales);
    });
  });

  describe("defaultLocale", () => {
    it("should use the same default locale as config", () => {
      expect(middlewareConfig.defaultLocale).toBe(defaultLocale);
    });
  });

  describe("localePrefix", () => {
    it("should be set to 'as-needed' (default locale has no URL prefix)", () => {
      expect(middlewareConfig.localePrefix).toBe("as-needed");
    });
  });

  describe("localeDetection", () => {
    it("should be enabled by default", () => {
      // When not explicitly false, locale detection is enabled
      expect(middlewareConfig.localeDetection).not.toBe(false);
    });
  });
});

describe("middleware matcher patterns", () => {
  // Helper to test if a path would match the middleware matcher pattern
  const matcherPattern =
    /^(?!\/api|^\/_next|^\/_vercel|^\/favicon\.ico|^\/robots\.txt|^\/sitemap\.xml|.*\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$).*/;

  const shouldMatch = (path: string) =>
    matcherPattern.test(path) && !path.startsWith("/api") && !path.startsWith("/_next");

  describe("paths that should be localized", () => {
    it("should match root path", () => {
      expect(shouldMatch("/")).toBe(true);
    });

    it("should match dashboard routes", () => {
      expect(shouldMatch("/dashboard")).toBe(true);
      expect(shouldMatch("/en/dashboard")).toBe(true);
    });

    it("should match feature routes", () => {
      expect(shouldMatch("/campaigns")).toBe(true);
      expect(shouldMatch("/templates")).toBe(true);
      expect(shouldMatch("/settings")).toBe(true);
      expect(shouldMatch("/accounts")).toBe(true);
    });

    it("should match auth routes", () => {
      expect(shouldMatch("/login")).toBe(true);
      expect(shouldMatch("/verify")).toBe(true);
    });

    it("should match dynamic routes", () => {
      expect(shouldMatch("/campaigns/123")).toBe(true);
      expect(shouldMatch("/templates/abc-def")).toBe(true);
    });
  });

  describe("paths that should NOT be localized", () => {
    it("should NOT match API routes", () => {
      expect(shouldMatch("/api/auth/session")).toBe(false);
      expect(shouldMatch("/api/campaigns")).toBe(false);
    });

    it("should NOT match Next.js internal routes", () => {
      expect(shouldMatch("/_next/static/chunk.js")).toBe(false);
      expect(shouldMatch("/_next/image")).toBe(false);
    });

    it("should NOT match static files by extension", () => {
      expect(shouldMatch("/logo.png")).toBe(false);
      expect(shouldMatch("/hero.jpg")).toBe(false);
      expect(shouldMatch("/icon.svg")).toBe(false);
    });

    it("should NOT match favicon and common files", () => {
      expect(shouldMatch("/favicon.ico")).toBe(false);
      expect(shouldMatch("/robots.txt")).toBe(false);
      expect(shouldMatch("/sitemap.xml")).toBe(false);
    });

    it("should NOT match font files", () => {
      expect(shouldMatch("/fonts/GeistVF.woff")).toBe(false);
      expect(shouldMatch("/fonts/GeistVF.woff2")).toBe(false);
    });
  });
});
