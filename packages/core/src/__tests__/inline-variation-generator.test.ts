import { describe, it, expect } from "vitest";
import {
  InlineVariationGenerator,
  type VariationInput,
  type VariationConfig,
  type GeneratedVariation,
  type AdTemplate,
} from "../generation/inline-variation-generator.js";

describe("InlineVariationGenerator", () => {
  const generator = new InlineVariationGenerator();

  describe("single template, single row - no variations", () => {
    it("generates exactly one variation for a simple template", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "Buy {product_name} now!",
          description: "Great product for {audience}",
          callToAction: "Shop Now",
        },
        dataRow: {
          id: "row-1",
          product_name: "iPhone 15",
          audience: "tech enthusiasts",
        },
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(1);
      expect(result.variations[0]?.content.headline).toBe("Buy iPhone 15 now!");
      expect(result.variations[0]?.content.description).toBe("Great product for tech enthusiasts");
      expect(result.variations[0]?.metadata.isOriginal).toBe(true);
      expect(result.variations[0]?.metadata.variationIndex).toBe(0);
    });

    it("preserves dataRowId in metadata", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "Test headline",
        },
        dataRow: { id: "row-42" },
      };

      const result = generator.generateVariations(input);

      expect(result.variations[0]?.metadata.dataRowId).toBe("row-42");
    });

    it("handles numeric row id", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "Test headline",
        },
        dataRow: { id: 123 },
      };

      const result = generator.generateVariations(input);

      expect(result.variations[0]?.metadata.dataRowId).toBe("123");
    });

    it("generates id for row without id field", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "Test headline",
        },
        dataRow: { product_name: "Widget" },
      };

      const result = generator.generateVariations(input);

      expect(result.variations[0]?.metadata.dataRowId).toBeDefined();
      expect(result.variations[0]?.metadata.dataRowId.length).toBeGreaterThan(0);
    });
  });

  describe("inline variation syntax - pipe syntax for alternatives", () => {
    it("generates variations for headline with pipe syntax", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[Buy Now|Shop Today|Get Yours]]",
          description: "Great product",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(3);
      expect(result.variations.map((v) => v.content.headline)).toEqual([
        "Buy Now",
        "Shop Today",
        "Get Yours",
      ]);
    });

    it("generates variations for description with pipe syntax", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "Fixed headline",
          description: "[[Great deal|Best price|Top quality]]",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(3);
      expect(result.variations.map((v) => v.content.description)).toEqual([
        "Great deal",
        "Best price",
        "Top quality",
      ]);
    });

    it("combines variable substitution with inline variations", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[Buy|Get]] {product_name} [[now|today]]!",
        },
        dataRow: {
          id: "row-1",
          product_name: "iPhone",
        },
      };

      const result = generator.generateVariations(input);

      // 2 x 2 = 4 variations
      expect(result.variations).toHaveLength(4);
      expect(result.variations.map((v) => v.content.headline).sort()).toEqual([
        "Buy iPhone now!",
        "Buy iPhone today!",
        "Get iPhone now!",
        "Get iPhone today!",
      ]);
    });
  });

  describe("cartesian product of multiple variation sources", () => {
    it("generates cartesian product for multiple headline variations", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[A|B]] and [[1|2|3]]",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      // 2 x 3 = 6 variations
      expect(result.variations).toHaveLength(6);
      expect(result.variations.map((v) => v.content.headline).sort()).toEqual([
        "A and 1",
        "A and 2",
        "A and 3",
        "B and 1",
        "B and 2",
        "B and 3",
      ]);
    });

    it("generates cartesian product across headline and description", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[Buy|Get]] now",
          description: "[[Great|Best]] product",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      // 2 x 2 = 4 variations
      expect(result.variations).toHaveLength(4);

      const combinations = result.variations.map(
        (v) => `${v.content.headline}|${v.content.description}`
      );
      expect(combinations.sort()).toEqual([
        "Buy now|Best product",
        "Buy now|Great product",
        "Get now|Best product",
        "Get now|Great product",
      ]);
    });

    it("generates cartesian product across all fields", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[H1|H2]]",
          description: "[[D1|D2]]",
          callToAction: "[[Shop Now|Learn More]]",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      // 2 x 2 x 2 = 8 variations
      expect(result.variations).toHaveLength(8);
    });
  });

  describe("deduplication", () => {
    it("deduplicates identical variations by default", () => {
      // If different variation paths lead to same result
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[Buy|Buy]] now", // Same value repeated
          description: "Great product",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(1);
      expect(result.duplicatesRemoved).toBe(1);
    });

    it("deduplicates by specified fields", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[Buy|Shop]]",
          description: "[[Desc A|Desc B]]",
          callToAction: "Shop Now",
        },
        dataRow: { id: "row-1" },
        variationConfig: {
          deduplicateBy: ["headline"], // Only check headline for duplicates
        },
      };

      const result = generator.generateVariations(input);

      // Total raw combinations: 2 x 2 = 4
      // (Buy + Desc A), (Buy + Desc B), (Shop + Desc A), (Shop + Desc B)
      // When deduplicating by headline only: Buy and Shop are unique = 2 variations kept
      expect(result.variations).toHaveLength(2);
      expect(result.duplicatesRemoved).toBe(2);
    });

    it("marks first occurrence as original", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[A|B|C]]",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      expect(result.variations[0]?.metadata.isOriginal).toBe(true);
      expect(result.variations[1]?.metadata.isOriginal).toBe(false);
      expect(result.variations[2]?.metadata.isOriginal).toBe(false);
    });
  });

  describe("maxVariations limit", () => {
    it("respects maxVariations limit", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[A|B|C|D|E|F|G|H|I|J]]", // 10 options
        },
        dataRow: { id: "row-1" },
        variationConfig: {
          maxVariations: 3,
        },
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(3);
      expect(result.totalPossibleVariations).toBe(10);
      expect(result.wasLimited).toBe(true);
    });

    it("includes totalPossibleVariations in result", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[A|B]] [[1|2|3]]", // 2 x 3 = 6 options
        },
        dataRow: { id: "row-1" },
        variationConfig: {
          maxVariations: 2,
        },
      };

      const result = generator.generateVariations(input);

      expect(result.totalPossibleVariations).toBe(6);
      expect(result.variations).toHaveLength(2);
    });

    it("does not limit when maxVariations is not set", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[A|B|C|D|E]]", // 5 options
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(5);
      expect(result.wasLimited).toBe(false);
    });
  });

  describe("variation indices", () => {
    it("assigns sequential variation indices", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[A|B|C]]",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      expect(result.variations.map((v) => v.metadata.variationIndex)).toEqual([0, 1, 2]);
    });

    it("generates unique IDs for each variation", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[A|B|C]]",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      const ids = result.variations.map((v) => v.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("edge cases", () => {
    it("handles empty variation options", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[]]", // Empty variation
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(1);
      expect(result.variations[0]?.content.headline).toBe("");
    });

    it("handles single option in variation syntax", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[Only Option]]",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(1);
      expect(result.variations[0]?.content.headline).toBe("Only Option");
    });

    it("handles missing template fields", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "Test",
          // description and callToAction are optional
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(1);
      expect(result.variations[0]?.content.headline).toBe("Test");
      expect(result.variations[0]?.content.description).toBe("");
      expect(result.variations[0]?.content.callToAction).toBeUndefined();
    });

    it("handles nested variation syntax", () => {
      // Variations within variations are not supported - treated literally
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[A [[nested|test]]|B]]",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      // Should parse outer variations, inner brackets treated as literal
      expect(result.variations).toHaveLength(2);
    });

    it("handles special characters in variation options", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[Price: $99|Price: $199|50% Off!]]",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(3);
      expect(result.variations.map((v) => v.content.headline)).toEqual([
        "Price: $99",
        "Price: $199",
        "50% Off!",
      ]);
    });

    it("handles whitespace in variation options", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[ Buy Now | Shop Today | Get Started ]]",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(3);
      // Should trim whitespace from options
      expect(result.variations.map((v) => v.content.headline)).toEqual([
        "Buy Now",
        "Shop Today",
        "Get Started",
      ]);
    });
  });

  describe("variable substitution integration", () => {
    it("substitutes variables before generating variations", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[Buy|Get]] {product_name} for ${price}",
        },
        dataRow: {
          id: "row-1",
          product_name: "Widget",
          price: "99",
        },
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(2);
      expect(result.variations.map((v) => v.content.headline)).toEqual([
        "Buy Widget for $99",
        "Get Widget for $99",
      ]);
    });

    it("handles missing variables with warnings", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "Buy {product_name}",
        },
        dataRow: { id: "row-1" }, // missing product_name
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(1);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("product_name");
    });

    it("supports variable filters in variations", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[Buy|Shop]] {product_name|uppercase}",
        },
        dataRow: {
          id: "row-1",
          product_name: "widget",
        },
      };

      const result = generator.generateVariations(input);

      expect(result.variations).toHaveLength(2);
      expect(result.variations[0]?.content.headline).toBe("Buy WIDGET");
      expect(result.variations[1]?.content.headline).toBe("Shop WIDGET");
    });
  });

  describe("result statistics", () => {
    it("includes accurate statistics", () => {
      const input: VariationInput = {
        template: {
          id: "tmpl-1",
          headline: "[[A|A|B]]", // One duplicate
          description: "[[X|Y]]",
        },
        dataRow: { id: "row-1" },
      };

      const result = generator.generateVariations(input);

      // 3 x 2 = 6 raw, but A appears twice so dedups
      expect(result.totalPossibleVariations).toBe(6);
      expect(result.duplicatesRemoved).toBeGreaterThan(0);
    });
  });
});
