import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AdTypeRegistry, adTypeRegistry } from "../registry.js";
import {
  initializeAdTypeRegistry,
  isAdTypeRegistryInitialized,
} from "../index.js";
import type {
  AdTypeDefinition,
  Platform,
  ContentCategory,
  ValidationResult,
} from "../types.js";

// Helper function to create a minimal valid ad type for testing
function createTestAdType(
  overrides: Partial<AdTypeDefinition> = {}
): AdTypeDefinition {
  return {
    id: "test-ad",
    platform: "google",
    name: "Test Ad",
    description: "A test ad type",
    category: "paid",
    icon: "test",
    fields: [],
    creatives: [],
    constraints: {
      characterLimits: {},
    },
    features: {
      supportsVariables: false,
      supportsMultipleAds: false,
      supportsKeywords: false,
      supportsScheduling: false,
    },
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    previewComponent: "TestPreview",
    ...overrides,
  };
}

describe("AdTypeRegistry", () => {
  let registry: AdTypeRegistry;

  beforeEach(() => {
    registry = new AdTypeRegistry();
  });

  describe("register", () => {
    it("registers an ad type successfully", () => {
      const adType = createTestAdType({ id: "test-1", platform: "google" });
      registry.register(adType);

      const result = registry.get("google", "test-1");
      expect(result).toEqual(adType);
    });

    it("allows multiple ad types for the same platform", () => {
      const adType1 = createTestAdType({ id: "test-1", platform: "google" });
      const adType2 = createTestAdType({ id: "test-2", platform: "google" });

      registry.register(adType1);
      registry.register(adType2);

      expect(registry.get("google", "test-1")).toEqual(adType1);
      expect(registry.get("google", "test-2")).toEqual(adType2);
    });

    it("allows same ad type id on different platforms", () => {
      const googleAdType = createTestAdType({
        id: "carousel",
        platform: "google",
      });
      const facebookAdType = createTestAdType({
        id: "carousel",
        platform: "facebook",
      });

      registry.register(googleAdType);
      registry.register(facebookAdType);

      expect(registry.get("google", "carousel")).toEqual(googleAdType);
      expect(registry.get("facebook", "carousel")).toEqual(facebookAdType);
    });

    it("overwrites an ad type if registered with same platform:id", () => {
      const adType1 = createTestAdType({
        id: "test-1",
        platform: "google",
        name: "Original",
      });
      const adType2 = createTestAdType({
        id: "test-1",
        platform: "google",
        name: "Updated",
      });

      registry.register(adType1);
      registry.register(adType2);

      expect(registry.get("google", "test-1")?.name).toBe("Updated");
    });
  });

  describe("get", () => {
    it("returns undefined for non-existent ad type", () => {
      const result = registry.get("google", "non-existent");
      expect(result).toBeUndefined();
    });

    it("returns the correct ad type", () => {
      const adType = createTestAdType({ id: "test", platform: "reddit" });
      registry.register(adType);

      const result = registry.get("reddit", "test");
      expect(result).toEqual(adType);
    });

    it("returns undefined for wrong platform", () => {
      const adType = createTestAdType({ id: "test", platform: "google" });
      registry.register(adType);

      const result = registry.get("facebook", "test");
      expect(result).toBeUndefined();
    });
  });

  describe("getByPlatform", () => {
    it("returns empty array when no ad types registered", () => {
      const result = registry.getByPlatform("google");
      expect(result).toEqual([]);
    });

    it("returns all ad types for a specific platform", () => {
      const googleAd1 = createTestAdType({ id: "ad1", platform: "google" });
      const googleAd2 = createTestAdType({ id: "ad2", platform: "google" });
      const redditAd = createTestAdType({ id: "ad1", platform: "reddit" });

      registry.register(googleAd1);
      registry.register(googleAd2);
      registry.register(redditAd);

      const googleAds = registry.getByPlatform("google");
      expect(googleAds).toHaveLength(2);
      expect(googleAds).toContainEqual(googleAd1);
      expect(googleAds).toContainEqual(googleAd2);
    });

    it("does not include ad types from other platforms", () => {
      const googleAd = createTestAdType({ id: "ad1", platform: "google" });
      const redditAd = createTestAdType({ id: "ad1", platform: "reddit" });

      registry.register(googleAd);
      registry.register(redditAd);

      const redditAds = registry.getByPlatform("reddit");
      expect(redditAds).toHaveLength(1);
      expect(redditAds[0]).toEqual(redditAd);
    });
  });

  describe("getByCategory", () => {
    it("returns empty array when no ad types match category", () => {
      const result = registry.getByCategory("paid");
      expect(result).toEqual([]);
    });

    it("returns all ad types for a specific category", () => {
      const paidAd1 = createTestAdType({ id: "paid1", category: "paid" });
      const paidAd2 = createTestAdType({ id: "paid2", category: "paid" });
      const organicAd = createTestAdType({ id: "organic1", category: "organic" });

      registry.register(paidAd1);
      registry.register(paidAd2);
      registry.register(organicAd);

      const paidAds = registry.getByCategory("paid");
      expect(paidAds).toHaveLength(2);
      expect(paidAds).toContainEqual(paidAd1);
      expect(paidAds).toContainEqual(paidAd2);
    });

    it("handles promoted category", () => {
      const promotedAd = createTestAdType({
        id: "promoted1",
        category: "promoted",
      });
      registry.register(promotedAd);

      const promotedAds = registry.getByCategory("promoted");
      expect(promotedAds).toHaveLength(1);
      expect(promotedAds[0]).toEqual(promotedAd);
    });
  });

  describe("getPaidTypes", () => {
    it("returns only paid ad types for the specified platform", () => {
      const googlePaid = createTestAdType({
        id: "paid",
        platform: "google",
        category: "paid",
      });
      const googleOrganic = createTestAdType({
        id: "organic",
        platform: "google",
        category: "organic",
      });
      const redditPaid = createTestAdType({
        id: "paid",
        platform: "reddit",
        category: "paid",
      });

      registry.register(googlePaid);
      registry.register(googleOrganic);
      registry.register(redditPaid);

      const googlePaidTypes = registry.getPaidTypes("google");
      expect(googlePaidTypes).toHaveLength(1);
      expect(googlePaidTypes[0]).toEqual(googlePaid);
    });

    it("returns empty array when no paid types exist for platform", () => {
      const organicAd = createTestAdType({
        id: "organic",
        platform: "google",
        category: "organic",
      });
      registry.register(organicAd);

      const paidTypes = registry.getPaidTypes("google");
      expect(paidTypes).toEqual([]);
    });
  });

  describe("getOrganicTypes", () => {
    it("returns only organic ad types for the specified platform", () => {
      const googlePaid = createTestAdType({
        id: "paid",
        platform: "google",
        category: "paid",
      });
      const googleOrganic = createTestAdType({
        id: "organic",
        platform: "google",
        category: "organic",
      });
      const redditOrganic = createTestAdType({
        id: "organic",
        platform: "reddit",
        category: "organic",
      });

      registry.register(googlePaid);
      registry.register(googleOrganic);
      registry.register(redditOrganic);

      const googleOrganicTypes = registry.getOrganicTypes("google");
      expect(googleOrganicTypes).toHaveLength(1);
      expect(googleOrganicTypes[0]).toEqual(googleOrganic);
    });

    it("returns empty array when no organic types exist for platform", () => {
      const paidAd = createTestAdType({
        id: "paid",
        platform: "google",
        category: "paid",
      });
      registry.register(paidAd);

      const organicTypes = registry.getOrganicTypes("google");
      expect(organicTypes).toEqual([]);
    });
  });

  describe("all", () => {
    it("returns empty array when no ad types registered", () => {
      const result = registry.all();
      expect(result).toEqual([]);
    });

    it("returns all registered ad types", () => {
      const adType1 = createTestAdType({ id: "ad1", platform: "google" });
      const adType2 = createTestAdType({ id: "ad2", platform: "reddit" });
      const adType3 = createTestAdType({ id: "ad3", platform: "facebook" });

      registry.register(adType1);
      registry.register(adType2);
      registry.register(adType3);

      const allTypes = registry.all();
      expect(allTypes).toHaveLength(3);
      expect(allTypes).toContainEqual(adType1);
      expect(allTypes).toContainEqual(adType2);
      expect(allTypes).toContainEqual(adType3);
    });
  });

  describe("getPromotedTypes", () => {
    it("returns only promoted ad types for the specified platform", () => {
      const googlePromoted = createTestAdType({
        id: "promoted",
        platform: "google",
        category: "promoted",
      });
      const googlePaid = createTestAdType({
        id: "paid",
        platform: "google",
        category: "paid",
      });
      const redditPromoted = createTestAdType({
        id: "promoted",
        platform: "reddit",
        category: "promoted",
      });

      registry.register(googlePromoted);
      registry.register(googlePaid);
      registry.register(redditPromoted);

      const googlePromotedTypes = registry.getPromotedTypes("google");
      expect(googlePromotedTypes).toHaveLength(1);
      expect(googlePromotedTypes[0]).toEqual(googlePromoted);
    });

    it("returns empty array when no promoted types exist for platform", () => {
      const paidAd = createTestAdType({
        id: "paid",
        platform: "google",
        category: "paid",
      });
      registry.register(paidAd);

      const promotedTypes = registry.getPromotedTypes("google");
      expect(promotedTypes).toEqual([]);
    });
  });

  describe("clear", () => {
    it("removes all registered ad types", () => {
      const adType1 = createTestAdType({ id: "ad1", platform: "google" });
      const adType2 = createTestAdType({ id: "ad2", platform: "reddit" });

      registry.register(adType1);
      registry.register(adType2);

      expect(registry.all()).toHaveLength(2);

      registry.clear();

      expect(registry.all()).toEqual([]);
      expect(registry.get("google", "ad1")).toBeUndefined();
      expect(registry.get("reddit", "ad2")).toBeUndefined();
    });
  });
});

