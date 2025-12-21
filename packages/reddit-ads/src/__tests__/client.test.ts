import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { RedditApiClient, RedditClientConfig } from "../client.js";
import { RedditApiException } from "../types.js";

describe("RedditApiClient", () => {
  const mockConfig: RedditClientConfig = {
    accessToken: "test-access-token",
    userAgent: "test-user-agent/1.0",
  };

  let client: RedditApiClient;

  beforeEach(() => {
    client = new RedditApiClient(mockConfig);
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("request handling", () => {
    it("should make GET request with proper headers", async () => {
      const mockResponse = { data: { id: "123", name: "Test Campaign" } };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers({
          "x-ratelimit-remaining": "599",
          "x-ratelimit-reset": "600",
        }),
      });

      const result = await client.get("/accounts/abc123/campaigns");

      expect(fetch).toHaveBeenCalledWith(
        "https://ads-api.reddit.com/api/v2.0/accounts/abc123/campaigns",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-access-token",
            "User-Agent": "test-user-agent/1.0",
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should make POST request with JSON body", async () => {
      const mockResponse = { data: { id: "new-123" } };
      const requestBody = { name: "New Campaign", objective: "AWARENESS" };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers(),
      });

      const result = await client.post("/accounts/abc123/campaigns", requestBody);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall?.[1]?.method).toBe("POST");
      expect(fetchCall?.[1]?.body).toBe(JSON.stringify(requestBody));
      expect(result).toEqual(mockResponse);
    });

    it("should make PUT request for updates", async () => {
      const mockResponse = { data: { id: "123", name: "Updated" } };
      const updateBody = { name: "Updated Campaign" };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers(),
      });

      const result = await client.put("/accounts/abc123/campaigns/123", updateBody);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall?.[1]?.method).toBe("PUT");
      expect(result).toEqual(mockResponse);
    });

    it("should make DELETE request", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve({}),
        headers: new Headers(),
      });

      await client.delete("/accounts/abc123/campaigns/123");

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall?.[1]?.method).toBe("DELETE");
    });
  });

  describe("error handling", () => {
    it("should throw RedditApiException on 401 Unauthorized", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: "Invalid token" }),
        headers: new Headers(),
      });

      // Use maxRetries: 0 to disable retries for error testing
      let caughtError: RedditApiException | null = null;
      try {
        await client.get("/accounts/abc123", { maxRetries: 0 });
      } catch (error) {
        caughtError = error as RedditApiException;
      }

      expect(caughtError).toBeInstanceOf(RedditApiException);
      expect(caughtError?.code).toBe("INVALID_TOKEN");
      expect(caughtError?.statusCode).toBe(401);
    });

    it("should throw RedditApiException on 404 Not Found", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: "Resource not found" }),
        headers: new Headers(),
      });

      // 404 is not retryable, so no maxRetries needed
      await expect(client.get("/accounts/abc123/campaigns/unknown")).rejects.toThrow(
        RedditApiException
      );
    });

    it("should throw RedditApiException on 429 Rate Limit", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: "Rate limit exceeded" }),
        headers: new Headers({
          "retry-after": "60",
        }),
      });

      // Use maxRetries: 0 to disable retries
      let caughtError: RedditApiException | null = null;
      try {
        await client.get("/accounts/abc123", { maxRetries: 0 });
      } catch (error) {
        caughtError = error as RedditApiException;
      }

      expect(caughtError).toBeInstanceOf(RedditApiException);
      expect(caughtError?.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(caughtError?.retryable).toBe(true);
      expect(caughtError?.retryAfter).toBe(60);
    });

    it("should throw RedditApiException on 500 Server Error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: "Internal server error" }),
        headers: new Headers(),
      });

      // Use maxRetries: 0 to disable retries
      let caughtError: RedditApiException | null = null;
      try {
        await client.get("/accounts/abc123", { maxRetries: 0 });
      } catch (error) {
        caughtError = error as RedditApiException;
      }

      expect(caughtError).toBeInstanceOf(RedditApiException);
      expect(caughtError?.code).toBe("INTERNAL_ERROR");
      expect(caughtError?.retryable).toBe(true);
    });
  });

  describe("retry with exponential backoff", () => {
    it("should retry on 500 errors with exponential backoff", async () => {
      const mockSuccessResponse = { data: { id: "123" } };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: "Server error" }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: "Server error" }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockSuccessResponse),
          headers: new Headers(),
        });

      const resultPromise = client.get("/accounts/abc123", { maxRetries: 3 });

      // Advance through retries
      await vi.advanceTimersByTimeAsync(1000); // First retry
      await vi.advanceTimersByTimeAsync(2000); // Second retry

      const result = await resultPromise;

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockSuccessResponse);
    });

    it("should not retry on 4xx errors (except 429)", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: "Bad request" }),
        headers: new Headers(),
      });

      await expect(client.get("/accounts/abc123", { maxRetries: 3 })).rejects.toThrow();

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("should exhaust retries and throw on persistent errors", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ message: "Service unavailable" }),
        headers: new Headers(),
      });

      let caughtError: RedditApiException | null = null;
      const resultPromise = client.get("/accounts/abc123", { maxRetries: 2 }).catch((err) => {
        caughtError = err;
      });

      // Advance through retries
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000); // Extra time for safety

      await resultPromise;

      expect(caughtError).toBeInstanceOf(RedditApiException);
      expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe("rate limiting", () => {
    it("should track rate limit from response headers", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: {} }),
        headers: new Headers({
          "x-ratelimit-remaining": "590",
          "x-ratelimit-reset": "500",
        }),
      });

      await client.get("/accounts/abc123");

      const status = client.getRateLimitStatus();
      expect(status.remaining).toBe(590);
      expect(status.resetInSeconds).toBe(500);
    });
  });

  describe("token management", () => {
    it("should allow updating access token", () => {
      client.setAccessToken("new-access-token");

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: {} }),
        headers: new Headers(),
      });

      client.get("/accounts/abc123");

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall?.[1]?.headers).toEqual(
        expect.objectContaining({
          Authorization: "Bearer new-access-token",
        })
      );
    });
  });

  describe("request logging", () => {
    it("should call onRequest hook with request details", async () => {
      const onRequest = vi.fn();
      const clientWithLogging = new RedditApiClient({
        ...mockConfig,
        onRequest,
      });

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: {} }),
        headers: new Headers(),
      });

      await clientWithLogging.get("/accounts/abc123");

      expect(onRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
          url: expect.stringContaining("/accounts/abc123"),
        })
      );
    });

    it("should call onResponse hook with response details", async () => {
      const onResponse = vi.fn();
      const clientWithLogging = new RedditApiClient({
        ...mockConfig,
        onResponse,
      });

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { id: "123" } }),
        headers: new Headers(),
      });

      await clientWithLogging.get("/accounts/abc123");

      expect(onResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          ok: true,
        })
      );
    });
  });

  describe("network error handling", () => {
    it("should throw on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

      await expect(client.get("/accounts/abc123", { maxRetries: 0 })).rejects.toThrow(
        "Network error"
      );
    });

    it("should handle malformed JSON error response with raw text fallback", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Invalid JSON")),
        text: () => Promise.resolve("<!DOCTYPE html><html>Error</html>"),
        headers: new Headers(),
      });

      let caughtError: RedditApiException | null = null;
      try {
        await client.get("/accounts/abc123", { maxRetries: 0 });
      } catch (error) {
        caughtError = error as RedditApiException;
      }

      expect(caughtError).toBeInstanceOf(RedditApiException);
      expect(caughtError?.details).toEqual(
        expect.objectContaining({
          rawError: expect.stringContaining("<!DOCTYPE html>"),
        })
      );
    });

    it("should handle completely unparseable error response", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Invalid JSON")),
        text: () => Promise.reject(new Error("Cannot read response")),
        headers: new Headers(),
      });

      let caughtError: RedditApiException | null = null;
      try {
        await client.get("/accounts/abc123", { maxRetries: 0 });
      } catch (error) {
        caughtError = error as RedditApiException;
      }

      expect(caughtError).toBeInstanceOf(RedditApiException);
      expect(caughtError?.details).toEqual({
        parseError: "Unable to parse error response",
      });
    });
  });
});
