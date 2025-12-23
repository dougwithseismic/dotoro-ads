/**
 * Keyword Generator Tests
 *
 * TDD approach: Tests written first, then implementation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  KeywordGenerator,
  type KeywordRule,
  type GeneratedKeyword,
  type KeywordGenerationContext,
} from "../keyword-generator.js";

describe("KeywordGenerator", () => {
  let generator: KeywordGenerator;

  beforeEach(() => {
    generator = new KeywordGenerator();
  });

  describe("basic keyword generation", () => {
    it("generates keyword from core term pattern with simple variable interpolation", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max" },
      };

      const keywords = generator.generateKeywords(rule, context);

      expect(keywords).toHaveLength(1);
      expect(keywords[0]).toEqual({
        keyword: "air max",
        matchType: "broad",
        adGroupId: "ag-1",
        sourceRuleId: "rule-1",
      });
    });

    it("generates keywords for multiple match types", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad", "phrase", "exact"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "nike shoes" },
      };

      const keywords = generator.generateKeywords(rule, context);

      expect(keywords).toHaveLength(3);
      expect(keywords.map(k => k.matchType)).toEqual(["broad", "phrase", "exact"]);
      expect(keywords.every(k => k.keyword === "nike shoes")).toBe(true);
    });
  });

  describe("prefix/suffix combinations", () => {
    it("generates all prefix combinations", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: ["buy", "cheap"],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max" },
      };

      const keywords = generator.generateKeywords(rule, context);
      const keywordTexts = keywords.map(k => k.keyword);

      expect(keywordTexts).toContain("buy air max");
      expect(keywordTexts).toContain("cheap air max");
    });

    it("generates all suffix combinations", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: ["online", "sale"],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max" },
      };

      const keywords = generator.generateKeywords(rule, context);
      const keywordTexts = keywords.map(k => k.keyword);

      expect(keywordTexts).toContain("air max online");
      expect(keywordTexts).toContain("air max sale");
    });

    it("generates all prefix+suffix combinations (cartesian product)", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: ["buy", ""],
        suffixes: ["online", ""],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max" },
      };

      const keywords = generator.generateKeywords(rule, context);
      const keywordTexts = keywords.map(k => k.keyword);

      // 2 prefixes x 2 suffixes = 4 combinations
      expect(keywordTexts).toContain("air max"); // no prefix, no suffix
      expect(keywordTexts).toContain("buy air max"); // prefix, no suffix
      expect(keywordTexts).toContain("air max online"); // no prefix, suffix
      expect(keywordTexts).toContain("buy air max online"); // prefix, suffix
    });

    it("generates full combinatorial set with match types (example from TODO)", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: ["buy", ""],
        suffixes: ["online", ""],
        matchTypes: ["broad", "exact"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max" },
      };

      const keywords = generator.generateKeywords(rule, context);

      // 2 prefixes x 2 suffixes x 2 match types = 8 keywords
      expect(keywords).toHaveLength(8);

      // Verify all expected combinations
      const expectedKeywords = [
        { keyword: "air max", matchType: "broad" },
        { keyword: "air max", matchType: "exact" },
        { keyword: "buy air max", matchType: "broad" },
        { keyword: "buy air max", matchType: "exact" },
        { keyword: "air max online", matchType: "broad" },
        { keyword: "air max online", matchType: "exact" },
        { keyword: "buy air max online", matchType: "broad" },
        { keyword: "buy air max online", matchType: "exact" },
      ];

      for (const expected of expectedKeywords) {
        expect(keywords).toContainEqual(
          expect.objectContaining({
            keyword: expected.keyword,
            matchType: expected.matchType,
            adGroupId: "ag-1",
            sourceRuleId: "rule-1",
          })
        );
      }
    });
  });

  describe("deduplication", () => {
    it("removes duplicate keyword+matchType combinations", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: ["", ""], // Intentionally duplicated to test dedup
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max" },
      };

      const keywords = generator.generateKeywords(rule, context);

      // Should deduplicate "air max" broad
      expect(keywords).toHaveLength(1);
      expect(keywords[0]?.keyword).toBe("air max");
    });

    it("preserves same keyword with different match types", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad", "exact"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max" },
      };

      const keywords = generator.generateKeywords(rule, context);

      // Same keyword, different match types - should NOT be deduplicated
      expect(keywords).toHaveLength(2);
    });

    it("normalizes whitespace during deduplication", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: ["buy ", " buy"], // Whitespace variations
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max" },
      };

      const keywords = generator.generateKeywords(rule, context);

      // Both should normalize to "buy air max"
      expect(keywords).toHaveLength(1);
      expect(keywords[0]?.keyword).toBe("buy air max");
    });
  });

  describe("variable interpolation", () => {
    it("interpolates multiple variables in core term pattern", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{brand} {product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { brand: "nike", product_name: "air max" },
      };

      const keywords = generator.generateKeywords(rule, context);

      expect(keywords).toHaveLength(1);
      expect(keywords[0]?.keyword).toBe("nike air max");
    });

    it("handles missing variable with empty string", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: {}, // Missing product_name
      };

      const keywords = generator.generateKeywords(rule, context);

      // Should generate empty keyword (which may be filtered)
      expect(keywords).toHaveLength(0);
    });

    it("handles null and undefined variable values", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: null },
      };

      const keywords = generator.generateKeywords(rule, context);

      // Empty keyword should be filtered out
      expect(keywords).toHaveLength(0);
    });

    it("converts numeric values to strings", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name} {year}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "model", year: 2024 },
      };

      const keywords = generator.generateKeywords(rule, context);

      expect(keywords).toHaveLength(1);
      expect(keywords[0]?.keyword).toBe("model 2024");
    });

    it("trims whitespace from interpolated values", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "  air max  " },
      };

      const keywords = generator.generateKeywords(rule, context);

      expect(keywords[0]?.keyword).toBe("air max");
    });
  });

  describe("negative keywords", () => {
    it("returns negative keywords from rule", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
        negativeKeywords: ["free", "cheap"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max" },
      };

      const result = generator.generateKeywordsWithNegatives(rule, context);

      expect(result.keywords).toHaveLength(1);
      expect(result.negativeKeywords).toEqual(["free", "cheap"]);
    });

    it("interpolates variables in negative keywords", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
        negativeKeywords: ["{brand} fake", "counterfeit {product_name}"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max", brand: "nike" },
      };

      const result = generator.generateKeywordsWithNegatives(rule, context);

      expect(result.negativeKeywords).toContain("nike fake");
      expect(result.negativeKeywords).toContain("counterfeit air max");
    });

    it("returns empty negative keywords array when none defined", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max" },
      };

      const result = generator.generateKeywordsWithNegatives(rule, context);

      expect(result.negativeKeywords).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("handles empty prefixes and suffixes arrays", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max" },
      };

      const keywords = generator.generateKeywords(rule, context);

      expect(keywords).toHaveLength(1);
      expect(keywords[0]?.keyword).toBe("air max");
    });

    it("handles empty match types array", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: [],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max" },
      };

      const keywords = generator.generateKeywords(rule, context);

      expect(keywords).toHaveLength(0);
    });

    it("handles static core term pattern (no variables)", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Static Keywords",
        scope: "campaign",
        coreTermPattern: "running shoes",
        prefixes: ["buy"],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: {},
      };

      const keywords = generator.generateKeywords(rule, context);

      expect(keywords).toHaveLength(1);
      expect(keywords[0]?.keyword).toBe("buy running shoes");
    });

    it("handles special characters in variable values", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max 90's edition" },
      };

      const keywords = generator.generateKeywords(rule, context);

      expect(keywords[0]?.keyword).toBe("air max 90's edition");
    });

    it("collapses multiple spaces to single space", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{brand}  {product_name}",
        prefixes: ["buy  "],
        suffixes: ["  online"],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { brand: "nike", product_name: "air max" },
      };

      const keywords = generator.generateKeywords(rule, context);

      // All keywords should have single spaces
      for (const kw of keywords) {
        expect(kw.keyword).not.toMatch(/  /);
      }
    });

    it("handles lowercase normalization", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "AIR MAX" },
      };

      const keywords = generator.generateKeywords(rule, context);

      // Keywords should be lowercased for consistency
      expect(keywords[0]?.keyword).toBe("air max");
    });
  });

  describe("batch generation", () => {
    it("generates keywords for multiple rows", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const rows = [
        { product_name: "air max", _adGroupId: "ag-1" },
        { product_name: "jordan", _adGroupId: "ag-2" },
        { product_name: "vaporfly", _adGroupId: "ag-3" },
      ];

      const keywords = generator.generateKeywordsForRows(rule, rows);

      expect(keywords).toHaveLength(3);
      expect(keywords.map(k => k.keyword)).toEqual(["air max", "jordan", "vaporfly"]);
      expect(keywords.map(k => k.adGroupId)).toEqual(["ag-1", "ag-2", "ag-3"]);
    });

    it("deduplicates across rows for same ad group", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Product Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const rows = [
        { product_name: "air max", _adGroupId: "ag-1" },
        { product_name: "air max", _adGroupId: "ag-1" }, // Duplicate
        { product_name: "air max", _adGroupId: "ag-2" }, // Different ad group
      ];

      const keywords = generator.generateKeywordsForRows(rule, rows);

      // Should have 2: one for ag-1, one for ag-2
      expect(keywords).toHaveLength(2);
    });
  });

  describe("scope handling", () => {
    it("preserves campaign scope in generated keywords", () => {
      const rule: KeywordRule = {
        id: "rule-1",
        name: "Campaign Level Keywords",
        scope: "campaign",
        coreTermPattern: "{brand}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { brand: "nike" },
      };

      const keywords = generator.generateKeywords(rule, context);

      // Scope is stored on the rule, not the generated keyword
      // but we verify the rule's scope is accessible
      expect(rule.scope).toBe("campaign");
      expect(keywords[0]?.sourceRuleId).toBe("rule-1");
    });

    it("preserves ad-group scope in generated keywords", () => {
      const rule: KeywordRule = {
        id: "rule-2",
        name: "Ad Group Level Keywords",
        scope: "ad-group",
        coreTermPattern: "{product_name}",
        prefixes: [],
        suffixes: [],
        matchTypes: ["broad"],
      };

      const context: KeywordGenerationContext = {
        adGroupId: "ag-1",
        rowData: { product_name: "air max" },
      };

      const keywords = generator.generateKeywords(rule, context);

      expect(rule.scope).toBe("ad-group");
      expect(keywords[0]?.sourceRuleId).toBe("rule-2");
    });
  });
});
