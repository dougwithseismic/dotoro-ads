/**
 * Google Sheets Service Tests
 *
 * TDD test suite for the Google Sheets service that fetches data from
 * Google Sheets API, handles OAuth tokens, and prepares data for ingestion.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { GoogleSheetsConfig } from "@repo/database/schema";

// Mock environment variables
vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");

// Mock the database module before importing the service
vi.mock("../db.js", () => {
  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue([{ config: {} }]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    transaction: vi.fn(),
  };

  return {
    db: mockDb,
    dataSources: { id: "id" },
    dataRows: { dataSourceId: "dataSourceId" },
  };
});

// Import the service after mocking
import {
  listSpreadsheets,
  listSheets,
  fetchSheetData,
  refreshTokenIfNeeded,
  type GoogleSheetsCredentials,
  type Spreadsheet,
  type Sheet,
} from "../google-sheets-service.js";
import { db } from "../db.js";

// Helper to create mock fetch responses
function createMockResponse(
  data: unknown,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    contentType?: string;
  } = {}
) {
  const {
    status = 200,
    statusText = "OK",
    headers = {},
    contentType = "application/json",
  } = options;

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers({
      "content-type": contentType,
      ...headers,
    }),
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

// Helper to create valid credentials
function createCredentials(overrides: Partial<GoogleSheetsCredentials> = {}): GoogleSheetsCredentials {
  return {
    accessToken: "valid-access-token",
    refreshToken: "valid-refresh-token",
    expiresAt: Date.now() + 3600000, // 1 hour from now
    ...overrides,
  };
}

// Helper to reset all mocks before each test
function resetDbMocks() {
  vi.mocked(db.select).mockClear();
  vi.mocked(db.update).mockClear();
  vi.mocked(db.insert).mockClear();
  vi.mocked(db.delete).mockClear();

  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue([{ config: {} }]),
      }),
    }),
  } as never);

  vi.mocked(db.update).mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as never);

  vi.mocked(db.insert).mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  } as never);

  vi.mocked(db.delete).mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  } as never);
}

describe("GoogleSheetsService", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    resetDbMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("listSpreadsheets", () => {
    it("fetches spreadsheet list from Google Drive API", async () => {
      const mockSpreadsheets = {
        files: [
          { id: "sheet1", name: "Budget 2025", mimeType: "application/vnd.google-apps.spreadsheet" },
          { id: "sheet2", name: "Inventory", mimeType: "application/vnd.google-apps.spreadsheet" },
        ],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockSpreadsheets));

      const credentials = createCredentials();
      const result = await listSpreadsheets(credentials);

      // Verify the fetch was called with the correct URL pattern and auth header
      expect(mockFetch).toHaveBeenCalled();
      const [calledUrl, calledOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toContain("googleapis.com/drive");
      expect((calledOptions.headers as Record<string, string>)["Authorization"]).toBe("Bearer valid-access-token");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "sheet1", name: "Budget 2025" });
      expect(result[1]).toEqual({ id: "sheet2", name: "Inventory" });
    });

    it("returns empty array when no spreadsheets found", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ files: [] }));

      const credentials = createCredentials();
      const result = await listSpreadsheets(credentials);

      expect(result).toEqual([]);
    });

    it("handles API errors gracefully", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(
          { error: { message: "Invalid credentials" } },
          { status: 401, statusText: "Unauthorized" }
        )
      );

      const credentials = createCredentials();

      await expect(listSpreadsheets(credentials)).rejects.toThrow(
        /unauthorized|invalid credentials/i
      );
    });

    it("handles network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const credentials = createCredentials();

      await expect(listSpreadsheets(credentials)).rejects.toThrow("Network error");
    });
  });

  describe("listSheets", () => {
    it("fetches sheet tabs from a spreadsheet", async () => {
      const mockSheetData = {
        sheets: [
          { properties: { sheetId: 0, title: "Sheet1", index: 0 } },
          { properties: { sheetId: 1, title: "Data", index: 1 } },
          { properties: { sheetId: 2, title: "Summary", index: 2 } },
        ],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockSheetData));

      const credentials = createCredentials();
      const result = await listSheets(credentials, "spreadsheet-id-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("sheets.googleapis.com"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer valid-access-token",
          }),
        })
      );
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ sheetId: 0, title: "Sheet1", index: 0 });
      expect(result[1]).toEqual({ sheetId: 1, title: "Data", index: 1 });
    });

    it("handles spreadsheet not found", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(
          { error: { message: "Spreadsheet not found" } },
          { status: 404, statusText: "Not Found" }
        )
      );

      const credentials = createCredentials();

      await expect(listSheets(credentials, "invalid-id")).rejects.toThrow(
        /not found/i
      );
    });
  });

  describe("fetchSheetData", () => {
    it("fetches sheet data with headers from row 1 by default", async () => {
      const mockValues = {
        values: [
          ["Name", "Email", "Age"],
          ["Alice", "alice@example.com", "30"],
          ["Bob", "bob@example.com", "25"],
        ],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockValues));

      const credentials = createCredentials();
      const result = await fetchSheetData(credentials, "spreadsheet-123", "Sheet1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("sheets.googleapis.com"),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ Name: "Alice", Email: "alice@example.com", Age: "30" });
      expect(result[1]).toEqual({ Name: "Bob", Email: "bob@example.com", Age: "25" });
    });

    it("uses custom header row when specified", async () => {
      const mockValues = {
        values: [
          ["Metadata row 1"],
          ["Metadata row 2"],
          ["Name", "Email", "Age"], // Header at row 3
          ["Alice", "alice@example.com", "30"],
          ["Bob", "bob@example.com", "25"],
        ],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockValues));

      const credentials = createCredentials();
      const result = await fetchSheetData(credentials, "spreadsheet-123", "Sheet1", 3);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ Name: "Alice", Email: "alice@example.com", Age: "30" });
    });

    it("handles empty sheet gracefully", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ values: [] }));

      const credentials = createCredentials();
      const result = await fetchSheetData(credentials, "spreadsheet-123", "Sheet1");

      expect(result).toEqual([]);
    });

    it("handles sheet with only headers (no data rows)", async () => {
      const mockValues = {
        values: [
          ["Name", "Email", "Age"],
        ],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockValues));

      const credentials = createCredentials();
      const result = await fetchSheetData(credentials, "spreadsheet-123", "Sheet1");

      expect(result).toEqual([]);
    });

    it("handles rows with missing columns", async () => {
      const mockValues = {
        values: [
          ["Name", "Email", "Age"],
          ["Alice"], // Missing Email and Age
          ["Bob", "bob@example.com"], // Missing Age
          ["Carol", "carol@example.com", "35"],
        ],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockValues));

      const credentials = createCredentials();
      const result = await fetchSheetData(credentials, "spreadsheet-123", "Sheet1");

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ Name: "Alice", Email: "", Age: "" });
      expect(result[1]).toEqual({ Name: "Bob", Email: "bob@example.com", Age: "" });
      expect(result[2]).toEqual({ Name: "Carol", Email: "carol@example.com", Age: "35" });
    });

    it("sanitizes column headers with special characters", async () => {
      const mockValues = {
        values: [
          ["First Name", "Last Name!", "Age (years)"],
          ["Alice", "Smith", "30"],
        ],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockValues));

      const credentials = createCredentials();
      const result = await fetchSheetData(credentials, "spreadsheet-123", "Sheet1");

      expect(result[0]).toEqual({
        "First Name": "Alice",
        "Last Name!": "Smith",
        "Age (years)": "30",
      });
    });

    it("handles API rate limiting (429)", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(
          { error: { message: "Rate limit exceeded" } },
          { status: 429, statusText: "Too Many Requests", headers: { "Retry-After": "60" } }
        )
      );

      const credentials = createCredentials();

      await expect(fetchSheetData(credentials, "spreadsheet-123", "Sheet1")).rejects.toThrow(
        /rate limit/i
      );
    });

    it("handles permission denied errors", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(
          { error: { message: "The caller does not have permission" } },
          { status: 403, statusText: "Forbidden" }
        )
      );

      const credentials = createCredentials();

      await expect(fetchSheetData(credentials, "spreadsheet-123", "Sheet1")).rejects.toThrow(
        /permission|forbidden/i
      );
    });
  });

  describe("refreshTokenIfNeeded", () => {
    it("returns original credentials if token is not expired", async () => {
      const credentials = createCredentials({
        expiresAt: Date.now() + 3600000, // 1 hour from now
      });

      const result = await refreshTokenIfNeeded(credentials);

      expect(result).toEqual(credentials);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("refreshes token when expired", async () => {
      const mockTokenResponse = {
        access_token: "new-access-token",
        expires_in: 3600,
        token_type: "Bearer",
      };
      mockFetch.mockResolvedValue(createMockResponse(mockTokenResponse));

      const credentials = createCredentials({
        expiresAt: Date.now() - 1000, // Already expired
      });

      const result = await refreshTokenIfNeeded(credentials);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("oauth2.googleapis.com/token"),
        expect.objectContaining({
          method: "POST",
        })
      );
      expect(result.accessToken).toBe("new-access-token");
    });

    it("refreshes token when expiring within buffer (5 minutes)", async () => {
      const mockTokenResponse = {
        access_token: "new-access-token",
        expires_in: 3600,
        token_type: "Bearer",
      };
      mockFetch.mockResolvedValue(createMockResponse(mockTokenResponse));

      const credentials = createCredentials({
        expiresAt: Date.now() + 60000, // Expires in 1 minute (within 5 minute buffer)
      });

      const result = await refreshTokenIfNeeded(credentials);

      expect(mockFetch).toHaveBeenCalled();
      expect(result.accessToken).toBe("new-access-token");
    });

    it("handles token refresh failure", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(
          { error: "invalid_grant", error_description: "Token has been revoked" },
          { status: 400, statusText: "Bad Request" }
        )
      );

      const credentials = createCredentials({
        expiresAt: Date.now() - 1000, // Already expired
      });

      await expect(refreshTokenIfNeeded(credentials)).rejects.toThrow(
        /revoked|invalid/i
      );
    });

    it("throws when no refresh token available and access token expired", async () => {
      const credentials: GoogleSheetsCredentials = {
        accessToken: "expired-token",
        refreshToken: "", // No refresh token
        expiresAt: Date.now() - 1000,
      };

      await expect(refreshTokenIfNeeded(credentials)).rejects.toThrow(
        /no refresh token/i
      );
    });
  });
});
