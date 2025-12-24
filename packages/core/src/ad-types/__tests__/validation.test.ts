import { describe, it, expect } from "vitest";
import {
  validateField,
  validateAdType,
  getCharacterCount,
  extractVariables,
} from "../validation.js";
import type { AdFieldDefinition } from "../types.js";

// Import index to trigger ad type registration
import "../index.js";

describe("validateField", () => {
  describe("required fields", () => {
    const requiredField: AdFieldDefinition = {
      id: "title",
      name: "Title",
      type: "text",
      required: true,
      supportsVariables: true,
    };

    it("returns error for undefined value", () => {
      const errors = validateField(requiredField, undefined);
      expect(errors).toContain("Title is required");
    });

    it("returns error for null value", () => {
      const errors = validateField(requiredField, null);
      expect(errors).toContain("Title is required");
    });

    it("returns error for empty string", () => {
      const errors = validateField(requiredField, "");
      expect(errors).toContain("Title is required");
    });

    it("passes for non-empty value", () => {
      const errors = validateField(requiredField, "Hello");
      expect(errors).toEqual([]);
    });
  });

  describe("optional fields", () => {
    const optionalField: AdFieldDefinition = {
      id: "description",
      name: "Description",
      type: "text",
      required: false,
      supportsVariables: true,
    };

    it("passes for undefined value", () => {
      const errors = validateField(optionalField, undefined);
      expect(errors).toEqual([]);
    });

    it("passes for empty string", () => {
      const errors = validateField(optionalField, "");
      expect(errors).toEqual([]);
    });
  });

  describe("text field validation", () => {
    const textField: AdFieldDefinition = {
      id: "headline",
      name: "Headline",
      type: "text",
      required: true,
      minLength: 5,
      maxLength: 30,
      supportsVariables: true,
    };

    it("validates length constraints", () => {
      const shortErrors = validateField(textField, "Hi");
      expect(shortErrors).toContain("Headline must be at least 5 characters");

      const longErrors = validateField(textField, "A".repeat(35));
      expect(longErrors).toContain("Headline must not exceed 30 characters");
    });

    it("passes for valid length", () => {
      const errors = validateField(textField, "Valid headline");
      expect(errors).toEqual([]);
    });

    it("skips length validation for variables", () => {
      const errors = validateField(textField, "{very_long_variable_name}");
      expect(errors).toEqual([]);
    });
  });

  describe("url field validation", () => {
    const urlField: AdFieldDefinition = {
      id: "finalUrl",
      name: "Final URL",
      type: "url",
      required: true,
      supportsVariables: true,
    };

    it("validates valid URLs", () => {
      const errors = validateField(urlField, "https://example.com");
      expect(errors).toEqual([]);
    });

    it("fails for invalid URLs", () => {
      const errors = validateField(urlField, "not a url");
      expect(errors).toContain("Final URL must be a valid URL");
    });

    it("skips validation for variable patterns", () => {
      const errors = validateField(urlField, "{landing_page_url}");
      expect(errors).toEqual([]);
    });
  });

  describe("number field validation", () => {
    const numberField: AdFieldDefinition = {
      id: "budget",
      name: "Budget",
      type: "number",
      required: true,
      minValue: 10,
      maxValue: 1000,
      supportsVariables: true,
    };

    it("validates number range", () => {
      const lowErrors = validateField(numberField, 5);
      expect(lowErrors).toContain("Budget must be at least 10");

      const highErrors = validateField(numberField, 2000);
      expect(highErrors).toContain("Budget must not exceed 1000");
    });

    it("passes for valid numbers", () => {
      const errors = validateField(numberField, 100);
      expect(errors).toEqual([]);
    });

    it("validates string numbers", () => {
      const errors = validateField(numberField, "100");
      expect(errors).toEqual([]);
    });

    it("fails for non-numeric strings", () => {
      const errors = validateField(numberField, "abc");
      expect(errors).toContain("Budget must be a number");
    });

    it("skips validation for variable patterns", () => {
      const errors = validateField(numberField, "{daily_budget}");
      expect(errors).toEqual([]);
    });
  });

  describe("array field validation", () => {
    const arrayField: AdFieldDefinition = {
      id: "headlines",
      name: "Headlines",
      type: "array",
      required: true,
      minCount: 3,
      maxCount: 10,
      maxLength: 30,
      supportsVariables: true,
    };

    it("validates array count", () => {
      const lowErrors = validateField(arrayField, ["one", "two"]);
      expect(lowErrors).toContain("Headlines requires at least 3 items");

      const highErrors = validateField(
        arrayField,
        Array.from({ length: 12 }, (_, i) => `item${i}`)
      );
      expect(highErrors).toContain("Headlines allows at most 10 items");
    });

    it("validates item lengths", () => {
      const errors = validateField(arrayField, [
        "Short",
        "Another",
        "This is a very long headline that exceeds the limit",
      ]);
      expect(errors.some((e) => e.includes("exceeds 30 characters"))).toBe(
        true
      );
    });

    it("passes for valid array", () => {
      const errors = validateField(arrayField, ["One", "Two", "Three"]);
      expect(errors).toEqual([]);
    });

    it("skips length validation for variable items", () => {
      const errors = validateField(arrayField, [
        "{headline1}",
        "{headline2}",
        "{headline3}",
      ]);
      expect(errors).toEqual([]);
    });
  });

  describe("select field validation", () => {
    const selectField: AdFieldDefinition = {
      id: "cta",
      name: "Call to Action",
      type: "select",
      required: true,
      options: [
        { value: "LEARN_MORE", label: "Learn More" },
        { value: "SHOP_NOW", label: "Shop Now" },
      ],
      supportsVariables: false,
    };

    it("validates option values", () => {
      const validErrors = validateField(selectField, "LEARN_MORE");
      expect(validErrors).toEqual([]);

      const invalidErrors = validateField(selectField, "INVALID_CTA");
      expect(invalidErrors).toContain("Call to Action has invalid value");
    });
  });

  describe("multiselect field validation", () => {
    const multiselectField: AdFieldDefinition = {
      id: "subreddits",
      name: "Subreddits",
      type: "multiselect",
      required: true,
      options: [
        { value: "tech", label: "Technology" },
        { value: "gaming", label: "Gaming" },
        { value: "movies", label: "Movies" },
      ],
      supportsVariables: false,
    };

    it("validates all selected values", () => {
      const validErrors = validateField(multiselectField, ["tech", "gaming"]);
      expect(validErrors).toEqual([]);

      const invalidErrors = validateField(multiselectField, [
        "tech",
        "invalid",
      ]);
      expect(invalidErrors).toContain(
        "Subreddits contains invalid value: invalid"
      );
    });
  });
});

