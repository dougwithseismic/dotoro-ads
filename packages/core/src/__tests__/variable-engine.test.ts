import { describe, it, expect } from "vitest";
import {
  VariableEngine,
  type SubstitutionResult,
  type ExtractedVariable,
} from "../services/variable-engine.js";

describe("VariableEngine", () => {
  const engine = new VariableEngine();

  describe("extractVariables", () => {
    it("extracts simple variables from template", () => {
      const template = "Get {product_name} for ${price}!";
      const variables = engine.extractVariables(template);

      expect(variables).toHaveLength(2);
      expect(variables[0]).toEqual({
        name: "product_name",
        raw: "{product_name}",
        filters: [],
        fallback: undefined,
      });
      expect(variables[1]).toEqual({
        name: "price",
        raw: "{price}",
        filters: [],
        fallback: undefined,
      });
    });

    it("extracts variables with filters", () => {
      const template = "{name|uppercase} - {price|currency}";
      const variables = engine.extractVariables(template);

      expect(variables).toHaveLength(2);
      expect(variables[0]).toEqual({
        name: "name",
        raw: "{name|uppercase}",
        filters: [{ name: "uppercase", args: [] }],
        fallback: undefined,
      });
      expect(variables[1]).toEqual({
        name: "price",
        raw: "{price|currency}",
        filters: [{ name: "currency", args: [] }],
        fallback: undefined,
      });
    });

    it("extracts variables with filter arguments", () => {
      const template = "{date|format:YYYY-MM-DD}";
      const variables = engine.extractVariables(template);

      expect(variables).toHaveLength(1);
      expect(variables[0]).toEqual({
        name: "date",
        raw: "{date|format:YYYY-MM-DD}",
        filters: [{ name: "format", args: ["YYYY-MM-DD"] }],
        fallback: undefined,
      });
    });

    it("extracts variables with multiple filters", () => {
      const template = "{name|trim|uppercase|truncate:50}";
      const variables = engine.extractVariables(template);

      expect(variables).toHaveLength(1);
      expect(variables[0]?.filters).toEqual([
        { name: "trim", args: [] },
        { name: "uppercase", args: [] },
        { name: "truncate", args: ["50"] },
      ]);
    });

    it("extracts variables with fallback values", () => {
      const template = "{sale_price|price}";
      const variables = engine.extractVariables(template);

      expect(variables).toHaveLength(1);
      expect(variables[0]).toEqual({
        name: "sale_price",
        raw: "{sale_price|price}",
        filters: [],
        fallback: "price",
      });
    });

    it("distinguishes between fallback and filter based on registered filters", () => {
      // 'uppercase' is a known filter, so it should be treated as filter
      const withFilter = engine.extractVariables("{name|uppercase}");
      expect(withFilter[0]?.filters).toEqual([{ name: "uppercase", args: [] }]);
      expect(withFilter[0]?.fallback).toBeUndefined();

      // 'default_name' is not a known filter, so it should be treated as fallback
      const withFallback = engine.extractVariables("{name|default_name}");
      expect(withFallback[0]?.filters).toEqual([]);
      expect(withFallback[0]?.fallback).toBe("default_name");
    });

    it("returns empty array for template with no variables", () => {
      const template = "Just plain text without variables";
      const variables = engine.extractVariables(template);

      expect(variables).toEqual([]);
    });

    it("handles nested variable references", () => {
      const template = "{category.{lang}}";
      const variables = engine.extractVariables(template);

      expect(variables).toHaveLength(1);
      expect(variables[0]).toEqual({
        name: "category.{lang}",
        raw: "{category.{lang}}",
        filters: [],
        fallback: undefined,
        nested: true,
      });
    });

    it("extracts unique variable names", () => {
      const template = "{name} is {name} and {name}";
      const variables = engine.extractVariables(template);

      // Should return unique variables only
      expect(variables).toHaveLength(1);
      expect(variables[0]?.name).toBe("name");
    });
  });

  describe("substitute", () => {
    it("substitutes simple variables", () => {
      const template = "Get {product_name} for ${price}!";
      const result = engine.substitute(template, {
        product_name: "Nike Air",
        price: "99.99",
      });

      expect(result.text).toBe("Get Nike Air for $99.99!");
      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("handles missing variables with empty string by default", () => {
      const template = "Get {product_name} now!";
      const result = engine.substitute(template, {});

      expect(result.text).toBe("Get  now!");
      expect(result.success).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          variable: "product_name",
          message: expect.stringContaining("missing"),
        })
      );
    });

    it("uses fallback variable when primary is missing", () => {
      const template = "Price: {sale_price|regular_price}";
      const result = engine.substitute(template, {
        regular_price: "100",
      });

      expect(result.text).toBe("Price: 100");
      expect(result.success).toBe(true);
    });

    it("handles case when both primary and fallback are missing", () => {
      const template = "Price: {sale_price|regular_price}";
      const result = engine.substitute(template, {});

      expect(result.text).toBe("Price: ");
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          variable: "sale_price",
        })
      );
    });

    describe("filters", () => {
      it("applies uppercase filter", () => {
        const template = "{name|uppercase}";
        const result = engine.substitute(template, { name: "hello world" });

        expect(result.text).toBe("HELLO WORLD");
      });

      it("applies lowercase filter", () => {
        const template = "{name|lowercase}";
        const result = engine.substitute(template, { name: "HELLO WORLD" });

        expect(result.text).toBe("hello world");
      });

      it("applies capitalize filter", () => {
        const template = "{name|capitalize}";
        const result = engine.substitute(template, { name: "hello world" });

        expect(result.text).toBe("Hello world");
      });

      it("applies titlecase filter", () => {
        const template = "{name|titlecase}";
        const result = engine.substitute(template, { name: "hello world" });

        expect(result.text).toBe("Hello World");
      });

      it("applies trim filter", () => {
        const template = "{name|trim}";
        const result = engine.substitute(template, { name: "  hello  " });

        expect(result.text).toBe("hello");
      });

      it("applies truncate filter with length", () => {
        const template = "{description|truncate:10}";
        const result = engine.substitute(template, {
          description: "This is a very long description",
        });

        expect(result.text).toBe("This is a...");
      });

      it("applies truncate filter with custom suffix", () => {
        const template = "{description|truncate:10:...more}";
        const result = engine.substitute(template, {
          description: "This is a very long description",
        });

        expect(result.text).toBe("This is a...more");
      });

      it("applies currency filter with default USD", () => {
        const template = "{price|currency}";
        const result = engine.substitute(template, { price: "99.99" });

        expect(result.text).toBe("$99.99");
      });

      it("applies currency filter with specified currency", () => {
        const template = "{price|currency:EUR}";
        const result = engine.substitute(template, { price: "99.99" });

        // EUR formatting
        expect(result.text).toMatch(/99[,.]99/);
      });

      it("applies number filter for formatting", () => {
        const template = "{count|number}";
        const result = engine.substitute(template, { count: "1234567" });

        expect(result.text).toBe("1,234,567");
      });

      it("applies number filter with decimal places", () => {
        const template = "{value|number:2}";
        const result = engine.substitute(template, { value: "1234.5" });

        expect(result.text).toBe("1,234.50");
      });

      it("applies percent filter", () => {
        const template = "{rate|percent}";
        const result = engine.substitute(template, { rate: "0.156" });

        expect(result.text).toBe("15.6%");
      });

      it("applies date format filter", () => {
        const template = "{date|format:YYYY-MM-DD}";
        const result = engine.substitute(template, {
          date: "2025-01-15T12:00:00Z",
        });

        expect(result.text).toBe("2025-01-15");
      });

      it("applies slug filter", () => {
        const template = "{title|slug}";
        const result = engine.substitute(template, {
          title: "Hello World! This is a Test",
        });

        expect(result.text).toBe("hello-world-this-is-a-test");
      });

      it("applies replace filter", () => {
        const template = "{text|replace:foo:bar}";
        const result = engine.substitute(template, { text: "foo is foo" });

        expect(result.text).toBe("bar is bar");
      });

      it("applies default filter for empty values", () => {
        const template = "{name|default:Anonymous}";
        const result = engine.substitute(template, { name: "" });

        expect(result.text).toBe("Anonymous");
      });

      it("applies multiple filters in sequence", () => {
        const template = "{name|trim|uppercase|truncate:5}";
        const result = engine.substitute(template, { name: "  hello world  " });

        expect(result.text).toBe("HELLO...");
      });

      it("handles unknown filter gracefully", () => {
        const template = "{name|unknownFilter}";
        const result = engine.substitute(template, { name: "test" });

        // Unknown filter treated as fallback - since name exists, use name value
        expect(result.text).toBe("test");
      });

      it("warns when unknown filter with args is used", () => {
        // When a filter has args (colon syntax), it's detected as a filter
        // If not registered, it should warn and return original value
        const template = "{name|unknownFilter:arg}";
        const result = engine.substitute(template, { name: "test" });

        expect(result.text).toBe("test");
        expect(result.warnings).toContainEqual(
          expect.objectContaining({
            variable: "filter:unknownFilter",
            message: expect.stringContaining("Unknown filter"),
          })
        );
      });

      it("handles filter execution errors gracefully", () => {
        const customEngine = new VariableEngine();
        customEngine.registerFilter("throwingFilter", () => {
          throw new Error("Filter execution error");
        });

        const result = customEngine.substitute("{name|throwingFilter}", {
          name: "test",
        });

        // Should return original value and add a warning
        expect(result.text).toBe("test");
        expect(result.warnings).toContainEqual(
          expect.objectContaining({
            variable: "filter:throwingFilter",
            message: expect.stringContaining("failed"),
          })
        );
      });
    });

    describe("nested variables", () => {
      it("resolves nested variable references", () => {
        const template = "{category.{lang}}";
        const result = engine.substitute(template, {
          lang: "en",
          "category.en": "Electronics",
          "category.es": "Electronica",
        });

        expect(result.text).toBe("Electronics");
      });

      it("handles missing inner variable in nested reference", () => {
        const template = "{category.{lang}}";
        const result = engine.substitute(template, {
          "category.en": "Electronics",
        });

        // lang is missing, so category.{lang} can't be resolved
        expect(result.text).toBe("");
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });

    describe("edge cases", () => {
      it("handles escaped braces", () => {
        const template = "Use {{variable}} syntax for templates";
        const result = engine.substitute(template, {});

        expect(result.text).toBe("Use {variable} syntax for templates");
      });

      it("handles empty template", () => {
        const result = engine.substitute("", { name: "test" });

        expect(result.text).toBe("");
        expect(result.success).toBe(true);
      });

      it("handles template with only variables", () => {
        const template = "{greeting}{name}";
        const result = engine.substitute(template, {
          greeting: "Hello ",
          name: "World",
        });

        expect(result.text).toBe("Hello World");
      });

      it("handles numeric values", () => {
        const template = "Price: {price}";
        const result = engine.substitute(template, { price: 99.99 });

        expect(result.text).toBe("Price: 99.99");
      });

      it("handles boolean values", () => {
        const template = "Active: {active}";
        const result = engine.substitute(template, { active: true });

        expect(result.text).toBe("Active: true");
      });

      it("handles null and undefined values", () => {
        const template = "{a} and {b}";
        const result = engine.substitute(template, { a: null, b: undefined });

        expect(result.text).toBe(" and ");
      });

      it("handles special characters in variable values", () => {
        const template = "{html}";
        const result = engine.substitute(template, {
          html: '<script>alert("xss")</script>',
        });

        expect(result.text).toBe('<script>alert("xss")</script>');
      });

      it("handles deeply nested object access", () => {
        const template = "{product.details.color}";
        const result = engine.substitute(template, {
          "product.details.color": "red",
        });

        expect(result.text).toBe("red");
      });

      it("preserves dollar signs in template", () => {
        const template = "Get {name} for ${price}!";
        const result = engine.substitute(template, {
          name: "Widget",
          price: "50",
        });

        expect(result.text).toBe("Get Widget for $50!");
      });
    });
  });

  describe("validate", () => {
    it("returns valid result for template with all variables present", () => {
      const template = "{name} - {price}";
      const result = engine.validate(template, { name: "test", price: "100" });

      expect(result.valid).toBe(true);
      expect(result.missingVariables).toEqual([]);
    });

    it("returns invalid result with missing variables list", () => {
      const template = "{name} - {price} - {description}";
      const result = engine.validate(template, { name: "test" });

      expect(result.valid).toBe(false);
      expect(result.missingVariables).toContain("price");
      expect(result.missingVariables).toContain("description");
    });

    it("considers fallback variables in validation", () => {
      const template = "{sale_price|regular_price}";
      const result = engine.validate(template, { regular_price: "100" });

      // Valid because fallback is present
      expect(result.valid).toBe(true);
    });
  });

  describe("getRequiredVariables", () => {
    it("returns list of required variable names", () => {
      const template = "{name} costs {price|currency}";
      const required = engine.getRequiredVariables(template);

      expect(required).toContain("name");
      expect(required).toContain("price");
    });

    it("includes fallback variables in required list", () => {
      const template = "{sale_price|regular_price}";
      const required = engine.getRequiredVariables(template);

      expect(required).toContain("sale_price");
      expect(required).toContain("regular_price");
    });

    it("returns unique variable names only", () => {
      const template = "{name} is {name}";
      const required = engine.getRequiredVariables(template);

      expect(required).toEqual(["name"]);
    });
  });

  describe("previewSubstitution", () => {
    it("returns substitution result with sample data indicators", () => {
      const template = "Get {product_name} for {price|currency}!";
      const sampleData = {
        product_name: "Sample Product",
        price: "99.99",
      };

      const result = engine.previewSubstitution(template, sampleData);

      expect(result.text).toBe("Get Sample Product for $99.99!");
      expect(result.substitutions).toContainEqual(
        expect.objectContaining({
          variable: "product_name",
          originalValue: "Sample Product",
          transformedValue: "Sample Product",
        })
      );
    });
  });

  describe("registerFilter", () => {
    it("allows registering custom filters", () => {
      const customEngine = new VariableEngine();
      customEngine.registerFilter("reverse", (value: string) => {
        return value.split("").reverse().join("");
      });

      const result = customEngine.substitute("{name|reverse}", {
        name: "hello",
      });

      expect(result.text).toBe("olleh");
    });

    it("custom filter receives arguments", () => {
      const customEngine = new VariableEngine();
      customEngine.registerFilter("repeat", (value: string, times: string) => {
        return value.repeat(parseInt(times, 10));
      });

      const result = customEngine.substitute("{text|repeat:3}", {
        text: "ab",
      });

      expect(result.text).toBe("ababab");
    });
  });
});

