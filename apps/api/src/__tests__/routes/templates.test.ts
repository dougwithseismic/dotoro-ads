import { describe, it, expect, beforeEach } from "vitest";
import { testClient } from "hono/testing";
import { templatesApp, seedMockTemplates } from "../../routes/templates.js";

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
  // Reset mock data before each test
  beforeEach(() => {
    seedMockTemplates();
  });

  const mockTemplateId = "660e8400-e29b-41d4-a716-446655440000";

  describe("GET /api/v1/templates", () => {
    it("should return a paginated list of templates", async () => {
      const client = testClient(templatesApp);
      const res = await client["api"]["v1"]["templates"].$get({
        query: { page: "1", limit: "10" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("total");
      expect(json).toHaveProperty("page");
      expect(json).toHaveProperty("limit");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should filter templates by platform", async () => {
      const client = testClient(templatesApp);
      const res = await client["api"]["v1"]["templates"].$get({
        query: { platform: "reddit" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
    });
  });

  describe("POST /api/v1/templates", () => {
    it("should create a new template", async () => {
      const client = testClient(templatesApp);
      const res = await client["api"]["v1"]["templates"].$post({
        json: {
          name: "New Campaign Template",
          platform: "reddit",
          structure: {
            objective: "CONVERSIONS",
            budget: {
              type: "daily",
              amount: 50,
              currency: "USD",
            },
          },
        },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toHaveProperty("id");
      expect(json.name).toBe("New Campaign Template");
      expect(json.platform).toBe("reddit");
    });

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

  describe("GET /api/v1/templates/:id", () => {
    it("should return a template by id", async () => {
      const client = testClient(templatesApp);
      const res = await client["api"]["v1"]["templates"][":id"].$get({
        param: { id: mockTemplateId },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(mockTemplateId);
      expect(json).toHaveProperty("name");
      expect(json).toHaveProperty("platform");
    });

    it("should return 404 for non-existent template", async () => {
      const client = testClient(templatesApp);
      const res = await client["api"]["v1"]["templates"][":id"].$get({
        param: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.code).toBe("NOT_FOUND");
    });
  });

  describe("PUT /api/v1/templates/:id", () => {
    it("should update an existing template", async () => {
      const client = testClient(templatesApp);
      const res = await client["api"]["v1"]["templates"][":id"].$put({
        param: { id: mockTemplateId },
        json: { name: "Updated Template Name" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("Updated Template Name");
    });

    it("should handle empty update body gracefully", async () => {
      const client = testClient(templatesApp);
      const res = await client["api"]["v1"]["templates"][":id"].$put({
        param: { id: mockTemplateId },
        json: {},
      });

      // Empty body should succeed but only update the timestamp
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("Reddit Product Ads");
    });

    it("should return 404 when updating non-existent template", async () => {
      const client = testClient(templatesApp);
      const res = await client["api"]["v1"]["templates"][":id"].$put({
        param: { id: "00000000-0000-0000-0000-000000000000" },
        json: { name: "Test" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/templates/:id", () => {
    it("should delete an existing template and return 204", async () => {
      const client = testClient(templatesApp);
      const res = await client["api"]["v1"]["templates"][":id"].$delete({
        param: { id: mockTemplateId },
      });

      expect(res.status).toBe(204);
    });

    it("should return 404 when deleting non-existent template", async () => {
      const client = testClient(templatesApp);
      const res = await client["api"]["v1"]["templates"][":id"].$delete({
        param: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/templates/:id/preview", () => {
    it("should return a preview of generated ads", async () => {
      const client = testClient(templatesApp);
      const res = await client["api"]["v1"]["templates"][":id"]["preview"].$post({
        param: { id: mockTemplateId },
        json: {
          dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
          limit: 5,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("templateId");
      expect(json).toHaveProperty("dataSourceId");
      expect(json).toHaveProperty("previewAds");
      expect(Array.isArray(json.previewAds)).toBe(true);
    });

    it("should return 404 for non-existent template", async () => {
      const client = testClient(templatesApp);
      const res = await client["api"]["v1"]["templates"][":id"]["preview"].$post({
        param: { id: "00000000-0000-0000-0000-000000000000" },
        json: {
          dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
          limit: 5,
        },
      });

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // Variable Engine Endpoint Tests
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
});
