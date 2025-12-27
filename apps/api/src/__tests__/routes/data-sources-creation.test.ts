/**
 * Data Source Creation Tests
 *
 * Tests for POST /api/v1/data-sources
 * Specifically testing that google-sheets data sources trigger an initial sync
 *
 * Issue being fixed:
 * - Google Sheets data sources are created without initial data
 * - After creation, the data source should automatically queue a sync job
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

describe("POST /api/v1/data-sources - Google Sheets creation", () => {
  const mockDb = vi.mocked(db);
  const mockGetJobQueueReady = vi.mocked(getJobQueueReady);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create a Google Sheets data source and queue initial sync", async () => {
    const createdAt = new Date();
    const updatedAt = new Date();

    // Mock database insert
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: mockDataSourceId,
            name: "Test Google Sheet",
            type: "google-sheets",
            userId: mockUserId,
            config: {
              googleSheets: {
                spreadsheetId: "abc123",
                spreadsheetName: "My Spreadsheet",
                sheetName: "Sheet1",
                syncFrequency: "1h",
              },
            },
            createdAt,
            updatedAt,
          },
        ]),
      }),
    } as unknown as ReturnType<typeof db.insert>);

    // Mock job queue
    const mockBoss = {
      send: vi.fn().mockResolvedValue(mockJobId),
    };
    mockGetJobQueueReady.mockResolvedValue(mockBoss as never);

    const response = await dataSourcesApp.request(
      "/api/v1/data-sources",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": mockUserId,
        },
        body: JSON.stringify({
          name: "Test Google Sheet",
          type: "google-sheets",
          config: {
            googleSheets: {
              spreadsheetId: "abc123",
              spreadsheetName: "My Spreadsheet",
              sheetName: "Sheet1",
              syncFrequency: "1h",
            },
          },
        }),
      }
    );

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.id).toBe(mockDataSourceId);
    expect(json.type).toBe("google-sheets");

    // Verify sync job was queued
    expect(mockGetJobQueueReady).toHaveBeenCalled();
    expect(mockBoss.send).toHaveBeenCalledWith(
      "sync-google-sheets",
      expect.objectContaining({
        dataSourceId: mockDataSourceId,
        userId: mockUserId,
        triggeredBy: "creation",
      })
    );
  });

  it("should create Google Sheets data source without sync if no googleSheets config", async () => {
    const createdAt = new Date();
    const updatedAt = new Date();

    // Mock database insert - no googleSheets config
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: mockDataSourceId,
            name: "Test Google Sheet",
            type: "google-sheets",
            userId: null,
            config: null,
            createdAt,
            updatedAt,
          },
        ]),
      }),
    } as unknown as ReturnType<typeof db.insert>);

    const response = await dataSourcesApp.request(
      "/api/v1/data-sources",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Google Sheet",
          type: "google-sheets",
        }),
      }
    );

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.id).toBe(mockDataSourceId);

    // Verify sync job was NOT queued (no config)
    expect(mockGetJobQueueReady).not.toHaveBeenCalled();
  });

  it("should create API data source and queue initial sync if apiFetch config present", async () => {
    const createdAt = new Date();
    const updatedAt = new Date();

    // Mock database insert
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: mockDataSourceId,
            name: "Test API Source",
            type: "api",
            userId: null,
            config: {
              apiFetch: {
                url: "https://api.example.com/data",
                method: "GET",
                syncFrequency: "1h",
              },
            },
            createdAt,
            updatedAt,
          },
        ]),
      }),
    } as unknown as ReturnType<typeof db.insert>);

    // Mock job queue
    const mockBoss = {
      send: vi.fn().mockResolvedValue(mockJobId),
    };
    mockGetJobQueueReady.mockResolvedValue(mockBoss as never);

    const response = await dataSourcesApp.request(
      "/api/v1/data-sources",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test API Source",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data",
              method: "GET",
              syncFrequency: "1h",
            },
          },
        }),
      }
    );

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.id).toBe(mockDataSourceId);
    expect(json.type).toBe("api");

    // Verify sync job was queued for API type
    expect(mockGetJobQueueReady).toHaveBeenCalled();
    expect(mockBoss.send).toHaveBeenCalledWith(
      "sync-api-data-source",
      expect.objectContaining({
        dataSourceId: mockDataSourceId,
        triggeredBy: "creation",
      })
    );
  });

  it("should create CSV data source without queuing sync job", async () => {
    const createdAt = new Date();
    const updatedAt = new Date();

    // Mock database insert
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: mockDataSourceId,
            name: "Test CSV",
            type: "csv",
            userId: null,
            config: null,
            createdAt,
            updatedAt,
          },
        ]),
      }),
    } as unknown as ReturnType<typeof db.insert>);

    const response = await dataSourcesApp.request(
      "/api/v1/data-sources",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test CSV",
          type: "csv",
        }),
      }
    );

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.id).toBe(mockDataSourceId);
    expect(json.type).toBe("csv");

    // Verify sync job was NOT queued for CSV type
    expect(mockGetJobQueueReady).not.toHaveBeenCalled();
  });

  it("should create manual data source without queuing sync job", async () => {
    const createdAt = new Date();
    const updatedAt = new Date();

    // Mock database insert
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: mockDataSourceId,
            name: "Test Manual",
            type: "manual",
            userId: null,
            config: null,
            createdAt,
            updatedAt,
          },
        ]),
      }),
    } as unknown as ReturnType<typeof db.insert>);

    const response = await dataSourcesApp.request(
      "/api/v1/data-sources",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Manual",
          type: "manual",
        }),
      }
    );

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.id).toBe(mockDataSourceId);
    expect(json.type).toBe("manual");

    // Verify sync job was NOT queued for manual type
    expect(mockGetJobQueueReady).not.toHaveBeenCalled();
  });
});
