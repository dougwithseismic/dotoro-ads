import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { z } from "zod";
import {
  aggregationFunctionSchema,
  aggregationConfigSchema,
  transformConfigSchema,
  createTransformSchema,
  updateTransformSchema,
  transformResponseSchema,
  previewTransformSchema,
  validateConfigRequestSchema,
} from "../schemas/transforms.js";

/**
 * Transform API Tests
 *
 * Tests for Zod schema validation and API route behavior.
 */

describe("Transform Schemas", () => {
  describe("aggregationFunctionSchema", () => {
    it("should accept valid aggregation functions", () => {
      const validFunctions = [
        "COUNT",
        "SUM",
        "MIN",
        "MAX",
        "AVG",
        "FIRST",
        "LAST",
        "CONCAT",
        "COLLECT",
        "DISTINCT_COUNT",
        "COUNT_IF",
      ];

      for (const fn of validFunctions) {
        expect(() => aggregationFunctionSchema.parse(fn)).not.toThrow();
      }
    });

    it("should reject invalid aggregation functions", () => {
      expect(() => aggregationFunctionSchema.parse("INVALID")).toThrow();
      expect(() => aggregationFunctionSchema.parse("count")).toThrow(); // lowercase
      expect(() => aggregationFunctionSchema.parse("")).toThrow();
    });
  });

  describe("aggregationConfigSchema", () => {
    it("should accept valid aggregation config with sourceField", () => {
      const config = {
        sourceField: "price",
        outputField: "total_price",
        function: "SUM",
      };
      expect(() => aggregationConfigSchema.parse(config)).not.toThrow();
    });

    it("should accept COUNT without sourceField", () => {
      const config = {
        outputField: "row_count",
        function: "COUNT",
      };
      expect(() => aggregationConfigSchema.parse(config)).not.toThrow();
    });

    it("should accept aggregation with options", () => {
      const config = {
        sourceField: "name",
        outputField: "all_names",
        function: "CONCAT",
        options: {
          separator: " | ",
        },
      };
      expect(() => aggregationConfigSchema.parse(config)).not.toThrow();
    });

    it("should accept COUNT_IF with condition", () => {
      const config = {
        outputField: "active_count",
        function: "COUNT_IF",
        options: {
          condition: {
            field: "status",
            operator: "equals",
            value: "active",
          },
        },
      };
      expect(() => aggregationConfigSchema.parse(config)).not.toThrow();
    });

    it("should reject invalid output field names", () => {
      const config = {
        sourceField: "price",
        outputField: "123invalid", // starts with number
        function: "SUM",
      };
      expect(() => aggregationConfigSchema.parse(config)).toThrow();
    });

    it("should reject output field with spaces", () => {
      const config = {
        sourceField: "price",
        outputField: "total price", // has space
        function: "SUM",
      };
      expect(() => aggregationConfigSchema.parse(config)).toThrow();
    });

    it("should accept output field with underscore", () => {
      const config = {
        sourceField: "price",
        outputField: "_total_price",
        function: "SUM",
      };
      expect(() => aggregationConfigSchema.parse(config)).not.toThrow();
    });
  });

  describe("transformConfigSchema", () => {
    it("should accept single groupBy field", () => {
      const config = {
        groupBy: "brand",
        aggregations: [
          { outputField: "count", function: "COUNT" },
        ],
        includeGroupKey: true,
      };
      expect(() => transformConfigSchema.parse(config)).not.toThrow();
    });

    it("should accept multiple groupBy fields", () => {
      const config = {
        groupBy: ["category", "brand"],
        aggregations: [
          { outputField: "count", function: "COUNT" },
        ],
        includeGroupKey: true,
      };
      expect(() => transformConfigSchema.parse(config)).not.toThrow();
    });

    it("should reject empty aggregations", () => {
      const config = {
        groupBy: "brand",
        aggregations: [],
        includeGroupKey: true,
      };
      expect(() => transformConfigSchema.parse(config)).toThrow();
    });

    it("should reject empty groupBy array", () => {
      const config = {
        groupBy: [],
        aggregations: [
          { outputField: "count", function: "COUNT" },
        ],
        includeGroupKey: true,
      };
      expect(() => transformConfigSchema.parse(config)).toThrow();
    });

    it("should apply default for includeGroupKey", () => {
      const config = {
        groupBy: "brand",
        aggregations: [
          { outputField: "count", function: "COUNT" },
        ],
      };
      const parsed = transformConfigSchema.parse(config);
      expect(parsed.includeGroupKey).toBe(true);
    });

    it("should accept outputFieldPrefix", () => {
      const config = {
        groupBy: "brand",
        aggregations: [
          { outputField: "count", function: "COUNT" },
        ],
        includeGroupKey: true,
        outputFieldPrefix: "agg_",
      };
      expect(() => transformConfigSchema.parse(config)).not.toThrow();
    });
  });

  describe("createTransformSchema", () => {
    it("should accept valid create input", () => {
      const input = {
        name: "Products by Brand",
        description: "Aggregate products by brand",
        sourceDataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        config: {
          groupBy: "brand",
          aggregations: [
            { outputField: "product_count", function: "COUNT" },
            { sourceField: "price", outputField: "min_price", function: "MIN" },
          ],
          includeGroupKey: true,
        },
        enabled: true,
      };
      expect(() => createTransformSchema.parse(input)).not.toThrow();
    });

    it("should apply default enabled value", () => {
      const input = {
        name: "Test Transform",
        sourceDataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        config: {
          groupBy: "brand",
          aggregations: [
            { outputField: "count", function: "COUNT" },
          ],
          includeGroupKey: true,
        },
      };
      const parsed = createTransformSchema.parse(input);
      expect(parsed.enabled).toBe(true);
    });

    it("should reject invalid UUID for sourceDataSourceId", () => {
      const input = {
        name: "Test Transform",
        sourceDataSourceId: "not-a-uuid",
        config: {
          groupBy: "brand",
          aggregations: [
            { outputField: "count", function: "COUNT" },
          ],
          includeGroupKey: true,
        },
      };
      expect(() => createTransformSchema.parse(input)).toThrow();
    });

    it("should reject empty name", () => {
      const input = {
        name: "",
        sourceDataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        config: {
          groupBy: "brand",
          aggregations: [
            { outputField: "count", function: "COUNT" },
          ],
          includeGroupKey: true,
        },
      };
      expect(() => createTransformSchema.parse(input)).toThrow();
    });

    it("should reject name exceeding 255 characters", () => {
      const input = {
        name: "a".repeat(256),
        sourceDataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        config: {
          groupBy: "brand",
          aggregations: [
            { outputField: "count", function: "COUNT" },
          ],
          includeGroupKey: true,
        },
      };
      expect(() => createTransformSchema.parse(input)).toThrow();
    });
  });

  describe("updateTransformSchema", () => {
    it("should accept partial update", () => {
      const input = {
        name: "Updated Name",
      };
      expect(() => updateTransformSchema.parse(input)).not.toThrow();
    });

    it("should accept empty object (no updates)", () => {
      const input = {};
      expect(() => updateTransformSchema.parse(input)).not.toThrow();
    });

    it("should accept all fields", () => {
      const input = {
        name: "Updated Transform",
        description: "Updated description",
        sourceDataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        config: {
          groupBy: "category",
          aggregations: [
            { outputField: "total", function: "COUNT" },
          ],
          includeGroupKey: true,
        },
        enabled: false,
      };
      expect(() => updateTransformSchema.parse(input)).not.toThrow();
    });

    it("should reject invalid config when provided", () => {
      const input = {
        config: {
          groupBy: "brand",
          aggregations: [], // empty aggregations
          includeGroupKey: true,
        },
      };
      expect(() => updateTransformSchema.parse(input)).toThrow();
    });
  });

  describe("transformResponseSchema", () => {
    it("should validate complete response", () => {
      const response = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        userId: null,
        name: "Products by Brand",
        description: "Aggregate products by brand",
        sourceDataSourceId: "550e8400-e29b-41d4-a716-446655440001",
        outputDataSourceId: "550e8400-e29b-41d4-a716-446655440002",
        config: {
          groupBy: "brand",
          aggregations: [
            { outputField: "count", function: "COUNT" },
          ],
          includeGroupKey: true,
        },
        enabled: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };
      expect(() => transformResponseSchema.parse(response)).not.toThrow();
    });

    it("should accept null userId", () => {
      const response = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        userId: null,
        name: "Test",
        description: null,
        sourceDataSourceId: "550e8400-e29b-41d4-a716-446655440001",
        outputDataSourceId: "550e8400-e29b-41d4-a716-446655440002",
        config: {
          groupBy: "brand",
          aggregations: [
            { outputField: "count", function: "COUNT" },
          ],
          includeGroupKey: true,
        },
        enabled: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };
      expect(() => transformResponseSchema.parse(response)).not.toThrow();
    });
  });

  describe("previewTransformSchema", () => {
    it("should accept valid preview request", () => {
      const request = {
        sourceDataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        config: {
          groupBy: "brand",
          aggregations: [
            { outputField: "count", function: "COUNT" },
          ],
          includeGroupKey: true,
        },
        limit: 10,
      };
      expect(() => previewTransformSchema.parse(request)).not.toThrow();
    });

    it("should apply default limit", () => {
      const request = {
        sourceDataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        config: {
          groupBy: "brand",
          aggregations: [
            { outputField: "count", function: "COUNT" },
          ],
          includeGroupKey: true,
        },
      };
      const parsed = previewTransformSchema.parse(request);
      expect(parsed.limit).toBe(10);
    });

    it("should reject limit over 100", () => {
      const request = {
        sourceDataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        config: {
          groupBy: "brand",
          aggregations: [
            { outputField: "count", function: "COUNT" },
          ],
          includeGroupKey: true,
        },
        limit: 101,
      };
      expect(() => previewTransformSchema.parse(request)).toThrow();
    });

    it("should reject negative limit", () => {
      const request = {
        sourceDataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        config: {
          groupBy: "brand",
          aggregations: [
            { outputField: "count", function: "COUNT" },
          ],
          includeGroupKey: true,
        },
        limit: -1,
      };
      expect(() => previewTransformSchema.parse(request)).toThrow();
    });
  });

  describe("validateConfigRequestSchema", () => {
    it("should accept valid validation request", () => {
      const request = {
        sourceDataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        config: {
          groupBy: "brand",
          aggregations: [
            { sourceField: "price", outputField: "avg_price", function: "AVG" },
          ],
          includeGroupKey: true,
        },
      };
      expect(() => validateConfigRequestSchema.parse(request)).not.toThrow();
    });
  });
});