describe("VariableEngine - Invalid Filter Arguments", () => {
  const engine = new VariableEngine();

  describe("truncate filter edge cases", () => {
    it("should handle non-numeric truncate length gracefully", () => {
      const result = engine.substitute("{value|truncate:abc}", { value: "hello world" });
      // With NaN length, the filter returns the original value unchanged
      expect(result.text).toBe("hello world");
      expect(result.success).toBe(true);
    });

    it("should handle negative truncate length", () => {
      const result = engine.substitute("{value|truncate:-5}", { value: "hello world" });
      // Negative length: value.length > -5 is true, so it truncates to first -5 chars (empty) + suffix
      // But slice(0, -5) gives "hello " so result is "hello..."
      expect(result.text).toBe("hello...");
    });

    it("should handle zero truncate length", () => {
      const result = engine.substitute("{value|truncate:0}", { value: "hello world" });
      expect(result.text).toBe("...");
    });

    it("should handle missing truncate length", () => {
      const result = engine.substitute("{value|truncate}", { value: "hello world" });
      // Missing arg results in NaN, returns original value
      expect(result.text).toBe("hello world");
    });
  });

  describe("format filter edge cases", () => {
    it("should handle missing format pattern", () => {
      const result = engine.substitute("{date|format}", { date: "2024-01-15" });
      // Missing pattern means undefined is passed, which becomes "undefined" string
      // But since pattern is undefined, the replacements don't find matches
      // The function returns the pattern as-is when it's undefined (converted to string)
      // Actually the date is valid so it processes - pattern being undefined returns original value
      expect(result.text).toBe("2024-01-15");
    });

    it("should handle invalid date with format filter", () => {
      const result = engine.substitute("{date|format:YYYY-MM-DD}", { date: "not-a-date" });
      // Invalid date returns the original value
      expect(result.text).toBe("not-a-date");
    });
  });

  describe("number filter edge cases", () => {
    it("should handle non-numeric decimal places in number filter", () => {
      const result = engine.substitute("{price|number:invalid}", { price: "99.99" });
      // NaN decimal places are ignored, falls back to default formatting
      expect(result.text).toBe("99.99");
    });

    it("should handle non-numeric value with number filter", () => {
      const result = engine.substitute("{price|number:2}", { price: "not-a-number" });
      // Non-numeric value returns original
      expect(result.text).toBe("not-a-number");
    });

    it("should handle negative decimal places", () => {
      const result = engine.substitute("{price|number:-2}", { price: "99.99" });
      // Negative decimal places are ignored, falls back to default formatting
      expect(result.text).toBe("99.99");
    });
  });

  describe("currency filter edge cases", () => {
    it("should handle invalid currency code", () => {
      const result = engine.substitute("{price|currency:INVALID}", { price: "99.99" });
      // Invalid currency code falls back to basic formatting
      expect(result.text).toBe("$99.99");
    });

    it("should handle non-numeric value with currency filter", () => {
      const result = engine.substitute("{price|currency}", { price: "free" });
      // Non-numeric returns original value
      expect(result.text).toBe("free");
    });
  });

  describe("replace filter edge cases", () => {
    it("should handle empty search string", () => {
      const result = engine.substitute("{text|replace::bar}", { text: "foo" });
      // Empty search returns original value
      expect(result.text).toBe("foo");
    });

    it("should handle missing replacement string", () => {
      const result = engine.substitute("{text|replace:foo}", { text: "foo bar foo" });
      // Missing replacement defaults to empty string
      expect(result.text).toBe(" bar ");
    });
  });

  describe("percent filter edge cases", () => {
    it("should handle non-numeric value with percent filter", () => {
      const result = engine.substitute("{rate|percent}", { rate: "high" });
      // Non-numeric returns original value
      expect(result.text).toBe("high");
    });
  });
});

