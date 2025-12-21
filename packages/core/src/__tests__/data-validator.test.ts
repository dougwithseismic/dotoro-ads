import { describe, it, expect } from "vitest";
import {
  validateRows,
  validateRow,
  type ValidationRule,
  type ValidationResult,
  type RowError,
} from "../services/data-validator.js";

describe("validateRow", () => {
  describe("required field validation", () => {
    it("passes when required field is present", () => {
      const row = { name: "John", age: 30 };
      const rules: ValidationRule[] = [{ field: "name", required: true }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toEqual([]);
    });

    it("fails when required field is missing", () => {
      const row = { age: 30 };
      const rules: ValidationRule[] = [{ field: "name", required: true }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        row: 0,
        field: "name",
        message: expect.stringContaining("required"),
      });
    });

    it("fails when required field is empty string", () => {
      const row = { name: "", age: 30 };
      const rules: ValidationRule[] = [{ field: "name", required: true }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.field).toBe("name");
    });

    it("fails when required field is null", () => {
      const row = { name: null, age: 30 };
      const rules: ValidationRule[] = [{ field: "name", required: true }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
    });

    it("fails when required field is undefined", () => {
      const row = { name: undefined, age: 30 };
      const rules: ValidationRule[] = [{ field: "name", required: true }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
    });
  });

  describe("type validation", () => {
    it("passes when string type matches", () => {
      const row = { name: "John" };
      const rules: ValidationRule[] = [{ field: "name", type: "string" }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toEqual([]);
    });

    it("fails when string type expected but number provided", () => {
      const row = { name: 123 };
      const rules: ValidationRule[] = [{ field: "name", type: "string" }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        field: "name",
        message: expect.stringContaining("string"),
      });
    });

    it("passes when number type matches", () => {
      const row = { age: 30 };
      const rules: ValidationRule[] = [{ field: "age", type: "number" }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toEqual([]);
    });

    it("fails when number type expected but string provided", () => {
      const row = { age: "thirty" };
      const rules: ValidationRule[] = [{ field: "age", type: "number" }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.field).toBe("age");
    });

    it("passes when boolean type matches", () => {
      const row = { active: true };
      const rules: ValidationRule[] = [{ field: "active", type: "boolean" }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toEqual([]);
    });

    it("fails when boolean type expected but string provided", () => {
      const row = { active: "yes" };
      const rules: ValidationRule[] = [{ field: "active", type: "boolean" }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
    });

    it("passes for valid URL type", () => {
      const row = { website: "https://example.com" };
      const rules: ValidationRule[] = [{ field: "website", type: "url" }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toEqual([]);
    });

    it("fails for invalid URL type", () => {
      const row = { website: "not-a-url" };
      const rules: ValidationRule[] = [{ field: "website", type: "url" }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
    });

    it("passes for valid email type", () => {
      const row = { email: "john@example.com" };
      const rules: ValidationRule[] = [{ field: "email", type: "email" }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toEqual([]);
    });

    it("fails for invalid email type", () => {
      const row = { email: "not-an-email" };
      const rules: ValidationRule[] = [{ field: "email", type: "email" }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
    });

    it("passes for valid date type (string)", () => {
      const row = { created: "2024-01-15" };
      const rules: ValidationRule[] = [{ field: "created", type: "date" }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toEqual([]);
    });

    it("skips type validation for null/undefined values when not required", () => {
      const row = { name: null };
      const rules: ValidationRule[] = [{ field: "name", type: "string" }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toEqual([]);
    });
  });

  describe("length validation", () => {
    it("passes when string length meets minLength", () => {
      const row = { name: "John" };
      const rules: ValidationRule[] = [{ field: "name", minLength: 3 }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toEqual([]);
    });

    it("fails when string length below minLength", () => {
      const row = { name: "Jo" };
      const rules: ValidationRule[] = [{ field: "name", minLength: 3 }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain("3");
    });

    it("passes when string length meets maxLength", () => {
      const row = { name: "John" };
      const rules: ValidationRule[] = [{ field: "name", maxLength: 10 }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toEqual([]);
    });

    it("fails when string length exceeds maxLength", () => {
      const row = { name: "John Doe Smith" };
      const rules: ValidationRule[] = [{ field: "name", maxLength: 10 }];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain("10");
    });

    it("validates length for both min and max", () => {
      const row = { name: "Jo" };
      const rules: ValidationRule[] = [
        { field: "name", minLength: 3, maxLength: 10 },
      ];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
    });
  });

  describe("pattern validation", () => {
    it("passes when value matches pattern", () => {
      const row = { code: "ABC-123" };
      const rules: ValidationRule[] = [
        { field: "code", pattern: /^[A-Z]+-\d+$/ },
      ];

      const errors = validateRow(row, 0, rules);

      expect(errors).toEqual([]);
    });

    it("fails when value does not match pattern", () => {
      const row = { code: "abc-123" };
      const rules: ValidationRule[] = [
        { field: "code", pattern: /^[A-Z]+-\d+$/ },
      ];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain("pattern");
    });
  });

  describe("custom validation", () => {
    it("passes when custom validator returns true", () => {
      const row = { age: 25 };
      const rules: ValidationRule[] = [
        { field: "age", custom: (v) => typeof v === "number" && v >= 18 },
      ];

      const errors = validateRow(row, 0, rules);

      expect(errors).toEqual([]);
    });

    it("fails when custom validator returns false", () => {
      const row = { age: 15 };
      const rules: ValidationRule[] = [
        { field: "age", custom: (v) => typeof v === "number" && v >= 18 },
      ];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain("custom");
    });
  });

  describe("multiple rules", () => {
    it("applies multiple rules to same field", () => {
      const row = { name: "Jo" };
      const rules: ValidationRule[] = [
        { field: "name", required: true, type: "string", minLength: 3 },
      ];

      const errors = validateRow(row, 0, rules);

      // Only minLength fails
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain("3");
    });

    it("collects all errors from all rules", () => {
      const row = { name: "", age: "not-a-number" };
      const rules: ValidationRule[] = [
        { field: "name", required: true },
        { field: "age", type: "number" },
      ];

      const errors = validateRow(row, 0, rules);

      expect(errors).toHaveLength(2);
      expect(errors.map((e) => e.field)).toContain("name");
      expect(errors.map((e) => e.field)).toContain("age");
    });
  });
});

describe("validateRows", () => {
  it("validates all rows and returns summary", () => {
    const rows = [
      { name: "John", age: 30 },
      { name: "Jane", age: 25 },
      { name: "Bob", age: 35 },
    ];
    const rules: ValidationRule[] = [
      { field: "name", required: true },
      { field: "age", type: "number" },
    ];

    const result = validateRows(rows, rules);

    expect(result.valid).toBe(true);
    expect(result.totalRows).toBe(3);
    expect(result.validRows).toBe(3);
    expect(result.invalidRows).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it("reports invalid rows", () => {
    const rows = [
      { name: "John", age: 30 },
      { name: "", age: 25 },
      { name: "Bob", age: "invalid" },
    ];
    const rules: ValidationRule[] = [
      { field: "name", required: true },
      { field: "age", type: "number" },
    ];

    const result = validateRows(rows, rules);

    expect(result.valid).toBe(false);
    expect(result.totalRows).toBe(3);
    expect(result.validRows).toBe(1);
    expect(result.invalidRows).toBe(2);
    expect(result.errors).toHaveLength(2);
  });

  it("includes row number in errors", () => {
    const rows = [
      { name: "John" },
      { name: "" },
      { name: "Bob" },
      { name: "" },
    ];
    const rules: ValidationRule[] = [{ field: "name", required: true }];

    const result = validateRows(rows, rules);

    expect(result.errors[0]?.row).toBe(1);
    expect(result.errors[1]?.row).toBe(3);
  });

  it("groups errors by field", () => {
    const rows = [
      { name: "", age: 30 },
      { name: "Jane", age: "invalid" },
      { name: "", age: "invalid" },
    ];
    const rules: ValidationRule[] = [
      { field: "name", required: true },
      { field: "age", type: "number" },
    ];

    const result = validateRows(rows, rules);

    expect(result.errorsByField["name"]).toHaveLength(2);
    expect(result.errorsByField["age"]).toHaveLength(2);
  });

  it("handles empty rows array", () => {
    const rows: Record<string, unknown>[] = [];
    const rules: ValidationRule[] = [{ field: "name", required: true }];

    const result = validateRows(rows, rules);

    expect(result.valid).toBe(true);
    expect(result.totalRows).toBe(0);
    expect(result.validRows).toBe(0);
    expect(result.invalidRows).toBe(0);
  });

  it("handles empty rules array", () => {
    const rows = [{ name: "John" }, { name: "" }];
    const rules: ValidationRule[] = [];

    const result = validateRows(rows, rules);

    expect(result.valid).toBe(true);
    expect(result.validRows).toBe(2);
  });

  it("includes value in error for debugging", () => {
    const rows = [{ name: 123 }];
    const rules: ValidationRule[] = [{ field: "name", type: "string" }];

    const result = validateRows(rows, rules);

    expect(result.errors[0]?.value).toBe(123);
  });

  it("handles large datasets efficiently", () => {
    const rows = Array.from({ length: 10000 }, (_, i) => ({
      name: `Person ${i}`,
      age: i % 100,
    }));
    const rules: ValidationRule[] = [
      { field: "name", required: true },
      { field: "age", type: "number" },
    ];

    const start = performance.now();
    const result = validateRows(rows, rules);
    const duration = performance.now() - start;

    expect(result.valid).toBe(true);
    expect(result.validRows).toBe(10000);
    // Should complete in under 5 seconds (generous for CI)
    expect(duration).toBeLessThan(5000);
  });
});
