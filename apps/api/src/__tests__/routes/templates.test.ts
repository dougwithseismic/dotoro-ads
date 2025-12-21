import { describe, it, expect, beforeEach } from "vitest";
import { testClient } from "hono/testing";
import { templatesApp, seedMockTemplates } from "../../routes/templates.js";

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
});
