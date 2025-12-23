import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockDataSourceId = "550e8400-e29b-41d4-a716-446655440000";
const nonExistentId = "550e8400-e29b-41d4-a716-446655440099";

// Mock data
const mockDataSource = {
  id: mockDataSourceId,
  userId: null,
  name: "Test Data Source",
  type: "csv" as const,
  config: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

const mockDataRows = [
  {
    id: "row-1",
    dataSourceId: mockDataSourceId,
    rowData: { city: "New York", population: 8336817, country: "USA" },
    rowIndex: 0,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "row-2",
    dataSourceId: mockDataSourceId,
    rowData: { city: "Los Angeles", population: 3979576, country: "USA" },
    rowIndex: 1,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "row-3",
    dataSourceId: mockDataSourceId,
    rowData: { city: "Chicago", population: 2693976, country: "USA" },
    rowIndex: 2,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "row-4",
    dataSourceId: mockDataSourceId,
    rowData: { city: "Houston", population: 2320268, country: "USA" },
    rowIndex: 3,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "row-5",
    dataSourceId: mockDataSourceId,
    rowData: { city: "Phoenix", population: 1680992, country: "USA" },
    rowIndex: 4,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  },
];

// Create a mock chain builder for drizzle ORM
function createMockDbChain(results: {
  dataSource?: typeof mockDataSource | null;
  dataRows?: typeof mockDataRows;
  rowCount?: number;
}) {
  let queryType: string | null = null;

  const mockSelect = vi.fn().mockImplementation((selectArg?: unknown) => {
    // Detect count query by checking if count was passed
    const isCountQuery = selectArg && typeof selectArg === "object" && "count" in (selectArg as Record<string, unknown>);

    return {
      from: vi.fn().mockImplementation((table: { id?: string }) => {
        // Detect table from mock table id
        if (table?.id === "dataSources_id") {
          queryType = "dataSources";
        } else if (table?.id === "dataRows_id") {
          queryType = isCountQuery ? "dataRowsCount" : "dataRows";
        }

        return {
          where: vi.fn().mockImplementation(() => {
            // For count queries that end here
            if (queryType === "dataRowsCount") {
              return Promise.resolve([{ count: results.rowCount ?? 0 }]);
            }

            return {
              limit: vi.fn().mockImplementation((limitVal: number) => {
                if (queryType === "dataSources") {
                  return Promise.resolve(results.dataSource ? [results.dataSource] : []);
                }
                return Promise.resolve([]);
              }),
              orderBy: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockImplementation((limitVal: number) => {
                  // Return only the requested number of rows
                  const rows = results.dataRows ?? [];
                  return Promise.resolve(rows.slice(0, limitVal));
                }),
              })),
              groupBy: vi.fn().mockResolvedValue([{ dataSourceId: mockDataSourceId, count: results.rowCount ?? 0 }]),
            };
          }),
          groupBy: vi.fn().mockResolvedValue([{ dataSourceId: mockDataSourceId, count: results.rowCount ?? 0 }]),
        };
      }),
    };
  });

  return { select: mockSelect };
}

// Mock the database module with dynamic mock
let mockDb: ReturnType<typeof createMockDbChain>;

vi.mock("../../services/db.js", () => {
  return {
    get db() {
      return mockDb;
    },
    dataSources: { id: "dataSources_id", createdAt: "created_at" },
    dataRows: { id: "dataRows_id", dataSourceId: "data_source_id", rowIndex: "row_index" },
    columnMappings: { id: "columnMappings_id", dataSourceId: "data_source_id" },
  };
});

// Mock data-ingestion service
const mockHasStoredData = vi.fn().mockReturnValue(false);
const mockGetStoredRows = vi.fn().mockReturnValue({ rows: [], total: 0 });

vi.mock("../../services/data-ingestion.js", () => ({
  processUploadedCsv: vi.fn(),
  getDataPreview: vi.fn(),
  validateData: vi.fn(),
  getStoredDataSource: vi.fn().mockReturnValue(null),
  get getStoredRows() {
    return mockGetStoredRows;
  },
  get hasStoredData() {
    return mockHasStoredData;
  },
  deleteStoredData: vi.fn(),
  clearAllStoredData: vi.fn(),
}));

// Import after mocking
import { dataSourcesApp } from "../../routes/data-sources.js";