describe("Transform Config Examples", () => {
  it("should validate product aggregation by brand example", () => {
    const config = {
      groupBy: "brand",
      aggregations: [
        { outputField: "product_count", function: "COUNT" },
        { sourceField: "price", outputField: "min_price", function: "MIN" },
        { sourceField: "price", outputField: "max_price", function: "MAX" },
        { sourceField: "price", outputField: "avg_price", function: "AVG" },
        { sourceField: "sku", outputField: "all_skus", function: "COLLECT" },
      ],
      includeGroupKey: true,
    };
    expect(() => transformConfigSchema.parse(config)).not.toThrow();
  });

  it("should validate multi-field grouping example", () => {
    const config = {
      groupBy: ["category", "subcategory"],
      aggregations: [
        { outputField: "item_count", function: "COUNT" },
        { sourceField: "name", outputField: "first_item", function: "FIRST" },
        {
          sourceField: "name",
          outputField: "all_names",
          function: "CONCAT",
          options: { separator: ", " }
        },
      ],
      includeGroupKey: true,
      outputFieldPrefix: "agg_",
    };
    expect(() => transformConfigSchema.parse(config)).not.toThrow();
  });

  it("should validate COUNT_IF aggregation", () => {
    const config = {
      groupBy: "brand",
      aggregations: [
        { outputField: "total_count", function: "COUNT" },
        {
          outputField: "active_count",
          function: "COUNT_IF",
          options: {
            condition: {
              field: "status",
              operator: "equals",
              value: "active",
            },
          },
        },
        {
          outputField: "premium_count",
          function: "COUNT_IF",
          options: {
            condition: {
              field: "price",
              operator: "greater_than",
              value: 100,
            },
          },
        },
      ],
      includeGroupKey: true,
    };
    expect(() => transformConfigSchema.parse(config)).not.toThrow();
  });

  it("should validate DISTINCT_COUNT aggregation", () => {
    const config = {
      groupBy: "category",
      aggregations: [
        { sourceField: "brand", outputField: "unique_brands", function: "DISTINCT_COUNT" },
        { sourceField: "supplier", outputField: "unique_suppliers", function: "DISTINCT_COUNT" },
      ],
      includeGroupKey: true,
    };
    expect(() => transformConfigSchema.parse(config)).not.toThrow();
  });
});
