import { describe, it, expect } from "vitest";
import {
  flattenJson,
  type JsonFlattenConfig,
} from "../json-flatten.js";

describe("flattenJson", () => {
  describe("data path extraction", () => {
    it("extracts array from nested path", () => {
      const data = {
        data: {
          items: [
            { id: 1, name: "Item 1" },
            { id: 2, name: "Item 2" },
          ],
        },
      };
      const config: JsonFlattenConfig = {
        dataPath: "data.items",
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1, name: "Item 1" });
      expect(result[1]).toEqual({ id: 2, name: "Item 2" });
    });

    it("extracts array from single-level path", () => {
      const data = {
        results: [
          { id: 1, value: "a" },
          { id: 2, value: "b" },
        ],
      };
      const config: JsonFlattenConfig = {
        dataPath: "results",
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1, value: "a" });
    });

    it("uses root if no dataPath provided and root is array", () => {
      const data = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1, name: "Item 1" });
    });

    it("uses root if no dataPath provided and root is object", () => {
      const data = { id: 1, name: "Single Item" };
      const config: JsonFlattenConfig = {
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 1, name: "Single Item" });
    });

    it("wraps single object in array when path leads to object", () => {
      const data = {
        data: {
          user: { id: 1, name: "John" },
        },
      };
      const config: JsonFlattenConfig = {
        dataPath: "data.user",
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 1, name: "John" });
    });

    it("handles missing path gracefully by returning empty array", () => {
      const data = {
        data: { items: [] },
      };
      const config: JsonFlattenConfig = {
        dataPath: "data.nonexistent.path",
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      expect(result).toEqual([]);
    });

    it("handles deeply nested path", () => {
      const data = {
        response: {
          data: {
            results: {
              items: [{ id: 1 }, { id: 2 }],
            },
          },
        },
      };
      const config: JsonFlattenConfig = {
        dataPath: "response.data.results.items",
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1 });
    });
  });

  describe("object flattening", () => {
    it("flattens nested objects with dot notation", () => {
      const data = [
        {
          id: 1,
          product: { name: "Widget", price: 29.99 },
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({
        id: 1,
        "product.name": "Widget",
        "product.price": 29.99,
      });
    });

    it("flattens multiple levels of nesting", () => {
      const data = [
        {
          id: 1,
          product: {
            name: "Widget",
            details: {
              weight: 100,
              dimensions: { width: 10, height: 20 },
            },
          },
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "join",
        maxDepth: 5, // Allow full flattening for this test
      };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({
        id: 1,
        "product.name": "Widget",
        "product.details.weight": 100,
        "product.details.dimensions.width": 10,
        "product.details.dimensions.height": 20,
      });
    });

    it("respects maxDepth limit", () => {
      const data = [
        {
          id: 1,
          product: {
            name: "Widget",
            details: {
              weight: 100,
              dimensions: { width: 10, height: 20 },
            },
          },
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "join",
        maxDepth: 2,
      };

      const result = flattenJson(data, config);

      // At depth 2, product.details should be kept as-is (not flattened further)
      expect(result[0]).toEqual({
        id: 1,
        "product.name": "Widget",
        "product.details": { weight: 100, dimensions: { width: 10, height: 20 } },
      });
    });

    it("handles deeply nested objects with default maxDepth of 3", () => {
      const data = [
        {
          level1: {
            level2: {
              level3: {
                level4: {
                  value: "deep",
                },
              },
            },
          },
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      // Default maxDepth is 3, so level1.level2.level3 should be kept as-is
      expect(result[0]).toEqual({
        "level1.level2.level3": {
          level4: { value: "deep" },
        },
      });
    });

    it("handles maxDepth of 1", () => {
      const data = [
        {
          id: 1,
          product: { name: "Widget", price: 29.99 },
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "join",
        maxDepth: 1,
      };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({
        id: 1,
        product: { name: "Widget", price: 29.99 },
      });
    });

    it("handles empty nested objects", () => {
      const data = [
        {
          id: 1,
          empty: {},
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({
        id: 1,
        empty: {},
      });
    });
  });

  describe("array handling - join mode", () => {
    it("joins arrays with default separator (comma space)", () => {
      const data = [
        {
          id: 1,
          tags: ["sale", "new", "featured"],
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({
        id: 1,
        tags: "sale, new, featured",
      });
    });

    it("joins arrays with custom separator", () => {
      const data = [
        {
          id: 1,
          tags: ["sale", "new", "featured"],
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "join",
        arraySeparator: " | ",
      };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({
        id: 1,
        tags: "sale | new | featured",
      });
    });

    it("joins arrays of numbers", () => {
      const data = [
        {
          id: 1,
          scores: [95, 87, 92],
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({
        id: 1,
        scores: "95, 87, 92",
      });
    });

    it("joins nested arrays of objects by stringifying", () => {
      const data = [
        {
          id: 1,
          items: [
            { name: "A", value: 1 },
            { name: "B", value: 2 },
          ],
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      // Objects in arrays should be JSON stringified
      expect(result[0]?.items).toContain('{"name":"A","value":1}');
    });
  });

  describe("array handling - first mode", () => {
    it("takes only first element of array", () => {
      const data = [
        {
          id: 1,
          tags: ["sale", "new", "featured"],
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "first",
      };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({
        id: 1,
        tags: "sale",
      });
    });

    it("flattens first element if it is an object", () => {
      const data = [
        {
          id: 1,
          contacts: [
            { name: "John", email: "john@example.com" },
            { name: "Jane", email: "jane@example.com" },
          ],
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "first",
      };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({
        id: 1,
        "contacts.name": "John",
        "contacts.email": "john@example.com",
      });
    });

    it("returns null for first element of empty array", () => {
      const data = [
        {
          id: 1,
          tags: [],
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "first",
      };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({
        id: 1,
        tags: null,
      });
    });
  });

  describe("array handling - expand mode", () => {
    it("expands arrays into multiple rows", () => {
      const data = [
        {
          id: 1,
          name: "Product A",
          tags: ["sale", "new"],
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "expand",
      };

      const result = flattenJson(data, config);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        name: "Product A",
        tags: "sale",
      });
      expect(result[1]).toEqual({
        id: 1,
        name: "Product A",
        tags: "new",
      });
    });

    it("expands arrays of objects", () => {
      const data = [
        {
          id: 1,
          variants: [
            { color: "red", size: "M" },
            { color: "blue", size: "L" },
          ],
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "expand",
      };

      const result = flattenJson(data, config);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        "variants.color": "red",
        "variants.size": "M",
      });
      expect(result[1]).toEqual({
        id: 1,
        "variants.color": "blue",
        "variants.size": "L",
      });
    });

    it("handles multiple arrays by using cartesian product", () => {
      const data = [
        {
          id: 1,
          sizes: ["S", "M"],
          colors: ["red", "blue"],
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "expand",
      };

      const result = flattenJson(data, config);

      expect(result).toHaveLength(4);
      expect(result).toContainEqual({ id: 1, sizes: "S", colors: "red" });
      expect(result).toContainEqual({ id: 1, sizes: "S", colors: "blue" });
      expect(result).toContainEqual({ id: 1, sizes: "M", colors: "red" });
      expect(result).toContainEqual({ id: 1, sizes: "M", colors: "blue" });
    });

    it("handles empty arrays in expand mode by producing no rows", () => {
      const data = [
        {
          id: 1,
          name: "Product A",
          tags: [],
        },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "expand",
      };

      const result = flattenJson(data, config);

      // Empty array means no rows to expand
      expect(result).toHaveLength(0);
    });

    it("handles single source with multiple items in expand mode", () => {
      const data = [
        { id: 1, tags: ["a", "b"] },
        { id: 2, tags: ["c"] },
      ];
      const config: JsonFlattenConfig = {
        arrayHandling: "expand",
      };

      const result = flattenJson(data, config);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 1, tags: "a" });
      expect(result[1]).toEqual({ id: 1, tags: "b" });
      expect(result[2]).toEqual({ id: 2, tags: "c" });
    });
  });

  describe("empty array handling across modes", () => {
    it("handles empty arrays in join mode", () => {
      const data = [{ id: 1, tags: [] }];
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({ id: 1, tags: "" });
    });

    it("handles empty arrays in first mode", () => {
      const data = [{ id: 1, tags: [] }];
      const config: JsonFlattenConfig = { arrayHandling: "first" };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({ id: 1, tags: null });
    });
  });

  describe("arrays of primitives", () => {
    it("handles arrays of strings", () => {
      const data = [{ tags: ["a", "b", "c"] }];
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({ tags: "a, b, c" });
    });

    it("handles arrays of numbers", () => {
      const data = [{ values: [1, 2, 3] }];
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({ values: "1, 2, 3" });
    });

    it("handles arrays of booleans", () => {
      const data = [{ flags: [true, false, true] }];
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({ flags: "true, false, true" });
    });

    it("handles arrays with null values", () => {
      const data = [{ values: [1, null, 3] }];
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(data, config);

      expect(result[0]).toEqual({ values: "1, null, 3" });
    });
  });

  describe("type preservation", () => {
    it("preserves numbers", () => {
      const data = [{ count: 42, price: 19.99 }];
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(data, config);

      expect(result[0]?.count).toBe(42);
      expect(result[0]?.price).toBe(19.99);
      expect(typeof result[0]?.count).toBe("number");
      expect(typeof result[0]?.price).toBe("number");
    });

    it("preserves booleans", () => {
      const data = [{ active: true, deleted: false }];
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(data, config);

      expect(result[0]?.active).toBe(true);
      expect(result[0]?.deleted).toBe(false);
      expect(typeof result[0]?.active).toBe("boolean");
    });

    it("preserves null", () => {
      const data = [{ value: null }];
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(data, config);

      expect(result[0]?.value).toBe(null);
    });

    it("preserves ISO date strings", () => {
      const isoDate = "2024-01-15T10:30:00.000Z";
      const data = [{ createdAt: isoDate }];
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(data, config);

      expect(result[0]?.createdAt).toBe(isoDate);
      expect(typeof result[0]?.createdAt).toBe("string");
    });

    it("preserves various string formats", () => {
      const data = [
        {
          email: "test@example.com",
          url: "https://example.com",
          id: "abc-123",
        },
      ];
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(data, config);

      expect(result[0]?.email).toBe("test@example.com");
      expect(result[0]?.url).toBe("https://example.com");
      expect(result[0]?.id).toBe("abc-123");
    });

    it("preserves undefined as undefined", () => {
      const data = [{ value: undefined }];
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(data, config);

      expect(result[0]?.value).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("handles null input", () => {
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(null, config);

      expect(result).toEqual([]);
    });

    it("handles undefined input", () => {
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(undefined, config);

      expect(result).toEqual([]);
    });

    it("handles empty object", () => {
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson({}, config);

      expect(result).toEqual([{}]);
    });

    it("handles empty array", () => {
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson([], config);

      expect(result).toEqual([]);
    });

    it("throws on circular references", () => {
      const data: Record<string, unknown> = { id: 1 };
      data.self = data; // Create circular reference

      const config: JsonFlattenConfig = { arrayHandling: "join" };

      expect(() => flattenJson(data, config)).toThrow(/circular/i);
    });

    it("handles mixed types in arrays for join mode", () => {
      const data = [{ mixed: [1, "two", true, null] }];
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(data, config);

      expect(result[0]?.mixed).toBe("1, two, true, null");
    });

    it("handles primitive values at root", () => {
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      expect(flattenJson("string", config)).toEqual([]);
      expect(flattenJson(123, config)).toEqual([]);
      expect(flattenJson(true, config)).toEqual([]);
    });

    it("handles keys with dots in the original data", () => {
      const data = [{ "key.with.dots": "value", nested: { child: "data" } }];
      const config: JsonFlattenConfig = { arrayHandling: "join" };

      const result = flattenJson(data, config);

      // Original dotted key should be preserved
      expect(result[0]?.["key.with.dots"]).toBe("value");
      expect(result[0]?.["nested.child"]).toBe("data");
    });

    it("handles very deep nesting gracefully", () => {
      // Create deeply nested structure
      let nested: Record<string, unknown> = { value: "deep" };
      for (let i = 0; i < 10; i++) {
        nested = { child: nested };
      }
      const data = [nested];
      const config: JsonFlattenConfig = { arrayHandling: "join", maxDepth: 5 };

      // Should not throw and should respect maxDepth
      const result = flattenJson(data, config);

      expect(result).toHaveLength(1);
    });

    it("handles array at path leading to primitive", () => {
      const data = {
        data: {
          value: "not an array or object",
        },
      };
      const config: JsonFlattenConfig = {
        dataPath: "data.value",
        arrayHandling: "join",
      };

      const result = flattenJson(data, config);

      expect(result).toEqual([]);
    });
  });

  describe("real-world examples", () => {
    it("handles typical API response structure", () => {
      const apiResponse = {
        success: true,
        data: {
          items: [
            {
              id: 1,
              product: { name: "Widget", price: 29.99 },
              tags: ["sale", "new"],
            },
            {
              id: 2,
              product: { name: "Gadget", price: 49.99 },
              tags: ["featured"],
            },
          ],
        },
        meta: { total: 2 },
      };

      const config: JsonFlattenConfig = {
        dataPath: "data.items",
        arrayHandling: "join",
      };

      const result = flattenJson(apiResponse, config);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        "product.name": "Widget",
        "product.price": 29.99,
        tags: "sale, new",
      });
      expect(result[1]).toEqual({
        id: 2,
        "product.name": "Gadget",
        "product.price": 49.99,
        tags: "featured",
      });
    });

    it("handles e-commerce product with variants", () => {
      const product = {
        id: "SKU-001",
        name: "T-Shirt",
        variants: [
          { size: "S", color: "Red", stock: 10 },
          { size: "M", color: "Red", stock: 15 },
          { size: "L", color: "Blue", stock: 5 },
        ],
      };

      const config: JsonFlattenConfig = {
        arrayHandling: "expand",
      };

      const result = flattenJson(product, config);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: "SKU-001",
        name: "T-Shirt",
        "variants.size": "S",
        "variants.color": "Red",
        "variants.stock": 10,
      });
    });

    it("handles user with nested address", () => {
      const user = {
        id: 1,
        name: "John Doe",
        address: {
          street: "123 Main St",
          city: "New York",
          country: { code: "US", name: "United States" },
        },
      };

      const config: JsonFlattenConfig = {
        arrayHandling: "join",
      };

      const result = flattenJson(user, config);

      expect(result[0]).toEqual({
        id: 1,
        name: "John Doe",
        "address.street": "123 Main St",
        "address.city": "New York",
        "address.country.code": "US",
        "address.country.name": "United States",
      });
    });
  });
});
