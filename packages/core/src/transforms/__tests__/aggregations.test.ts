/**
 * Aggregation Functions Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AggregationExecutor } from "../aggregations.js";

describe("AggregationExecutor", () => {
  let executor: AggregationExecutor;

  beforeEach(() => {
    executor = new AggregationExecutor();
  });

  describe("COUNT", () => {
    it("counts all values", () => {
      expect(executor.execute("COUNT", [1, 2, 3, 4, 5])).toBe(5);
    });

    it("counts including null and undefined", () => {
      expect(executor.execute("COUNT", [1, null, 3, undefined, 5])).toBe(5);
    });

    it("returns 0 for empty array", () => {
      expect(executor.execute("COUNT", [])).toBe(0);
    });

    it("counts distinct values when distinct option is true", () => {
      expect(executor.execute("COUNT", [1, 2, 2, 3, 3, 3], { distinct: true })).toBe(3);
    });

    it("handles strings for distinct count", () => {
      expect(executor.execute("COUNT", ["a", "b", "a", "c"], { distinct: true })).toBe(3);
    });
  });

  describe("SUM", () => {
    it("sums numeric values", () => {
      expect(executor.execute("SUM", [1, 2, 3, 4, 5])).toBe(15);
    });

    it("filters out non-numeric values", () => {
      expect(executor.execute("SUM", [1, "two", 3, null, 5])).toBe(9);
    });

    it("parses string numbers", () => {
      expect(executor.execute("SUM", ["1", "2.5", 3])).toBe(6.5);
    });

    it("returns 0 for empty array", () => {
      expect(executor.execute("SUM", [])).toBe(0);
    });

    it("returns 0 for all non-numeric values", () => {
      expect(executor.execute("SUM", ["a", "b", null])).toBe(0);
    });

    it("handles negative numbers", () => {
      expect(executor.execute("SUM", [-5, 10, -3])).toBe(2);
    });

    it("handles decimal numbers", () => {
      expect(executor.execute("SUM", [1.5, 2.3, 0.2])).toBeCloseTo(4.0);
    });
  });

  describe("MIN", () => {
    it("finds minimum numeric value", () => {
      expect(executor.execute("MIN", [5, 2, 8, 1, 9])).toBe(1);
    });

    it("finds minimum string value", () => {
      expect(executor.execute("MIN", ["banana", "apple", "cherry"])).toBe("apple");
    });

    it("returns null for empty array", () => {
      expect(executor.execute("MIN", [])).toBeNull();
    });

    it("filters out null/undefined for numeric comparison", () => {
      expect(executor.execute("MIN", [5, null, 2, undefined, 8])).toBe(2);
    });

    it("handles string numbers as numbers", () => {
      expect(executor.execute("MIN", ["10", "2", "8"])).toBe(2);
    });

    it("returns null when all values are null/undefined", () => {
      expect(executor.execute("MIN", [null, undefined, null])).toBeNull();
    });

    it("handles negative numbers", () => {
      expect(executor.execute("MIN", [5, -2, 8, -10])).toBe(-10);
    });
  });

  describe("MAX", () => {
    it("finds maximum numeric value", () => {
      expect(executor.execute("MAX", [5, 2, 8, 1, 9])).toBe(9);
    });

    it("finds maximum string value", () => {
      expect(executor.execute("MAX", ["banana", "apple", "cherry"])).toBe("cherry");
    });

    it("returns null for empty array", () => {
      expect(executor.execute("MAX", [])).toBeNull();
    });

    it("filters out null/undefined for numeric comparison", () => {
      expect(executor.execute("MAX", [5, null, 2, undefined, 8])).toBe(8);
    });

    it("handles string numbers as numbers", () => {
      expect(executor.execute("MAX", ["10", "2", "8"])).toBe(10);
    });

    it("returns null when all values are null/undefined", () => {
      expect(executor.execute("MAX", [null, undefined, null])).toBeNull();
    });
  });

  describe("AVG", () => {
    it("calculates average of numeric values", () => {
      expect(executor.execute("AVG", [2, 4, 6, 8])).toBe(5);
    });

    it("filters out non-numeric values", () => {
      expect(executor.execute("AVG", [2, "four", 6, null, 8])).toBe(5.333333333333333);
    });

    it("returns null for empty array", () => {
      expect(executor.execute("AVG", [])).toBeNull();
    });

    it("returns null for all non-numeric values", () => {
      expect(executor.execute("AVG", ["a", "b", null])).toBeNull();
    });

    it("handles single value", () => {
      expect(executor.execute("AVG", [10])).toBe(10);
    });

    it("parses string numbers", () => {
      expect(executor.execute("AVG", ["2", "4", "6"])).toBe(4);
    });
  });

  describe("FIRST", () => {
    it("returns first value", () => {
      expect(executor.execute("FIRST", [1, 2, 3])).toBe(1);
    });

    it("returns first non-null value", () => {
      expect(executor.execute("FIRST", [null, undefined, 3, 4])).toBe(3);
    });

    it("returns null for empty array", () => {
      expect(executor.execute("FIRST", [])).toBeNull();
    });

    it("returns null for all null/undefined values", () => {
      expect(executor.execute("FIRST", [null, undefined, null])).toBeNull();
    });

    it("returns first string value", () => {
      expect(executor.execute("FIRST", ["apple", "banana"])).toBe("apple");
    });

    it("returns first object value", () => {
      const obj = { id: 1 };
      expect(executor.execute("FIRST", [obj, { id: 2 }])).toBe(obj);
    });
  });

  describe("LAST", () => {
    it("returns last value", () => {
      expect(executor.execute("LAST", [1, 2, 3])).toBe(3);
    });

    it("returns last non-null value", () => {
      expect(executor.execute("LAST", [1, 2, null, undefined])).toBe(2);
    });

    it("returns null for empty array", () => {
      expect(executor.execute("LAST", [])).toBeNull();
    });

    it("returns null for all null/undefined values", () => {
      expect(executor.execute("LAST", [null, undefined, null])).toBeNull();
    });

    it("returns last string value", () => {
      expect(executor.execute("LAST", ["apple", "banana"])).toBe("banana");
    });
  });

  describe("CONCAT", () => {
    it("concatenates string values with default separator", () => {
      expect(executor.execute("CONCAT", ["apple", "banana", "cherry"])).toBe("apple, banana, cherry");
    });

    it("uses custom separator", () => {
      expect(executor.execute("CONCAT", ["a", "b", "c"], { separator: " | " })).toBe("a | b | c");
    });

    it("converts non-strings to strings", () => {
      expect(executor.execute("CONCAT", [1, 2, 3])).toBe("1, 2, 3");
    });

    it("filters out null and undefined", () => {
      expect(executor.execute("CONCAT", ["a", null, "b", undefined, "c"])).toBe("a, b, c");
    });

    it("returns empty string for empty array", () => {
      expect(executor.execute("CONCAT", [])).toBe("");
    });

    it("handles single value", () => {
      expect(executor.execute("CONCAT", ["only"])).toBe("only");
    });

    it("supports empty string separator", () => {
      expect(executor.execute("CONCAT", ["a", "b", "c"], { separator: "" })).toBe("abc");
    });
  });

  describe("COLLECT", () => {
    it("collects all values into array", () => {
      expect(executor.execute("COLLECT", [1, 2, 3])).toEqual([1, 2, 3]);
    });

    it("filters out null and undefined", () => {
      expect(executor.execute("COLLECT", [1, null, 2, undefined, 3])).toEqual([1, 2, 3]);
    });

    it("returns empty array for empty input", () => {
      expect(executor.execute("COLLECT", [])).toEqual([]);
    });

    it("respects limit option", () => {
      expect(executor.execute("COLLECT", [1, 2, 3, 4, 5], { limit: 3 })).toEqual([1, 2, 3]);
    });

    it("handles limit greater than array length", () => {
      expect(executor.execute("COLLECT", [1, 2], { limit: 5 })).toEqual([1, 2]);
    });

    it("collects mixed types", () => {
      expect(executor.execute("COLLECT", ["a", 1, true])).toEqual(["a", 1, true]);
    });
  });

  describe("DISTINCT_COUNT", () => {
    it("counts unique values", () => {
      expect(executor.execute("DISTINCT_COUNT", [1, 2, 2, 3, 3, 3])).toBe(3);
    });

    it("handles strings", () => {
      expect(executor.execute("DISTINCT_COUNT", ["a", "b", "a", "c", "b"])).toBe(3);
    });

    it("returns 0 for empty array", () => {
      expect(executor.execute("DISTINCT_COUNT", [])).toBe(0);
    });

    it("filters null and undefined", () => {
      expect(executor.execute("DISTINCT_COUNT", [1, null, 2, undefined, 1])).toBe(2);
    });

    it("treats null/undefined values as not distinct", () => {
      expect(executor.execute("DISTINCT_COUNT", [null, null, undefined])).toBe(0);
    });
  });

  describe("COUNT_IF", () => {
    it("counts values matching equals condition", () => {
      const result = executor.execute("COUNT_IF", [
        { status: "active" },
        { status: "inactive" },
        { status: "active" },
      ], {
        condition: { field: "status", operator: "equals", value: "active" }
      });
      expect(result).toBe(2);
    });

    it("counts values matching greater_than condition", () => {
      const result = executor.execute("COUNT_IF", [
        { price: 50 },
        { price: 100 },
        { price: 150 },
      ], {
        condition: { field: "price", operator: "greater_than", value: 75 }
      });
      expect(result).toBe(2);
    });

    it("returns 0 when no values match", () => {
      const result = executor.execute("COUNT_IF", [
        { status: "inactive" },
        { status: "inactive" },
      ], {
        condition: { field: "status", operator: "equals", value: "active" }
      });
      expect(result).toBe(0);
    });

    it("returns 0 for empty array", () => {
      const result = executor.execute("COUNT_IF", [], {
        condition: { field: "status", operator: "equals", value: "active" }
      });
      expect(result).toBe(0);
    });

    it("returns 0 when no condition is provided", () => {
      const result = executor.execute("COUNT_IF", [{ a: 1 }, { a: 2 }], {});
      expect(result).toBe(0);
    });

    it("handles contains condition", () => {
      const result = executor.execute("COUNT_IF", [
        { name: "Apple iPhone" },
        { name: "Samsung Galaxy" },
        { name: "Apple iPad" },
      ], {
        condition: { field: "name", operator: "contains", value: "Apple" }
      });
      expect(result).toBe(2);
    });
  });

  describe("execute - unknown function", () => {
    it("throws for unknown aggregation function", () => {
      expect(() => executor.execute("UNKNOWN" as any, [1, 2, 3])).toThrow("Unknown aggregation function: UNKNOWN");
    });
  });
});
