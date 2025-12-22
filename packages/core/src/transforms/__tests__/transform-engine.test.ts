/**
 * Transform Engine Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TransformEngine } from "../transform-engine.js";
import { AggregationExecutor } from "../aggregations.js";
import type { TransformConfig } from "../types.js";

describe("TransformEngine", () => {
  let engine: TransformEngine;
  let aggregationExecutor: AggregationExecutor;

  const sampleProducts = [
    { sku: "ABC123", brand: "Nike", price: 99.99, category: "Shoes" },
    { sku: "ABC124", brand: "Nike", price: 149.99, category: "Shoes" },
    { sku: "DEF456", brand: "Adidas", price: 79.99, category: "Shirts" },
    { sku: "DEF457", brand: "Adidas", price: 89.99, category: "Shoes" },
    { sku: "GHI789", brand: "Puma", price: null, category: "Accessories" },
  ];

  beforeEach(() => {
    aggregationExecutor = new AggregationExecutor();
    engine = new TransformEngine(aggregationExecutor);
  });

  describe("execute", () => {
    it("groups by single field and counts rows", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "product_count" }
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, sampleProducts);

      expect(result.groupCount).toBe(3);
      expect(result.sourceRowCount).toBe(5);
      expect(result.rows).toHaveLength(3);
      expect(result.errors).toHaveLength(0);

      // Find Nike row
      const nikeRow = result.rows.find(r => r.brand === "Nike");
      expect(nikeRow?.product_count).toBe(2);

      // Find Adidas row
      const adidasRow = result.rows.find(r => r.brand === "Adidas");
      expect(adidasRow?.product_count).toBe(2);

      // Find Puma row
      const pumaRow = result.rows.find(r => r.brand === "Puma");
      expect(pumaRow?.product_count).toBe(1);
    });

    it("applies multiple aggregations", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "product_count" },
          { function: "MIN", sourceField: "price", outputField: "min_price" },
          { function: "MAX", sourceField: "price", outputField: "max_price" },
          { function: "COLLECT", sourceField: "sku", outputField: "all_skus" },
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, sampleProducts);

      const nikeRow = result.rows.find(r => r.brand === "Nike");
      expect(nikeRow?.product_count).toBe(2);
      expect(nikeRow?.min_price).toBe(99.99);
      expect(nikeRow?.max_price).toBe(149.99);
      expect(nikeRow?.all_skus).toEqual(["ABC123", "ABC124"]);

      // Puma has null price
      const pumaRow = result.rows.find(r => r.brand === "Puma");
      expect(pumaRow?.min_price).toBeNull();
      expect(pumaRow?.max_price).toBeNull();
    });

    it("groups by multiple fields", () => {
      const config: TransformConfig = {
        groupBy: ["brand", "category"],
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, sampleProducts);

      // Nike|Shoes (2), Adidas|Shirts (1), Adidas|Shoes (1), Puma|Accessories (1)
      expect(result.groupCount).toBe(4);
      expect(result.rows).toHaveLength(4);

      const nikeShoes = result.rows.find(r => r.brand === "Nike" && r.category === "Shoes");
      expect(nikeShoes?.count).toBe(2);

      const adidasShoes = result.rows.find(r => r.brand === "Adidas" && r.category === "Shoes");
      expect(adidasShoes?.count).toBe(1);
    });

    it("handles group by values containing pipe characters", () => {
      const dataWithPipes = [
        { brand: "Nike|Jordan", category: "Shoes", price: 100 },
        { brand: "Nike|Jordan", category: "Shirts", price: 50 },
      ];

      const config: TransformConfig = {
        groupBy: ["brand", "category"],
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, dataWithPipes);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].brand).toBe("Nike|Jordan");
    });

    it("excludes group key when includeGroupKey is false", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: false,
      };

      const result = engine.execute(config, sampleProducts);

      // Rows should not have brand field
      expect(result.rows[0]).not.toHaveProperty("brand");
      expect(result.rows[0]).toHaveProperty("count");
    });

    it("applies outputFieldPrefix", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "count" },
          { function: "SUM", sourceField: "price", outputField: "total" },
        ],
        includeGroupKey: true,
        outputFieldPrefix: "agg_",
      };

      const result = engine.execute(config, sampleProducts);

      const nikeRow = result.rows.find(r => r.brand === "Nike");
      expect(nikeRow).toHaveProperty("agg_count");
      expect(nikeRow).toHaveProperty("agg_total");
      expect(nikeRow?.agg_count).toBe(2);
    });

    it("handles empty source rows", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, []);

      expect(result.groupCount).toBe(0);
      expect(result.sourceRowCount).toBe(0);
      expect(result.rows).toHaveLength(0);
    });

    it("handles null/undefined group keys", () => {
      const dataWithNulls = [
        { brand: "Nike", price: 100 },
        { brand: null, price: 50 },
        { brand: undefined, price: 75 },
        { brand: "Nike", price: 150 },
      ];

      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, dataWithNulls);

      // Nike group + null/undefined group (treated as single group)
      expect(result.groupCount).toBe(2);

      const nikeRow = result.rows.find(r => r.brand === "Nike");
      expect(nikeRow?.count).toBe(2);

      // Null/undefined grouped together
      const nullRow = result.rows.find(r => r.brand === null || r.brand === undefined || r.brand === "");
      expect(nullRow?.count).toBe(2);
    });
  });

  describe("nested field access", () => {
    it("accesses nested fields via dot notation", () => {
      const nestedData = [
        { item: { brand: "Nike", pricing: { msrp: 100 } } },
        { item: { brand: "Nike", pricing: { msrp: 150 } } },
        { item: { brand: "Adidas", pricing: { msrp: 80 } } },
      ];

      const config: TransformConfig = {
        groupBy: "item.brand",
        aggregations: [
          { function: "COUNT", outputField: "count" },
          { function: "AVG", sourceField: "item.pricing.msrp", outputField: "avg_msrp" },
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, nestedData);

      expect(result.groupCount).toBe(2);

      const nikeRow = result.rows.find(r => r["item.brand"] === "Nike");
      expect(nikeRow?.count).toBe(2);
      expect(nikeRow?.avg_msrp).toBe(125);
    });

    it("handles missing nested fields gracefully", () => {
      const incompleteData = [
        { item: { brand: "Nike" } }, // missing pricing
        { item: { brand: "Nike", pricing: { msrp: 100 } } },
      ];

      const config: TransformConfig = {
        groupBy: "item.brand",
        aggregations: [
          { function: "AVG", sourceField: "item.pricing.msrp", outputField: "avg_msrp" },
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, incompleteData);

      // Should only average the one valid value
      const nikeRow = result.rows.find(r => r["item.brand"] === "Nike");
      expect(nikeRow?.avg_msrp).toBe(100);
    });
  });

  describe("preview", () => {
    it("limits result rows", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: true,
      };

      const result = engine.preview(config, sampleProducts, 2);

      expect(result.rows).toHaveLength(2);
      expect(result.groupCount).toBe(2); // Limited
      expect(result.sourceRowCount).toBe(5); // Not limited
    });

    it("uses default limit of 10", () => {
      const manyBrands = Array.from({ length: 20 }, (_, i) => ({
        brand: `Brand${i}`,
        price: 100,
      }));

      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: true,
      };

      const result = engine.preview(config, manyBrands);

      expect(result.rows).toHaveLength(10);
    });
  });

  describe("aggregation options", () => {
    it("applies CONCAT separator option", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "CONCAT", sourceField: "sku", outputField: "sku_list", options: { separator: " | " } },
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, sampleProducts);

      const nikeRow = result.rows.find(r => r.brand === "Nike");
      expect(nikeRow?.sku_list).toBe("ABC123 | ABC124");
    });

    it("applies COLLECT limit option", () => {
      const config: TransformConfig = {
        groupBy: "category",
        aggregations: [
          { function: "COLLECT", sourceField: "sku", outputField: "skus", options: { limit: 1 } },
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, sampleProducts);

      const shoesRow = result.rows.find(r => r.category === "Shoes");
      expect(shoesRow?.skus).toHaveLength(1);
    });

    it("applies COUNT distinct option", () => {
      const dataWithDuplicates = [
        { brand: "Nike", category: "Shoes" },
        { brand: "Nike", category: "Shoes" },
        { brand: "Nike", category: "Shirts" },
      ];

      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", sourceField: "category", outputField: "unique_categories", options: { distinct: true } },
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, dataWithDuplicates);

      const nikeRow = result.rows.find(r => r.brand === "Nike");
      expect(nikeRow?.unique_categories).toBe(2);
    });
  });

  describe("error handling", () => {
    it("handles missing sourceField for aggregations that require it", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "SUM", outputField: "total" }, // Missing sourceField
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, sampleProducts);

      // Should still work but with undefined/0 values
      expect(result.rows).toHaveLength(3);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("includes warning for non-existent fields", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "SUM", sourceField: "nonexistent", outputField: "total" },
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, sampleProducts);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.message.includes("nonexistent"))).toBe(true);
    });

    it("returns error for empty aggregations array", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [],
        includeGroupKey: true,
      };

      const result = engine.execute(config, sampleProducts);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("NO_AGGREGATIONS");
      expect(result.rows).toHaveLength(0);
    });
  });

  describe("getFieldValue", () => {
    it("handles deeply nested objects", () => {
      const deepData = [
        { a: { b: { c: { d: 1 } } } },
        { a: { b: { c: { d: 2 } } } },
      ];

      const config: TransformConfig = {
        groupBy: "a.b.c.d",
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, deepData);

      expect(result.groupCount).toBe(2);
    });

    it("handles arrays in path", () => {
      const dataWithArrays = [
        { items: [{ name: "A" }], brand: "Nike" },
        { items: [{ name: "B" }], brand: "Nike" },
      ];

      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COLLECT", sourceField: "items", outputField: "all_items" },
        ],
        includeGroupKey: true,
      };

      const result = engine.execute(config, dataWithArrays);

      const nikeRow = result.rows.find(r => r.brand === "Nike");
      expect(nikeRow?.all_items).toHaveLength(2);
    });
  });
});
