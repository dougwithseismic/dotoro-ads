import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAdTypes } from "../useAdTypes";
import type { Platform } from "../../types";

// Mock the ad type registry from @repo/core
vi.mock("@repo/core/ad-types", () => ({
  adTypeRegistry: {
    getByPlatform: vi.fn((platform: Platform) => {
      const mockAdTypes = {
        google: [
          {
            id: "responsive-search",
            platform: "google",
            name: "Responsive Search Ad",
            description: "Text ads that adapt to show the best combination",
            category: "paid",
            icon: "search",
            fields: [],
            creatives: [],
            constraints: { characterLimits: {} },
            features: {
              supportsVariables: true,
              supportsMultipleAds: true,
              supportsKeywords: true,
              supportsScheduling: true,
            },
            validate: () => ({ valid: true, errors: [], warnings: [] }),
            previewComponent: "GoogleSearchAdPreview",
          },
          {
            id: "responsive-display",
            platform: "google",
            name: "Responsive Display Ad",
            description: "Visual ads that automatically adjust",
            category: "paid",
            icon: "image",
            fields: [],
            creatives: [],
            constraints: { characterLimits: {} },
            features: {
              supportsVariables: true,
              supportsMultipleAds: true,
              supportsKeywords: false,
              supportsScheduling: true,
            },
            validate: () => ({ valid: true, errors: [], warnings: [] }),
            previewComponent: "GoogleDisplayAdPreview",
          },
        ],
        reddit: [
          {
            id: "link",
            platform: "reddit",
            name: "Link Ad",
            description: "Drive traffic to your website",
            category: "paid",
            icon: "link",
            fields: [],
            creatives: [],
            constraints: { characterLimits: {} },
            features: {
              supportsVariables: true,
              supportsMultipleAds: true,
              supportsKeywords: false,
              supportsScheduling: true,
            },
            validate: () => ({ valid: true, errors: [], warnings: [] }),
            previewComponent: "RedditLinkAdPreview",
          },
          {
            id: "conversation",
            platform: "reddit",
            name: "Conversation Ad",
            description: "Promote a post that encourages discussion",
            category: "promoted",
            icon: "chat",
            fields: [],
            creatives: [],
            constraints: { characterLimits: {} },
            features: {
              supportsVariables: true,
              supportsMultipleAds: false,
              supportsKeywords: false,
              supportsScheduling: true,
            },
            validate: () => ({ valid: true, errors: [], warnings: [] }),
            previewComponent: "RedditConversationAdPreview",
          },
        ],
        facebook: [
          {
            id: "single-image",
            platform: "facebook",
            name: "Single Image Ad",
            description: "Simple, effective ads with a single image",
            category: "paid",
            icon: "image",
            fields: [],
            creatives: [],
            constraints: { characterLimits: {} },
            features: {
              supportsVariables: true,
              supportsMultipleAds: true,
              supportsKeywords: false,
              supportsScheduling: true,
            },
            validate: () => ({ valid: true, errors: [], warnings: [] }),
            previewComponent: "FacebookSingleImagePreview",
          },
        ],
      };
      return mockAdTypes[platform] || [];
    }),
    getByCategory: vi.fn((category) => {
      // Return filtered results by category
      const allTypes = [
        { id: "responsive-search", platform: "google", category: "paid" },
        { id: "responsive-display", platform: "google", category: "paid" },
        { id: "link", platform: "reddit", category: "paid" },
        { id: "conversation", platform: "reddit", category: "promoted" },
        { id: "single-image", platform: "facebook", category: "paid" },
      ];
      return allTypes.filter((t) => t.category === category);
    }),
    get: vi.fn((platform: Platform, adTypeId: string) => {
      const types = {
        "google:responsive-search": {
          id: "responsive-search",
          platform: "google",
          name: "Responsive Search Ad",
          description: "Text ads that adapt to show the best combination",
          category: "paid",
          icon: "search",
          fields: [
            { id: "headlines", name: "Headlines", type: "array", required: true, maxLength: 30 },
            { id: "descriptions", name: "Descriptions", type: "array", required: true, maxLength: 90 },
          ],
          creatives: [],
          constraints: {
            characterLimits: { headline: 30, description: 90 },
          },
          features: {
            supportsVariables: true,
            supportsMultipleAds: true,
            supportsKeywords: true,
            supportsScheduling: true,
          },
          validate: () => ({ valid: true, errors: [], warnings: [] }),
          previewComponent: "GoogleSearchAdPreview",
        },
        "reddit:link": {
          id: "link",
          platform: "reddit",
          name: "Link Ad",
          description: "Drive traffic to your website",
          category: "paid",
          icon: "link",
          fields: [
            { id: "title", name: "Title", type: "text", required: true, maxLength: 300 },
          ],
          creatives: [
            { id: "thumbnail", name: "Thumbnail", type: "image", required: false },
          ],
          constraints: {
            characterLimits: { title: 300 },
          },
          features: {
            supportsVariables: true,
            supportsMultipleAds: true,
            supportsKeywords: false,
            supportsScheduling: true,
          },
          validate: () => ({ valid: true, errors: [], warnings: [] }),
          previewComponent: "RedditLinkAdPreview",
        },
      };
      return types[`${platform}:${adTypeId}`];
    }),
  },
  initializeAdTypeRegistry: vi.fn(),
}));

