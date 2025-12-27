/**
 * Data Source Sync Endpoint Tests
 *
 * Tests for POST /api/v1/data-sources/:id/sync
 * This endpoint triggers a manual sync for data sources.
 *
 * Issue being fixed:
 * - Sync endpoint was only accepting 'api' type data sources
 * - It should accept google-sheets, csv, and api types
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { dataSourcesApp } from "../../routes/data-sources.js";

const mockDataSourceId = "550e8400-e29b-41d4-a716-446655440000";
const mockJobId = "660e8400-e29b-41d4-a716-446655440001";
const mockUserId = "770e8400-e29b-41d4-a716-446655440002";

// Mock the database module
vi.mock("../../services/db.js", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  dataSources: { id: "id" },
  dataRows: { id: "id", dataSourceId: "data_source_id" },
  transforms: {},
  columnMappings: {},
}));

// Mock the data-ingestion service
vi.mock("../../services/data-ingestion.js", () => ({
  processUploadedCsv: vi.fn(),
  getDataPreview: vi.fn(),
  validateData: vi.fn(),
  getStoredDataSource: vi.fn(),
  getStoredRows: vi.fn(),
  hasStoredData: vi.fn().mockReturnValue(false),
  deleteStoredData: vi.fn(),
  clearAllStoredData: vi.fn(),
}));

// Mock the api-fetch-service
vi.mock("../../services/api-fetch-service.js", () => ({
  testApiConnection: vi.fn(),
}));

// Mock the job queue
vi.mock("../../jobs/queue.js", () => ({
  getJobQueue: vi.fn(),
  getJobQueueReady: vi.fn(),
}));

import { db } from "../../services/db.js";
import { getJobQueueReady } from "../../jobs/queue.js";

describe("POST /api/v1/data-sources/:id/sync", () => {
  const mockDb = vi.mocked(db);
  const mockGetJobQueueReady = vi.mocked(getJobQueueReady);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Validation", () => {
    it("should return 400 for invalid UUID format", async () => {
      const response = await dataSourcesApp.request(
        "/api/v1/data-sources/not-a-uuid/sync",
        { method: "POST" }
      );

      expect(response.status).toBe(400);
    });

    it("should return 404 when data source does not exist", async () => {
      // Mock empty result from database
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const response = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sync`,
        { method: "POST" }
      );

      expect(response.status).toBe(404);
    });
  });

  describe("API type data sources", () => {
    it("should queue sync job for API type data sources with apiFetch config", async () => {
      const mockBoss = {
        send: vi.fn().mockResolvedValue(mockJobId),
      };
      mockGetJobQueueReady.mockResolvedValue(mockBoss as never);

      // Mock data source with API type and apiFetch config
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockDataSourceId,
                name: "Test API Source",
                type: "api",
                userId: mockUserId,
                config: {
                  apiFetch: {
                    url: "https://api.example.com/data",
                    method: "GET",
                    syncFrequency: "1h",
                  },
                },
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const response = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sync`,
        { method: "POST" }
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.jobId).toBe(mockJobId);
      expect(json.status).toBe("queued");
    });

    it("should return 400 for API type without apiFetch config", async () => {
      // Mock data source with API type but no apiFetch config
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockDataSourceId,
                name: "Test API Source",
                type: "api",
                userId: mockUserId,
                config: {},
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const response = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sync`,
        { method: "POST" }
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Google Sheets type data sources", () => {
    it("should queue sync job for google-sheets type data sources", async () => {
      const mockBoss = {
        send: vi.fn().mockResolvedValue(mockJobId),
      };
      mockGetJobQueueReady.mockResolvedValue(mockBoss as never);

      // Mock data source with google-sheets type
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockDataSourceId,
                name: "Test Google Sheet",
                type: "google-sheets",
                userId: mockUserId,
                config: {
                  googleSheets: {
                    spreadsheetId: "abc123",
                    spreadsheetName: "My Sheet",
                    sheetName: "Sheet1",
                    syncFrequency: "1h",
                  },
                },
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const response = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sync`,
        {
          method: "POST",
          headers: {
            "x-user-id": mockUserId,
          },
        }
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.jobId).toBe(mockJobId);
      expect(json.status).toBe("queued");
    });

    it("should queue sync job for google-sheets with flat config format", async () => {
      const mockBoss = {
        send: vi.fn().mockResolvedValue(mockJobId),
      };
      mockGetJobQueueReady.mockResolvedValue(mockBoss as never);

      // Mock data source with google-sheets type using flat config (spreadsheetId directly in config)
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockDataSourceId,
                name: "Test Google Sheet",
                type: "google-sheets",
                userId: mockUserId,
                config: {
                  source: "google-sheets",
                  spreadsheetId: "abc123",
                  spreadsheetName: "My Sheet",
                  sheetName: "Sheet1",
                  syncFrequency: "manual",
                  headerRow: 1,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const response = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sync`,
        {
          method: "POST",
          headers: {
            "x-user-id": mockUserId,
          },
        }
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.jobId).toBe(mockJobId);
      expect(json.status).toBe("queued");
    });

    it("should return 400 for google-sheets type without googleSheets config", async () => {
      // Mock data source with google-sheets type but no googleSheets config
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockDataSourceId,
                name: "Test Google Sheet",
                type: "google-sheets",
                userId: mockUserId,
                config: {},
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const response = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sync`,
        {
          method: "POST",
          headers: {
            "x-user-id": mockUserId,
          },
        }
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("CSV type data sources", () => {
    it("should return 400 for CSV type (CSV data is uploaded, not synced)", async () => {
      // CSV type does not support sync - data is uploaded via the upload endpoint
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockDataSourceId,
                name: "Test CSV",
                type: "csv",
                userId: mockUserId,
                config: {},
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const response = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sync`,
        { method: "POST" }
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.details.message).toContain("upload");
    });
  });

  describe("Manual type data sources", () => {
    it("should return 400 for manual type (manual data is not synced)", async () => {
      // Manual type does not support sync
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockDataSourceId,
                name: "Test Manual",
                type: "manual",
                userId: mockUserId,
                config: {},
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const response = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sync`,
        { method: "POST" }
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Error handling", () => {
    it("should return 500 when job queue fails to enqueue", async () => {
      const mockBoss = {
        send: vi.fn().mockResolvedValue(null), // Returns null when job creation fails
      };
      mockGetJobQueueReady.mockResolvedValue(mockBoss as never);

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockDataSourceId,
                name: "Test API Source",
                type: "api",
                userId: mockUserId,
                config: {
                  apiFetch: {
                    url: "https://api.example.com/data",
                    method: "GET",
                    syncFrequency: "1h",
                  },
                },
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const response = await dataSourcesApp.request(
        `/api/v1/data-sources/${mockDataSourceId}/sync`,
        { method: "POST" }
      );

      expect(response.status).toBe(500);
    });
  });
});
