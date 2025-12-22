import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";

const mockTemplateId = "660e8400-e29b-41d4-a716-446655440000";
const mockDataSourceId = "550e8400-e29b-41d4-a716-446655440000";

// Mock the database module - routes are tightly coupled to db
vi.mock("../../services/db.js", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    campaignTemplates: { id: "id", platform: "platform", createdAt: "created_at" },
    dataRows: { id: "id", dataSourceId: "data_source_id", rowIndex: "row_index" },
  };
});

// Mock data-ingestion service
vi.mock("../../services/data-ingestion.js", () => ({
  hasStoredData: vi.fn().mockReturnValue(true),
  getStoredRows: vi.fn().mockReturnValue({
    rows: [
      { product_name: "Product A", description: "Desc A" },
      { product_name: "Product B", description: "Desc B" },
    ],
    total: 2,
  }),
}));

// Import after mocking
import { templatesApp } from "../../routes/templates.js";

// Helper to make direct requests to the app
async function makeRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const request = new Request(`http://localhost${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return templatesApp.fetch(request);
}

describe("Templates API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Note: Tests that require database interaction are skipped.
  // These should be implemented as integration tests with a test database.

  describe("POST /api/v1/templates - validation", () => {
    it("should return 400 for invalid platform", async () => {
      const client = testClient(templatesApp);
      const res = await client["api"]["v1"]["templates"].$post({
        json: {
          name: "Test",
          platform: "invalid" as unknown as "reddit",
        },
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // Variable Engine Endpoint Tests (no database dependency)
  // ============================================================================

  describe("POST /api/v1/templates/variables/extract", () => {
    it("should extract variables from template fields", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/variables/extract", {
        template: {
          headline: "Get {product_name} for ${price|currency}!",
          description: "{description}",
        },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.variables).toContain("product_name");
      expect(data.variables).toContain("price");
      expect(data.variables).toContain("description");
    });

    it("should return empty array for templates without variables", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/variables/extract", {
        template: { headline: "Static headline" },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.variables).toEqual([]);
    });

    it("should extract variables with filters correctly", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/variables/extract", {
        template: {
          headline: "{title|uppercase|truncate:50}",
        },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.variables).toContain("title");
    });

    it("should handle template with fallback syntax", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/variables/extract", {
        template: {
          headline: "{sale_price|regular_price}",
        },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      // Both sale_price and regular_price should be extracted
      expect(data.variables).toContain("sale_price");
      expect(data.variables).toContain("regular_price");
    });
  });

  describe("POST /api/v1/templates/validate", () => {
    it("should validate reddit template successfully", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/validate", {
        template: {
          headline: "Buy {product}!",
          description: "Great deal on {product}",
        },
        platform: "reddit",
        sampleData: { product: "Shoes" },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(true);
    });

    it("should return errors for headline exceeding 100 chars after substitution", async () => {
      const longProduct = "A".repeat(100);
      const response = await makeRequest("POST", "/api/v1/templates/validate", {
        template: { headline: "Buy {product} now!" },
        platform: "reddit",
        sampleData: { product: longProduct },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.errors.some((e: { code: string }) => e.code === "MAX_LENGTH")).toBe(true);
    });

    it("should validate template without sample data using placeholder values", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/validate", {
        template: {
          headline: "{product_name}",
          description: "Get it today!",
        },
        platform: "reddit",
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(true);
      expect(data.extractedVariables).toContain("product_name");
    });

    it("should warn for unsupported platforms", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/validate", {
        template: {
          headline: "Test headline",
        },
        platform: "facebook",
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.warnings.some((w: { field: string }) => w.field === "_platform")).toBe(true);
    });
  });

  describe("POST /api/v1/templates/variables/substitute", () => {
    it("should substitute variables with provided data", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/variables/substitute", {
        template: "Get {product_name} for {price|currency}!",
        data: { product_name: "Nike Air", price: "99.99" },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.text).toBe("Get Nike Air for $99.99!");
      expect(data.success).toBe(true);
    });

    it("should return warnings for missing variables", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/variables/substitute", {
        template: "Get {product_name} today!",
        data: {},
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.text).toBe("Get  today!");
      expect(data.warnings.length).toBeGreaterThan(0);
    });

    it("should include substitution details", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/variables/substitute", {
        template: "{name|uppercase}",
        data: { name: "hello" },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.text).toBe("HELLO");
      expect(data.substitutions).toContainEqual(
        expect.objectContaining({
          variable: "name",
          originalValue: "hello",
          transformedValue: "HELLO",
          filters: ["uppercase"],
        })
      );
    });

    it("should handle escaped braces correctly", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/variables/substitute", {
        template: "Use {{variable}} syntax for {name}",
        data: { name: "templates" },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.text).toBe("Use {variable} syntax for templates");
    });
  });

  describe("POST /api/v1/templates/preview", () => {
    it("should generate preview ads from template and data rows", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/preview", {
        template: {
          headline: "{product_name}",
          description: "Only {price}!",
        },
        dataRows: [
          { product_name: "Product A", price: "$99" },
          { product_name: "Product B", price: "$149" },
        ],
        platform: "reddit",
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.previewAds).toHaveLength(2);
      expect(data.previewAds[0].headline).toBe("Product A");
      expect(data.previewAds[1].headline).toBe("Product B");
    });

    it("should respect the limit parameter", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/preview", {
        template: {
          headline: "{name}",
        },
        dataRows: [
          { name: "A" },
          { name: "B" },
          { name: "C" },
          { name: "D" },
          { name: "E" },
        ],
        platform: "reddit",
        limit: 2,
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.previewAds).toHaveLength(2);
    });

    it("should include validation errors for invalid generated ads", async () => {
      const longName = "A".repeat(110); // Exceeds Reddit headline limit
      const response = await makeRequest("POST", "/api/v1/templates/preview", {
        template: {
          headline: "{name}",
        },
        dataRows: [{ name: longName }],
        platform: "reddit",
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.validationErrors).toHaveLength(1);
      expect(data.validationErrors[0].rowIndex).toBe(0);
    });

    it("should handle empty data rows", async () => {
      const response = await makeRequest("POST", "/api/v1/templates/preview", {
        template: {
          headline: "{name}",
        },
        dataRows: [],
        platform: "reddit",
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.previewAds).toHaveLength(0);
    });
  });

  // Database-dependent tests are skipped - these require integration testing
  describe.skip("GET /api/v1/templates (requires database)", () => {
    it("should return a paginated list of templates", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/templates (requires database)", () => {
    it("should create a new template", async () => {
      // Integration test required
    });
  });

  describe.skip("GET /api/v1/templates/:id (requires database)", () => {
    it("should return a template by id", async () => {
      // Integration test required
    });
  });

  describe.skip("PUT /api/v1/templates/:id (requires database)", () => {
    it("should update an existing template", async () => {
      // Integration test required
    });
  });

  describe.skip("DELETE /api/v1/templates/:id (requires database)", () => {
    it("should delete an existing template", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/templates/:id/preview (requires database)", () => {
    it("should return a preview of generated ads", async () => {
      // Integration test required
    });
  });
});
