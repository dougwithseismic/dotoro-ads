import { describe, it, expect } from "vitest";
import {
  normalizeColumnName,
  detectColumnType,
  analyzeColumns,
  normalizeRows,
  type ColumnType,
  type ColumnAnalysis,
} from "../services/data-normalizer.js";

describe("normalizeColumnName", () => {
  it("converts spaces to underscores", () => {
    expect(normalizeColumnName("Product Name")).toBe("product_name");
  });

  it("converts camelCase to snake_case", () => {
    expect(normalizeColumnName("productName")).toBe("product_name");
    expect(normalizeColumnName("ProductName")).toBe("product_name");
    expect(normalizeColumnName("productNameLong")).toBe("product_name_long");
  });

  it("removes special characters", () => {
    expect(normalizeColumnName("Price ($)")).toBe("price");
    expect(normalizeColumnName("Item #")).toBe("item");
    expect(normalizeColumnName("Name!@#$%")).toBe("name");
  });

  it("handles leading/trailing whitespace", () => {
    expect(normalizeColumnName("  Product Name  ")).toBe("product_name");
  });

  it("handles multiple spaces", () => {
    expect(normalizeColumnName("Product   Name")).toBe("product_name");
  });

  it("handles already snake_case names", () => {
    expect(normalizeColumnName("product_name")).toBe("product_name");
  });

  it("handles empty string", () => {
    expect(normalizeColumnName("")).toBe("column");
  });

  it("handles numbers at start", () => {
    expect(normalizeColumnName("123Name")).toBe("_123_name");
  });

  it("handles uppercase abbreviations", () => {
    expect(normalizeColumnName("XMLParser")).toBe("xml_parser");
    expect(normalizeColumnName("parseXML")).toBe("parse_xml");
    expect(normalizeColumnName("HTTPSUrl")).toBe("https_url");
  });

  it("handles hyphenated names", () => {
    expect(normalizeColumnName("first-name")).toBe("first_name");
    expect(normalizeColumnName("first--name")).toBe("first_name");
  });

  it("collapses multiple underscores", () => {
    expect(normalizeColumnName("first__name")).toBe("first_name");
    expect(normalizeColumnName("first___name")).toBe("first_name");
  });

  it("removes trailing underscores", () => {
    expect(normalizeColumnName("name_")).toBe("name");
    expect(normalizeColumnName("name___")).toBe("name");
  });
});

describe("detectColumnType", () => {
  describe("string detection", () => {
    it("detects plain strings", () => {
      expect(detectColumnType(["John", "Jane", "Bob"])).toBe("string");
    });

    it("returns string for mixed types", () => {
      expect(detectColumnType(["John", "30", "true"])).toBe("string");
    });

    it("returns string for empty array", () => {
      expect(detectColumnType([])).toBe("string");
    });
  });

  describe("number detection", () => {
    it("detects integers", () => {
      expect(detectColumnType(["1", "2", "3", "100"])).toBe("number");
    });

    it("detects decimals", () => {
      expect(detectColumnType(["1.5", "2.75", "3.0"])).toBe("number");
    });

    it("detects negative numbers", () => {
      expect(detectColumnType(["-1", "-2.5", "3"])).toBe("number");
    });

    it("detects numbers with thousands separator", () => {
      expect(detectColumnType(["1,000", "2,500", "10,000"])).toBe("number");
    });

    it("detects currency-style numbers", () => {
      expect(detectColumnType(["$100", "$200.50", "$1,000"])).toBe("number");
    });

    it("detects percentage numbers", () => {
      expect(detectColumnType(["50%", "75%", "100%"])).toBe("number");
    });

    it("handles empty values in number columns", () => {
      expect(detectColumnType(["1", "", "3", ""])).toBe("number");
    });
  });

  describe("boolean detection", () => {
    it("detects true/false strings", () => {
      expect(detectColumnType(["true", "false", "true"])).toBe("boolean");
    });

    it("detects yes/no strings", () => {
      expect(detectColumnType(["yes", "no", "yes"])).toBe("boolean");
    });

    it("detects 1/0 as boolean", () => {
      expect(detectColumnType(["1", "0", "1", "0"])).toBe("boolean");
    });

    it("detects case-insensitive boolean", () => {
      expect(detectColumnType(["TRUE", "FALSE", "True", "False"])).toBe(
        "boolean"
      );
      expect(detectColumnType(["YES", "NO", "Yes", "No"])).toBe("boolean");
    });
  });

  describe("date detection", () => {
    it("detects ISO date format", () => {
      expect(
        detectColumnType(["2024-01-15", "2024-02-20", "2024-03-25"])
      ).toBe("date");
    });

    it("detects US date format", () => {
      expect(detectColumnType(["01/15/2024", "02/20/2024", "03/25/2024"])).toBe(
        "date"
      );
    });

    it("detects EU date format", () => {
      expect(detectColumnType(["15-01-2024", "20-02-2024", "25-03-2024"])).toBe(
        "date"
      );
    });

    it("detects datetime format", () => {
      expect(
        detectColumnType(["2024-01-15T10:30:00", "2024-02-20T15:45:00"])
      ).toBe("date");
    });

    it("detects various date formats", () => {
      expect(
        detectColumnType(["Jan 15, 2024", "Feb 20, 2024", "Mar 25, 2024"])
      ).toBe("date");
    });
  });

  describe("URL detection", () => {
    it("detects http URLs", () => {
      expect(
        detectColumnType([
          "http://example.com",
          "http://test.org",
          "http://site.net",
        ])
      ).toBe("url");
    });

    it("detects https URLs", () => {
      expect(
        detectColumnType([
          "https://example.com",
          "https://test.org/page",
          "https://site.net/path?query=1",
        ])
      ).toBe("url");
    });

    it("detects www URLs", () => {
      expect(
        detectColumnType([
          "www.example.com",
          "www.test.org",
          "www.site.net/page",
        ])
      ).toBe("url");
    });
  });

  describe("email detection", () => {
    it("detects email addresses", () => {
      expect(
        detectColumnType([
          "john@example.com",
          "jane@test.org",
          "bob@company.net",
        ])
      ).toBe("email");
    });

    it("detects emails with plus addressing", () => {
      expect(
        detectColumnType([
          "john+work@example.com",
          "jane+personal@test.org",
        ])
      ).toBe("email");
    });

    it("detects emails with subdomains", () => {
      expect(
        detectColumnType([
          "john@mail.example.com",
          "jane@subdomain.test.org",
        ])
      ).toBe("email");
    });
  });

  describe("threshold-based detection", () => {
    it("requires majority of values to match type", () => {
      // 3 numbers, 1 string (75% match) - should be number (70% threshold)
      expect(detectColumnType(["1", "2", "3", "hello"])).toBe("number");

      // 4 numbers, 1 non-number (80% match) - should still be number
      expect(detectColumnType(["1", "2", "3", "4", "hello"])).toBe("number");

      // 2 numbers, 2 strings (50% match) - should be string
      expect(detectColumnType(["1", "2", "hello", "world"])).toBe("string");
    });

    it("ignores empty values when determining type", () => {
      expect(detectColumnType(["1", "", "3", "", "5"])).toBe("number");
    });
  });
});

