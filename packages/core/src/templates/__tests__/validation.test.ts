import { describe, it, expect } from "vitest";
import {
  validateCarousel,
  validateCardCount,
  validateCard,
  validateCardDimensions,
  validateCardOrder,
  canAddCard,
  canRemoveCard,
  validateDataRowSelection,
} from "../validation.js";
import {
  createCarouselTemplate,
  createCarouselCard,
  createEmptyCanvasJson,
  CAROUSEL_PLATFORM_CONSTRAINTS,
  type CarouselCard,
  type CarouselTemplate,
} from "../types.js";

describe("validateCarousel", () => {
  describe("manual mode", () => {
    it("should validate a valid manual carousel", () => {
      const template = createCarouselTemplate("facebook", "manual");
      const result = validateCarousel(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when no cards are present", () => {
      const template: CarouselTemplate = {
        mode: "manual",
        platform: "facebook",
        aspectRatio: "1:1",
        platformConstraints: CAROUSEL_PLATFORM_CONSTRAINTS.facebook,
        cards: [],
      };

      const result = validateCarousel(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "NO_CARDS" })
      );
    });

    it("should fail when cards is undefined", () => {
      const template: CarouselTemplate = {
        mode: "manual",
        platform: "facebook",
        aspectRatio: "1:1",
        platformConstraints: CAROUSEL_PLATFORM_CONSTRAINTS.facebook,
      };

      const result = validateCarousel(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "NO_CARDS" })
      );
    });

    it("should fail when only one card is present (Facebook requires 2+)", () => {
      const template: CarouselTemplate = {
        mode: "manual",
        platform: "facebook",
        aspectRatio: "1:1",
        platformConstraints: CAROUSEL_PLATFORM_CONSTRAINTS.facebook,
        cards: [createCarouselCard(0, { width: 1080, height: 1080 })],
        cardCount: 1,
      };

      const result = validateCarousel(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "TOO_FEW_CARDS" })
      );
    });

    it("should fail when exceeding max cards (Reddit max is 6)", () => {
      const cards = Array.from({ length: 8 }, (_, i) =>
        createCarouselCard(i, { width: 1080, height: 1080 })
      );

      const template: CarouselTemplate = {
        mode: "manual",
        platform: "reddit",
        aspectRatio: "1:1",
        platformConstraints: CAROUSEL_PLATFORM_CONSTRAINTS.reddit,
        cards,
        cardCount: 8,
      };

      const result = validateCarousel(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "TOO_MANY_CARDS" })
      );
    });
  });

  describe("data-driven mode", () => {
    it("should validate a valid data-driven carousel", () => {
      const template = createCarouselTemplate("facebook", "data-driven");
      const result = validateCarousel(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when cardTemplate is missing", () => {
      const template: CarouselTemplate = {
        mode: "data-driven",
        platform: "facebook",
        aspectRatio: "1:1",
        platformConstraints: CAROUSEL_PLATFORM_CONSTRAINTS.facebook,
      };

      const result = validateCarousel(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "MISSING_CARD_TEMPLATE" })
      );
    });
  });
});

describe("validateCardCount", () => {
  it("should validate count within range", () => {
    const constraints = CAROUSEL_PLATFORM_CONSTRAINTS.facebook;
    const result = validateCardCount(5, constraints);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should warn when at maximum", () => {
    const constraints = CAROUSEL_PLATFORM_CONSTRAINTS.facebook;
    const result = validateCardCount(10, constraints);

    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "AT_MAX_CARDS" })
    );
  });

  it("should fail when below minimum", () => {
    const constraints = CAROUSEL_PLATFORM_CONSTRAINTS.facebook;
    const result = validateCardCount(1, constraints);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "TOO_FEW_CARDS" })
    );
  });

  it("should fail when above maximum", () => {
    const constraints = CAROUSEL_PLATFORM_CONSTRAINTS.reddit;
    const result = validateCardCount(7, constraints);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "TOO_MANY_CARDS" })
    );
  });
});

