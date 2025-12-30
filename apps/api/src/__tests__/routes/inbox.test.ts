import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { testClient } from "hono/testing";

// Store original env
const originalEnv = process.env.INBOX_API_KEY;

// Mock the plugin system
vi.mock("../../plugins/index.js", () => {
  const mockDispatcher = {
    dispatch: vi.fn().mockResolvedValue({
      messageId: "test-message-id",
      results: [],
    }),
  };

  return {
    PluginDispatcher: vi.fn().mockImplementation(() => mockDispatcher),
    pluginRegistry: {
      getAll: vi.fn().mockReturnValue([]),
      register: vi.fn(),
    },
    mockDispatcher, // Export for test access
  };
});

// Import after mocking
import { inboxApp } from "../../routes/inbox.js";
import { PluginDispatcher, pluginRegistry } from "../../plugins/index.js";

describe("Inbox API", () => {
  const validApiKey = "sk_inbox_test_key_12345";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INBOX_API_KEY = validApiKey;
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.INBOX_API_KEY = originalEnv;
    } else {
      delete process.env.INBOX_API_KEY;
    }
  });

  // ============================================================================
  // POST /api/inbox - Accept external messages
  // ============================================================================
  describe("POST /api/inbox", () => {
    it("should return 200 with acknowledgment for valid request", async () => {
      const client = testClient(inboxApp);
      const res = await client["api"]["inbox"].$post(
        {
          json: {
            source: "zapier",
            event: "campaign_update",
            data: { campaignId: "123" },
          },
        },
        {
          headers: {
            "X-Inbox-Key": validApiKey,
          },
        }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.received).toBe(true);
      expect(body.timestamp).toBeDefined();
      expect(body.id).toBeDefined();
      // Verify timestamp is valid ISO 8601
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
      // Verify ID is a UUID
      expect(body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("should return 401 when X-Inbox-Key header is missing", async () => {
      const client = testClient(inboxApp);
      const res = await client["api"]["inbox"].$post({
        json: { test: "data" },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Invalid or missing API key");
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 when X-Inbox-Key header is invalid", async () => {
      const client = testClient(inboxApp);
      const res = await client["api"]["inbox"].$post(
        {
          json: { test: "data" },
        },
        {
          headers: {
            "X-Inbox-Key": "wrong_key",
          },
        }
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Invalid or missing API key");
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 when X-Inbox-Key header is empty", async () => {
      const client = testClient(inboxApp);
      const res = await client["api"]["inbox"].$post(
        {
          json: { test: "data" },
        },
        {
          headers: {
            "X-Inbox-Key": "",
          },
        }
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 for invalid JSON payload", async () => {
      // Need to use raw fetch to send invalid JSON
      const app = inboxApp;
      const res = await app.request("/api/inbox", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Inbox-Key": validApiKey,
        },
        body: "not valid json",
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("should accept any valid JSON object", async () => {
      const client = testClient(inboxApp);
      const res = await client["api"]["inbox"].$post(
        {
          json: {
            any: "valid",
            json: { nested: true },
            payload: [1, 2, 3],
            number: 42,
            boolean: false,
            nullValue: null,
          },
        },
        {
          headers: {
            "X-Inbox-Key": validApiKey,
          },
        }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.received).toBe(true);
    });

    it("should accept empty JSON object", async () => {
      const client = testClient(inboxApp);
      const res = await client["api"]["inbox"].$post(
        {
          json: {},
        },
        {
          headers: {
            "X-Inbox-Key": validApiKey,
          },
        }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.received).toBe(true);
    });

    it("should dispatch message to plugin system", async () => {
      const client = testClient(inboxApp);
      await client["api"]["inbox"].$post(
        {
          json: {
            source: "test",
            event: "test_event",
          },
        },
        {
          headers: {
            "X-Inbox-Key": validApiKey,
          },
        }
      );

      // Get the mock dispatcher instance
      const MockDispatcher = PluginDispatcher as unknown as ReturnType<typeof vi.fn>;
      expect(MockDispatcher).toHaveBeenCalled();
    });

    it("should return 500 when INBOX_API_KEY is not configured", async () => {
      delete process.env.INBOX_API_KEY;

      const client = testClient(inboxApp);
      const res = await client["api"]["inbox"].$post(
        {
          json: { test: "data" },
        },
        {
          headers: {
            "X-Inbox-Key": validApiKey,
          },
        }
      );

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.code).toBe("INTERNAL_ERROR");
    });

    it("should include response timestamp and id in response", async () => {
      const client = testClient(inboxApp);
      const beforeRequest = new Date();

      const res = await client["api"]["inbox"].$post(
        {
          json: { test: "data" },
        },
        {
          headers: {
            "X-Inbox-Key": validApiKey,
          },
        }
      );

      const afterRequest = new Date();
      const body = await res.json();

      // Verify timestamp is between before and after request
      const responseTime = new Date(body.timestamp);
      expect(responseTime.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime());
      expect(responseTime.getTime()).toBeLessThanOrEqual(afterRequest.getTime());

      // Verify id format (UUID)
      expect(body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });
});