describe("analyzeColumns", () => {
  it("analyzes columns and returns analysis for each", () => {
    const headers = ["Product Name", "Price", "In Stock"];
    const rows = [
      { "Product Name": "Widget", Price: "29.99", "In Stock": "true" },
      { "Product Name": "Gadget", Price: "49.99", "In Stock": "false" },
      { "Product Name": "Doodad", Price: "19.99", "In Stock": "true" },
    ];

    const analysis = analyzeColumns(headers, rows);

    expect(analysis).toHaveLength(3);

    expect(analysis[0]).toMatchObject({
      originalName: "Product Name",
      suggestedName: "product_name",
      detectedType: "string",
    });

    expect(analysis[1]).toMatchObject({
      originalName: "Price",
      suggestedName: "price",
      detectedType: "number",
    });

    expect(analysis[2]).toMatchObject({
      originalName: "In Stock",
      suggestedName: "in_stock",
      detectedType: "boolean",
    });
  });

  it("includes sample values", () => {
    const headers = ["name"];
    const rows = [
      { name: "John" },
      { name: "Jane" },
      { name: "Bob" },
      { name: "Alice" },
      { name: "Charlie" },
    ];

    const analysis = analyzeColumns(headers, rows);

    expect(analysis[0]?.sampleValues).toBeDefined();
    expect(analysis[0]?.sampleValues.length).toBeLessThanOrEqual(5);
  });

  it("counts null/empty values", () => {
    const headers = ["name", "age"];
    const rows = [
      { name: "John", age: "30" },
      { name: "", age: "" },
      { name: "Jane", age: "25" },
      { name: "", age: "" },
    ];

    const analysis = analyzeColumns(headers, rows);

    expect(analysis[0]?.nullCount).toBe(2);
    expect(analysis[1]?.nullCount).toBe(2);
  });

  it("counts unique values", () => {
    const headers = ["status"];
    const rows = [
      { status: "active" },
      { status: "inactive" },
      { status: "active" },
      { status: "pending" },
      { status: "active" },
    ];

    const analysis = analyzeColumns(headers, rows);

    expect(analysis[0]?.uniqueCount).toBe(3);
  });

  it("handles empty rows", () => {
    const headers = ["name", "age"];
    const rows: Record<string, string>[] = [];

    const analysis = analyzeColumns(headers, rows);

    expect(analysis).toHaveLength(2);
    expect(analysis[0]?.detectedType).toBe("string");
    expect(analysis[0]?.sampleValues).toEqual([]);
  });
});

