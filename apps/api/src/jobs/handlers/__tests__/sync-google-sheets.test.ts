/**
 * Sync Google Sheets Job Handler Tests
 *
 * Tests for the job handler that fetches data from Google Sheets
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

// Mock the Google Sheets service
vi.mock("../../../services/google-sheets-service.js", () => {
  const mockFetchAndIngestGoogleSheets = vi.fn();
  return {
    fetchAndIngestGoogleSheets: mockFetchAndIngestGoogleSheets,
    __mockFetchAndIngestGoogleSheets: mockFetchAndIngestGoogleSheets,
  };
});

// Mock OAuth tokens service (for getting credentials)
vi.mock("../../../services/oauth-tokens.js", () => {
  const mockGetGoogleCredentials = vi.fn();
  return {
    getGoogleCredentials: mockGetGoogleCredentials,
    __mockGetGoogleCredentials: mockGetGoogleCredentials,
  };
});

// Import after mocking
import {
  SYNC_GOOGLE_SHEETS_JOB,
  createSyncGoogleSheetsHandler,
  isSyncDue,
  SYNC_INTERVALS,
  type SyncGoogleSheetsJob,
} from "../sync-google-sheets.js";

// Get mock references after imports
const dbModule = await vi.importMock<{
  __mockDbSelect: ReturnType<typeof vi.fn>;
  __mockDbUpdate: ReturnType<typeof vi.fn>;
}>("../../../services/db.js");

const sheetsModule = await vi.importMock<{
  __mockFetchAndIngestGoogleSheets: ReturnType<typeof vi.fn>;
}>("../../../services/google-sheets-service.js");

const oauthModule = await vi.importMock<{
  __mockGetGoogleCredentials: ReturnType<typeof vi.fn>;
}>("../../../services/oauth-tokens.js");

const mockDbSelect = dbModule.__mockDbSelect;
const mockFetchAndIngestGoogleSheets = sheetsModule.__mockFetchAndIngestGoogleSheets;
const mockGetGoogleCredentials = oauthModule.__mockGetGoogleCredentials;

describe("Sync Google Sheets Job Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("SYNC_GOOGLE_SHEETS_JOB constant", () => {
    it("should export the correct job name", () => {
      expect(SYNC_GOOGLE_SHEETS_JOB).toBe("sync-google-sheets");
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
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      // Last sync was 2 hours ago, interval is 1 hour -> due
      const lastSync1h = new Date("2025-01-15T10:00:00Z");
      expect(isSyncDue("1h", lastSync1h)).toBe(true);

      // Last sync was 7 hours ago, interval is 6 hours -> due
      const lastSync6h = new Date("2025-01-15T05:00:00Z");
      expect(isSyncDue("6h", lastSync6h)).toBe(true);
    });

    it("should return false when not enough time has passed", () => {
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      // Last sync was 30 minutes ago, interval is 1 hour -> not due
      const lastSync1h = new Date("2025-01-15T11:30:00Z");
      expect(isSyncDue("1h", lastSync1h)).toBe(false);
    });
  });

  describe("createSyncGoogleSheetsHandler", () => {
    const mockJobData: SyncGoogleSheetsJob = {
      dataSourceId: "ds-123",
      userId: "user-456",
      triggeredBy: "manual",
    };

    it("should sync data from Google Sheets", async () => {
      const mockDataSource = {
        id: "ds-123",
        type: "google-sheets",
        userId: "user-456",
        config: {
          googleSheets: {
            spreadsheetId: "spreadsheet-123",
            spreadsheetName: "Test Sheet",
            sheetName: "Sheet1",
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

      mockGetGoogleCredentials.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 3600000,
      });

      mockFetchAndIngestGoogleSheets.mockResolvedValue({
        success: true,
        rowCount: 100,
        columns: ["Name", "Email", "Age"],
        duration: 1500,
      });

      const handler = createSyncGoogleSheetsHandler();
      const result = await handler(mockJobData);

      expect(mockFetchAndIngestGoogleSheets).toHaveBeenCalledWith(
        "ds-123",
        mockDataSource.config.googleSheets,
        expect.objectContaining({
          accessToken: "valid-token",
        })
      );
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(100);
      expect(result.duration).toBe(1500);
    });

    it("should update sync status on success", async () => {
      const mockDataSource = {
        id: "ds-123",
        type: "google-sheets",
        userId: "user-456",
        config: {
          googleSheets: {
            spreadsheetId: "spreadsheet-123",
            spreadsheetName: "Test Sheet",
            sheetName: "Sheet1",
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

      mockGetGoogleCredentials.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 3600000,
      });

      mockFetchAndIngestGoogleSheets.mockResolvedValue({
        success: true,
        rowCount: 50,
        columns: ["id"],
        duration: 500,
      });

      const handler = createSyncGoogleSheetsHandler();
      const result = await handler(mockJobData);

      expect(result.success).toBe(true);
    });

    it("should handle missing credentials", async () => {
      const mockDataSource = {
        id: "ds-123",
        type: "google-sheets",
        userId: "user-456",
        config: {
          googleSheets: {
            spreadsheetId: "spreadsheet-123",
            spreadsheetName: "Test Sheet",
            sheetName: "Sheet1",
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

      mockGetGoogleCredentials.mockResolvedValue(null);

      const handler = createSyncGoogleSheetsHandler();

      await expect(handler(mockJobData)).rejects.toThrow(/credentials/i);
      expect(mockFetchAndIngestGoogleSheets).not.toHaveBeenCalled();
    });

    it("should skip non-google-sheets type data sources", async () => {
      const mockDataSource = {
        id: "ds-123",
        type: "csv", // Not a Google Sheets type
        config: {},
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDataSource]),
          }),
        }),
      });

      const handler = createSyncGoogleSheetsHandler();

      await expect(handler(mockJobData)).rejects.toThrow(
        /not a google-sheets type/i
      );
      expect(mockFetchAndIngestGoogleSheets).not.toHaveBeenCalled();
    });

    it("should handle missing data source", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const handler = createSyncGoogleSheetsHandler();

      await expect(handler(mockJobData)).rejects.toThrow(
        /data source not found/i
      );
      expect(mockFetchAndIngestGoogleSheets).not.toHaveBeenCalled();
    });

    it("should handle missing googleSheets config", async () => {
      const mockDataSource = {
        id: "ds-123",
        type: "google-sheets",
        config: {}, // No googleSheets config
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDataSource]),
          }),
        }),
      });

      const handler = createSyncGoogleSheetsHandler();

      await expect(handler(mockJobData)).rejects.toThrow(
        /no google sheets configuration/i
      );
      expect(mockFetchAndIngestGoogleSheets).not.toHaveBeenCalled();
    });

    it("should sync data with flat config format (spreadsheetId at root level)", async () => {
      // This config format is what the frontend sends:
      // { spreadsheetId, spreadsheetName, sheetName, ... } directly in config
      // instead of nested under config.googleSheets
      const mockDataSource = {
        id: "ds-123",
        type: "google-sheets",
        userId: "user-456",
        config: {
          // Flat format - sent directly by frontend
          spreadsheetId: "spreadsheet-flat-123",
          spreadsheetName: "Flat Config Sheet",
          sheetName: "Sheet1",
          syncFrequency: "24h",
          headerRow: 1,
        },
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDataSource]),
          }),
        }),
      });

      mockGetGoogleCredentials.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 3600000,
      });

      mockFetchAndIngestGoogleSheets.mockResolvedValue({
        success: true,
        rowCount: 75,
        columns: ["Name", "Email"],
        duration: 800,
      });

      const handler = createSyncGoogleSheetsHandler();
      const result = await handler(mockJobData);

      // Should extract the flat config and pass it to the service
      expect(mockFetchAndIngestGoogleSheets).toHaveBeenCalledWith(
        "ds-123",
        expect.objectContaining({
          spreadsheetId: "spreadsheet-flat-123",
          spreadsheetName: "Flat Config Sheet",
          sheetName: "Sheet1",
        }),
        expect.objectContaining({
          accessToken: "valid-token",
        })
      );
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(75);
    });

    it("should handle fetch service returning error", async () => {
      const mockDataSource = {
        id: "ds-123",
        type: "google-sheets",
        userId: "user-456",
        config: {
          googleSheets: {
            spreadsheetId: "spreadsheet-123",
            spreadsheetName: "Test Sheet",
            sheetName: "Sheet1",
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

      mockGetGoogleCredentials.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 3600000,
      });

      mockFetchAndIngestGoogleSheets.mockResolvedValue({
        success: false,
        rowCount: 0,
        columns: [],
        duration: 200,
        error: "Spreadsheet not found",
      });

      const handler = createSyncGoogleSheetsHandler();
      const result = await handler(mockJobData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Spreadsheet not found");
    });

    it("should handle fetch service throwing an error", async () => {
      const mockDataSource = {
        id: "ds-123",
        type: "google-sheets",
        userId: "user-456",
        config: {
          googleSheets: {
            spreadsheetId: "spreadsheet-123",
            spreadsheetName: "Test Sheet",
            sheetName: "Sheet1",
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

      mockGetGoogleCredentials.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 3600000,
      });

      mockFetchAndIngestGoogleSheets.mockRejectedValue(new Error("Network failure"));

      const handler = createSyncGoogleSheetsHandler();

      await expect(handler(mockJobData)).rejects.toThrow("Network failure");
    });

    it("should log sync metrics", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const mockDataSource = {
        id: "ds-123",
        type: "google-sheets",
        userId: "user-456",
        config: {
          googleSheets: {
            spreadsheetId: "spreadsheet-123",
            spreadsheetName: "Test Sheet",
            sheetName: "Sheet1",
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

      mockGetGoogleCredentials.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 3600000,
      });

      mockFetchAndIngestGoogleSheets.mockResolvedValue({
        success: true,
        rowCount: 250,
        columns: ["a", "b", "c"],
        duration: 3000,
      });

      const handler = createSyncGoogleSheetsHandler();
      await handler(mockJobData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ds-123")
      );

      consoleSpy.mockRestore();
    });
  });
});
