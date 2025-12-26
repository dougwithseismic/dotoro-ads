/**
 * Test Connection Endpoint Tests
 *
 * Tests for POST /api/v1/data-sources/test-connection
 * This endpoint allows users to test an API connection before creating a data source.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { testClient } from "hono/testing";
import { dataSourcesApp } from "../../routes/data-sources.js";

// Mock the api-fetch-service
vi.mock("../../services/api-fetch-service.js", () => ({
  testApiConnection: vi.fn(),
}));

// Mock the database module
vi.mock("../../services/db.js", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  dataSources: {},
  dataRows: {},
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
  hasStoredData: vi.fn(),
  deleteStoredData: vi.fn(),
  clearAllStoredData: vi.fn(),
}));

import { testApiConnection } from "../../services/api-fetch-service.js";

describe("POST /api/v1/data-sources/test-connection", () => {
  const client = testClient(dataSourcesApp);
  const mockTestApiConnection = vi.mocked(testApiConnection);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Successful connections", () => {
    it("returns success with preview data for valid GET request", async () => {
      mockTestApiConnection.mockResolvedValue({
        success: true,
        preview: {
          headers: ["id", "name", "price"],
          rows: [
            { id: 1, name: "Product A", price: 29.99 },
            { id: 2, name: "Product B", price: 49.99 },
          ],
        },
      });

      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "https://api.example.com/products",
          method: "GET",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.preview).toBeDefined();
      expect(data.preview?.headers).toEqual(["id", "name", "price"]);
      expect(data.preview?.rows).toHaveLength(2);
    });

    it("returns success with POST request", async () => {
      mockTestApiConnection.mockResolvedValue({
        success: true,
        preview: {
          headers: ["id", "result"],
          rows: [{ id: 1, result: "success" }],
        },
      });

      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "https://api.example.com/query",
          method: "POST",
          body: JSON.stringify({ filter: "active" }),
          headers: { "Content-Type": "application/json" },
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify the service was called with correct parameters
      expect(mockTestApiConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://api.example.com/query",
          method: "POST",
          body: JSON.stringify({ filter: "active" }),
        })
      );
    });

    it("passes flatten config to service", async () => {
      mockTestApiConnection.mockResolvedValue({
        success: true,
        preview: {
          headers: ["id", "details.category"],
          rows: [{ id: 1, "details.category": "A" }],
        },
      });

      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "https://api.example.com/nested",
          method: "GET",
          flattenConfig: {
            dataPath: "data.items",
            arrayHandling: "join",
            maxDepth: 3,
          },
        },
      });

      expect(response.status).toBe(200);
      expect(mockTestApiConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          flattenConfig: {
            dataPath: "data.items",
            arrayHandling: "join",
            maxDepth: 3,
            arraySeparator: undefined,
          },
        })
      );
    });

    it("passes authentication credentials to service", async () => {
      mockTestApiConnection.mockResolvedValue({
        success: true,
        preview: {
          headers: ["id"],
          rows: [{ id: 1 }],
        },
      });

      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "https://api.example.com/secure",
          method: "GET",
          authType: "bearer",
          authCredentials: "my-secret-token",
        },
      });

      expect(response.status).toBe(200);
      expect(mockTestApiConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          authType: "bearer",
          authCredentials: "my-secret-token",
        })
      );
    });
  });

  describe("Failed connections", () => {
    it("returns error for connection failure", async () => {
      mockTestApiConnection.mockResolvedValue({
        success: false,
        error: "Network error: Failed to fetch",
      });

      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "https://invalid-api.example.com/data",
          method: "GET",
        },
      });

      expect(response.status).toBe(200); // Still 200, but success is false
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Network error");
      expect(data.preview).toBeUndefined();
    });

    it("returns error for non-JSON response", async () => {
      mockTestApiConnection.mockResolvedValue({
        success: false,
        error: "Response is not JSON. Expected application/json content type.",
      });

      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "https://api.example.com/html",
          method: "GET",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("JSON");
    });

    it("returns error for rate limiting", async () => {
      mockTestApiConnection.mockResolvedValue({
        success: false,
        error: "Rate limit exceeded. Retry after 60 seconds.",
      });

      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "https://api.example.com/limited",
          method: "GET",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Rate limit");
    });
  });

  describe("Request validation", () => {
    it("rejects invalid URL format", async () => {
      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "not-a-valid-url",
          method: "GET",
        },
      });

      // Should return validation error
      expect(response.status).toBe(400);
    });

    it("rejects missing required fields", async () => {
      // @ts-expect-error - intentionally omitting required field
      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "https://api.example.com/data",
          // method is missing
        },
      });

      expect(response.status).toBe(400);
    });

    it("rejects invalid method", async () => {
      // @ts-expect-error - intentionally using invalid method
      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "https://api.example.com/data",
          method: "DELETE", // Only GET and POST are allowed
        },
      });

      expect(response.status).toBe(400);
    });

    it("rejects invalid arrayHandling value", async () => {
      // @ts-expect-error - intentionally using invalid value
      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "https://api.example.com/data",
          method: "GET",
          flattenConfig: {
            arrayHandling: "invalid",
          },
        },
      });

      expect(response.status).toBe(400);
    });
  });

  describe("All auth types", () => {
    it("supports 'none' auth type", async () => {
      mockTestApiConnection.mockResolvedValue({
        success: true,
        preview: { headers: ["id"], rows: [{ id: 1 }] },
      });

      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "https://api.example.com/public",
          method: "GET",
          authType: "none",
        },
      });

      expect(response.status).toBe(200);
      expect(mockTestApiConnection).toHaveBeenCalledWith(
        expect.objectContaining({ authType: "none" })
      );
    });

    it("supports 'api-key' auth type", async () => {
      mockTestApiConnection.mockResolvedValue({
        success: true,
        preview: { headers: ["id"], rows: [{ id: 1 }] },
      });

      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "https://api.example.com/secure",
          method: "GET",
          authType: "api-key",
          authCredentials: "api-key-12345",
        },
      });

      expect(response.status).toBe(200);
      expect(mockTestApiConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          authType: "api-key",
          authCredentials: "api-key-12345",
        })
      );
    });

    it("supports 'basic' auth type", async () => {
      mockTestApiConnection.mockResolvedValue({
        success: true,
        preview: { headers: ["id"], rows: [{ id: 1 }] },
      });

      const credentials = Buffer.from("user:pass").toString("base64");
      const response = await client["api/v1/data-sources/test-connection"].$post({
        json: {
          url: "https://api.example.com/secure",
          method: "GET",
          authType: "basic",
          authCredentials: credentials,
        },
      });

      expect(response.status).toBe(200);
      expect(mockTestApiConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          authType: "basic",
          authCredentials: credentials,
        })
      );
    });
  });
});
