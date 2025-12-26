import { describe, it, expect, beforeEach, vi } from "vitest";

const mockDataSourceId = "550e8400-e29b-41d4-a716-446655440000";
const mockItemId = "660e8400-e29b-41d4-a716-446655440001";
const mockOtherDataSourceId = "770e8400-e29b-41d4-a716-446655440002";

// Mock the database module
vi.mock("../../services/db.js", () => {
  const createChainableMock = () => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockResolvedValue([]);
    chain.orderBy = vi.fn().mockReturnValue(chain);
    chain.offset = vi.fn().mockReturnValue(chain);
    chain.groupBy = vi.fn().mockReturnValue(chain);
    chain.returning = vi.fn().mockResolvedValue([]);
    chain.values = vi.fn().mockReturnValue(chain);
    chain.set = vi.fn().mockReturnValue(chain);
    return chain;
  };

  return {
    db: {
      select: vi.fn().mockImplementation(createChainableMock),
      insert: vi.fn().mockImplementation(createChainableMock),
      update: vi.fn().mockImplementation(createChainableMock),
      delete: vi.fn().mockImplementation(createChainableMock),
      transaction: vi.fn().mockImplementation((fn) =>
        fn({
          select: vi.fn().mockImplementation(createChainableMock),
          insert: vi.fn().mockImplementation(createChainableMock),
          update: vi.fn().mockImplementation(createChainableMock),
          delete: vi.fn().mockImplementation(createChainableMock),
        })
      ),
    },
    dataSources: {
      id: "id",
      userId: "user_id",
      name: "name",
      type: "type",
      config: "config",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    dataRows: {
      id: "id",
      dataSourceId: "data_source_id",
      rowData: "row_data",
      rowIndex: "row_index",
      createdAt: "created_at",
    },
    columnMappings: {
      id: "id",
      dataSourceId: "data_source_id",
    },
    transforms: {
      id: "id",
      name: "name",
      sourceDataSourceId: "source_data_source_id",
    },
  };
});

// Mock data-ingestion service
vi.mock("../../services/data-ingestion.js", () => ({
  processUploadedCsv: vi.fn(),
  getDataPreview: vi.fn(),
  validateData: vi.fn(),
  getStoredDataSource: vi.fn(),
  getStoredRows: vi.fn().mockReturnValue({ rows: [], total: 0 }),
  hasStoredData: vi.fn().mockReturnValue(false),
  deleteStoredData: vi.fn(),
  clearAllStoredData: vi.fn(),
}));

// Import after mocking
import { dataSourcesApp } from "../../routes/data-sources.js";

