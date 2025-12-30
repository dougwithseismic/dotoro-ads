/**
 * Platform Defaults Resolver Tests
 *
 * Tests for the resolver that provides platform-specific default values
 * for campaign, ad group, and ad fields. This allows validators to check
 * if a missing field has a platform default before flagging it as an error.
 */

import { describe, it, expect } from "vitest";
import {
  PlatformDefaultsResolver,
  type EntityType,
  type Platform,
  type KnownPlatform,
  KNOWN_PLATFORMS,
} from "../platform-defaults-resolver.js";

describe("PlatformDefaultsResolver", () => {
  const resolver = new PlatformDefaultsResolver();

  // ─────────────────────────────────────────────────────────────────────────────
  // Reddit Campaign Defaults
  // ─────────────────────────────────────────────────────────────────────────────

  describe("getRedditCampaignDefaults", () => {
    it("returns objective default as IMPRESSIONS", () => {
      const defaults = resolver.getDefaults("reddit");
      expect(defaults.campaign.objective).toBe("IMPRESSIONS");
    });

    it("returns specialAdCategories default as [NONE]", () => {
      const defaults = resolver.getDefaults("reddit");
      expect(defaults.campaign.specialAdCategories).toEqual(["NONE"]);
    });

    it("returns the complete campaign defaults object", () => {
      const defaults = resolver.getDefaults("reddit");
      expect(defaults.campaign).toEqual({
        objective: "IMPRESSIONS",
        specialAdCategories: ["NONE"],
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Reddit Ad Group Defaults
  // ─────────────────────────────────────────────────────────────────────────────

  describe("getRedditAdGroupDefaults", () => {
    it("returns bidStrategy default as MAXIMIZE_VOLUME", () => {
      const defaults = resolver.getDefaults("reddit");
      expect(defaults.adGroup.bidStrategy).toBe("MAXIMIZE_VOLUME");
    });

    it("returns bidType default as CPC", () => {
      const defaults = resolver.getDefaults("reddit");
      expect(defaults.adGroup.bidType).toBe("CPC");
    });

    it("returns the complete ad group defaults object", () => {
      const defaults = resolver.getDefaults("reddit");
      expect(defaults.adGroup).toEqual({
        bidStrategy: "MAXIMIZE_VOLUME",
        bidType: "CPC",
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Reddit Ad Defaults
  // ─────────────────────────────────────────────────────────────────────────────

  describe("getRedditAdDefaults", () => {
    it("returns empty ad defaults (callToAction is optional in AdValidator)", () => {
      const defaults = resolver.getDefaults("reddit");
      expect(defaults.ad).toEqual({});
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // hasDefault Method
  // ─────────────────────────────────────────────────────────────────────────────

  describe("hasDefault", () => {
    describe("reddit campaign fields", () => {
      it("returns true for objective field", () => {
        expect(resolver.hasDefault("reddit", "campaign", "objective")).toBe(true);
      });

      it("returns true for specialAdCategories field", () => {
        expect(resolver.hasDefault("reddit", "campaign", "specialAdCategories")).toBe(true);
      });

      it("returns false for name field (no default)", () => {
        expect(resolver.hasDefault("reddit", "campaign", "name")).toBe(false);
      });

      it("returns false for unknown field", () => {
        expect(resolver.hasDefault("reddit", "campaign", "unknownField")).toBe(false);
      });
    });

    describe("reddit adGroup fields", () => {
      it("returns true for bidStrategy field", () => {
        expect(resolver.hasDefault("reddit", "adGroup", "bidStrategy")).toBe(true);
      });

      it("returns true for bidType field", () => {
        expect(resolver.hasDefault("reddit", "adGroup", "bidType")).toBe(true);
      });

      it("returns false for name field (no default)", () => {
        expect(resolver.hasDefault("reddit", "adGroup", "name")).toBe(false);
      });
    });

    describe("reddit ad fields", () => {
      it("returns false for callToAction field (optional in AdValidator)", () => {
        expect(resolver.hasDefault("reddit", "ad", "callToAction")).toBe(false);
      });

      it("returns false for headline field (no default)", () => {
        expect(resolver.hasDefault("reddit", "ad", "headline")).toBe(false);
      });
    });

    describe("unknown platforms", () => {
      it("returns false for unsupported platform", () => {
        expect(resolver.hasDefault("facebook", "campaign", "objective")).toBe(false);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getDefault Method
  // ─────────────────────────────────────────────────────────────────────────────

  describe("getDefault", () => {
    describe("reddit campaign fields", () => {
      it("returns IMPRESSIONS for objective", () => {
        expect(resolver.getDefault("reddit", "campaign", "objective")).toBe("IMPRESSIONS");
      });

      it("returns [NONE] for specialAdCategories", () => {
        expect(resolver.getDefault("reddit", "campaign", "specialAdCategories")).toEqual(["NONE"]);
      });

      it("returns undefined for fields without defaults", () => {
        expect(resolver.getDefault("reddit", "campaign", "name")).toBeUndefined();
      });
    });

    describe("reddit adGroup fields", () => {
      it("returns MAXIMIZE_VOLUME for bidStrategy", () => {
        expect(resolver.getDefault("reddit", "adGroup", "bidStrategy")).toBe("MAXIMIZE_VOLUME");
      });

      it("returns CPC for bidType", () => {
        expect(resolver.getDefault("reddit", "adGroup", "bidType")).toBe("CPC");
      });

      it("returns undefined for fields without defaults", () => {
        expect(resolver.getDefault("reddit", "adGroup", "targeting")).toBeUndefined();
      });
    });

    describe("reddit ad fields", () => {
      it("returns undefined for callToAction (optional in AdValidator)", () => {
        expect(resolver.getDefault("reddit", "ad", "callToAction")).toBeUndefined();
      });

      it("returns undefined for fields without defaults", () => {
        expect(resolver.getDefault("reddit", "ad", "finalUrl")).toBeUndefined();
      });
    });

    describe("unknown platforms", () => {
      it("returns undefined for unsupported platform", () => {
        expect(resolver.getDefault("facebook", "campaign", "objective")).toBeUndefined();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getDefaults Method (Full Platform Defaults)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("getDefaults", () => {
    it("returns complete defaults structure for reddit", () => {
      const defaults = resolver.getDefaults("reddit");

      expect(defaults).toEqual({
        campaign: {
          objective: "IMPRESSIONS",
          specialAdCategories: ["NONE"],
        },
        adGroup: {
          bidStrategy: "MAXIMIZE_VOLUME",
          bidType: "CPC",
        },
        ad: {},
      });
    });

    it("returns empty defaults for unknown platform", () => {
      const defaults = resolver.getDefaults("facebook");

      expect(defaults).toEqual({
        campaign: {},
        adGroup: {},
        ad: {},
      });
    });

    it("returns empty defaults for google (not yet implemented)", () => {
      const defaults = resolver.getDefaults("google");

      expect(defaults).toEqual({
        campaign: {},
        adGroup: {},
        ad: {},
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Singleton Pattern
  // ─────────────────────────────────────────────────────────────────────────────

  describe("singleton instance", () => {
    it("multiple instances have same defaults", () => {
      const resolver1 = new PlatformDefaultsResolver();
      const resolver2 = new PlatformDefaultsResolver();

      expect(resolver1.getDefaults("reddit")).toEqual(resolver2.getDefaults("reddit"));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles empty string field name", () => {
      expect(resolver.hasDefault("reddit", "campaign", "")).toBe(false);
      expect(resolver.getDefault("reddit", "campaign", "")).toBeUndefined();
    });

    it("handles case sensitivity for field names", () => {
      // Field names should be case-sensitive
      expect(resolver.hasDefault("reddit", "campaign", "Objective")).toBe(false);
      expect(resolver.hasDefault("reddit", "campaign", "OBJECTIVE")).toBe(false);
      expect(resolver.hasDefault("reddit", "campaign", "objective")).toBe(true);
    });

    it("returns fresh arrays to prevent mutation", () => {
      const defaults1 = resolver.getDefaults("reddit");
      const defaults2 = resolver.getDefaults("reddit");

      // Should be equal but not the same reference
      expect(defaults1.campaign.specialAdCategories).toEqual(defaults2.campaign.specialAdCategories);

      // Verify they are different references (immutability)
      if (Array.isArray(defaults1.campaign.specialAdCategories)) {
        defaults1.campaign.specialAdCategories.push("MODIFIED" as never);
        expect(defaults2.campaign.specialAdCategories).not.toContain("MODIFIED");
      }
    });

    it("getDefault returns fresh arrays to prevent mutation", () => {
      const value1 = resolver.getDefault("reddit", "campaign", "specialAdCategories") as string[];
      const value2 = resolver.getDefault("reddit", "campaign", "specialAdCategories") as string[];

      expect(value1).toEqual(value2);

      // Mutate value1 and verify value2 is unaffected
      value1.push("MODIFIED");
      expect(value2).not.toContain("MODIFIED");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Extensible Platform Support
  // ─────────────────────────────────────────────────────────────────────────────

  describe("extensible platform support", () => {
    describe("KNOWN_PLATFORMS constant", () => {
      it("exports known platforms as a const array", () => {
        expect(KNOWN_PLATFORMS).toBeDefined();
        expect(Array.isArray(KNOWN_PLATFORMS)).toBe(true);
      });

      it("includes reddit and google as known platforms", () => {
        expect(KNOWN_PLATFORMS).toContain("reddit");
        expect(KNOWN_PLATFORMS).toContain("google");
      });

      it("includes additional platforms for future use", () => {
        expect(KNOWN_PLATFORMS).toContain("meta");
        expect(KNOWN_PLATFORMS).toContain("tiktok");
        expect(KNOWN_PLATFORMS).toContain("snapchat");
      });
    });

    describe("type compatibility", () => {
      it("accepts any string as a platform identifier", () => {
        // These should all work without type errors at runtime
        const customPlatform: Platform = "my-custom-platform";
        const anotherPlatform: Platform = "linkedin";

        expect(resolver.getDefaults(customPlatform)).toEqual({
          campaign: {},
          adGroup: {},
          ad: {},
        });
        expect(resolver.getDefaults(anotherPlatform)).toEqual({
          campaign: {},
          adGroup: {},
          ad: {},
        });
      });

      it("known platforms still work with type narrowing", () => {
        const knownPlatform: KnownPlatform = "reddit";
        const defaults = resolver.getDefaults(knownPlatform);
        expect(defaults.campaign.objective).toBe("IMPRESSIONS");
      });
    });

    describe("runtime defaults registration", () => {
      it("allows registering defaults for custom platforms", () => {
        const customResolver = new PlatformDefaultsResolver();

        customResolver.registerDefaults("tiktok", {
          campaign: {
            objective: "REACH",
          },
          adGroup: {
            placementType: "AUTOMATIC",
          },
          ad: {},
        });

        expect(customResolver.hasDefault("tiktok", "campaign", "objective")).toBe(true);
        expect(customResolver.getDefault("tiktok", "campaign", "objective")).toBe("REACH");
        expect(customResolver.hasDefault("tiktok", "adGroup", "placementType")).toBe(true);
      });

      it("does not affect other resolver instances", () => {
        const resolver1 = new PlatformDefaultsResolver();
        const resolver2 = new PlatformDefaultsResolver();

        resolver1.registerDefaults("custom", {
          campaign: { test: "value" },
          adGroup: {},
          ad: {},
        });

        // Original resolver should not have custom platform
        expect(resolver.hasDefault("custom", "campaign", "test")).toBe(false);
        // Second resolver should not have custom platform
        expect(resolver2.hasDefault("custom", "campaign", "test")).toBe(false);
        // First resolver should have custom platform
        expect(resolver1.hasDefault("custom", "campaign", "test")).toBe(true);
      });

      it("overwrites existing defaults when re-registering", () => {
        const customResolver = new PlatformDefaultsResolver();

        customResolver.registerDefaults("meta", {
          campaign: { objective: "AWARENESS" },
          adGroup: {},
          ad: {},
        });

        customResolver.registerDefaults("meta", {
          campaign: { objective: "CONVERSIONS" },
          adGroup: {},
          ad: {},
        });

        expect(customResolver.getDefault("meta", "campaign", "objective")).toBe("CONVERSIONS");
      });
    });

    describe("validation with unknown platforms", () => {
      it("returns empty defaults for completely unknown platforms", () => {
        const unknownPlatforms = ["pinterest", "twitter", "linkedin", "amazon-ads"];

        for (const platform of unknownPlatforms) {
          const defaults = resolver.getDefaults(platform);
          expect(defaults).toEqual({
            campaign: {},
            adGroup: {},
            ad: {},
          });
        }
      });

      it("hasDefault returns false for all fields on unknown platforms", () => {
        expect(resolver.hasDefault("pinterest", "campaign", "objective")).toBe(false);
        expect(resolver.hasDefault("pinterest", "adGroup", "bidStrategy")).toBe(false);
        expect(resolver.hasDefault("pinterest", "ad", "headline")).toBe(false);
      });
    });

    describe("isKnownPlatform helper", () => {
      it("returns true for known platforms", () => {
        expect(resolver.isKnownPlatform("reddit")).toBe(true);
        expect(resolver.isKnownPlatform("google")).toBe(true);
        expect(resolver.isKnownPlatform("meta")).toBe(true);
      });

      it("returns false for unknown platforms", () => {
        expect(resolver.isKnownPlatform("pinterest")).toBe(false);
        expect(resolver.isKnownPlatform("custom-platform")).toBe(false);
      });
    });
  });
});
