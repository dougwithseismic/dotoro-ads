import { describe, it, expect, beforeEach } from "vitest";
import { TemplateService } from "../../services/template-service.js";

describe("TemplateService", () => {
  let service: TemplateService;

  beforeEach(() => {
    service = new TemplateService();
  });

  describe("extractVariables", () => {
    it("should extract variables from all template fields", () => {
      const variables = service.extractVariables({
        headline: "{product_name}",
        description: "{description} - {brand}",
        displayUrl: "{site_url}",
        finalUrl: "{landing_page}",
        callToAction: "Shop Now",
      });

      expect(variables).toContain("product_name");
      expect(variables).toContain("description");
      expect(variables).toContain("brand");
      expect(variables).toContain("site_url");
      expect(variables).toContain("landing_page");
      expect(variables).toHaveLength(5);
    });

    it("should return unique variables only", () => {
      const variables = service.extractVariables({
        headline: "{name} - {name}",
        description: "Get {name} now!",
      });

      expect(variables).toEqual(["name"]);
    });

    it("should handle templates without variables", () => {
      const variables = service.extractVariables({
        headline: "Static headline",
        description: "Static description",
      });

      expect(variables).toEqual([]);
    });

    it("should extract variables with filters", () => {
      const variables = service.extractVariables({
        headline: "{product|uppercase|truncate:50}",
        description: "{price|currency:USD}",
      });

      expect(variables).toContain("product");
      expect(variables).toContain("price");
    });

    it("should extract fallback variables", () => {
      const variables = service.extractVariables({
        headline: "{sale_price|regular_price}",
      });

      expect(variables).toContain("sale_price");
      expect(variables).toContain("regular_price");
    });

    it("should handle undefined optional fields", () => {
      const variables = service.extractVariables({
        headline: "{name}",
        // description, displayUrl, finalUrl, callToAction are undefined
      });

      expect(variables).toEqual(["name"]);
    });
  });

  describe("validateTemplate", () => {
    it("should validate a valid Reddit template", () => {
      const result = service.validateTemplate(
        {
          headline: "Buy {product}!",
          description: "Great deal",
        },
        "reddit",
        { product: "Shoes" }
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return errors for headline exceeding limit after substitution", () => {
      const longProduct = "A".repeat(100);
      const result = service.validateTemplate(
        {
          headline: "Buy {product} now!",
        },
        "reddit",
        { product: longProduct }
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "MAX_LENGTH")).toBe(true);
    });

    it("should use placeholder values when no sample data provided", () => {
      const result = service.validateTemplate(
        {
          headline: "{product_name}",
          description: "Great product",
        },
        "reddit"
      );

      expect(result.valid).toBe(true);
      expect(result.extractedVariables).toContain("product_name");
    });

    it("should warn for unsupported platforms", () => {
      const result = service.validateTemplate(
        {
          headline: "Test",
        },
        "facebook"
      );

      expect(result.warnings.some((w) => w.field === "_platform")).toBe(true);
    });

    it("should include extracted variables in result", () => {
      const result = service.validateTemplate(
        {
          headline: "{product} for {price}",
        },
        "reddit"
      );

      expect(result.extractedVariables).toContain("product");
      expect(result.extractedVariables).toContain("price");
    });
  });

  describe("generateAd", () => {
    it("should substitute variables in all fields", () => {
      const ad = service.generateAd(
        {
          headline: "Buy {product}!",
          description: "Only {price}",
          displayUrl: "{site}",
          finalUrl: "https://{domain}/{slug}",
        },
        {
          product: "Nike Air",
          price: "$99",
          site: "example.com",
          domain: "example.com",
          slug: "nike-air",
        },
        "reddit"
      );

      expect(ad.headline).toBe("Buy Nike Air!");
      expect(ad.description).toBe("Only $99");
      expect(ad.displayUrl).toBe("example.com");
      expect(ad.finalUrl).toBe("https://example.com/nike-air");
    });

    it("should include source row data", () => {
      const rowData = { product: "Test", price: "50" };
      const ad = service.generateAd(
        { headline: "{product}" },
        rowData,
        "reddit"
      );

      expect(ad.sourceRow).toEqual(rowData);
    });

    it("should collect warnings for missing variables", () => {
      const ad = service.generateAd(
        { headline: "{product} - {missing_var}" },
        { product: "Test" },
        "reddit"
      );

      expect(ad.headline).toBe("Test - ");
      expect(ad.warnings.length).toBeGreaterThan(0);
      expect(ad.warnings.some((w) => w.includes("missing_var"))).toBe(true);
    });

    it("should handle undefined optional fields", () => {
      const ad = service.generateAd(
        { headline: "{name}" },
        { name: "Test" },
        "reddit"
      );

      expect(ad.headline).toBe("Test");
      expect(ad.description).toBeNull();
      expect(ad.displayUrl).toBeNull();
      expect(ad.finalUrl).toBeNull();
    });

    it("should apply filters correctly", () => {
      const ad = service.generateAd(
        { headline: "{name|uppercase}" },
        { name: "hello world" },
        "reddit"
      );

      expect(ad.headline).toBe("HELLO WORLD");
    });

    it("should preserve callToAction without substitution", () => {
      const ad = service.generateAd(
        {
          headline: "{name}",
          callToAction: "Shop Now",
        },
        { name: "Test" },
        "reddit"
      );

      expect(ad.callToAction).toBe("Shop Now");
    });
  });

  describe("previewAds", () => {
    it("should generate multiple preview ads from data rows", () => {
      const result = service.previewAds(
        { headline: "{name}", description: "{desc}" },
        [
          { name: "Product A", desc: "Desc A" },
          { name: "Product B", desc: "Desc B" },
          { name: "Product C", desc: "Desc C" },
        ],
        "reddit"
      );

      expect(result.previewAds).toHaveLength(3);
      expect(result.previewAds[0].headline).toBe("Product A");
      expect(result.previewAds[1].headline).toBe("Product B");
      expect(result.previewAds[2].headline).toBe("Product C");
    });

    it("should respect the limit parameter", () => {
      const result = service.previewAds(
        { headline: "{name}" },
        [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
        "reddit",
        2
      );

      expect(result.previewAds).toHaveLength(2);
    });

    it("should include validation errors for invalid ads", () => {
      const longName = "A".repeat(110); // Exceeds Reddit headline limit
      const result = service.previewAds(
        { headline: "{name}" },
        [{ name: longName }],
        "reddit"
      );

      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].rowIndex).toBe(0);
      expect(result.validationErrors[0].errors.length).toBeGreaterThan(0);
    });

    it("should handle empty data rows", () => {
      const result = service.previewAds({ headline: "{name}" }, [], "reddit");

      expect(result.previewAds).toHaveLength(0);
      expect(result.validationErrors).toHaveLength(0);
    });

    it("should use default limit of 5", () => {
      const result = service.previewAds(
        { headline: "{n}" },
        Array.from({ length: 10 }, (_, i) => ({ n: `${i}` })),
        "reddit"
      );

      expect(result.previewAds).toHaveLength(5);
    });

    it("should not validate for non-reddit platforms", () => {
      const longName = "A".repeat(200);
      const result = service.previewAds(
        { headline: "{name}" },
        [{ name: longName }],
        "google"
      );

      // No validation errors because Google validation is not implemented
      expect(result.validationErrors).toHaveLength(0);
    });
  });

  describe("getCharacterEstimates", () => {
    it("should calculate character counts after substitution", () => {
      const estimates = service.getCharacterEstimates(
        {
          headline: "{name}",
          description: "{desc}",
          displayUrl: "{url}",
        },
        { name: "Test Product", desc: "A great product", url: "example.com" }
      );

      expect(estimates.headline).toBe(12); // "Test Product".length
      expect(estimates.description).toBe(15); // "A great product".length
      expect(estimates.displayUrl).toBe(11); // "example.com".length
    });

    it("should return 0 for undefined fields", () => {
      const estimates = service.getCharacterEstimates(
        { headline: "{name}" },
        { name: "Test" }
      );

      expect(estimates.description).toBe(0);
      expect(estimates.displayUrl).toBe(0);
    });
  });

  describe("previewFieldSubstitution", () => {
    it("should return preview result with substitution details", () => {
      const result = service.previewFieldSubstitution(
        "Get {product|uppercase} for {price|currency}!",
        { product: "shoes", price: "99.99" }
      );

      expect(result.text).toBe("Get SHOES for $99.99!");
      expect(result.success).toBe(true);
      expect(result.substitutions.length).toBe(2);
    });

    it("should include warnings for missing variables", () => {
      const result = service.previewFieldSubstitution("{missing}", {});

      expect(result.text).toBe("");
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("getPlatformLimits", () => {
    it("should return Reddit limits", () => {
      const limits = service.getPlatformLimits("reddit");

      expect(limits.headline.maxLength).toBe(100);
      expect(limits.headline.required).toBe(true);
      expect(limits.description.maxLength).toBe(500);
      expect(limits.description.required).toBe(false);
    });

    it("should return default limits for other platforms", () => {
      const limits = service.getPlatformLimits("google");

      expect(limits.headline.maxLength).toBe(100);
      expect(limits.headline.required).toBe(true);
    });
  });
});

describe("TemplateService - Error Handling", () => {
  let service: TemplateService;

  beforeEach(() => {
    service = new TemplateService();
  });

  it("should handle filter errors gracefully in generateAd", () => {
    // The currency filter should handle invalid values gracefully
    const ad = service.generateAd(
      { headline: "{price|currency}" },
      { price: "not-a-number" },
      "reddit"
    );

    // Should return the original value when filter fails
    expect(ad.headline).toBe("not-a-number");
  });

  it("should aggregate warnings from multiple fields", () => {
    const ad = service.generateAd(
      {
        headline: "{missing1}",
        description: "{missing2}",
      },
      {},
      "reddit"
    );

    // Should have warnings for both missing variables
    expect(ad.warnings.length).toBeGreaterThanOrEqual(2);
  });
});