describe("GET /api/v1/data-sources/:id/sample", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default behavior
    mockHasStoredData.mockReturnValue(false);
    mockGetStoredRows.mockReturnValue({ rows: [], total: 0 });
  });

  describe("Success cases", () => {
    it("should return sample data for a valid data source with database data", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        dataRows: mockDataRows,
        rowCount: 5,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sample`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      // Verify response structure
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("total");
      expect(Array.isArray(json.data)).toBe(true);
      expect(typeof json.total).toBe("number");
    });

    it("should return raw rowData without wrapper metadata", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        dataRows: mockDataRows,
        rowCount: 5,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sample`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      // Data should be array of raw rowData objects, not wrapped
      expect(json.data.length).toBeGreaterThan(0);
      const firstRow = json.data[0];

      // Should have the actual data fields
      expect(firstRow).toHaveProperty("city");
      expect(firstRow).toHaveProperty("population");
      expect(firstRow).toHaveProperty("country");

      // Should NOT have database wrapper fields
      expect(firstRow).not.toHaveProperty("id");
      expect(firstRow).not.toHaveProperty("dataSourceId");
      expect(firstRow).not.toHaveProperty("rowIndex");
      expect(firstRow).not.toHaveProperty("createdAt");
    });

    it("should return correct total count", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        dataRows: mockDataRows,
        rowCount: 5,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sample`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.total).toBe(5);
    });

    it("should use default limit of 10 when not specified", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        dataRows: mockDataRows,
        rowCount: 5,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sample`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      // With only 5 rows and default limit 10, should return all 5
      expect(json.data.length).toBe(5);
    });
  });

  describe("Limit parameter", () => {
    it("should respect the limit query parameter", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        dataRows: mockDataRows,
        rowCount: 5,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sample?limit=2`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.data.length).toBe(2);
      // Total should still reflect all available rows
      expect(json.total).toBe(5);
    });

    it("should accept limit=1 (minimum valid value)", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        dataRows: mockDataRows.slice(0, 1),
        rowCount: 5,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sample?limit=1`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.data.length).toBe(1);
    });

    it("should accept limit=100 (maximum valid value)", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        dataRows: mockDataRows,
        rowCount: 5,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sample?limit=100`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      // Should return all available rows (only 5 available)
      expect(json.data.length).toBe(5);
    });
  });

  describe("Empty data handling", () => {
    it("should return empty array when data source exists but has no data", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        dataRows: [],
        rowCount: 0,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sample`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.data).toEqual([]);
      expect(json.total).toBe(0);
    });
  });

  describe("Error handling", () => {
    it("should return 404 for non-existent data source", async () => {
      mockDb = createMockDbChain({
        dataSource: null,
        dataRows: [],
        rowCount: 0,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${nonExistentId}/sample`,
        { method: "GET" }
      );

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toHaveProperty("error");
    });

    it("should return 400 for invalid UUID format", async () => {
      mockDb = createMockDbChain({
        dataSource: null,
        dataRows: [],
        rowCount: 0,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/invalid-uuid/sample`,
        { method: "GET" }
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for limit below minimum (0)", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        dataRows: [],
        rowCount: 0,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sample?limit=0`,
        { method: "GET" }
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for limit above maximum (101)", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        dataRows: [],
        rowCount: 0,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sample?limit=101`,
        { method: "GET" }
      );

      expect(res.status).toBe(400);
    });
  });

  describe("In-memory data path", () => {
    it("should use in-memory data when hasStoredData returns true", async () => {
      const inMemoryRows = [
        { product: "Widget A", price: 9.99 },
        { product: "Widget B", price: 19.99 },
        { product: "Widget C", price: 29.99 },
      ];

      mockHasStoredData.mockReturnValue(true);
      mockGetStoredRows.mockReturnValue({ rows: inMemoryRows, total: 3 });

      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        dataRows: [], // DB rows should not be used
        rowCount: 0,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sample`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      // Verify in-memory data is returned
      expect(json.data).toEqual(inMemoryRows);
      expect(json.total).toBe(3);

      // Verify the in-memory functions were called
      expect(mockHasStoredData).toHaveBeenCalledWith(mockDataSourceId);
      expect(mockGetStoredRows).toHaveBeenCalledWith(mockDataSourceId, 1, 10); // Default limit
    });

    it("should respect limit parameter with in-memory data", async () => {
      const inMemoryRows = [
        { product: "Widget A", price: 9.99 },
        { product: "Widget B", price: 19.99 },
      ];

      mockHasStoredData.mockReturnValue(true);
      mockGetStoredRows.mockReturnValue({ rows: inMemoryRows, total: 10 });

      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        dataRows: [],
        rowCount: 0,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sample?limit=2`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      // Verify limit was passed to getStoredRows
      expect(mockGetStoredRows).toHaveBeenCalledWith(mockDataSourceId, 1, 2);
      expect(json.data.length).toBe(2);
      expect(json.total).toBe(10);
    });

    it("should fall back to database when hasStoredData returns false", async () => {
      mockHasStoredData.mockReturnValue(false);

      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        dataRows: mockDataRows,
        rowCount: 5,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sample`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      // Should have data from database
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0]).toHaveProperty("city");

      // Verify in-memory was checked
      expect(mockHasStoredData).toHaveBeenCalledWith(mockDataSourceId);
      // getStoredRows should NOT be called when hasStoredData is false
      expect(mockGetStoredRows).not.toHaveBeenCalled();
    });
  });
});
