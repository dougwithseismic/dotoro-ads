import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";

const mockTransformId = "880e8400-e29b-41d4-a716-446655440000";
const mockDataSourceId = "550e8400-e29b-41d4-a716-446655440000";
const mockOutputDataSourceId = "660e8400-e29b-41d4-a716-446655440000";

// Mock the database module - routes are tightly coupled to db
vi.mock("../../services/db.js", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn(),
    },
    transforms: {
      id: "id",
      name: "name",
      enabled: "enabled",
    },
    dataSources: {
      id: "id",
      name: "name",
      type: "type",
    },
    dataRows: {
      id: "id",
      dataSourceId: "data_source_id",
      rowIndex: "row_index",
    },
    columnMappings: {
      id: "id",
      dataSourceId: "data_source_id",
    },
  };
});

// Import after mocking
import { transformsApp } from "../../routes/transforms.js";

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
  return transformsApp.fetch(request);
}

describe("Transform Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // POST /api/v1/transforms - Create Transform
  // ============================================================================

  describe("POST /api/v1/transforms - validation", () => {
    it("should return 400 for missing required fields", async () => {
      const client = testClient(transformsApp);
      const res = await client["api"]["v1"]["transforms"].$post({
        json: {
          // Missing name
          sourceDataSourceId: mockDataSourceId,
          config: {
            groupBy: "brand",
            aggregations: [{ outputField: "count", function: "COUNT" }],
            includeGroupKey: true,
          },
        } as never,
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid UUID in sourceDataSourceId", async () => {
      const client = testClient(transformsApp);
      const res = await client["api"]["v1"]["transforms"].$post({
        json: {
          name: "Test Transform",
          sourceDataSourceId: "not-a-valid-uuid",
          config: {
            groupBy: "brand",
            aggregations: [{ outputField: "count", function: "COUNT" }],
            includeGroupKey: true,
          },
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for empty aggregations", async () => {
      const client = testClient(transformsApp);
      const res = await client["api"]["v1"]["transforms"].$post({
        json: {
          name: "Test Transform",
          sourceDataSourceId: mockDataSourceId,
          config: {
            groupBy: "brand",
            aggregations: [],
            includeGroupKey: true,
          },
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing groupBy", async () => {
      const client = testClient(transformsApp);
      const res = await client["api"]["v1"]["transforms"].$post({
        json: {
          name: "Test Transform",
          sourceDataSourceId: mockDataSourceId,
          config: {
            aggregations: [{ outputField: "count", function: "COUNT" }],
            includeGroupKey: true,
          },
        } as never,
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for empty name", async () => {
      const client = testClient(transformsApp);
      const res = await client["api"]["v1"]["transforms"].$post({
        json: {
          name: "",
          sourceDataSourceId: mockDataSourceId,
          config: {
            groupBy: "brand",
            aggregations: [{ outputField: "count", function: "COUNT" }],
            includeGroupKey: true,
          },
        },
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/v1/transforms/preview - Preview Transform
  // ============================================================================

  describe("POST /api/v1/transforms/preview - validation", () => {
    it("should return 400 for missing sourceDataSourceId", async () => {
      const response = await makeRequest("POST", "/api/v1/transforms/preview", {
        config: {
          groupBy: "brand",
          aggregations: [{ outputField: "count", function: "COUNT" }],
          includeGroupKey: true,
        },
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid config", async () => {
      const response = await makeRequest("POST", "/api/v1/transforms/preview", {
        sourceDataSourceId: mockDataSourceId,
        config: {
          groupBy: "brand",
          aggregations: [], // Empty aggregations
          includeGroupKey: true,
        },
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for limit over 100", async () => {
      const response = await makeRequest("POST", "/api/v1/transforms/preview", {
        sourceDataSourceId: mockDataSourceId,
        config: {
          groupBy: "brand",
          aggregations: [{ outputField: "count", function: "COUNT" }],
          includeGroupKey: true,
        },
        limit: 101,
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for negative limit", async () => {
      const response = await makeRequest("POST", "/api/v1/transforms/preview", {
        sourceDataSourceId: mockDataSourceId,
        config: {
          groupBy: "brand",
          aggregations: [{ outputField: "count", function: "COUNT" }],
          includeGroupKey: true,
        },
        limit: -1,
      });

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/v1/transforms/validate - Validate Config
  // ============================================================================

  describe("POST /api/v1/transforms/validate - validation", () => {
    it("should return 400 for missing sourceDataSourceId", async () => {
      const response = await makeRequest("POST", "/api/v1/transforms/validate", {
        config: {
          groupBy: "brand",
          aggregations: [{ outputField: "count", function: "COUNT" }],
          includeGroupKey: true,
        },
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid aggregation function", async () => {
      const response = await makeRequest("POST", "/api/v1/transforms/validate", {
        sourceDataSourceId: mockDataSourceId,
        config: {
          groupBy: "brand",
          aggregations: [
            { outputField: "count", function: "INVALID_FUNCTION" },
          ],
          includeGroupKey: true,
        },
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid output field name", async () => {
      const response = await makeRequest("POST", "/api/v1/transforms/validate", {
        sourceDataSourceId: mockDataSourceId,
        config: {
          groupBy: "brand",
          aggregations: [
            { outputField: "123invalid", function: "COUNT" }, // starts with number
          ],
          includeGroupKey: true,
        },
      });

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // PUT /api/v1/transforms/:id - Update Transform
  // ============================================================================

  describe("PUT /api/v1/transforms/:id - validation", () => {
    it("should return 400 for invalid UUID", async () => {
      const client = testClient(transformsApp);
      const res = await client["api"]["v1"]["transforms"][":id"].$put({
        param: { id: "not-a-uuid" },
        json: { name: "Updated Name" },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid config when provided", async () => {
      const client = testClient(transformsApp);
      const res = await client["api"]["v1"]["transforms"][":id"].$put({
        param: { id: mockTransformId },
        json: {
          config: {
            groupBy: "brand",
            aggregations: [], // Empty aggregations
            includeGroupKey: true,
          },
        },
      });

      expect(res.status).toBe(400);
    });

    it("should accept valid partial update", async () => {
      // This will fail at the service level (not found) but pass validation
      const client = testClient(transformsApp);
      const res = await client["api"]["v1"]["transforms"][":id"].$put({
        param: { id: mockTransformId },
        json: { name: "New Name" },
      });

      // Should not be 400 - validation passed, will be 404 or 500 due to mocking
      expect(res.status).not.toBe(400);
    });
  });

  // ============================================================================
  // DELETE /api/v1/transforms/:id
  // ============================================================================

  describe("DELETE /api/v1/transforms/:id - validation", () => {
    it("should return 400 for invalid UUID", async () => {
      const client = testClient(transformsApp);
      const res = await client["api"]["v1"]["transforms"][":id"].$delete({
        param: { id: "not-a-uuid" },
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/v1/transforms/:id/execute
  // ============================================================================

  describe("POST /api/v1/transforms/:id/execute - validation", () => {
    it("should return 400 for invalid UUID", async () => {
      const response = await makeRequest(
        "POST",
        "/api/v1/transforms/not-a-uuid/execute"
      );

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/v1/transforms/:id/preview
  // ============================================================================

  describe("POST /api/v1/transforms/:id/preview - validation", () => {
    it("should return 400 for invalid UUID", async () => {
      const response = await makeRequest(
        "POST",
        "/api/v1/transforms/not-a-uuid/preview"
      );

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // GET /api/v1/transforms/:id
  // ============================================================================

  describe("GET /api/v1/transforms/:id - validation", () => {
    it("should return 400 for invalid UUID", async () => {
      const client = testClient(transformsApp);
      const res = await client["api"]["v1"]["transforms"][":id"].$get({
        param: { id: "not-a-uuid" },
      });

      expect(res.status).toBe(400);
    });
  });

  // Database-dependent tests are skipped - these require integration testing
  describe.skip("GET /api/v1/transforms (requires database)", () => {
    it("should return a paginated list of transforms", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/transforms (requires database)", () => {
    it("should create transform with valid input", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/transforms/preview (requires database)", () => {
    it("should return preview results", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/transforms/validate (requires database)", () => {
    it("should return validation result for valid config", async () => {
      // Integration test required
    });

    it("should return validation errors for invalid config", async () => {
      // Integration test required
    });
  });
});
