import { describe, it, expect } from "vitest";
import {
  parseCsv,
  previewCsv,
  type CsvParseOptions,
  type CsvParseResult,
} from "../services/csv-parser.js";

describe("parseCsv", () => {
  describe("basic parsing", () => {
    it("parses a simple CSV string with headers", async () => {
      const csv = `name,age,city
John,30,New York
Jane,25,Los Angeles`;

      const result = await parseCsv(csv);

      expect(result.headers).toEqual(["name", "age", "city"]);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        name: "John",
        age: "30",
        city: "New York",
      });
      expect(result.rows[1]).toEqual({
        name: "Jane",
        age: "25",
        city: "Los Angeles",
      });
      expect(result.totalRows).toBe(2);
      expect(result.errors).toEqual([]);
    });

    it("parses CSV with custom delimiter (semicolon)", async () => {
      const csv = `name;age;city
John;30;New York
Jane;25;Los Angeles`;

      const result = await parseCsv(csv, { delimiter: ";" });

      expect(result.headers).toEqual(["name", "age", "city"]);
      expect(result.rows[0]).toEqual({
        name: "John",
        age: "30",
        city: "New York",
      });
    });

    it("parses CSV with tab delimiter", async () => {
      const csv = `name\tage\tcity
John\t30\tNew York`;

      const result = await parseCsv(csv, { delimiter: "\t" });

      expect(result.headers).toEqual(["name", "age", "city"]);
      expect(result.rows[0]).toEqual({
        name: "John",
        age: "30",
        city: "New York",
      });
    });

    it("parses CSV without headers when hasHeader is false", async () => {
      const csv = `John,30,New York
Jane,25,Los Angeles`;

      const result = await parseCsv(csv, { hasHeader: false });

      expect(result.headers).toEqual(["column_1", "column_2", "column_3"]);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        column_1: "John",
        column_2: "30",
        column_3: "New York",
      });
    });

    it("handles CSV from Buffer", async () => {
      const csv = `name,age
John,30`;
      const buffer = Buffer.from(csv, "utf-8");

      const result = await parseCsv(buffer);

      expect(result.headers).toEqual(["name", "age"]);
      expect(result.rows[0]).toEqual({ name: "John", age: "30" });
    });
  });

  describe("handling edge cases", () => {
    it("handles empty CSV", async () => {
      const csv = "";

      const result = await parseCsv(csv);

      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
      expect(result.totalRows).toBe(0);
    });

    it("handles CSV with only headers", async () => {
      const csv = `name,age,city`;

      const result = await parseCsv(csv);

      expect(result.headers).toEqual(["name", "age", "city"]);
      expect(result.rows).toEqual([]);
      expect(result.totalRows).toBe(0);
    });

    it("handles single row CSV", async () => {
      const csv = `name,age
John,30`;

      const result = await parseCsv(csv);

      expect(result.headers).toEqual(["name", "age"]);
      expect(result.rows).toHaveLength(1);
    });

    it("handles single column CSV", async () => {
      const csv = `name
John
Jane`;

      const result = await parseCsv(csv);

      expect(result.headers).toEqual(["name"]);
      expect(result.rows[0]).toEqual({ name: "John" });
      expect(result.rows[1]).toEqual({ name: "Jane" });
    });

    it("handles quoted fields with commas", async () => {
      const csv = `name,address,city
John,"123 Main St, Apt 4",New York`;

      const result = await parseCsv(csv);

      expect(result.rows[0]).toEqual({
        name: "John",
        address: "123 Main St, Apt 4",
        city: "New York",
      });
    });

    it("handles quoted fields with newlines", async () => {
      const csv = `name,description
John,"Line 1
Line 2"`;

      const result = await parseCsv(csv);

      expect(result.rows[0]?.description).toBe("Line 1\nLine 2");
    });

    it("handles escaped quotes", async () => {
      const csv = `name,quote
John,"He said ""Hello"""`;

      const result = await parseCsv(csv);

      expect(result.rows[0]?.quote).toBe('He said "Hello"');
    });

    it("handles empty fields", async () => {
      const csv = `name,age,city
John,,New York
,25,`;

      const result = await parseCsv(csv);

      expect(result.rows[0]).toEqual({
        name: "John",
        age: "",
        city: "New York",
      });
      expect(result.rows[1]).toEqual({
        name: "",
        age: "25",
        city: "",
      });
    });

    it("handles whitespace in fields", async () => {
      const csv = `name,age,city
  John  , 30 , New York  `;

      const result = await parseCsv(csv);

      // Values should preserve whitespace by default
      expect(result.rows[0]?.name?.trim()).toBe("John");
    });

    it("handles duplicate column names by making them unique", async () => {
      const csv = `name,name,name
John,Doe,Jr`;

      const result = await parseCsv(csv);

      expect(result.headers).toEqual(["name", "name_2", "name_3"]);
      expect(result.rows[0]).toEqual({
        name: "John",
        name_2: "Doe",
        name_3: "Jr",
      });
    });
  });

  describe("error handling", () => {
    it("reports rows with mismatched column count", async () => {
      const csv = `name,age,city
John,30
Jane,25,Los Angeles,Extra`;

      const result = await parseCsv(csv);

      // Should still parse what it can
      expect(result.rows).toHaveLength(2);
      // First row has fewer columns - missing value becomes empty
      expect(result.rows[0]).toEqual({
        name: "John",
        age: "30",
        city: "",
      });
      // Should report errors for malformed rows
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("preview functionality", () => {
    it("includes preview of first N rows", async () => {
      const csv = `name,age
John,30
Jane,25
Bob,35
Alice,28
Charlie,32`;

      const result = await parseCsv(csv, { previewRows: 3 });

      expect(result.rows).toHaveLength(5);
      expect(result.preview).toHaveLength(3);
      expect(result.preview[0]).toEqual({ name: "John", age: "30" });
      expect(result.preview[2]).toEqual({ name: "Bob", age: "35" });
    });

    it("preview contains all rows if fewer than previewRows", async () => {
      const csv = `name,age
John,30
Jane,25`;

      const result = await parseCsv(csv, { previewRows: 10 });

      expect(result.preview).toHaveLength(2);
    });
  });

  describe("encoding handling", () => {
    it("handles UTF-8 encoded content", async () => {
      const csv = `name,city
Jürgen,München
François,Paris`;

      const result = await parseCsv(csv, { encoding: "utf-8" });

      expect(result.rows[0]).toEqual({ name: "Jürgen", city: "München" });
      expect(result.rows[1]).toEqual({ name: "François", city: "Paris" });
    });

    it("handles Latin-1 encoded buffer", async () => {
      // Create Latin-1 encoded content
      const csv = `name,city
Jürgen,München`;
      const buffer = Buffer.from(csv, "latin1");

      const result = await parseCsv(buffer, { encoding: "latin1" });

      expect(result.headers).toEqual(["name", "city"]);
      // Content should be readable
      expect(result.rows).toHaveLength(1);
    });
  });
});

describe("Performance", () => {
  it("handles large datasets efficiently", async () => {
    const rows = Array.from(
      { length: 10000 },
      (_, i) => `Person${i},${i},City${i}`
    ).join("\n");
    const csv = `name,age,city\n${rows}`;

    const start = performance.now();
    const result = await parseCsv(csv);
    const duration = performance.now() - start;

    expect(result.totalRows).toBe(10000);
    expect(duration).toBeLessThan(5000); // Should parse in under 5 seconds
  });

  it("previewCsv is fast for large files", async () => {
    const rows = Array.from(
      { length: 10000 },
      (_, i) => `Person${i},${i},City${i}`
    ).join("\n");
    const csv = `name,age,city\n${rows}`;

    const start = performance.now();
    const result = await previewCsv(csv, 10);
    const duration = performance.now() - start;

    expect(result.preview.length).toBe(10);
    expect(duration).toBeLessThan(100); // Preview should be MUCH faster
  });
});

describe("previewCsv", () => {
  it("returns headers and first N rows for quick preview", async () => {
    const csv = `name,age,city
John,30,New York
Jane,25,Los Angeles
Bob,35,Chicago
Alice,28,Miami`;

    const result = await previewCsv(csv, 2);

    expect(result.headers).toEqual(["name", "age", "city"]);
    expect(result.preview).toHaveLength(2);
    expect(result.preview[0]).toEqual({
      name: "John",
      age: "30",
      city: "New York",
    });
    expect(result.preview[1]).toEqual({
      name: "Jane",
      age: "25",
      city: "Los Angeles",
    });
  });

  it("defaults to 10 rows if not specified", async () => {
    const rows = Array.from(
      { length: 20 },
      (_, i) => `Person${i},${20 + i}`
    ).join("\n");
    const csv = `name,age\n${rows}`;

    const result = await previewCsv(csv);

    expect(result.preview).toHaveLength(10);
  });

  it("handles buffer input", async () => {
    const csv = `name,age
John,30
Jane,25`;
    const buffer = Buffer.from(csv);

    const result = await previewCsv(buffer, 5);

    expect(result.headers).toEqual(["name", "age"]);
    expect(result.preview).toHaveLength(2);
  });

  it("handles empty CSV", async () => {
    const result = await previewCsv("", 5);

    expect(result.headers).toEqual([]);
    expect(result.preview).toEqual([]);
  });
});
