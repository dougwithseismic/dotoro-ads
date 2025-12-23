import { describe, it, expect, beforeEach, vi } from "vitest";

const mockDataSourceId = "550e8400-e29b-41d4-a716-446655440000";

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

const mockColumnMappings = [
  {
    id: "mapping-1",
    dataSourceId: mockDataSourceId,
    sourceColumn: "Name",
    normalizedName: "name",
    dataType: "string",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "mapping-2",
    dataSourceId: mockDataSourceId,
    sourceColumn: "Email",
    normalizedName: "email",
    dataType: "string",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
];

const mockDataRows = [
  {
    id: "row-1",
    dataSourceId: mockDataSourceId,
    rowData: { name: "John Doe", email: "john@example.com" },
    rowIndex: 0,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "row-2",
    dataSourceId: mockDataSourceId,
    rowData: { name: "Jane Smith", email: "jane@example.com" },
    rowIndex: 1,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  },
];

// Create a mock chain builder for drizzle ORM
function createMockDbChain(results: {
  dataSource?: typeof mockDataSource | null;
  columnMappings?: typeof mockColumnMappings;
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
        } else if (table?.id === "columnMappings_id") {
          queryType = "columnMappings";
        } else if (table?.id === "dataRows_id") {
          queryType = isCountQuery ? "dataRowsCount" : "dataRows";
        }

        return {
          where: vi.fn().mockImplementation(() => {
            // For count queries that end here
            if (queryType === "dataRowsCount") {
              return Promise.resolve([{ count: results.rowCount ?? 0 }]);
            }
            // For columnMappings queries that don't have limit
            if (queryType === "columnMappings") {
              return Promise.resolve(results.columnMappings ?? []);
            }

            return {
              limit: vi.fn().mockImplementation(() => {
                if (queryType === "dataSources") {
                  return Promise.resolve(results.dataSource ? [results.dataSource] : []);
                }
                return Promise.resolve([]);
              }),
              orderBy: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockResolvedValue(results.dataRows ?? []),
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

describe("GET /api/v1/data-sources/:id - Detail Response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Response structure", () => {
    it("should return columnMappings array in response", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        columnMappings: mockColumnMappings,
        dataRows: mockDataRows,
        rowCount: 2,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("columnMappings");
      expect(Array.isArray(json.columnMappings)).toBe(true);
    });

    it("should return data array (preview rows) in response", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        columnMappings: mockColumnMappings,
        dataRows: mockDataRows,
        rowCount: 2,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("data");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should return columns array extracted from data", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        columnMappings: mockColumnMappings,
        dataRows: mockDataRows,
        rowCount: 2,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("columns");
      expect(Array.isArray(json.columns)).toBe(true);
    });
  });

  describe("Empty data handling", () => {
    it("should return empty columnMappings array when no mappings exist", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        columnMappings: [],
        dataRows: [],
        rowCount: 0,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.columnMappings).toEqual([]);
    });

    it("should return empty data array when no rows exist", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        columnMappings: [],
        dataRows: [],
        rowCount: 0,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual([]);
    });
  });

  describe("Error handling", () => {
    it("should return 404 when data source not found", async () => {
      mockDb = createMockDbChain({
        dataSource: null,
        columnMappings: [],
        dataRows: [],
        rowCount: 0,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}`,
        { method: "GET" }
      );

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid UUID format", async () => {
      mockDb = createMockDbChain({
        dataSource: null,
        columnMappings: [],
        dataRows: [],
        rowCount: 0,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/not-a-valid-uuid`,
        { method: "GET" }
      );

      expect(res.status).toBe(400);
    });
  });

  describe("Column mapping format", () => {
    it("should return simplified column mapping format with sourceColumn, normalizedName, dataType", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        columnMappings: mockColumnMappings,
        dataRows: mockDataRows,
        rowCount: 2,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      // Verify column mapping format matches frontend expectations
      expect(json.columnMappings.length).toBeGreaterThan(0);
      const mapping = json.columnMappings[0];
      expect(mapping).toHaveProperty("sourceColumn");
      expect(mapping).toHaveProperty("normalizedName");
      expect(mapping).toHaveProperty("dataType");
      // Should NOT have database-specific fields
      expect(mapping).not.toHaveProperty("id");
      expect(mapping).not.toHaveProperty("dataSourceId");
      expect(mapping).not.toHaveProperty("createdAt");
      expect(mapping).not.toHaveProperty("updatedAt");
    });
  });

  describe("Data preview format", () => {
    it("should extract rowData content for preview", async () => {
      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        columnMappings: mockColumnMappings,
        dataRows: mockDataRows,
        rowCount: 2,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      // Data should be array of rowData objects
      expect(json.data.length).toBe(2);
      expect(json.data[0]).toEqual({ name: "John Doe", email: "john@example.com" });
      expect(json.data[1]).toEqual({ name: "Jane Smith", email: "jane@example.com" });
    });
  });

  describe("In-memory data path", () => {
    it("should use in-memory data when hasStoredData returns true", async () => {
      const inMemoryRows = [
        { city: "New York", population: 8336817 },
        { city: "Los Angeles", population: 3979576 },
      ];

      mockHasStoredData.mockReturnValue(true);
      mockGetStoredRows.mockReturnValue({ rows: inMemoryRows, total: 2 });

      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        columnMappings: [],
        dataRows: [], // DB rows should not be used
        rowCount: 2,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}`,
        { method: "GET" }
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      // Verify in-memory data is returned
      expect(json.data).toEqual(inMemoryRows);
      expect(json.columns).toEqual(["city", "population"]);

      // Verify the in-memory functions were called
      expect(mockHasStoredData).toHaveBeenCalledWith(mockDataSourceId);
      expect(mockGetStoredRows).toHaveBeenCalledWith(mockDataSourceId, 1, 20);
    });

    it("should fall back to database when getStoredRows throws an error", async () => {
      // Track call count to make getStoredRows fail only on second call
      // (first call is from computeRowCount, second is from preview fetch)
      let callCount = 0;
      mockHasStoredData.mockReturnValue(true);
      mockGetStoredRows.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Allow computeRowCount to succeed
          return { rows: [], total: 2 };
        }
        // Make preview fetch fail
        throw new Error("In-memory store corrupted");
      });

      mockDb = createMockDbChain({
        dataSource: mockDataSource,
        columnMappings: mockColumnMappings,
        dataRows: mockDataRows,
        rowCount: 2,
      });

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}`,
        { method: "GET" }
      );

      // Should succeed by falling back to database
      expect(res.status).toBe(200);
      const json = await res.json();

      // Should have data from database fallback
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("columns");
    });

    afterEach(() => {
      // Reset mocks to default behavior
      mockHasStoredData.mockReturnValue(false);
      mockGetStoredRows.mockReturnValue({ rows: [], total: 0 });
    });
  });
});