// Helper to make direct requests to the app
async function makeRequest(
  method: string,
  path: string,
  body?: unknown,
  query?: Record<string, string>
): Promise<Response> {
  let url = `http://localhost${path}`;
  if (query) {
    const params = new URLSearchParams(query);
    url += `?${params.toString()}`;
  }
  const request = new Request(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return dataSourcesApp.fetch(request);
}

describe("Data Source Items CRUD API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // POST /api/v1/data-sources/:id/items - Bulk Insert
  // ============================================================================

  describe("POST /api/v1/data-sources/:id/items", () => {
    it("should return 400 for invalid data source UUID", async () => {
      const response = await makeRequest(
        "POST",
        "/api/v1/data-sources/not-a-uuid/items",
        {
          items: [{ name: "Test" }],
          mode: "append",
        }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing items array", async () => {
      const response = await makeRequest(
        "POST",
        `/api/v1/data-sources/${mockDataSourceId}/items`,
        {
          mode: "append",
        }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for empty items array", async () => {
      const response = await makeRequest(
        "POST",
        `/api/v1/data-sources/${mockDataSourceId}/items`,
        {
          items: [],
          mode: "append",
        }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid mode", async () => {
      const response = await makeRequest(
        "POST",
        `/api/v1/data-sources/${mockDataSourceId}/items`,
        {
          items: [{ name: "Test" }],
          mode: "invalid",
        }
      );

      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent data source", async () => {
      const response = await makeRequest(
        "POST",
        `/api/v1/data-sources/${mockDataSourceId}/items`,
        {
          items: [{ name: "Test" }],
          mode: "append",
        }
      );

      // With current mock returning empty array, this should be 404
      expect(response.status).toBe(404);
    });

    it.skip("should bulk insert items in append mode", async () => {
      // Requires database integration test
    });

    it.skip("should clear and insert in replace mode", async () => {
      // Requires database integration test
    });

    it.skip("should reject if would exceed row limit", async () => {
      // Requires database integration test
    });

    it.skip("should return limitReached flag when approaching limit", async () => {
      // Requires database integration test
    });

    it.skip("should batch inserts in chunks of 100", async () => {
      // Requires database integration test
    });

    it.skip("should use max(rowIndex) + 1 for append mode starting index (not count)", async () => {
      // This test verifies the critical fix for Issue 1 from Phase 0A code review.
      // The bug was using count() instead of max(rowIndex) + 1, which would cause
      // row index collisions if rows were deleted and then new rows appended.
      //
      // Example scenario that the fix handles correctly:
      // - Initial state: rows with indices [0, 1, 2, 3, 4] (5 rows, max=4)
      // - Delete rows 2, 3: remaining indices [0, 1, 4] (3 rows, max=4)
      // - Append 2 new rows:
      //   - BUG (count-based): would use startingIndex=3, creating [3, 4] -> COLLISION with existing row 4!
      //   - FIX (max-based): uses startingIndex=5, creating [5, 6] -> No collision
      //
      // Requires database integration test to properly verify
    });

    it.skip("should rollback delete if insert fails in replace mode (transaction safety)", async () => {
      // This test verifies the critical fix for Issue 2 from Phase 0A code review.
      // The bug was performing delete and insert as separate operations. If insert
      // failed after delete, data would be lost.
      //
      // With the transaction fix:
      // - Replace mode wraps delete + all inserts in a single transaction
      // - If any insert fails, the delete is rolled back
      // - No data loss occurs even on partial failure
      //
      // Requires database integration test to properly verify transaction rollback
    });
  });

  // ============================================================================
  // PUT /api/v1/data-sources/:id/items/:itemId - Update Single Item
  // ============================================================================

  describe("PUT /api/v1/data-sources/:id/items/:itemId", () => {
    it("should return 400 for invalid data source UUID", async () => {
      const response = await makeRequest(
        "PUT",
        `/api/v1/data-sources/not-a-uuid/items/${mockItemId}`,
        { data: { name: "Updated" } }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid item UUID", async () => {
      const response = await makeRequest(
        "PUT",
        `/api/v1/data-sources/${mockDataSourceId}/items/not-a-uuid`,
        { data: { name: "Updated" } }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing data field", async () => {
      const response = await makeRequest(
        "PUT",
        `/api/v1/data-sources/${mockDataSourceId}/items/${mockItemId}`,
        {}
      );

      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent data source", async () => {
      const response = await makeRequest(
        "PUT",
        `/api/v1/data-sources/${mockDataSourceId}/items/${mockItemId}`,
        { data: { name: "Updated" } }
      );

      expect(response.status).toBe(404);
    });

    it.skip("should return 404 for non-existent item", async () => {
      // Requires database integration test
    });

    it.skip("should return 404 for item in different data source", async () => {
      // Requires database integration test
    });

    it.skip("should update existing item", async () => {
      // Requires database integration test
    });
  });

  // ============================================================================
  // DELETE /api/v1/data-sources/:id/items/:itemId - Delete Single Item
  // ============================================================================

  describe("DELETE /api/v1/data-sources/:id/items/:itemId", () => {
    it("should return 400 for invalid data source UUID", async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/v1/data-sources/not-a-uuid/items/${mockItemId}`
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid item UUID", async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/v1/data-sources/${mockDataSourceId}/items/not-a-uuid`
      );

      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent data source", async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/v1/data-sources/${mockDataSourceId}/items/${mockItemId}`
      );

      expect(response.status).toBe(404);
    });

    it.skip("should return 404 for non-existent item", async () => {
      // Requires database integration test
    });

    it.skip("should delete existing item", async () => {
      // Requires database integration test
    });
  });

  // ============================================================================
  // DELETE /api/v1/data-sources/:id/items - Clear All Items
  // ============================================================================

  describe("DELETE /api/v1/data-sources/:id/items", () => {
    it("should return 400 for invalid data source UUID", async () => {
      const response = await makeRequest(
        "DELETE",
        "/api/v1/data-sources/not-a-uuid/items",
        undefined,
        { confirm: "true" }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 without confirm query param", async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/v1/data-sources/${mockDataSourceId}/items`
      );

      expect(response.status).toBe(400);
      // The error format from Zod validation contains issues array
      const json = await response.json();
      expect(json.success).toBe(false);
    });

    it("should return 400 with confirm=false", async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/v1/data-sources/${mockDataSourceId}/items`,
        undefined,
        { confirm: "false" }
      );

      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent data source", async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/v1/data-sources/${mockDataSourceId}/items`,
        undefined,
        { confirm: "true" }
      );

      expect(response.status).toBe(404);
    });

    it.skip("should clear all items with confirm=true", async () => {
      // Requires database integration test
    });

    it.skip("should return deleted count", async () => {
      // Requires database integration test
    });
  });
});
