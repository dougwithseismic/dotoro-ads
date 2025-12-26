/**
 * Sync API Data Source Job Handler Tests
 *
 * Tests for the job handler that fetches data from external APIs
 * and ingests it into data sources.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database module
vi.mock("../../../services/db.js", () => {
  const mockDbSelect = vi.fn();
  const mockDbUpdate = vi.fn();
  return {
    db: {
      select: mockDbSelect,
      update: mockDbUpdate,
    },
    dataSources: { id: "id", type: "type", config: "config" },
    __mockDbSelect: mockDbSelect,
    __mockDbUpdate: mockDbUpdate,
  };
});

// Mock the API fetch service
vi.mock("../../../services/api-fetch-service.js", () => {
  const mockFetchAndIngest = vi.fn();
  return {
    fetchAndIngest: mockFetchAndIngest,
    __mockFetchAndIngest: mockFetchAndIngest,
  };
});

// Import after mocking
import {
  SYNC_API_DATA_SOURCE_JOB,
  createSyncApiDataSourceHandler,
  isSyncDue,
  SYNC_INTERVALS,
  type SyncApiDataSourceJob,
} from "../sync-api-data-source.js";

// Get mock references after imports
const dbModule = await vi.importMock<{
  __mockDbSelect: ReturnType<typeof vi.fn>;
  __mockDbUpdate: ReturnType<typeof vi.fn>;
}>("../../../services/db.js");

const fetchModule = await vi.importMock<{
  __mockFetchAndIngest: ReturnType<typeof vi.fn>;
}>("../../../services/api-fetch-service.js");

const mockDbSelect = dbModule.__mockDbSelect;
const mockFetchAndIngest = fetchModule.__mockFetchAndIngest;

describe("Sync API Data Source Job Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("SYNC_API_DATA_SOURCE_JOB constant", () => {
    it("should export the correct job name", () => {
      expect(SYNC_API_DATA_SOURCE_JOB).toBe("sync-api-data-source");
    });
  });

  describe("SYNC_INTERVALS", () => {
    it("should have correct interval for manual", () => {
      expect(SYNC_INTERVALS.manual).toBe(Infinity);
    });

    it("should have correct interval for 1h", () => {
      expect(SYNC_INTERVALS["1h"]).toBe(3600000);
    });

    it("should have correct interval for 6h", () => {
      expect(SYNC_INTERVALS["6h"]).toBe(21600000);
    });

    it("should have correct interval for 24h", () => {
      expect(SYNC_INTERVALS["24h"]).toBe(86400000);
    });

    it("should have correct interval for 7d", () => {
      expect(SYNC_INTERVALS["7d"]).toBe(604800000);
    });
  });

  describe("isSyncDue", () => {
    it("should return false for manual frequency", () => {
      expect(isSyncDue("manual", null)).toBe(false);
      expect(isSyncDue("manual", new Date())).toBe(false);
    });

    it("should return true when lastSyncAt is null", () => {
      expect(isSyncDue("1h", null)).toBe(true);
      expect(isSyncDue("24h", null)).toBe(true);
    });

    it("should return true when enough time has passed", () => {
      // Set current time
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      // Last sync was 2 hours ago, interval is 1 hour -> due
      const lastSync1h = new Date("2025-01-15T10:00:00Z");
      expect(isSyncDue("1h", lastSync1h)).toBe(true);

      // Last sync was 7 hours ago, interval is 6 hours -> due
      const lastSync6h = new Date("2025-01-15T05:00:00Z");
      expect(isSyncDue("6h", lastSync6h)).toBe(true);

      // Last sync was 2 days ago, interval is 24 hours -> due
      const lastSync24h = new Date("2025-01-13T12:00:00Z");
      expect(isSyncDue("24h", lastSync24h)).toBe(true);

      // Last sync was 8 days ago, interval is 7 days -> due
      const lastSync7d = new Date("2025-01-07T12:00:00Z");
      expect(isSyncDue("7d", lastSync7d)).toBe(true);
    });

    it("should return false when not enough time has passed", () => {
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      // Last sync was 30 minutes ago, interval is 1 hour -> not due
      const lastSync1h = new Date("2025-01-15T11:30:00Z");
      expect(isSyncDue("1h", lastSync1h)).toBe(false);

      // Last sync was 3 hours ago, interval is 6 hours -> not due
      const lastSync6h = new Date("2025-01-15T09:00:00Z");
      expect(isSyncDue("6h", lastSync6h)).toBe(false);

      // Last sync was 12 hours ago, interval is 24 hours -> not due
      const lastSync24h = new Date("2025-01-15T00:00:00Z");
      expect(isSyncDue("24h", lastSync24h)).toBe(false);

      // Last sync was 3 days ago, interval is 7 days -> not due
      const lastSync7d = new Date("2025-01-12T12:00:00Z");
      expect(isSyncDue("7d", lastSync7d)).toBe(false);
    });

    it("should return true when exactly at the boundary", () => {
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      // Last sync was exactly 1 hour ago
      const lastSync = new Date("2025-01-15T11:00:00Z");
      expect(isSyncDue("1h", lastSync)).toBe(true);
    });
  });

  describe("createSyncApiDataSourceHandler", () => {
    const mockJobData: SyncApiDataSourceJob = {
      dataSourceId: "ds-123",
      triggeredBy: "manual",
    };

    it("should fetch and ingest data for API data source", async () => {
      // Setup: data source exists with API config
      const mockDataSource = {
        id: "ds-123",
        type: "api",
        config: {
          apiFetch: {
            url: "https://api.example.com/data",
            method: "GET",
            syncFrequency: "24h",
          },
        },
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDataSource]),
          }),
        }),
      });

      mockFetchAndIngest.mockResolvedValue({
        success: true,
        rowCount: 100,
        columns: ["id", "name", "value"],
        duration: 1500,
      });

      const handler = createSyncApiDataSourceHandler();
      const result = await handler(mockJobData);

      expect(mockFetchAndIngest).toHaveBeenCalledWith(
        "ds-123",
        mockDataSource.config.apiFetch
      );
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(100);
      expect(result.duration).toBe(1500);
    });

    it("should update lastSyncAt on success", async () => {
      const mockDataSource = {
        id: "ds-123",
        type: "api",
        config: {
          apiFetch: {
            url: "https://api.example.com/data",
            method: "GET",
            syncFrequency: "24h",
          },
        },
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDataSource]),
          }),
        }),
      });

      mockFetchAndIngest.mockResolvedValue({
        success: true,
        rowCount: 50,
        columns: ["id"],
        duration: 500,
      });

      const handler = createSyncApiDataSourceHandler();
      const result = await handler(mockJobData);

      // The fetchAndIngest function handles updating lastSyncAt internally
      expect(result.success).toBe(true);
    });

    it("should update lastSyncStatus to error on failure", async () => {
      const mockDataSource = {
        id: "ds-123",
        type: "api",
        config: {
          apiFetch: {
            url: "https://api.example.com/data",
            method: "GET",
            syncFrequency: "24h",
          },
        },
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDataSource]),
          }),
        }),
      });

      mockFetchAndIngest.mockResolvedValue({
        success: false,
        rowCount: 0,
        columns: [],
        duration: 200,
        error: "Connection timeout",
      });

      const handler = createSyncApiDataSourceHandler();
      const result = await handler(mockJobData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection timeout");
    });

    it("should log sync duration and row count", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const mockDataSource = {
        id: "ds-123",
        type: "api",
        config: {
          apiFetch: {
            url: "https://api.example.com/data",
            method: "GET",
            syncFrequency: "24h",
          },
        },
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDataSource]),
          }),
        }),
      });

      mockFetchAndIngest.mockResolvedValue({
        success: true,
        rowCount: 250,
        columns: ["a", "b", "c"],
        duration: 3000,
      });

      const handler = createSyncApiDataSourceHandler();
      await handler(mockJobData);

      // Verify logging was called with sync metrics
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ds-123")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("250")
      );

      consoleSpy.mockRestore();
    });

    it("should skip non-API type data sources", async () => {
      const mockDataSource = {
        id: "ds-123",
        type: "csv", // Not an API type
        config: {},
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDataSource]),
          }),
        }),
      });

      const handler = createSyncApiDataSourceHandler();

      await expect(handler(mockJobData)).rejects.toThrow(
        "Data source is not an API type"
      );
      expect(mockFetchAndIngest).not.toHaveBeenCalled();
    });

    it("should handle missing data source", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const handler = createSyncApiDataSourceHandler();

      await expect(handler(mockJobData)).rejects.toThrow(
        "Data source not found"
      );
      expect(mockFetchAndIngest).not.toHaveBeenCalled();
    });

    it("should handle missing apiFetch config", async () => {
      const mockDataSource = {
        id: "ds-123",
        type: "api",
        config: {}, // No apiFetch config
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDataSource]),
          }),
        }),
      });

      const handler = createSyncApiDataSourceHandler();

      await expect(handler(mockJobData)).rejects.toThrow(
        "Data source has no API fetch configuration"
      );
      expect(mockFetchAndIngest).not.toHaveBeenCalled();
    });

    it("should include userId in job data if provided", async () => {
      const mockDataSourceWithUser: SyncApiDataSourceJob = {
        dataSourceId: "ds-123",
        userId: "user-456",
        triggeredBy: "schedule",
      };

      const mockDataSource = {
        id: "ds-123",
        type: "api",
        config: {
          apiFetch: {
            url: "https://api.example.com/data",
            method: "GET",
            syncFrequency: "6h",
          },
        },
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDataSource]),
          }),
        }),
      });

      mockFetchAndIngest.mockResolvedValue({
        success: true,
        rowCount: 10,
        columns: ["id"],
        duration: 100,
      });

      const handler = createSyncApiDataSourceHandler();
      const result = await handler(mockDataSourceWithUser);

      expect(result.success).toBe(true);
    });

    it("should handle fetch service throwing an error", async () => {
      const mockDataSource = {
        id: "ds-123",
        type: "api",
        config: {
          apiFetch: {
            url: "https://api.example.com/data",
            method: "GET",
            syncFrequency: "24h",
          },
        },
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDataSource]),
          }),
        }),
      });

      mockFetchAndIngest.mockRejectedValue(new Error("Network failure"));

      const handler = createSyncApiDataSourceHandler();

      await expect(handler(mockJobData)).rejects.toThrow("Network failure");
    });
  });
});