describe("normalizeRows", () => {
  it("converts row values to detected types", () => {
    const rows = [
      { name: "Widget", price: "29.99", active: "true" },
      { name: "Gadget", price: "49.99", active: "false" },
    ];

    const columns: ColumnAnalysis[] = [
      {
        originalName: "name",
        suggestedName: "name",
        detectedType: "string",
        sampleValues: [],
        nullCount: 0,
        uniqueCount: 2,
      },
      {
        originalName: "price",
        suggestedName: "price",
        detectedType: "number",
        sampleValues: [],
        nullCount: 0,
        uniqueCount: 2,
      },
      {
        originalName: "active",
        suggestedName: "active",
        detectedType: "boolean",
        sampleValues: [],
        nullCount: 0,
        uniqueCount: 2,
      },
    ];

    const normalized = normalizeRows(rows, columns);

    expect(normalized[0]).toEqual({
      name: "Widget",
      price: 29.99,
      active: true,
    });
    expect(normalized[1]).toEqual({
      name: "Gadget",
      price: 49.99,
      active: false,
    });
  });

  it("renames columns to suggested names", () => {
    const rows = [{ "Product Name": "Widget", "Sale Price": "29.99" }];

    const columns: ColumnAnalysis[] = [
      {
        originalName: "Product Name",
        suggestedName: "product_name",
        detectedType: "string",
        sampleValues: [],
        nullCount: 0,
        uniqueCount: 1,
      },
      {
        originalName: "Sale Price",
        suggestedName: "sale_price",
        detectedType: "number",
        sampleValues: [],
        nullCount: 0,
        uniqueCount: 1,
      },
    ];

    const normalized = normalizeRows(rows, columns);

    expect(normalized[0]).toEqual({
      product_name: "Widget",
      sale_price: 29.99,
    });
  });

  it("converts various number formats", () => {
    const rows = [
      { price: "$1,234.56" },
      { price: "1000" },
      { price: "50%" },
      { price: "-25.5" },
    ];

    const columns: ColumnAnalysis[] = [
      {
        originalName: "price",
        suggestedName: "price",
        detectedType: "number",
        sampleValues: [],
        nullCount: 0,
        uniqueCount: 4,
      },
    ];

    const normalized = normalizeRows(rows, columns);

    expect(normalized[0]?.price).toBe(1234.56);
    expect(normalized[1]?.price).toBe(1000);
    expect(normalized[2]?.price).toBe(50);
    expect(normalized[3]?.price).toBe(-25.5);
  });

  it("converts various boolean formats", () => {
    const rows = [
      { active: "true" },
      { active: "false" },
      { active: "yes" },
      { active: "no" },
      { active: "1" },
      { active: "0" },
      { active: "TRUE" },
      { active: "NO" },
    ];

    const columns: ColumnAnalysis[] = [
      {
        originalName: "active",
        suggestedName: "active",
        detectedType: "boolean",
        sampleValues: [],
        nullCount: 0,
        uniqueCount: 2,
      },
    ];

    const normalized = normalizeRows(rows, columns);

    expect(normalized[0]?.active).toBe(true);
    expect(normalized[1]?.active).toBe(false);
    expect(normalized[2]?.active).toBe(true);
    expect(normalized[3]?.active).toBe(false);
    expect(normalized[4]?.active).toBe(true);
    expect(normalized[5]?.active).toBe(false);
    expect(normalized[6]?.active).toBe(true);
    expect(normalized[7]?.active).toBe(false);
  });

  it("handles null/empty values", () => {
    const rows = [{ name: "Widget", price: "" }, { name: "", price: "29.99" }];

    const columns: ColumnAnalysis[] = [
      {
        originalName: "name",
        suggestedName: "name",
        detectedType: "string",
        sampleValues: [],
        nullCount: 1,
        uniqueCount: 1,
      },
      {
        originalName: "price",
        suggestedName: "price",
        detectedType: "number",
        sampleValues: [],
        nullCount: 1,
        uniqueCount: 1,
      },
    ];

    const normalized = normalizeRows(rows, columns);

    expect(normalized[0]).toEqual({ name: "Widget", price: null });
    expect(normalized[1]).toEqual({ name: "", price: 29.99 });
  });

  it("preserves URL and email as strings", () => {
    const rows = [
      { website: "https://example.com", email: "john@example.com" },
    ];

    const columns: ColumnAnalysis[] = [
      {
        originalName: "website",
        suggestedName: "website",
        detectedType: "url",
        sampleValues: [],
        nullCount: 0,
        uniqueCount: 1,
      },
      {
        originalName: "email",
        suggestedName: "email",
        detectedType: "email",
        sampleValues: [],
        nullCount: 0,
        uniqueCount: 1,
      },
    ];

    const normalized = normalizeRows(rows, columns);

    expect(normalized[0]).toEqual({
      website: "https://example.com",
      email: "john@example.com",
    });
  });

  it("converts date strings to Date objects or ISO strings", () => {
    const rows = [
      { date: "2024-01-15" },
      { date: "01/15/2024" },
      { date: "2024-01-15T10:30:00" },
    ];

    const columns: ColumnAnalysis[] = [
      {
        originalName: "date",
        suggestedName: "date",
        detectedType: "date",
        sampleValues: [],
        nullCount: 0,
        uniqueCount: 3,
      },
    ];

    const normalized = normalizeRows(rows, columns);

    // Dates should be converted to ISO strings
    expect(typeof normalized[0]?.date).toBe("string");
    expect(normalized[0]?.date).toContain("2024");
  });
});