describe("useAdTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Basic Fetching Tests
  // ==========================================================================

  describe("Basic Fetching", () => {
    it("returns ad types for a single platform", () => {
      const { result } = renderHook(() => useAdTypes(["google"]));

      expect(result.current.adTypes.google).toBeDefined();
      expect(result.current.adTypes.google).toHaveLength(2);
      expect(result.current.adTypes.google[0].id).toBe("responsive-search");
      expect(result.current.adTypes.google[1].id).toBe("responsive-display");
    });

    it("returns ad types for multiple platforms", () => {
      const { result } = renderHook(() => useAdTypes(["google", "reddit"]));

      expect(result.current.adTypes.google).toHaveLength(2);
      expect(result.current.adTypes.reddit).toHaveLength(2);
    });

    it("returns empty arrays for platforms not in the list", () => {
      const { result } = renderHook(() => useAdTypes(["google"]));

      expect(result.current.adTypes.reddit).toEqual([]);
      expect(result.current.adTypes.facebook).toEqual([]);
    });

    it("returns all ad types when all platforms selected", () => {
      const { result } = renderHook(() =>
        useAdTypes(["google", "reddit", "facebook"])
      );

      expect(result.current.adTypes.google).toHaveLength(2);
      expect(result.current.adTypes.reddit).toHaveLength(2);
      expect(result.current.adTypes.facebook).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Filtering Tests
  // ==========================================================================

  describe("Filtering by Category", () => {
    it("filters ad types by paid category", () => {
      const { result } = renderHook(() =>
        useAdTypes(["google", "reddit"], { category: "paid" })
      );

      // All Google types are paid
      expect(result.current.adTypes.google).toHaveLength(2);
      // Reddit has 1 paid type (link), 1 promoted type (conversation)
      expect(result.current.adTypes.reddit).toHaveLength(1);
      expect(result.current.adTypes.reddit[0].id).toBe("link");
    });

    it("filters ad types by promoted category", () => {
      const { result } = renderHook(() =>
        useAdTypes(["reddit"], { category: "promoted" })
      );

      expect(result.current.adTypes.reddit).toHaveLength(1);
      expect(result.current.adTypes.reddit[0].id).toBe("conversation");
    });

    it("returns empty arrays when no matching category", () => {
      const { result } = renderHook(() =>
        useAdTypes(["google"], { category: "organic" })
      );

      expect(result.current.adTypes.google).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Get Single Ad Type Tests
  // ==========================================================================

  describe("Getting Single Ad Type", () => {
    it("returns a specific ad type by id", () => {
      const { result } = renderHook(() => useAdTypes(["google"]));

      const adType = result.current.getAdType("google", "responsive-search");
      expect(adType).toBeDefined();
      expect(adType?.name).toBe("Responsive Search Ad");
      expect(adType?.platform).toBe("google");
    });

    it("returns undefined for non-existent ad type", () => {
      const { result } = renderHook(() => useAdTypes(["google"]));

      const adType = result.current.getAdType("google", "non-existent");
      expect(adType).toBeUndefined();
    });
  });

  // ==========================================================================
  // Helper Method Tests
  // ==========================================================================

  describe("Helper Methods", () => {
    it("getRequiredFields returns required fields for an ad type", () => {
      const { result } = renderHook(() => useAdTypes(["google"]));

      const requiredFields = result.current.getRequiredFields(
        "google",
        "responsive-search"
      );
      expect(requiredFields).toContain("headlines");
      expect(requiredFields).toContain("descriptions");
    });

    it("getCreativeRequirements returns creative requirements", () => {
      const { result } = renderHook(() => useAdTypes(["reddit"]));

      const creatives = result.current.getCreativeRequirements("reddit", "link");
      expect(creatives).toBeDefined();
      expect(creatives).toHaveLength(1);
      expect(creatives[0].id).toBe("thumbnail");
    });

    it("getCharacterLimits returns character limits for an ad type", () => {
      const { result } = renderHook(() => useAdTypes(["google"]));

      const limits = result.current.getCharacterLimits(
        "google",
        "responsive-search"
      );
      expect(limits).toEqual({ headline: 30, description: 90 });
    });

    it("returns empty array/object for non-existent ad type", () => {
      const { result } = renderHook(() => useAdTypes(["google"]));

      expect(result.current.getRequiredFields("google", "non-existent")).toEqual(
        []
      );
      expect(
        result.current.getCreativeRequirements("google", "non-existent")
      ).toEqual([]);
      expect(
        result.current.getCharacterLimits("google", "non-existent")
      ).toEqual({});
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles empty platform array", () => {
      const { result } = renderHook(() => useAdTypes([]));

      expect(result.current.adTypes.google).toEqual([]);
      expect(result.current.adTypes.reddit).toEqual([]);
      expect(result.current.adTypes.facebook).toEqual([]);
    });

    it("handles undefined platforms gracefully", () => {
      const { result } = renderHook(() =>
        useAdTypes(undefined as unknown as Platform[])
      );

      expect(result.current.adTypes.google).toEqual([]);
    });

    it("memoizes results when platforms array reference is stable", () => {
      const platforms: Platform[] = ["google"];
      const { result, rerender } = renderHook(
        ({ platforms: p }) => useAdTypes(p),
        { initialProps: { platforms } }
      );

      const firstResult = result.current.adTypes;

      // Rerender with SAME platforms array reference
      rerender({ platforms });

      const secondResult = result.current.adTypes;

      // Should be the same reference (memoized) when platforms reference is stable
      expect(firstResult).toBe(secondResult);
    });

    it("updates when platforms change", () => {
      const { result, rerender } = renderHook(
        ({ platforms }) => useAdTypes(platforms),
        { initialProps: { platforms: ["google"] as Platform[] } }
      );

      expect(result.current.adTypes.google).toHaveLength(2);
      expect(result.current.adTypes.reddit).toEqual([]);

      // Change platforms
      rerender({ platforms: ["reddit"] });

      expect(result.current.adTypes.reddit).toHaveLength(2);
      expect(result.current.adTypes.google).toEqual([]);
    });
  });
});
