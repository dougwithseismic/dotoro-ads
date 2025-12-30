import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useTemplateLengthEstimation,
  extractVariables,
  getFieldLimit,
  type ColumnLengthStats,
} from "../useTemplateLengthEstimation";

describe("extractVariables", () => {
  it("should extract variables with double braces", () => {
    const result = extractVariables("Hello {{name}}!");
    expect(result).toEqual(["name"]);
  });

  it("should extract variables with single braces", () => {
    const result = extractVariables("Hello {name}!");
    expect(result).toEqual(["name"]);
  });

  it("should extract multiple variables", () => {
    const result = extractVariables("{{first}} and {{second}}");
    expect(result).toContain("first");
    expect(result).toContain("second");
    expect(result).toHaveLength(2);
  });

  it("should handle variables with filters", () => {
    const result = extractVariables("{{name|uppercase}}");
    expect(result).toEqual(["name"]);
  });

  it("should return empty array for no variables", () => {
    const result = extractVariables("Hello World!");
    expect(result).toEqual([]);
  });

  it("should return unique variables", () => {
    const result = extractVariables("{{name}} and {{name}}");
    expect(result).toEqual(["name"]);
  });
});

describe("getFieldLimit", () => {
  it("should return Google headline limit", () => {
    expect(getFieldLimit("google", "headline")).toBe(30);
  });

  it("should return Google description limit", () => {
    expect(getFieldLimit("google", "description")).toBe(90);
  });

  it("should return Facebook headline limit", () => {
    expect(getFieldLimit("facebook", "headline")).toBe(40);
  });

  it("should return Reddit title limit", () => {
    expect(getFieldLimit("reddit", "title")).toBe(300);
  });

  it("should map headline to title for Reddit", () => {
    expect(getFieldLimit("reddit", "headline")).toBe(300);
  });

  it("should return undefined for unknown platform", () => {
    expect(getFieldLimit("unknown" as any, "headline")).toBeUndefined();
  });

  it("should return undefined for unknown field", () => {
    expect(getFieldLimit("google", "unknown")).toBeUndefined();
  });
});

describe("useTemplateLengthEstimation", () => {
  const mockColumnStats: ColumnLengthStats = {
    product_name: {
      minLength: 5,
      maxLength: 25,
      avgLength: 15,
      sampleShortest: "Nike",
      sampleLongest: "Nike Air Max Running Shoes",
      computedAt: "2024-01-01T00:00:00Z",
    },
    price: {
      minLength: 3,
      maxLength: 8,
      avgLength: 5,
      sampleShortest: "$99",
      sampleLongest: "$1,999.99",
      computedAt: "2024-01-01T00:00:00Z",
    },
  };

  it("should calculate static length for template without variables", () => {
    const { result } = renderHook(() =>
      useTemplateLengthEstimation("Buy Now!", mockColumnStats, "google", "headline")
    );

    expect(result.current.staticLength).toBe(8);
    expect(result.current.estimatedMin).toBe(8);
    expect(result.current.estimatedMax).toBe(8);
    expect(result.current.variables).toHaveLength(0);
  });

  it("should calculate estimated lengths with variables", () => {
    const { result } = renderHook(() =>
      useTemplateLengthEstimation(
        "Buy {{product_name}}!",
        mockColumnStats,
        "google",
        "headline"
      )
    );

    // Static: "Buy !" = 5 chars
    // Variable: product_name min=5, max=25
    expect(result.current.staticLength).toBe(5);
    expect(result.current.estimatedMin).toBe(10); // 5 + 5
    expect(result.current.estimatedMax).toBe(30); // 5 + 25
  });

  it("should identify when max exceeds limit", () => {
    const { result } = renderHook(() =>
      useTemplateLengthEstimation(
        "Buy {{product_name}} for {{price}}!",
        mockColumnStats,
        "google",
        "headline"
      )
    );

    // Static: "Buy  for !" = 10 chars
    // Variables: product_name max=25, price max=8
    // Total max = 10 + 25 + 8 = 43, exceeds Google headline limit of 30
    expect(result.current.isOverLimit).toBe(true);
    expect(result.current.platformLimit).toBe(30);
  });

  it("should handle missing variables with default length", () => {
    const { result } = renderHook(() =>
      useTemplateLengthEstimation(
        "{{unknown_var}}",
        mockColumnStats,
        "google",
        "headline"
      )
    );

    expect(result.current.missingVariables).toContain("unknown_var");
    // Default length of 10 for unknown variables
    expect(result.current.estimatedMax).toBe(10);
  });

  it("should return correct platform limit", () => {
    const { result: googleResult } = renderHook(() =>
      useTemplateLengthEstimation("Test", mockColumnStats, "google", "headline")
    );
    expect(googleResult.current.platformLimit).toBe(30);

    const { result: redditResult } = renderHook(() =>
      useTemplateLengthEstimation("Test", mockColumnStats, "reddit", "title")
    );
    expect(redditResult.current.platformLimit).toBe(300);
  });

  it("should calculate variable contributions", () => {
    const { result } = renderHook(() =>
      useTemplateLengthEstimation(
        "{{product_name}}",
        mockColumnStats,
        "google",
        "headline"
      )
    );

    expect(result.current.variables).toHaveLength(1);
    expect(result.current.variables[0].name).toBe("product_name");
    expect(result.current.variables[0].minLength).toBe(5);
    expect(result.current.variables[0].maxLength).toBe(25);
    expect(result.current.variables[0].contribution).toBe(100);
  });

  it("should handle undefined column stats", () => {
    const { result } = renderHook(() =>
      useTemplateLengthEstimation(
        "{{product_name}}",
        undefined,
        "google",
        "headline"
      )
    );

    // Without stats, only static length is calculated
    expect(result.current.staticLength).toBe(0);
    expect(result.current.estimatedMax).toBe(0);
    expect(result.current.variables).toHaveLength(0);
  });
});