describe("adTypeRegistry singleton", () => {
  it("exports a singleton instance", () => {
    expect(adTypeRegistry).toBeInstanceOf(AdTypeRegistry);
  });
});

describe("initializeAdTypeRegistry", () => {
  afterEach(() => {
    // Reinitialize to restore the registry to its original state
    initializeAdTypeRegistry({ reset: true });
  });

  it("returns the registry instance", () => {
    const registry = initializeAdTypeRegistry();
    expect(registry).toBe(adTypeRegistry);
  });

  it("initializes with all platform ad types", () => {
    const registry = initializeAdTypeRegistry({ reset: true });

    // Check that Google ad types are registered
    expect(registry.get("google", "responsive-search")).toBeDefined();
    expect(registry.get("google", "responsive-display")).toBeDefined();
    expect(registry.get("google", "performance-max")).toBeDefined();

    // Check that Reddit ad types are registered
    expect(registry.get("reddit", "link")).toBeDefined();
    expect(registry.get("reddit", "carousel")).toBeDefined();

    // Check that Facebook ad types are registered
    expect(registry.get("facebook", "single-image")).toBeDefined();
    expect(registry.get("facebook", "carousel")).toBeDefined();
  });

  it("is idempotent - calling multiple times does not duplicate registrations", () => {
    initializeAdTypeRegistry({ reset: true });
    const countAfterFirst = adTypeRegistry.all().length;

    initializeAdTypeRegistry();
    initializeAdTypeRegistry();
    initializeAdTypeRegistry();

    const countAfterMultiple = adTypeRegistry.all().length;
    expect(countAfterMultiple).toBe(countAfterFirst);
  });

  it("reset option clears and re-registers all types", () => {
    initializeAdTypeRegistry({ reset: true });
    const initialCount = adTypeRegistry.all().length;

    // Manually add a custom type
    adTypeRegistry.register({
      id: "custom-type",
      platform: "google",
      name: "Custom Type",
      description: "Test",
      category: "paid",
      icon: "test",
      fields: [],
      creatives: [],
      constraints: { characterLimits: {} },
      features: {
        supportsVariables: false,
        supportsMultipleAds: false,
        supportsKeywords: false,
        supportsScheduling: false,
      },
      validate: () => ({ valid: true, errors: [], warnings: [] }),
      previewComponent: "Test",
    });

    expect(adTypeRegistry.all().length).toBe(initialCount + 1);
    expect(adTypeRegistry.get("google", "custom-type")).toBeDefined();

    // Reset should remove custom type
    initializeAdTypeRegistry({ reset: true });

    expect(adTypeRegistry.all().length).toBe(initialCount);
    expect(adTypeRegistry.get("google", "custom-type")).toBeUndefined();
  });
});

describe("isAdTypeRegistryInitialized", () => {
  it("returns true after initialization", () => {
    initializeAdTypeRegistry({ reset: true });
    expect(isAdTypeRegistryInitialized()).toBe(true);
  });
});
