import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";

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
    dataSources: { id: "id", createdAt: "created_at" },
    dataRows: { id: "id", dataSourceId: "data_source_id", rowIndex: "row_index" },
  };
});

// Mock data-ingestion service
vi.mock("../../services/data-ingestion.js", () => ({
  processUploadedCsv: vi.fn().mockResolvedValue({
    dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
    headers: ["name", "email", "age"],
    columns: [
      { originalName: "name", suggestedName: "name", detectedType: "string", sampleValues: ["John", "Jane"] },
      { originalName: "email", suggestedName: "email", detectedType: "email", sampleValues: ["john@example.com"] },
      { originalName: "age", suggestedName: "age", detectedType: "number", sampleValues: [25, 30] },
    ],
    rowCount: 2,
    preview: [{ name: "John", email: "john@example.com", age: 25 }],
  }),
  getDataPreview: vi.fn().mockResolvedValue({
    headers: ["name", "email"],
    preview: [{ name: "John", email: "john@test.com" }],
  }),
  validateData: vi.fn().mockReturnValue({
    valid: true,
    totalRows: 2,
    validRows: 2,
    invalidRows: 0,
    errors: [],
  }),
  getStoredDataSource: vi.fn().mockReturnValue({
    id: "550e8400-e29b-41d4-a716-446655440000",
    rows: [{ name: "John" }],
    columns: [
      { originalName: "name", suggestedName: "name", detectedType: "string" },
    ],
  }),
  getStoredRows: vi.fn().mockReturnValue({
    rows: [{ name: "John" }],
    total: 1,
  }),
  hasStoredData: vi.fn().mockReturnValue(true),
  deleteStoredData: vi.fn(),
  clearAllStoredData: vi.fn(),
}));

// Import after mocking
import { dataSourcesApp } from "../../routes/data-sources.js";

describe("Data Sources API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Note: Tests that require database interaction are skipped.
  // These should be implemented as integration tests with a test database.

  describe("POST /api/v1/data-sources - validation", () => {
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

  describe("GET /api/v1/data-sources/:id - validation", () => {
    it("should return 400 for invalid UUID", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$get({
        param: { id: "not-a-uuid" },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/data-sources/preview-csv", () => {
    it("should return quick preview of CSV content", async () => {
      const res = await dataSourcesApp.request(
        "/api/v1/data-sources/preview-csv",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "name,email\nJohn,john@test.com\nJane,jane@test.com",
            rows: 5,
          }),
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("headers");
      expect(json).toHaveProperty("preview");
    });

    it("should return 400 for empty CSV content", async () => {
      const res = await dataSourcesApp.request(
        "/api/v1/data-sources/preview-csv",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "",
            rows: 5,
          }),
        }
      );

      // Empty content is invalid - returns 400
      expect(res.status).toBe(400);
    });

    it("should respect rows limit parameter", async () => {
      const res = await dataSourcesApp.request(
        "/api/v1/data-sources/preview-csv",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "name\nA\nB\nC\nD\nE",
            rows: 2,
          }),
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.preview.length).toBeLessThanOrEqual(2);
    });
  });

  // Database-dependent tests are skipped - these require integration testing
  describe.skip("GET /api/v1/data-sources (requires database)", () => {
    it("should return a paginated list of data sources", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/data-sources (requires database)", () => {
    it("should create a new data source", async () => {
      // Integration test required
    });
  });

  describe.skip("GET /api/v1/data-sources/:id (requires database)", () => {
    it("should return a data source by id", async () => {
      // Integration test required
    });
  });

  describe.skip("PUT /api/v1/data-sources/:id (requires database)", () => {
    it("should update an existing data source", async () => {
      // Integration test required
    });
  });

  describe.skip("DELETE /api/v1/data-sources/:id (requires database)", () => {
    it("should delete an existing data source", async () => {
      // Integration test required
    });
  });

  describe.skip("GET /api/v1/data-sources/:id/rows (requires database)", () => {
    it("should return paginated data rows", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/data-sources/:id/preview (requires database)", () => {
    it("should return a preview of data rows", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/data-sources/:id/upload (requires database)", () => {
    it("should parse uploaded CSV and return analysis", async () => {
      // Integration test required
    });
  });
});
