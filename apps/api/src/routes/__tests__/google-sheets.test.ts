/**
 * Google Sheets API Routes Tests
 *
 * Tests for Google Sheets data routes:
 * - GET /api/v1/google/spreadsheets - List user's spreadsheets
 * - GET /api/v1/google/spreadsheets/:spreadsheetId/sheets - List sheets in a spreadsheet
 * - GET /api/v1/google/spreadsheets/:spreadsheetId/sheets/:sheetName/data - Get sheet data
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock environment variables
vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("FRONTEND_URL", "http://localhost:3000");

// Mock the OAuth tokens service
vi.mock("../../services/oauth-tokens.js", () => ({
  getGoogleCredentials: vi.fn(),
  storeGoogleCredentials: vi.fn(),
  revokeGoogleCredentials: vi.fn(),
  hasGoogleCredentials: vi.fn(),
}));

// Mock the Google Sheets service
vi.mock("../../services/google-sheets-service.js", () => ({
  listSpreadsheets: vi.fn(),
  listSheets: vi.fn(),
  fetchSheetData: vi.fn(),
  refreshTokenIfNeeded: vi.fn(),
}));

import { googleSheetsApp } from "../google-sheets.js";
import { getGoogleCredentials } from "../../services/oauth-tokens.js";
import {
  listSpreadsheets,
  listSheets,
  fetchSheetData,
} from "../../services/google-sheets-service.js";

describe("Google Sheets API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // GET /api/v1/google/spreadsheets
  // ===========================================================================
  describe("GET /api/v1/google/spreadsheets", () => {
    const mockCredentials = {
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresAt: Date.now() + 3600000,
    };

    const mockSpreadsheets = [
      { id: "spreadsheet-1", name: "Budget 2025" },
      { id: "spreadsheet-2", name: "Campaign Data" },
      { id: "spreadsheet-3", name: "Keywords List" },
    ];

    it("returns 401 when x-user-id header is missing", async () => {
      const res = await googleSheetsApp.request("/api/v1/google/spreadsheets");

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/user.*id|missing.*user/i);
      expect(data.code).toBe("MISSING_USER_ID");
    });

    it("returns 401 when user has no Google credentials", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(null);

      const res = await googleSheetsApp.request("/api/v1/google/spreadsheets", {
        headers: { "x-user-id": "user-123" },
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/google.*not.*connected|credentials/i);
      expect(data.code).toBe("GOOGLE_NOT_CONNECTED");
      expect(getGoogleCredentials).toHaveBeenCalledWith("user-123");
    });

    it("returns list of spreadsheets when user has valid credentials", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(listSpreadsheets).mockResolvedValue(mockSpreadsheets);

      const res = await googleSheetsApp.request("/api/v1/google/spreadsheets", {
        headers: { "x-user-id": "user-123" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.spreadsheets).toEqual(mockSpreadsheets);
      expect(data.spreadsheets).toHaveLength(3);
      expect(listSpreadsheets).toHaveBeenCalledWith(mockCredentials);
    });

    it("returns empty array when user has no spreadsheets", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(listSpreadsheets).mockResolvedValue([]);

      const res = await googleSheetsApp.request("/api/v1/google/spreadsheets", {
        headers: { "x-user-id": "user-123" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.spreadsheets).toEqual([]);
      expect(data.spreadsheets).toHaveLength(0);
    });

    it("returns 500 when listSpreadsheets throws a generic error", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(listSpreadsheets).mockRejectedValue(
        new Error("Network connection failed")
      );

      const res = await googleSheetsApp.request("/api/v1/google/spreadsheets", {
        headers: { "x-user-id": "user-123" },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(data.code).toBe("GOOGLE_API_ERROR");
    });

    it("returns 401 when token is expired and cannot be refreshed", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(listSpreadsheets).mockRejectedValue(
        new Error("Unauthorized: Invalid credentials for listing spreadsheets")
      );

      const res = await googleSheetsApp.request("/api/v1/google/spreadsheets", {
        headers: { "x-user-id": "user-123" },
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/unauthorized|invalid.*credentials/i);
      expect(data.code).toBe("GOOGLE_AUTH_ERROR");
    });
  });

  // ===========================================================================
  // GET /api/v1/google/spreadsheets/:spreadsheetId/sheets
  // ===========================================================================
  describe("GET /api/v1/google/spreadsheets/:spreadsheetId/sheets", () => {
    const mockCredentials = {
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresAt: Date.now() + 3600000,
    };

    const mockSheets = [
      { sheetId: 0, title: "Sheet1", index: 0 },
      { sheetId: 123456, title: "Campaign Data", index: 1 },
      { sheetId: 789012, title: "Keywords", index: 2 },
    ];

    it("returns 401 when x-user-id header is missing", async () => {
      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/spreadsheet-123/sheets"
      );

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/user.*id|missing.*user/i);
      expect(data.code).toBe("MISSING_USER_ID");
    });

    it("returns 401 when user has no Google credentials", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(null);

      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/spreadsheet-123/sheets",
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/google.*not.*connected|credentials/i);
      expect(data.code).toBe("GOOGLE_NOT_CONNECTED");
    });

    it("returns list of sheets for valid spreadsheet ID", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(listSheets).mockResolvedValue(mockSheets);

      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/spreadsheet-123/sheets",
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.sheets).toEqual(mockSheets);
      expect(data.sheets).toHaveLength(3);
      expect(listSheets).toHaveBeenCalledWith(mockCredentials, "spreadsheet-123");
    });

    it("returns 404 when spreadsheet is not found", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(listSheets).mockRejectedValue(
        new Error("Not found: spreadsheet invalid-id does not exist")
      );

      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/invalid-id/sheets",
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toMatch(/not found|does not exist/i);
      expect(data.code).toBe("SPREADSHEET_NOT_FOUND");
    });

    it("returns 403 when user has no access to spreadsheet", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(listSheets).mockRejectedValue(
        new Error("Permission denied: Access forbidden for spreadsheet-123")
      );

      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/spreadsheet-123/sheets",
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/permission|forbidden|access/i);
      expect(data.code).toBe("ACCESS_DENIED");
    });

    it("handles spreadsheet ID with special characters", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(listSheets).mockResolvedValue(mockSheets);

      const spreadsheetId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
      const res = await googleSheetsApp.request(
        `/api/v1/google/spreadsheets/${spreadsheetId}/sheets`,
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(200);
      expect(listSheets).toHaveBeenCalledWith(mockCredentials, spreadsheetId);
    });
  });

  // ===========================================================================
  // GET /api/v1/google/spreadsheets/:spreadsheetId/sheets/:sheetName/data
  // ===========================================================================
  describe("GET /api/v1/google/spreadsheets/:spreadsheetId/sheets/:sheetName/data", () => {
    const mockCredentials = {
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresAt: Date.now() + 3600000,
    };

    const mockSheetData = [
      { Name: "Alice", Email: "alice@example.com", City: "New York" },
      { Name: "Bob", Email: "bob@example.com", City: "Los Angeles" },
      { Name: "Charlie", Email: "charlie@example.com", City: "Chicago" },
    ];

    it("returns 401 when x-user-id header is missing", async () => {
      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/spreadsheet-123/sheets/Sheet1/data"
      );

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/user.*id|missing.*user/i);
      expect(data.code).toBe("MISSING_USER_ID");
    });

    it("returns 401 when user has no Google credentials", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(null);

      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/spreadsheet-123/sheets/Sheet1/data",
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/google.*not.*connected|credentials/i);
      expect(data.code).toBe("GOOGLE_NOT_CONNECTED");
    });

    it("returns sheet data with columns for valid request", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(fetchSheetData).mockResolvedValue(mockSheetData);

      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/spreadsheet-123/sheets/Sheet1/data",
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toEqual(mockSheetData);
      expect(data.columns).toEqual(["Name", "Email", "City"]);
      expect(data.rowCount).toBe(3);
      expect(fetchSheetData).toHaveBeenCalledWith(
        mockCredentials,
        "spreadsheet-123",
        "Sheet1",
        1 // default headerRow
      );
    });

    it("returns empty data and columns for empty sheet", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(fetchSheetData).mockResolvedValue([]);

      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/spreadsheet-123/sheets/Sheet1/data",
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toEqual([]);
      expect(data.columns).toEqual([]);
      expect(data.rowCount).toBe(0);
    });

    it("supports custom headerRow query parameter", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(fetchSheetData).mockResolvedValue(mockSheetData);

      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/spreadsheet-123/sheets/Sheet1/data?headerRow=3",
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(200);
      expect(fetchSheetData).toHaveBeenCalledWith(
        mockCredentials,
        "spreadsheet-123",
        "Sheet1",
        3
      );
    });

    it("handles URL-encoded sheet names with spaces", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(fetchSheetData).mockResolvedValue(mockSheetData);

      const sheetName = "Campaign Data 2025";
      const encodedSheetName = encodeURIComponent(sheetName);
      const res = await googleSheetsApp.request(
        `/api/v1/google/spreadsheets/spreadsheet-123/sheets/${encodedSheetName}/data`,
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(200);
      expect(fetchSheetData).toHaveBeenCalledWith(
        mockCredentials,
        "spreadsheet-123",
        sheetName,
        1
      );
    });

    it("handles sheet names with special characters", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(fetchSheetData).mockResolvedValue(mockSheetData);

      const sheetName = "Q1 Budget (Final)";
      const encodedSheetName = encodeURIComponent(sheetName);
      const res = await googleSheetsApp.request(
        `/api/v1/google/spreadsheets/spreadsheet-123/sheets/${encodedSheetName}/data`,
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(200);
      expect(fetchSheetData).toHaveBeenCalledWith(
        mockCredentials,
        "spreadsheet-123",
        sheetName,
        1
      );
    });

    it("returns 404 when spreadsheet is not found", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(fetchSheetData).mockRejectedValue(
        new Error("Not found: spreadsheet invalid-id does not exist")
      );

      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/invalid-id/sheets/Sheet1/data",
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toMatch(/not found|does not exist/i);
      expect(data.code).toBe("SPREADSHEET_NOT_FOUND");
    });

    it("returns 404 when sheet is not found", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(fetchSheetData).mockRejectedValue(
        new Error('Not found: sheet "NonExistent" in spreadsheet spreadsheet-123 does not exist')
      );

      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/spreadsheet-123/sheets/NonExistent/data",
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toMatch(/not found|does not exist/i);
      expect(data.code).toBe("SHEET_NOT_FOUND");
    });

    it("returns 403 when user has no access", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(fetchSheetData).mockRejectedValue(
        new Error("Permission denied: Access forbidden for spreadsheet-123")
      );

      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/spreadsheet-123/sheets/Sheet1/data",
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/permission|forbidden|access/i);
      expect(data.code).toBe("ACCESS_DENIED");
    });

    it("returns 429 when rate limited", async () => {
      vi.mocked(getGoogleCredentials).mockResolvedValue(mockCredentials);
      vi.mocked(fetchSheetData).mockRejectedValue(
        new Error("Rate limit exceeded for sheet data. Please try again later.")
      );

      const res = await googleSheetsApp.request(
        "/api/v1/google/spreadsheets/spreadsheet-123/sheets/Sheet1/data",
        { headers: { "x-user-id": "user-123" } }
      );

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toMatch(/rate limit|too many/i);
      expect(data.code).toBe("RATE_LIMITED");
    });
  });
});
