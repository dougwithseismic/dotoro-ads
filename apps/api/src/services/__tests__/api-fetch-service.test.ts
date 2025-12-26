/**
 * API Fetch Service Tests
 *
 * TDD test suite for the API fetch service that fetches data from external APIs,
 * flattens the response, and inserts it into a data source.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ApiFetchConfig } from "@repo/database/schema";

// Mock the database module before importing the service
// Note: vi.mock is hoisted, so we can't reference variables defined outside
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
  fetchAndIngest,
  testApiConnection,
} from "../api-fetch-service.js";
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

// Helper to create a basic ApiFetchConfig
function createConfig(overrides: Partial<ApiFetchConfig> = {}): ApiFetchConfig {
  return {
    url: "https://api.example.com/data",
    method: "GET",
    syncFrequency: "manual",
    ...overrides,
  };
}

// Helper to reset all mocks before each test
function resetDbMocks() {
  vi.mocked(db.select).mockClear();
  vi.mocked(db.update).mockClear();
  vi.mocked(db.insert).mockClear();
  vi.mocked(db.delete).mockClear();

  // Reset the mock implementations
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

describe("fetchAndIngest", () => {
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

  describe("HTTP Request Handling", () => {
    it("fetches data from GET endpoint", async () => {
      const mockData = [{ id: 1, name: "Test" }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({ method: "GET", flattenConfig: { arrayHandling: "join" } });
      const result = await fetchAndIngest("ds-123", config);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.objectContaining({
          method: "GET",
          signal: expect.any(AbortSignal),
        })
      );
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(1);
    });

    it("fetches data from POST endpoint with body", async () => {
      const mockData = [{ id: 1, name: "Test" }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({
        method: "POST",
        body: JSON.stringify({ query: "test" }),
        headers: { "Content-Type": "application/json" },
        flattenConfig: { arrayHandling: "join" },
      });
      const result = await fetchAndIngest("ds-123", config);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ query: "test" }),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
      expect(result.success).toBe(true);
    });

    it("auto-sets Content-Type to application/json for POST with body when not specified", async () => {
      const mockData = [{ id: 1, name: "Test" }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({
        method: "POST",
        body: JSON.stringify({ query: "test" }),
        flattenConfig: { arrayHandling: "join" },
        // No Content-Type header specified
      });
      const result = await fetchAndIngest("ds-123", config);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ query: "test" }),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
      expect(result.success).toBe(true);
    });

    it("does not override existing Content-Type header for POST", async () => {
      const mockData = [{ id: 1, name: "Test" }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({
        method: "POST",
        body: "key=value",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        flattenConfig: { arrayHandling: "join" },
      });
      const result = await fetchAndIngest("ds-123", config);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
          }),
        })
      );
      expect(result.success).toBe(true);
    });

    it("does not override lowercase content-type header for POST", async () => {
      const mockData = [{ id: 1, name: "Test" }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({
        method: "POST",
        body: "key=value",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        flattenConfig: { arrayHandling: "join" },
      });
      const result = await fetchAndIngest("ds-123", config);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "content-type": "application/x-www-form-urlencoded",
          }),
        })
      );
      expect(result.success).toBe(true);
    });

    it("handles timeout after 30 seconds", async () => {
      // Simulate an abort error that would be thrown when timeout triggers
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      const config = createConfig();
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("timeout");
    });
  });

  describe("Authentication", () => {
    it("injects auth headers for bearer token", async () => {
      const mockData = [{ id: 1 }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({
        authType: "bearer",
        authCredentials: "my-secret-token",
        flattenConfig: { arrayHandling: "join" },
      });
      await fetchAndIngest("ds-123", config);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer my-secret-token",
          }),
        })
      );
    });

    it("injects auth headers for API key", async () => {
      const mockData = [{ id: 1 }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({
        authType: "api-key",
        authCredentials: "api-key-12345",
        flattenConfig: { arrayHandling: "join" },
      });
      await fetchAndIngest("ds-123", config);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-API-Key": "api-key-12345",
          }),
        })
      );
    });

    it("injects auth headers for basic auth", async () => {
      const mockData = [{ id: 1 }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      // base64 encoded "user:pass"
      const credentials = Buffer.from("user:pass").toString("base64");
      const config = createConfig({
        authType: "basic",
        authCredentials: credentials,
        flattenConfig: { arrayHandling: "join" },
      });
      await fetchAndIngest("ds-123", config);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${credentials}`,
          }),
        })
      );
    });

    it("merges custom headers with auth headers", async () => {
      const mockData = [{ id: 1 }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({
        authType: "bearer",
        authCredentials: "token",
        headers: { "X-Custom": "value" },
        flattenConfig: { arrayHandling: "join" },
      });
      await fetchAndIngest("ds-123", config);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token",
            "X-Custom": "value",
          }),
        })
      );
    });
  });

  describe("Response Processing", () => {
    it("flattens nested JSON response", async () => {
      const mockData = {
        data: {
          items: [
            { id: 1, product: { name: "Widget", price: 29.99 } },
            { id: 2, product: { name: "Gadget", price: 49.99 } },
          ],
        },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({
        flattenConfig: {
          dataPath: "data.items",
          arrayHandling: "join",
        },
      });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(2);
      // Columns should include flattened keys
      expect(result.columns).toContain("id");
      expect(result.columns).toContain("product.name");
      expect(result.columns).toContain("product.price");
    });

    it("uses root data when no dataPath specified", async () => {
      const mockData = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({
        flattenConfig: {
          arrayHandling: "join",
        },
      });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(2);
    });

    it("returns row count and columns", async () => {
      const mockData = [
        { id: 1, name: "A", value: 100 },
        { id: 2, name: "B", value: 200 },
        { id: 3, name: "C", value: 300 },
      ];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({
        flattenConfig: { arrayHandling: "join" },
      });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.rowCount).toBe(3);
      expect(result.columns).toEqual(["id", "name", "value"]);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("handles empty response array", async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));

      const config = createConfig({
        flattenConfig: { arrayHandling: "join" },
      });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(0);
      expect(result.columns).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    it("handles 404 errors", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(
          { error: "Not found" },
          { status: 404, statusText: "Not Found" }
        )
      );

      const config = createConfig();
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("404");
    });

    it("handles 500 errors", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(
          { error: "Internal server error" },
          { status: 500, statusText: "Internal Server Error" }
        )
      );

      const config = createConfig();
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("500");
    });

    it("handles invalid JSON response", async () => {
      const invalidResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
        text: vi.fn().mockResolvedValue("invalid json {{{"),
      };
      mockFetch.mockResolvedValue(invalidResponse);

      const config = createConfig();
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("JSON");
    });

    it("handles non-JSON content type", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse("<html>Not JSON</html>", { contentType: "text/html" })
      );

      const config = createConfig();
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("JSON");
    });

    it("handles network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const config = createConfig();
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network");
    });
  });

  describe("Rate Limiting", () => {
    it("respects 429 rate limiting with Retry-After header", async () => {
      const rateLimitResponse = createMockResponse(
        { error: "Too Many Requests" },
        {
          status: 429,
          statusText: "Too Many Requests",
          headers: { "Retry-After": "5" },
        }
      );

      mockFetch.mockResolvedValue(rateLimitResponse);

      const config = createConfig();
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Rate limit");
      expect(result.error).toContain("5");
    });

    it("provides default retry message when no Retry-After header", async () => {
      const rateLimitResponse = createMockResponse(
        { error: "Too Many Requests" },
        { status: 429, statusText: "Too Many Requests" }
      );

      mockFetch.mockResolvedValue(rateLimitResponse);

      const config = createConfig();
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Rate limit");
    });
  });

  describe("Data Ingestion", () => {
    it("clears existing items before insert", async () => {
      const mockData = [{ id: 1, name: "Test" }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      // Setup transaction mock
      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const tx = {
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(tx as never);
      });

      const config = createConfig({
        flattenConfig: { arrayHandling: "join" },
      });
      await fetchAndIngest("ds-123", config);

      // Verify transaction was used
      expect(db.transaction).toHaveBeenCalled();
    });

    it("inserts rows in batches within a transaction", async () => {
      // Create 150 items to test batching (batch size is 100)
      const mockData = Array.from({ length: 150 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const txInsertMock = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      const txDeleteMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const tx = {
          delete: txDeleteMock,
          insert: txInsertMock,
        };
        return callback(tx as never);
      });

      const config = createConfig({
        flattenConfig: { arrayHandling: "join" },
      });
      await fetchAndIngest("ds-123", config);

      // Verify transaction was used and insert was called at least twice (for 2 batches)
      expect(db.transaction).toHaveBeenCalled();
      expect(txInsertMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("rolls back transaction on insert failure", async () => {
      const mockData = [{ id: 1, name: "Test" }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      // Setup transaction mock that fails on insert
      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const tx = {
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockRejectedValue(new Error("Insert failed")),
          }),
        };
        return callback(tx as never);
      });

      const config = createConfig({
        flattenConfig: { arrayHandling: "join" },
      });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Insert failed");
    });
  });

  describe("Sync Status Updates", () => {
    it("updates lastSyncAt on success", async () => {
      const mockData = [{ id: 1 }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({
        flattenConfig: { arrayHandling: "join" },
      });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(true);
      // Update is called for "syncing" status and then for "success" status
      expect(vi.mocked(db.update).mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it("updates lastSyncError on failure", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(
          { error: "Not found" },
          { status: 404, statusText: "Not Found" }
        )
      );

      const config = createConfig();
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      // Update is called for "syncing" status and then for "error" status
      expect(vi.mocked(db.update).mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("SSRF Prevention", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    resetDbMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("blocked URLs in fetchAndIngest", () => {
    it("blocks localhost URLs", async () => {
      const config = createConfig({ url: "http://localhost:3000/api" });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Internal/private URLs are not allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("blocks 127.0.0.1 URLs", async () => {
      const config = createConfig({ url: "http://127.0.0.1:8080/data" });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Internal/private URLs are not allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("blocks IPv6 localhost (::1)", async () => {
      const config = createConfig({ url: "http://[::1]:8080/data" });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Internal/private URLs are not allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("blocks 192.168.x.x private IPs", async () => {
      const config = createConfig({ url: "http://192.168.1.1/api" });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Internal/private URLs are not allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("blocks 10.x.x.x private IPs", async () => {
      const config = createConfig({ url: "http://10.0.0.1/api" });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Internal/private URLs are not allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("blocks 172.16-31.x.x private IPs", async () => {
      const config = createConfig({ url: "http://172.16.0.1/api" });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Internal/private URLs are not allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("blocks cloud metadata endpoint (169.254.169.254)", async () => {
      const config = createConfig({ url: "http://169.254.169.254/latest/meta-data" });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Internal/private URLs are not allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("blocks .local domains", async () => {
      const config = createConfig({ url: "http://myserver.local/api" });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Internal/private URLs are not allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("blocks non-HTTP protocols (ftp)", async () => {
      const config = createConfig({ url: "ftp://example.com/file" });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Only HTTP/HTTPS protocols are allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("blocks non-HTTP protocols (file)", async () => {
      const config = createConfig({ url: "file:///etc/passwd" });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Only HTTP/HTTPS protocols are allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("rejects invalid URL format", async () => {
      const config = createConfig({ url: "not-a-valid-url" });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid URL format");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("allows valid external HTTPS URLs", async () => {
      const mockData = [{ id: 1 }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({
        url: "https://api.example.com/data",
        flattenConfig: { arrayHandling: "join" },
      });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("allows valid external HTTP URLs", async () => {
      const mockData = [{ id: 1 }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const config = createConfig({
        url: "http://api.example.com/data",
        flattenConfig: { arrayHandling: "join" },
      });
      const result = await fetchAndIngest("ds-123", config);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("blocked URLs in testApiConnection", () => {
    it("blocks localhost URLs", async () => {
      const result = await testApiConnection({
        url: "http://localhost:3000/api",
        method: "GET",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Internal/private URLs are not allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("blocks private IP ranges", async () => {
      const result = await testApiConnection({
        url: "http://192.168.0.1/api",
        method: "GET",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Internal/private URLs are not allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("blocks cloud metadata endpoint", async () => {
      const result = await testApiConnection({
        url: "http://169.254.169.254/latest/meta-data",
        method: "GET",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Internal/private URLs are not allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("blocks non-HTTP protocols", async () => {
      const result = await testApiConnection({
        url: "file:///etc/passwd",
        method: "GET",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Only HTTP/HTTPS protocols are allowed");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("allows valid external URLs", async () => {
      const mockData = [{ id: 1 }];
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await testApiConnection({
        url: "https://api.example.com/data",
        method: "GET",
        flattenConfig: { arrayHandling: "join" },
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});

describe("testApiConnection", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success with preview data for valid API", async () => {
    const mockData = [
      { id: 1, name: "Product A" },
      { id: 2, name: "Product B" },
    ];
    mockFetch.mockResolvedValue(createMockResponse(mockData));

    const result = await testApiConnection({
      url: "https://api.example.com/products",
      method: "GET",
      flattenConfig: { arrayHandling: "join" },
    });

    expect(result.success).toBe(true);
    expect(result.preview).toBeDefined();
    expect(result.preview?.headers).toEqual(["id", "name"]);
    expect(result.preview?.rows).toHaveLength(2);
    expect(result.error).toBeUndefined();
  });

  it("returns success with limited preview rows", async () => {
    const mockData = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
    }));
    mockFetch.mockResolvedValue(createMockResponse(mockData));

    const result = await testApiConnection({
      url: "https://api.example.com/items",
      method: "GET",
      flattenConfig: { arrayHandling: "join" },
    });

    expect(result.success).toBe(true);
    // Preview should be limited to first 10 rows
    expect(result.preview?.rows.length).toBeLessThanOrEqual(10);
  });

  it("returns error for invalid URL", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await testApiConnection({
      url: "https://invalid-api.example.com/data",
      method: "GET",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.preview).toBeUndefined();
  });

  it("returns error for non-JSON response", async () => {
    mockFetch.mockResolvedValue(
      createMockResponse("<html></html>", { contentType: "text/html" })
    );

    const result = await testApiConnection({
      url: "https://api.example.com/html",
      method: "GET",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("JSON");
  });

  it("applies flatten config to preview", async () => {
    const mockData = {
      data: {
        items: [
          { id: 1, details: { category: "A" } },
          { id: 2, details: { category: "B" } },
        ],
      },
    };
    mockFetch.mockResolvedValue(createMockResponse(mockData));

    const result = await testApiConnection({
      url: "https://api.example.com/nested",
      method: "GET",
      flattenConfig: {
        dataPath: "data.items",
        arrayHandling: "join",
      },
    });

    expect(result.success).toBe(true);
    expect(result.preview?.headers).toContain("id");
    expect(result.preview?.headers).toContain("details.category");
  });

  it("handles POST requests with body", async () => {
    const mockData = [{ id: 1, result: "success" }];
    mockFetch.mockResolvedValue(createMockResponse(mockData));

    const result = await testApiConnection({
      url: "https://api.example.com/query",
      method: "POST",
      body: JSON.stringify({ filter: "active" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/query",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ filter: "active" }),
      })
    );
  });

  it("handles authentication in test connection", async () => {
    const mockData = [{ id: 1 }];
    mockFetch.mockResolvedValue(createMockResponse(mockData));

    await testApiConnection({
      url: "https://api.example.com/secure",
      method: "GET",
      authType: "bearer",
      authCredentials: "test-token",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });
});
