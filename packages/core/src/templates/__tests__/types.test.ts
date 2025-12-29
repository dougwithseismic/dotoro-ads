import { describe, it, expect } from "vitest";
import {
  createCarouselTemplate,
  createEmptyCanvasJson,
  createCarouselCard,
  generateCardId,
  isDataDrivenMode,
  isManualMode,
  isValidCarouselPlatform,
  CAROUSEL_PLATFORM_CONSTRAINTS,
  carouselTemplateSchema,
  carouselCardSchema,
  type CarouselTemplate,
} from "../types.js";

describe("CAROUSEL_PLATFORM_CONSTRAINTS", () => {
  it("should have correct Facebook constraints", () => {
    const fb = CAROUSEL_PLATFORM_CONSTRAINTS.facebook;
    expect(fb.minCards).toBe(2);
    expect(fb.maxCards).toBe(10);
    expect(fb.aspectRatio).toBe("1:1");
    expect(fb.dimensions).toEqual({ width: 1080, height: 1080 });
    expect(fb.maxFileSize).toBe(30_000_000);
  });

  it("should have correct Reddit constraints", () => {
    const reddit = CAROUSEL_PLATFORM_CONSTRAINTS.reddit;
    expect(reddit.minCards).toBe(2);
    expect(reddit.maxCards).toBe(6);
    expect(reddit.aspectRatio).toBe("1:1");
    expect(reddit.dimensions).toEqual({ width: 1080, height: 1080 });
    expect(reddit.maxFileSize).toBe(3_000_000);
  });
});

describe("createCarouselTemplate", () => {
  it("should create a manual mode template with 2 cards", () => {
    const template = createCarouselTemplate("facebook", "manual");

    expect(template.mode).toBe("manual");
    expect(template.platform).toBe("facebook");
    expect(template.aspectRatio).toBe("1:1");
    expect(template.cards).toHaveLength(2);
    expect(template.cardCount).toBe(2);
    expect(template.platformConstraints).toEqual(
      CAROUSEL_PLATFORM_CONSTRAINTS.facebook
    );
  });

  it("should create a data-driven mode template with cardTemplate", () => {
    const template = createCarouselTemplate("reddit", "data-driven");

    expect(template.mode).toBe("data-driven");
    expect(template.platform).toBe("reddit");
    expect(template.cardTemplate).toBeDefined();
    expect(template.cardTemplate?.width).toBe(1080);
    expect(template.cardTemplate?.height).toBe(1080);
    expect(template.cards).toBeUndefined();
  });

  it("should default to manual mode", () => {
    const template = createCarouselTemplate("facebook");

    expect(template.mode).toBe("manual");
  });
});

describe("createEmptyCanvasJson", () => {
  it("should create canvas with correct dimensions", () => {
    const canvas = createEmptyCanvasJson({ width: 1080, height: 1080 });

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1080);
    expect(canvas.version).toBe("6.0.0");
    expect(canvas.objects).toEqual([]);
    expect(canvas.background).toBe("#ffffff");
  });
});

describe("createCarouselCard", () => {
  it("should create card with correct order", () => {
    const card = createCarouselCard(3, { width: 1080, height: 1080 });

    expect(card.order).toBe(3);
    expect(card.id).toMatch(/^card_\d+_[a-z0-9]+$/);
    expect(card.canvasJson.width).toBe(1080);
    expect(card.canvasJson.height).toBe(1080);
  });

  it("should generate unique IDs", () => {
    const card1 = createCarouselCard(0, { width: 1080, height: 1080 });
    const card2 = createCarouselCard(1, { width: 1080, height: 1080 });

    expect(card1.id).not.toBe(card2.id);
  });
});

describe("generateCardId", () => {
  it("should generate unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateCardId());
    }
    expect(ids.size).toBe(100);
  });

  it("should match expected format", () => {
    const id = generateCardId();
    expect(id).toMatch(/^card_\d+_[a-z0-9]+$/);
  });
});

describe("isDataDrivenMode", () => {
  it("should return true for data-driven templates", () => {
    const template = createCarouselTemplate("facebook", "data-driven");
    expect(isDataDrivenMode(template)).toBe(true);
  });

  it("should return false for manual templates", () => {
    const template = createCarouselTemplate("facebook", "manual");
    expect(isDataDrivenMode(template)).toBe(false);
  });

  it("should return false when cardTemplate is missing", () => {
    const template: CarouselTemplate = {
      mode: "data-driven",
      platform: "facebook",
      aspectRatio: "1:1",
      platformConstraints: CAROUSEL_PLATFORM_CONSTRAINTS.facebook,
    };
    expect(isDataDrivenMode(template)).toBe(false);
  });
});