describe("validateAdType", () => {
  it("validates against registered ad type", () => {
    const result = validateAdType("google", "responsive-search", {
      headlines: ["H1", "H2", "H3"],
      descriptions: ["D1", "D2"],
      finalUrl: "https://example.com",
    });
    expect(result.valid).toBe(true);
  });

  it("returns error for unknown ad type", () => {
    const result = validateAdType("google", "unknown-type", {});
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("not found");
  });

  it("validates field requirements", () => {
    const result = validateAdType("google", "responsive-search", {
      headlines: ["H1"], // Only 1 headline, needs 3
      descriptions: ["D1", "D2"],
      finalUrl: "https://example.com",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("At least 3 headlines required");
  });
});

describe("getCharacterCount", () => {
  it("returns length of plain text", () => {
    const count = getCharacterCount("Hello World", {});
    expect(count).toBe(11);
  });

  it("substitutes variables and counts", () => {
    const count = getCharacterCount("Buy {product} now!", {
      product: "Nike Air",
    });
    expect(count).toBe("Buy Nike Air now!".length);
  });

  it("handles missing variables as empty string", () => {
    const count = getCharacterCount("Get {product}!", {});
    expect(count).toBe("Get !".length);
  });

  it("handles complex variable patterns", () => {
    const count = getCharacterCount("{name} - ${price}", {
      name: "Product",
      price: "99.99",
    });
    expect(count).toBe("Product - $99.99".length);
  });
});

describe("extractVariables", () => {
  it("extracts simple variables", () => {
    const vars = extractVariables("Buy {product} for ${price}");
    expect(vars).toContain("product");
    expect(vars).toContain("price");
  });

  it("returns empty array for no variables", () => {
    const vars = extractVariables("Static text only");
    expect(vars).toEqual([]);
  });

  it("handles fallback variables", () => {
    const vars = extractVariables("{sale_price|regular_price}");
    expect(vars).toContain("sale_price");
    expect(vars).toContain("regular_price");
  });

  it("removes duplicates", () => {
    const vars = extractVariables("{name} and {name} again");
    expect(vars).toEqual(["name"]);
  });

  it("handles filter syntax", () => {
    const vars = extractVariables("{name|uppercase}");
    expect(vars).toContain("name");
    expect(vars).toContain("uppercase");
  });
});