describe("VariableEngine - DoS Prevention", () => {
  const engine = new VariableEngine();

  it("should reject templates exceeding maximum length", () => {
    const longTemplate = "a".repeat(60000); // Exceeds 50KB limit
    const result = engine.substitute(longTemplate, {});

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining("exceeds maximum length"),
      })
    );
  });

  it("should reject templates with too many variables", () => {
    // Create template with 101 unique variables (exceeds limit of 100)
    const variables = Array.from({ length: 101 }, (_, i) => `{var_${i}}`);
    const template = variables.join(" ");
    const result = engine.substitute(template, {});

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining("exceeds maximum variable count"),
      })
    );
  });

  it("should accept templates within limits", () => {
    // Create template with exactly 100 variables (at the limit)
    const variables = Array.from({ length: 100 }, (_, i) => `{var_${i}}`);
    const template = variables.join(" ");
    const data = Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [`var_${i}`, `value_${i}`])
    );
    const result = engine.substitute(template, data);

    expect(result.success).toBe(true);
  });
});

describe("VariableEngine - Performance", () => {
  const engine = new VariableEngine();

  it("handles large templates efficiently", () => {
    const variables = Array.from({ length: 100 }, (_, i) => `{var_${i}}`);
    const template = variables.join(" ");
    const data = Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [`var_${i}`, `value_${i}`])
    );

    const start = performance.now();
    const result = engine.substitute(template, data);
    const duration = performance.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
  });

  it("handles templates with many filter chains", () => {
    const template = Array.from(
      { length: 50 },
      (_, i) => `{var_${i}|trim|uppercase|truncate:20}`
    ).join(" ");
    const data = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`var_${i}`, `  Value ${i}  `])
    );

    const start = performance.now();
    const result = engine.substitute(template, data);
    const duration = performance.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(100);
  });
});