describe("isManualMode", () => {
  it("should return true for manual templates", () => {
    const template = createCarouselTemplate("facebook", "manual");
    expect(isManualMode(template)).toBe(true);
  });

  it("should return false for data-driven templates", () => {
    const template = createCarouselTemplate("facebook", "data-driven");
    expect(isManualMode(template)).toBe(false);
  });

  it("should return false when cards is missing", () => {
    const template: CarouselTemplate = {
      mode: "manual",
      platform: "facebook",
      aspectRatio: "1:1",
      platformConstraints: CAROUSEL_PLATFORM_CONSTRAINTS.facebook,
    };
    expect(isManualMode(template)).toBe(false);
  });
});

describe("isValidCarouselPlatform", () => {
  it("should return true for facebook", () => {
    expect(isValidCarouselPlatform("facebook")).toBe(true);
  });

  it("should return true for reddit", () => {
    expect(isValidCarouselPlatform("reddit")).toBe(true);
  });

  it("should return false for other platforms", () => {
    expect(isValidCarouselPlatform("google")).toBe(false);
    expect(isValidCarouselPlatform("twitter")).toBe(false);
    expect(isValidCarouselPlatform("")).toBe(false);
  });
});

describe("carouselCardSchema", () => {
  it("should validate a valid card", () => {
    const card = createCarouselCard(0, { width: 1080, height: 1080 });
    const result = carouselCardSchema.safeParse(card);

    expect(result.success).toBe(true);
  });

  it("should validate card with optional fields", () => {
    const card = {
      id: "card_1",
      canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }),
      order: 0,
      headline: "Test Headline",
      description: "Test Description",
      url: "https://example.com",
      dataRowId: "row_1",
    };
    const result = carouselCardSchema.safeParse(card);

    expect(result.success).toBe(true);
  });

  it("should reject card with invalid URL", () => {
    const card = {
      id: "card_1",
      canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }),
      order: 0,
      url: "not-a-url",
    };
    const result = carouselCardSchema.safeParse(card);

    expect(result.success).toBe(false);
  });

  it("should reject card with empty ID", () => {
    const card = {
      id: "",
      canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }),
      order: 0,
    };
    const result = carouselCardSchema.safeParse(card);

    expect(result.success).toBe(false);
  });
});

describe("carouselTemplateSchema", () => {
  it("should validate a valid manual mode template", () => {
    const template = createCarouselTemplate("facebook", "manual");
    const result = carouselTemplateSchema.safeParse(template);

    expect(result.success).toBe(true);
  });

  it("should validate a valid data-driven mode template", () => {
    const template = createCarouselTemplate("reddit", "data-driven");
    const result = carouselTemplateSchema.safeParse(template);

    expect(result.success).toBe(true);
  });

  it("should reject data-driven mode without cardTemplate", () => {
    const template = {
      mode: "data-driven",
      platform: "facebook",
      aspectRatio: "1:1",
      platformConstraints: CAROUSEL_PLATFORM_CONSTRAINTS.facebook,
    };
    const result = carouselTemplateSchema.safeParse(template);

    expect(result.success).toBe(false);
  });

  it("should reject manual mode without cards", () => {
    const template = {
      mode: "manual",
      platform: "facebook",
      aspectRatio: "1:1",
      platformConstraints: CAROUSEL_PLATFORM_CONSTRAINTS.facebook,
    };
    const result = carouselTemplateSchema.safeParse(template);

    expect(result.success).toBe(false);
  });

  it("should reject invalid aspect ratio", () => {
    const template = {
      mode: "manual",
      platform: "facebook",
      aspectRatio: "16:9",
      platformConstraints: CAROUSEL_PLATFORM_CONSTRAINTS.facebook,
      cards: [
        createCarouselCard(0, { width: 1080, height: 1080 }),
        createCarouselCard(1, { width: 1080, height: 1080 }),
      ],
    };
    const result = carouselTemplateSchema.safeParse(template);

    expect(result.success).toBe(false);
  });

  it("should reject invalid platform", () => {
    const template = {
      mode: "manual",
      platform: "twitter",
      aspectRatio: "1:1",
      platformConstraints: CAROUSEL_PLATFORM_CONSTRAINTS.facebook,
      cards: [
        createCarouselCard(0, { width: 1080, height: 1080 }),
        createCarouselCard(1, { width: 1080, height: 1080 }),
      ],
    };
    const result = carouselTemplateSchema.safeParse(template);

    expect(result.success).toBe(false);
  });
});
