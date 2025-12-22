/**
 * Transform Validator Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TransformValidator } from "../transform-validator.js";
import type { TransformConfig, FieldSchema } from "../types.js";

describe("TransformValidator", () => {
  let validator: TransformValidator;

  const sampleSchema: FieldSchema[] = [
    { name: "sku", type: "string" },
    { name: "brand", type: "string" },
    { name: "price", type: "number", nullable: true },
    { name: "quantity", type: "number" },
    { name: "category", type: "string" },
    { name: "active", type: "boolean" },
    { name: "tags", type: "array" },
    { name: "metadata", type: "object" },
  ];

  beforeEach(() => {
    validator = new TransformValidator();
  });

  describe("validateConfig", () => {
    it("validates a correct config", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "count" },
          { function: "SUM", sourceField: "price", outputField: "total_price" },
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates multi-field groupBy", () => {
      const config: TransformConfig = {
        groupBy: ["brand", "category"],
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      expect(result.valid).toBe(true);
    });

    it("errors on missing groupBy field", () => {
      const config: TransformConfig = {
        groupBy: "nonexistent",
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("FIELD_NOT_FOUND");
      expect(result.errors[0].field).toBe("nonexistent");
    });

    it("errors on missing aggregation sourceField", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "SUM", sourceField: "nonexistent", outputField: "total" },
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("FIELD_NOT_FOUND");
    });

    it("warns on non-numeric field for SUM", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "SUM", sourceField: "category", outputField: "sum_category" },
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      // Should be valid but with warnings
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain("numeric");
    });

    it("warns on non-numeric field for AVG", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "AVG", sourceField: "sku", outputField: "avg_sku" },
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("errors on duplicate output field names", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "count" },
          { function: "SUM", sourceField: "price", outputField: "count" }, // Duplicate
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("DUPLICATE_OUTPUT_FIELD");
    });

    it("errors on invalid output field name", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "123invalid" }, // Starts with number
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("INVALID_IDENTIFIER");
    });

    it("allows output field with underscore prefix", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "_count" },
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      expect(result.valid).toBe(true);
    });

    it("errors on empty aggregations array", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("NO_AGGREGATIONS");
    });

    it("validates nested field paths", () => {
      const nestedSchema: FieldSchema[] = [
        { name: "item.brand", type: "string" },
        { name: "item.pricing.msrp", type: "number" },
      ];

      const config: TransformConfig = {
        groupBy: "item.brand",
        aggregations: [
          { function: "AVG", sourceField: "item.pricing.msrp", outputField: "avg_price" },
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, nestedSchema);

      expect(result.valid).toBe(true);
    });

    it("allows COUNT without sourceField", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      expect(result.valid).toBe(true);
    });

    it("validates COUNT_IF condition field", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          {
            function: "COUNT_IF",
            outputField: "active_count",
            options: {
              condition: { field: "active", operator: "equals", value: true }
            }
          },
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      expect(result.valid).toBe(true);
    });

    it("errors on invalid COUNT_IF condition field", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          {
            function: "COUNT_IF",
            outputField: "nonexistent_count",
            options: {
              condition: { field: "nonexistent", operator: "equals", value: true }
            }
          },
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("FIELD_NOT_FOUND");
    });

    it("errors on invalid COUNT_IF condition operator", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          {
            function: "COUNT_IF",
            outputField: "invalid_op_count",
            options: {
              condition: { field: "active", operator: "invalid_operator", value: true }
            }
          },
        ],
        includeGroupKey: true,
      };

      const result = validator.validateConfig(config, sampleSchema);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_OPERATOR")).toBe(true);
      expect(result.errors.some(e => e.message.includes("invalid_operator"))).toBe(true);
    });
  });

  describe("inferOutputSchema", () => {
    it("infers output schema for simple aggregations", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "count" },
          { function: "SUM", sourceField: "price", outputField: "total" },
          { function: "MIN", sourceField: "price", outputField: "min_price" },
          { function: "MAX", sourceField: "price", outputField: "max_price" },
          { function: "AVG", sourceField: "price", outputField: "avg_price" },
        ],
        includeGroupKey: true,
      };

      const schema = validator.inferOutputSchema(config, sampleSchema);

      // Group key field
      expect(schema.find(f => f.name === "brand")).toEqual({ name: "brand", type: "string" });

      // Aggregated fields
      expect(schema.find(f => f.name === "count")).toEqual({ name: "count", type: "number" });
      expect(schema.find(f => f.name === "total")).toEqual({ name: "total", type: "number" });
      expect(schema.find(f => f.name === "min_price")).toEqual({ name: "min_price", type: "number", nullable: true });
      expect(schema.find(f => f.name === "max_price")).toEqual({ name: "max_price", type: "number", nullable: true });
      expect(schema.find(f => f.name === "avg_price")).toEqual({ name: "avg_price", type: "number", nullable: true });
    });

    it("infers array type for COLLECT", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COLLECT", sourceField: "sku", outputField: "all_skus" },
        ],
        includeGroupKey: true,
      };

      const schema = validator.inferOutputSchema(config, sampleSchema);

      expect(schema.find(f => f.name === "all_skus")).toEqual({ name: "all_skus", type: "array" });
    });

    it("infers string type for CONCAT", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "CONCAT", sourceField: "sku", outputField: "sku_list" },
        ],
        includeGroupKey: true,
      };

      const schema = validator.inferOutputSchema(config, sampleSchema);

      expect(schema.find(f => f.name === "sku_list")).toEqual({ name: "sku_list", type: "string" });
    });

    it("includes multiple group key fields", () => {
      const config: TransformConfig = {
        groupBy: ["brand", "category"],
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: true,
      };

      const schema = validator.inferOutputSchema(config, sampleSchema);

      expect(schema.find(f => f.name === "brand")).toBeDefined();
      expect(schema.find(f => f.name === "category")).toBeDefined();
    });

    it("excludes group key fields when includeGroupKey is false", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: false,
      };

      const schema = validator.inferOutputSchema(config, sampleSchema);

      expect(schema.find(f => f.name === "brand")).toBeUndefined();
      expect(schema.find(f => f.name === "count")).toBeDefined();
    });

    it("applies outputFieldPrefix to inferred schema", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "COUNT", outputField: "count" },
        ],
        includeGroupKey: true,
        outputFieldPrefix: "agg_",
      };

      const schema = validator.inferOutputSchema(config, sampleSchema);

      expect(schema.find(f => f.name === "agg_count")).toBeDefined();
      // Group key should not have prefix
      expect(schema.find(f => f.name === "brand")).toBeDefined();
    });

    it("preserves source field type for FIRST/LAST", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "FIRST", sourceField: "category", outputField: "first_category" },
          { function: "LAST", sourceField: "price", outputField: "last_price" },
        ],
        includeGroupKey: true,
      };

      const schema = validator.inferOutputSchema(config, sampleSchema);

      expect(schema.find(f => f.name === "first_category")).toEqual({
        name: "first_category",
        type: "string",
        nullable: true
      });
      expect(schema.find(f => f.name === "last_price")).toEqual({
        name: "last_price",
        type: "number",
        nullable: true
      });
    });

    it("infers number type for DISTINCT_COUNT", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { function: "DISTINCT_COUNT", sourceField: "category", outputField: "unique_categories" },
        ],
        includeGroupKey: true,
      };

      const schema = validator.inferOutputSchema(config, sampleSchema);

      expect(schema.find(f => f.name === "unique_categories")).toEqual({
        name: "unique_categories",
        type: "number"
      });
    });
  });
});
