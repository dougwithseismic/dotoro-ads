import { describe, it, expect } from "vitest";
import { GOOGLE_AD_TYPES } from "../platforms/google.js";
import { REDDIT_AD_TYPES } from "../platforms/reddit.js";
import { FACEBOOK_AD_TYPES } from "../platforms/facebook.js";
import type { AdTypeDefinition } from "../types.js";

describe("Google Ad Types", () => {
  it("exports the expected number of ad types", () => {
    expect(GOOGLE_AD_TYPES).toHaveLength(3);
  });

  it("includes responsive-search ad type", () => {
    const adType = GOOGLE_AD_TYPES.find((t) => t.id === "responsive-search");
    expect(adType).toBeDefined();
    expect(adType?.platform).toBe("google");
    expect(adType?.category).toBe("paid");
    expect(adType?.features.supportsKeywords).toBe(true);
  });

  it("includes responsive-display ad type", () => {
    const adType = GOOGLE_AD_TYPES.find((t) => t.id === "responsive-display");
    expect(adType).toBeDefined();
    expect(adType?.platform).toBe("google");
    expect(adType?.creatives.length).toBeGreaterThan(0);
  });

  it("includes performance-max ad type", () => {
    const adType = GOOGLE_AD_TYPES.find((t) => t.id === "performance-max");
    expect(adType).toBeDefined();
    expect(adType?.platform).toBe("google");
    expect(adType?.features.supportsMultipleAds).toBe(false);
  });

  describe("responsive-search validation", () => {
    const adType = GOOGLE_AD_TYPES.find(
      (t) => t.id === "responsive-search"
    ) as AdTypeDefinition;

    it("validates valid data", () => {
      const result = adType.validate({
        headlines: ["Headline 1", "Headline 2", "Headline 3"],
        descriptions: ["Description 1", "Description 2"],
        finalUrl: "https://example.com",
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("fails when headlines are missing", () => {
      const result = adType.validate({
        descriptions: ["Description 1", "Description 2"],
        finalUrl: "https://example.com",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least 3 headlines required");
    });

    it("fails when not enough headlines", () => {
      const result = adType.validate({
        headlines: ["Headline 1", "Headline 2"],
        descriptions: ["Description 1", "Description 2"],
        finalUrl: "https://example.com",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least 3 headlines required");
    });

    it("fails when descriptions are missing", () => {
      const result = adType.validate({
        headlines: ["Headline 1", "Headline 2", "Headline 3"],
        finalUrl: "https://example.com",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least 2 descriptions required");
    });

    it("warns about duplicate headlines", () => {
      const result = adType.validate({
        headlines: ["Same Headline", "Same Headline", "Same Headline"],
        descriptions: ["Description 1", "Description 2"],
        finalUrl: "https://example.com",
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        "Headlines should be unique for better performance"
      );
    });
  });

  describe("responsive-display validation", () => {
    const adType = GOOGLE_AD_TYPES.find(
      (t) => t.id === "responsive-display"
    ) as AdTypeDefinition;

    it("fails when landscape images are missing", () => {
      const result = adType.validate({
        squareImages: [{ id: "1" }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least one landscape image required");
    });

    it("fails when square images are missing", () => {
      const result = adType.validate({
        landscapeImages: [{ id: "1" }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least one square image required");
    });

    it("validates when both image types present", () => {
      const result = adType.validate({
        landscapeImages: [{ id: "1" }],
        squareImages: [{ id: "2" }],
      });
      expect(result.valid).toBe(true);
    });
  });
});

describe("Reddit Ad Types", () => {
  it("exports the expected number of ad types", () => {
    expect(REDDIT_AD_TYPES).toHaveLength(6);
  });

  it("includes all expected ad types", () => {
    const ids = REDDIT_AD_TYPES.map((t) => t.id);
    expect(ids).toContain("link");
    expect(ids).toContain("image");
    expect(ids).toContain("video");
    expect(ids).toContain("carousel");
    expect(ids).toContain("conversation");
    expect(ids).toContain("thread");
  });

  it("has thread as organic category", () => {
    const thread = REDDIT_AD_TYPES.find((t) => t.id === "thread");
    expect(thread?.category).toBe("organic");
  });

  it("has conversation as promoted category", () => {
    const conversation = REDDIT_AD_TYPES.find((t) => t.id === "conversation");
    expect(conversation?.category).toBe("promoted");
  });

  describe("link ad validation", () => {
    const adType = REDDIT_AD_TYPES.find(
      (t) => t.id === "link"
    ) as AdTypeDefinition;

    it("validates valid data", () => {
      const result = adType.validate({
        title: "Check this out!",
        destinationUrl: "https://example.com",
        callToAction: "LEARN_MORE",
      });
      expect(result.valid).toBe(true);
    });

    it("fails when title is missing", () => {
      const result = adType.validate({
        destinationUrl: "https://example.com",
        callToAction: "LEARN_MORE",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Title is required");
    });

    it("fails when destination URL is missing", () => {
      const result = adType.validate({
        title: "Check this out!",
        callToAction: "LEARN_MORE",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Destination URL is required");
    });
  });

  describe("carousel ad validation", () => {
    const adType = REDDIT_AD_TYPES.find(
      (t) => t.id === "carousel"
    ) as AdTypeDefinition;

    it("fails when cards are missing", () => {
      const result = adType.validate({
        title: "Products",
        callToAction: "SHOP_NOW",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least 2 carousel cards required");
    });

    it("fails when only 1 card", () => {
      const result = adType.validate({
        title: "Products",
        callToAction: "SHOP_NOW",
        cards: [{ id: "1" }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least 2 carousel cards required");
    });

    it("fails when more than 6 cards", () => {
      const result = adType.validate({
        title: "Products",
        callToAction: "SHOP_NOW",
        cards: [
          { id: "1" },
          { id: "2" },
          { id: "3" },
          { id: "4" },
          { id: "5" },
          { id: "6" },
          { id: "7" },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Maximum 6 carousel cards allowed");
    });

    it("validates with correct number of cards", () => {
      const result = adType.validate({
        title: "Products",
        callToAction: "SHOP_NOW",
        cards: [{ id: "1" }, { id: "2" }, { id: "3" }],
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("thread validation", () => {
    const adType = REDDIT_AD_TYPES.find(
      (t) => t.id === "thread"
    ) as AdTypeDefinition;

    it("fails when subreddit is missing", () => {
      const result = adType.validate({
        title: "My Post",
        postType: "text",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Subreddit is required");
    });

    it("fails when link post has no URL", () => {
      const result = adType.validate({
        title: "My Post",
        subreddit: "productivity",
        postType: "link",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("URL is required for link posts");
    });

    it("validates text post without URL", () => {
      const result = adType.validate({
        title: "My Post",
        subreddit: "productivity",
        postType: "text",
      });
      expect(result.valid).toBe(true);
    });
  });
});

describe("Facebook Ad Types", () => {
  it("exports the expected number of ad types", () => {
    expect(FACEBOOK_AD_TYPES).toHaveLength(4);
  });

  it("includes all expected ad types", () => {
    const ids = FACEBOOK_AD_TYPES.map((t) => t.id);
    expect(ids).toContain("single-image");
    expect(ids).toContain("video");
    expect(ids).toContain("carousel");
    expect(ids).toContain("collection");
  });

  it("all types are paid category", () => {
    for (const adType of FACEBOOK_AD_TYPES) {
      expect(adType.category).toBe("paid");
    }
  });

  describe("single-image validation", () => {
    const adType = FACEBOOK_AD_TYPES.find(
      (t) => t.id === "single-image"
    ) as AdTypeDefinition;

    it("validates valid data", () => {
      const result = adType.validate({
        image: { id: "1" },
        primaryText: "Check this out!",
        headline: "Great Product",
        websiteUrl: "https://example.com",
        callToAction: "SHOP_NOW",
      });
      expect(result.valid).toBe(true);
    });

    it("fails when image is missing", () => {
      const result = adType.validate({
        primaryText: "Check this out!",
        headline: "Great Product",
        websiteUrl: "https://example.com",
        callToAction: "SHOP_NOW",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Image is required");
    });

    it("fails when primary text is missing", () => {
      const result = adType.validate({
        image: { id: "1" },
        headline: "Great Product",
        websiteUrl: "https://example.com",
        callToAction: "SHOP_NOW",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Primary text is required");
    });
  });

  describe("carousel validation", () => {
    const adType = FACEBOOK_AD_TYPES.find(
      (t) => t.id === "carousel"
    ) as AdTypeDefinition;

    it("fails when cards are missing", () => {
      const result = adType.validate({
        primaryText: "Products",
        websiteUrl: "https://example.com",
        callToAction: "SHOP_NOW",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least 2 carousel cards required");
    });

    it("fails when more than 10 cards", () => {
      const result = adType.validate({
        primaryText: "Products",
        websiteUrl: "https://example.com",
        callToAction: "SHOP_NOW",
        cards: Array.from({ length: 11 }, (_, i) => ({ id: String(i) })),
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Maximum 10 carousel cards allowed");
    });

    it("validates with correct number of cards", () => {
      const result = adType.validate({
        primaryText: "Products",
        websiteUrl: "https://example.com",
        callToAction: "SHOP_NOW",
        cards: [{ id: "1" }, { id: "2" }],
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("collection validation", () => {
    const adType = FACEBOOK_AD_TYPES.find(
      (t) => t.id === "collection"
    ) as AdTypeDefinition;

    it("fails when not enough products", () => {
      const result = adType.validate({
        primaryText: "Products",
        headline: "Our Collection",
        instantExperienceId: "123",
        coverImage: { id: "1" },
        products: [{ id: "1" }, { id: "2" }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least 4 product images required");
    });

    it("validates with enough products", () => {
      const result = adType.validate({
        primaryText: "Products",
        headline: "Our Collection",
        instantExperienceId: "123",
        coverImage: { id: "1" },
        products: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }],
      });
      expect(result.valid).toBe(true);
    });
  });
});

describe("Ad Type Structure Validation", () => {
  const allAdTypes = [
    ...GOOGLE_AD_TYPES,
    ...REDDIT_AD_TYPES,
    ...FACEBOOK_AD_TYPES,
  ];

  it("all ad types have required properties", () => {
    for (const adType of allAdTypes) {
      expect(adType.id).toBeTruthy();
      expect(adType.platform).toBeTruthy();
      expect(adType.name).toBeTruthy();
      expect(adType.description).toBeTruthy();
      expect(adType.category).toBeTruthy();
      expect(adType.icon).toBeTruthy();
      expect(Array.isArray(adType.fields)).toBe(true);
      expect(Array.isArray(adType.creatives)).toBe(true);
      expect(adType.constraints).toBeDefined();
      expect(adType.features).toBeDefined();
      expect(typeof adType.validate).toBe("function");
      expect(adType.previewComponent).toBeTruthy();
    }
  });

  it("all fields have required properties", () => {
    for (const adType of allAdTypes) {
      for (const field of adType.fields) {
        expect(field.id).toBeTruthy();
        expect(field.name).toBeTruthy();
        expect(field.type).toBeTruthy();
        expect(typeof field.required).toBe("boolean");
        expect(typeof field.supportsVariables).toBe("boolean");
      }
    }
  });

  it("all creative requirements have required properties", () => {
    for (const adType of allAdTypes) {
      for (const creative of adType.creatives) {
        expect(creative.id).toBeTruthy();
        expect(creative.name).toBeTruthy();
        expect(creative.type).toBeTruthy();
        expect(typeof creative.required).toBe("boolean");
        expect(creative.specs).toBeDefined();
      }
    }
  });

  it("all features have boolean values", () => {
    for (const adType of allAdTypes) {
      expect(typeof adType.features.supportsVariables).toBe("boolean");
      expect(typeof adType.features.supportsMultipleAds).toBe("boolean");
      expect(typeof adType.features.supportsKeywords).toBe("boolean");
      expect(typeof adType.features.supportsScheduling).toBe("boolean");
    }
  });
});
