import { describe, it, expect } from "vitest";
import {
  RedditValidator,
  type RedditAdTemplate,
  type RedditValidationResult,
} from "../validators/reddit-validator.js";

describe("RedditValidator", () => {
  const validator = new RedditValidator();

  describe("validateHeadline", () => {
    it("validates valid headline", () => {
      const result = validator.validate({
        headline: "Get Nike Air Now!",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("fails when headline is empty", () => {
      const result = validator.validate({
        headline: "",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "headline",
          code: "REQUIRED",
        })
      );
    });

    it("fails when headline exceeds 100 characters", () => {
      const longHeadline = "A".repeat(101);
      const result = validator.validate({
        headline: longHeadline,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "headline",
          code: "MAX_LENGTH",
          message: expect.stringContaining("100"),
        })
      );
    });

    it("passes when headline is exactly 100 characters", () => {
      const result = validator.validate({
        headline: "A".repeat(100),
      });

      expect(result.valid).toBe(true);
    });
  });

  describe("validateDescription", () => {
    it("validates valid description", () => {
      const result = validator.validate({
        headline: "Test",
        description: "This is a great product that you should buy!",
      });

      expect(result.valid).toBe(true);
    });

    it("description is optional", () => {
      const result = validator.validate({
        headline: "Test",
      });

      expect(result.valid).toBe(true);
    });

    it("fails when description exceeds 500 characters", () => {
      const longDescription = "A".repeat(501);
      const result = validator.validate({
        headline: "Test",
        description: longDescription,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "description",
          code: "MAX_LENGTH",
          message: expect.stringContaining("500"),
        })
      );
    });

    it("passes when description is exactly 500 characters", () => {
      const result = validator.validate({
        headline: "Test",
        description: "A".repeat(500),
      });

      expect(result.valid).toBe(true);
    });
  });

  describe("validateWithVariables", () => {
    it("validates template with variables using sample data", () => {
      const template = {
        headline: "Get {product_name} for ${price}!",
        description: "{product_description}",
      };

      const sampleData = {
        product_name: "Nike Air",
        price: "99.99",
        product_description: "The best running shoes for your workout!",
      };

      const result = validator.validateWithVariables(template, sampleData);

      expect(result.valid).toBe(true);
    });

    it("fails when substituted headline exceeds limit", () => {
      const template = {
        headline: "{product_name}",
      };

      const sampleData = {
        product_name: "A".repeat(150), // 150 chars > 100 limit
      };

      const result = validator.validateWithVariables(template, sampleData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "headline",
          code: "MAX_LENGTH",
        })
      );
    });

    it("fails when substituted description exceeds limit", () => {
      const template = {
        headline: "Test",
        description: "{long_text}",
      };

      const sampleData = {
        long_text: "A".repeat(600), // 600 chars > 500 limit
      };

      const result = validator.validateWithVariables(template, sampleData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "description",
          code: "MAX_LENGTH",
        })
      );
    });

    it("warns about missing variables", () => {
      const template = {
        headline: "Get {product_name} now!",
      };

      const sampleData = {}; // Missing product_name

      const result = validator.validateWithVariables(template, sampleData);

      // Should still be valid (empty string substitution) but with warning
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: "headline",
          message: expect.stringContaining("product_name"),
        })
      );
    });

    it("applies filters before validation", () => {
      const template = {
        headline: "{product_name|uppercase|truncate:50}",
      };

      const sampleData = {
        product_name: "This is a very long product name that would be too long otherwise",
      };

      const result = validator.validateWithVariables(template, sampleData);

      // After truncation, should be valid
      expect(result.valid).toBe(true);
    });
  });

  describe("validateDisplayUrl", () => {
    it("validates valid display URL", () => {
      const result = validator.validate({
        headline: "Test",
        displayUrl: "example.com/products",
      });

      expect(result.valid).toBe(true);
    });

    it("fails when display URL exceeds 25 characters", () => {
      const result = validator.validate({
        headline: "Test",
        displayUrl: "thisisaverylongdomainname.com/products/category",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "displayUrl",
          code: "MAX_LENGTH",
          message: expect.stringContaining("25"),
        })
      );
    });

    it("displayUrl is optional", () => {
      const result = validator.validate({
        headline: "Test",
      });

      expect(result.valid).toBe(true);
    });
  });

  describe("validateCallToAction", () => {
    it("validates valid CTA", () => {
      const result = validator.validate({
        headline: "Test",
        callToAction: "Shop Now",
      });

      expect(result.valid).toBe(true);
    });

    it("fails when CTA is not in allowed list", () => {
      const result = validator.validate({
        headline: "Test",
        callToAction: "Click Me Please",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "callToAction",
          code: "INVALID_VALUE",
        })
      );
    });

    it("accepts all standard Reddit CTAs", () => {
      const validCTAs = [
        "Shop Now",
        "Learn More",
        "Sign Up",
        "Download",
        "Install",
        "Get Quote",
        "Contact Us",
        "Book Now",
        "Apply Now",
        "Watch More",
      ];

      for (const cta of validCTAs) {
        const result = validator.validate({
          headline: "Test",
          callToAction: cta,
        });
        expect(result.valid).toBe(true);
      }
    });
  });

  describe("validateFinalUrl", () => {
    it("validates valid HTTPS URL", () => {
      const result = validator.validate({
        headline: "Test",
        finalUrl: "https://example.com/products",
      });

      expect(result.valid).toBe(true);
    });

    it("fails when URL is not HTTPS", () => {
      const result = validator.validate({
        headline: "Test",
        finalUrl: "http://example.com/products",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "finalUrl",
          code: "INVALID_FORMAT",
          message: expect.stringContaining("HTTPS"),
        })
      );
    });

    it("fails when URL is malformed", () => {
      const result = validator.validate({
        headline: "Test",
        finalUrl: "not a valid url",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "finalUrl",
          code: "INVALID_FORMAT",
        })
      );
    });
  });

  describe("multiple errors", () => {
    it("collects all validation errors", () => {
      const result = validator.validate({
        headline: "", // Required
        description: "A".repeat(600), // Too long
        callToAction: "Invalid CTA", // Not allowed
        finalUrl: "http://insecure.com", // Not HTTPS
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });

    it("returns all errors with proper field paths", () => {
      const result = validator.validate({
        headline: "",
        description: "A".repeat(600),
      });

      const fields = result.errors.map((e) => e.field);
      expect(fields).toContain("headline");
      expect(fields).toContain("description");
    });
  });

  describe("extractRequiredVariables", () => {
    it("extracts variables from template", () => {
      const template = {
        headline: "Get {product_name} now!",
        description: "Only ${price} for {category}",
      };

      const variables = validator.extractRequiredVariables(template);

      expect(variables).toContain("product_name");
      expect(variables).toContain("price");
      expect(variables).toContain("category");
    });

    it("handles templates without variables", () => {
      const template = {
        headline: "Static headline",
        description: "Static description",
      };

      const variables = validator.extractRequiredVariables(template);

      expect(variables).toEqual([]);
    });

    it("handles fallback variables", () => {
      const template = {
        headline: "{sale_price|regular_price}",
      };

      const variables = validator.extractRequiredVariables(template);

      expect(variables).toContain("sale_price");
      expect(variables).toContain("regular_price");
    });
  });

  describe("getCharacterCount", () => {
    it("returns character count for substituted template", () => {
      const template = "Get {product_name} for ${price}!";
      const sampleData = {
        product_name: "Nike Air",
        price: "99.99",
      };

      const count = validator.getCharacterCount(template, sampleData);

      expect(count).toBe("Get Nike Air for $99.99!".length);
    });

    it("handles missing variables as empty strings", () => {
      const template = "Get {product_name}!";
      const count = validator.getCharacterCount(template, {});

      expect(count).toBe("Get !".length);
    });
  });
});
