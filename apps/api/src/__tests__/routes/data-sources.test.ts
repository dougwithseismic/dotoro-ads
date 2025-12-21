import { describe, it, expect, beforeEach } from "vitest";
import { testClient } from "hono/testing";
import { dataSourcesApp, seedMockData } from "../../routes/data-sources.js";

describe("Data Sources API", () => {
  // Reset mock data before each test
  beforeEach(() => {
    seedMockData();
  });

  // Test data
  const mockDataSource = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    userId: null,
    name: "Test CSV Source",
    type: "csv" as const,
    config: { delimiter: "," },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };

  describe("GET /api/v1/data-sources", () => {
    it("should return a paginated list of data sources", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"].$get({
        query: { page: "1", limit: "10" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("total");
      expect(json).toHaveProperty("page");
      expect(json).toHaveProperty("limit");
      expect(json).toHaveProperty("totalPages");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should use default pagination when not provided", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"].$get({});

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.page).toBe(1);
      expect(json.limit).toBe(20);
    });
  });

  describe("POST /api/v1/data-sources", () => {
    it("should create a new data source with valid input", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "New Data Source",
          type: "csv",
          config: { delimiter: ";" },
        },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toHaveProperty("id");
      expect(json.name).toBe("New Data Source");
      expect(json.type).toBe("csv");
    });

    it("should return 400 for invalid input - missing name", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "",
          type: "csv",
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      // @hono/zod-openapi returns { success: false, error: { ... } } format
      expect(json.success).toBe(false);
      expect(json).toHaveProperty("error");
    });

    it("should return 400 for invalid type", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "Test",
          type: "invalid_type" as unknown as "csv",
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/data-sources/:id", () => {
    it("should return a data source by id", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$get({
        param: { id: mockDataSource.id },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("id");
      expect(json).toHaveProperty("name");
      expect(json).toHaveProperty("type");
    });

    it("should return 404 for non-existent id", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$get({
        param: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toHaveProperty("error");
      expect(json.code).toBe("NOT_FOUND");
    });

    it("should return 400 for invalid UUID", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$get({
        param: { id: "not-a-uuid" },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/v1/data-sources/:id", () => {
    it("should update an existing data source", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$put({
        param: { id: mockDataSource.id },
        json: { name: "Updated Name" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("Updated Name");
    });

    it("should handle empty update body gracefully", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$put({
        param: { id: mockDataSource.id },
        json: {},
      });

      // Empty body should succeed but only update the timestamp
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe(mockDataSource.name);
    });

    it("should return 404 when updating non-existent data source", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$put({
        param: { id: "00000000-0000-0000-0000-000000000000" },
        json: { name: "Updated Name" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/data-sources/:id", () => {
    it("should delete an existing data source and return 204", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$delete({
        param: { id: mockDataSource.id },
      });

      expect(res.status).toBe(204);
    });

    it("should return 404 when deleting non-existent data source", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$delete({
        param: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/v1/data-sources/:id/rows", () => {
    it("should return paginated data rows for a data source", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"]["rows"].$get({
        param: { id: mockDataSource.id },
        query: { page: "1", limit: "20" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("total");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should return 404 for non-existent data source", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"]["rows"].$get({
        param: { id: "00000000-0000-0000-0000-000000000000" },
        query: {},
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/data-sources/:id/preview", () => {
    it("should return a preview of data rows", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"]["preview"].$post({
        param: { id: mockDataSource.id },
        json: { limit: 5 },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("data");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should return 404 for non-existent data source", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"]["preview"].$post({
        param: { id: "00000000-0000-0000-0000-000000000000" },
        json: { limit: 5 },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/data-sources/:id/upload", () => {
    it("should accept a file upload (placeholder)", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"]["upload"].$post({
        param: { id: mockDataSource.id },
      });

      // For now, just check it returns a response
      expect([200, 201, 501]).toContain(res.status);
    });
  });
});