describe("validateCard", () => {
  const constraints = CAROUSEL_PLATFORM_CONSTRAINTS.facebook;

  it("should validate a valid card", () => {
    const card = createCarouselCard(0, { width: 1080, height: 1080 });
    const errors = validateCard(card, 0, constraints);

    expect(errors).toHaveLength(0);
  });

  it("should fail when card has no ID", () => {
    const card: CarouselCard = {
      id: "",
      canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }),
      order: 0,
    };
    const errors = validateCard(card, 0, constraints);

    expect(errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_CARD_ID" })
    );
  });

  it("should fail when card has invalid URL", () => {
    const card: CarouselCard = {
      id: "card_1",
      canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }),
      order: 0,
      url: "not-a-url",
    };
    const errors = validateCard(card, 0, constraints);

    expect(errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_URL" })
    );
  });

  it("should allow URL with variables", () => {
    const card: CarouselCard = {
      id: "card_1",
      canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }),
      order: 0,
      url: "https://example.com/{product_slug}",
    };
    const errors = validateCard(card, 0, constraints);

    expect(errors.filter((e) => e.code === "INVALID_URL")).toHaveLength(0);
  });

  it("should fail when headline is too long", () => {
    const card: CarouselCard = {
      id: "card_1",
      canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }),
      order: 0,
      headline: "a".repeat(101),
    };
    const errors = validateCard(card, 0, constraints);

    expect(errors).toContainEqual(
      expect.objectContaining({ code: "HEADLINE_TOO_LONG" })
    );
  });

  it("should fail when description is too long", () => {
    const card: CarouselCard = {
      id: "card_1",
      canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }),
      order: 0,
      description: "a".repeat(201),
    };
    const errors = validateCard(card, 0, constraints);

    expect(errors).toContainEqual(
      expect.objectContaining({ code: "DESCRIPTION_TOO_LONG" })
    );
  });
});

describe("validateCardDimensions", () => {
  const constraints = CAROUSEL_PLATFORM_CONSTRAINTS.facebook;

  it("should validate correct dimensions", () => {
    const canvas = { width: 1080, height: 1080 };
    const errors = validateCardDimensions(canvas, constraints, 0);

    expect(errors).toHaveLength(0);
  });

  it("should fail when width is incorrect", () => {
    const canvas = { width: 800, height: 1080 };
    const errors = validateCardDimensions(canvas, constraints, 0);

    expect(errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_WIDTH" })
    );
  });

  it("should fail when height is incorrect", () => {
    const canvas = { width: 1080, height: 800 };
    const errors = validateCardDimensions(canvas, constraints, 0);

    expect(errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_HEIGHT" })
    );
  });
});

describe("validateCardOrder", () => {
  it("should validate correct order", () => {
    const cards: CarouselCard[] = [
      { id: "1", canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }), order: 0 },
      { id: "2", canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }), order: 1 },
      { id: "3", canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }), order: 2 },
    ];
    const errors = validateCardOrder(cards);

    expect(errors).toHaveLength(0);
  });

  it("should validate correct order even when array is unsorted", () => {
    const cards: CarouselCard[] = [
      { id: "2", canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }), order: 1 },
      { id: "1", canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }), order: 0 },
      { id: "3", canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }), order: 2 },
    ];
    const errors = validateCardOrder(cards);

    expect(errors).toHaveLength(0);
  });

  it("should fail when order has gaps", () => {
    const cards: CarouselCard[] = [
      { id: "1", canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }), order: 0 },
      { id: "2", canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }), order: 2 },
    ];
    const errors = validateCardOrder(cards);

    expect(errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_ORDER" })
    );
  });

  it("should fail when order doesn't start at 0", () => {
    const cards: CarouselCard[] = [
      { id: "1", canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }), order: 1 },
      { id: "2", canvasJson: createEmptyCanvasJson({ width: 1080, height: 1080 }), order: 2 },
    ];
    const errors = validateCardOrder(cards);

    expect(errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_ORDER" })
    );
  });
});

describe("canAddCard", () => {
  it("should return true when under limit", () => {
    expect(canAddCard(5, "facebook")).toBe(true);
    expect(canAddCard(4, "reddit")).toBe(true);
  });

  it("should return false when at limit", () => {
    expect(canAddCard(10, "facebook")).toBe(false);
    expect(canAddCard(6, "reddit")).toBe(false);
  });
});

describe("canRemoveCard", () => {
  it("should return true when above minimum", () => {
    expect(canRemoveCard(5, "facebook")).toBe(true);
    expect(canRemoveCard(4, "reddit")).toBe(true);
  });

  it("should return false when at minimum", () => {
    expect(canRemoveCard(2, "facebook")).toBe(false);
    expect(canRemoveCard(2, "reddit")).toBe(false);
  });
});

describe("validateDataRowSelection", () => {
  it("should validate correct selection count", () => {
    const result = validateDataRowSelection(5, "facebook");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail when too few rows selected", () => {
    const result = validateDataRowSelection(1, "facebook");
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "TOO_FEW_ROWS" })
    );
  });

  it("should fail when too many rows selected", () => {
    const result = validateDataRowSelection(8, "reddit");
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "TOO_MANY_ROWS" })
    );
  });
});
