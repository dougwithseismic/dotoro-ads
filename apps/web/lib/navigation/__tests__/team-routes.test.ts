/**
 * Team URL Routing Utilities Tests
 *
 * Tests for team-aware navigation utilities that handle
 * URL generation and parsing for team-scoped routes.
 */

import { describe, it, expect } from "vitest";
import {
  buildTeamPath,
  extractTeamSlug,
  isTeamScopedRoute,
  getTeamPathWithoutSlug,
  NON_TEAM_ROUTES,
} from "../team-routes";

describe("team-routes utilities", () => {
  describe("buildTeamPath", () => {
    it("should build a path with team slug", () => {
      expect(buildTeamPath("acme-corp", "/dashboard")).toBe(
        "/acme-corp/dashboard"
      );
    });

    it("should handle root path", () => {
      expect(buildTeamPath("acme-corp", "/")).toBe("/acme-corp");
    });

    it("should handle path without leading slash", () => {
      expect(buildTeamPath("acme-corp", "dashboard")).toBe(
        "/acme-corp/dashboard"
      );
    });

    it("should handle nested paths", () => {
      expect(buildTeamPath("acme-corp", "/campaign-sets/new")).toBe(
        "/acme-corp/campaign-sets/new"
      );
    });

    it("should handle path with query params", () => {
      expect(buildTeamPath("acme-corp", "/settings?tab=billing")).toBe(
        "/acme-corp/settings?tab=billing"
      );
    });

    it("should trim whitespace from team slug", () => {
      expect(buildTeamPath(" acme-corp ", "/dashboard")).toBe(
        "/acme-corp/dashboard"
      );
    });

    it("should handle empty path as root", () => {
      expect(buildTeamPath("acme-corp", "")).toBe("/acme-corp");
    });
  });

  describe("extractTeamSlug", () => {
    it("should extract team slug from path with locale", () => {
      expect(extractTeamSlug("/en/acme-corp/dashboard")).toBe("acme-corp");
    });

    it("should extract team slug from root team path", () => {
      expect(extractTeamSlug("/en/acme-corp")).toBe("acme-corp");
    });

    it("should extract team slug from deeply nested path", () => {
      expect(extractTeamSlug("/en/acme-corp/campaign-sets/123/edit")).toBe(
        "acme-corp"
      );
    });

    it("should return null for paths without locale", () => {
      expect(extractTeamSlug("/acme-corp/dashboard")).toBeNull();
    });

    it("should return null for auth routes", () => {
      expect(extractTeamSlug("/en/login")).toBeNull();
      expect(extractTeamSlug("/en/verify")).toBeNull();
    });

    it("should return null for admin routes", () => {
      expect(extractTeamSlug("/en/admin")).toBeNull();
      expect(extractTeamSlug("/en/admin/users")).toBeNull();
    });

    it("should return null for invite routes", () => {
      expect(extractTeamSlug("/en/invite/abc123")).toBeNull();
    });

    it("should return null for locale-only paths", () => {
      expect(extractTeamSlug("/en")).toBeNull();
      expect(extractTeamSlug("/en/")).toBeNull();
    });

    it("should return null for unsupported locale codes", () => {
      // Only "en" is currently supported, so other locales should return null
      expect(extractTeamSlug("/en/acme-corp/dashboard")).toBe("acme-corp");
      expect(extractTeamSlug("/de/acme-corp/dashboard")).toBeNull();
      expect(extractTeamSlug("/fr/acme-corp/dashboard")).toBeNull();
    });
  });

  describe("isTeamScopedRoute", () => {
    it("should return true for dashboard route", () => {
      expect(isTeamScopedRoute("/dashboard")).toBe(true);
      expect(isTeamScopedRoute("/en/acme/dashboard")).toBe(true);
    });

    it("should return true for campaign-sets routes", () => {
      expect(isTeamScopedRoute("/campaign-sets")).toBe(true);
      expect(isTeamScopedRoute("/campaign-sets/new")).toBe(true);
      expect(isTeamScopedRoute("/campaign-sets/123")).toBe(true);
    });

    it("should return true for data-sources routes", () => {
      expect(isTeamScopedRoute("/data-sources")).toBe(true);
      expect(isTeamScopedRoute("/data-sources/123")).toBe(true);
    });

    it("should return true for templates routes", () => {
      expect(isTeamScopedRoute("/templates")).toBe(true);
      expect(isTeamScopedRoute("/templates/editor")).toBe(true);
    });

    it("should return true for transforms routes", () => {
      expect(isTeamScopedRoute("/transforms")).toBe(true);
      expect(isTeamScopedRoute("/transforms/builder")).toBe(true);
    });

    it("should return true for rules routes", () => {
      expect(isTeamScopedRoute("/rules")).toBe(true);
      expect(isTeamScopedRoute("/rules/builder/123")).toBe(true);
    });

    it("should return true for accounts routes", () => {
      expect(isTeamScopedRoute("/accounts")).toBe(true);
    });

    it("should return true for settings routes", () => {
      expect(isTeamScopedRoute("/settings")).toBe(true);
      expect(isTeamScopedRoute("/settings/profile")).toBe(true);
      expect(isTeamScopedRoute("/settings/team")).toBe(true);
    });

    it("should return true for campaigns routes", () => {
      expect(isTeamScopedRoute("/campaigns")).toBe(true);
      expect(isTeamScopedRoute("/campaigns/123")).toBe(true);
    });

    it("should return false for login route", () => {
      expect(isTeamScopedRoute("/login")).toBe(false);
      expect(isTeamScopedRoute("/en/login")).toBe(false);
    });

    it("should return false for verify route", () => {
      expect(isTeamScopedRoute("/verify")).toBe(false);
    });

    it("should return false for admin routes", () => {
      expect(isTeamScopedRoute("/admin")).toBe(false);
      expect(isTeamScopedRoute("/admin/users")).toBe(false);
      expect(isTeamScopedRoute("/en/admin/settings")).toBe(false);
    });

    it("should return false for invite routes", () => {
      expect(isTeamScopedRoute("/invite/abc123")).toBe(false);
    });

    it("should return false for root path", () => {
      expect(isTeamScopedRoute("/")).toBe(false);
      expect(isTeamScopedRoute("/en")).toBe(false);
    });
  });

  describe("getTeamPathWithoutSlug", () => {
    it("should remove team slug from path", () => {
      expect(getTeamPathWithoutSlug("/en/acme-corp/dashboard")).toBe(
        "/dashboard"
      );
    });

    it("should handle root team path", () => {
      expect(getTeamPathWithoutSlug("/en/acme-corp")).toBe("/");
    });

    it("should handle deeply nested paths", () => {
      expect(
        getTeamPathWithoutSlug("/en/acme-corp/campaign-sets/123/edit")
      ).toBe("/campaign-sets/123/edit");
    });

    it("should preserve query params", () => {
      expect(
        getTeamPathWithoutSlug("/en/acme-corp/settings?tab=billing")
      ).toBe("/settings?tab=billing");
    });

    it("should return original path if no team slug found", () => {
      expect(getTeamPathWithoutSlug("/en/login")).toBe("/login");
    });

    it("should return original path for non-team routes", () => {
      expect(getTeamPathWithoutSlug("/en/admin/users")).toBe("/admin/users");
    });
  });

  describe("NON_TEAM_ROUTES", () => {
    it("should contain expected non-team route patterns", () => {
      expect(NON_TEAM_ROUTES).toContain("login");
      expect(NON_TEAM_ROUTES).toContain("verify");
      expect(NON_TEAM_ROUTES).toContain("admin");
      expect(NON_TEAM_ROUTES).toContain("invite");
    });
  });
});
