/**
 * Plugin Implementations Tests
 *
 * TDD tests for the built-in plugin implementations.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { LoggingPlugin } from "../implementations/logging-plugin.js";
import { WebhookPlugin } from "../implementations/webhook-plugin.js";
import type { MessagePayload, PluginContext } from "../types.js";

// Helper to create a test message payload
function createPayload(overrides: Partial<MessagePayload> = {}): MessagePayload {
  return {
    id: "msg-123",
    type: "test",
    content: "Test message content",
    metadata: { key: "value" },
    timestamp: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

// Helper to create a mock plugin context
function createMockContext(): PluginContext {
  return {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    config: {},
  };
}

describe("LoggingPlugin", () => {
  let plugin: LoggingPlugin;
  let context: PluginContext;

  beforeEach(() => {
    plugin = new LoggingPlugin();
    context = createMockContext();
  });

  describe("name", () => {
    it("has the correct plugin name", () => {
      expect(plugin.name).toBe("logging");
    });
  });

  describe("onMessage", () => {
    it("logs message with id, type, and content preview", async () => {
      const payload = createPayload();

      await plugin.onMessage(payload, context);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining("msg-123"),
        expect.objectContaining({
          messageId: "msg-123",
          type: "test",
        })
      );
    });

    it("truncates long content in the log", async () => {
      const longContent = "a".repeat(200);
      const payload = createPayload({ content: longContent });

      await plugin.onMessage(payload, context);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          contentPreview: expect.stringMatching(/\.\.\.$/),
        })
      );
    });

    it("includes timestamp in log data", async () => {
      const payload = createPayload();

      await plugin.onMessage(payload, context);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe("onError", () => {
    it("logs error with plugin name and message id", async () => {
      const error = new Error("Something went wrong");
      const payload = createPayload();

      await plugin.onError(error, payload, context);

      expect(context.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("msg-123"),
        expect.objectContaining({
          error: "Something went wrong",
          messageId: "msg-123",
        })
      );
    });
  });
});

describe("WebhookPlugin", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let context: PluginContext;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });
    global.fetch = mockFetch;
    context = createMockContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("name", () => {
    it("has the correct plugin name", () => {
      const plugin = new WebhookPlugin({ webhookUrl: "https://example.com/webhook" });
      expect(plugin.name).toBe("webhook");
    });

    it("allows custom plugin name", () => {
      const plugin = new WebhookPlugin({
        webhookUrl: "https://example.com/webhook",
        name: "custom-webhook",
      });
      expect(plugin.name).toBe("custom-webhook");
    });
  });

  describe("onMessage", () => {
    it("posts message payload to webhook URL", async () => {
      const plugin = new WebhookPlugin({ webhookUrl: "https://example.com/webhook" });
      const payload = createPayload();

      await plugin.onMessage(payload, context);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/webhook",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: expect.any(String),
        })
      );
    });

    it("sends correct JSON body structure", async () => {
      const plugin = new WebhookPlugin({ webhookUrl: "https://example.com/webhook" });
      const payload = createPayload({ id: "test-id", content: "Test content" });

      await plugin.onMessage(payload, context);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toMatchObject({
        id: "test-id",
        type: "test",
        content: "Test content",
      });
    });

    it("throws error on non-OK response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const plugin = new WebhookPlugin({ webhookUrl: "https://example.com/webhook" });

      await expect(plugin.onMessage(createPayload(), context)).rejects.toThrow(
        /500/
      );
    });

    it("includes custom headers when configured", async () => {
      const plugin = new WebhookPlugin({
        webhookUrl: "https://example.com/webhook",
        headers: { Authorization: "Bearer token123" },
      });

      await plugin.onMessage(createPayload(), context);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token123",
          }),
        })
      );
    });

    it("handles network errors gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const plugin = new WebhookPlugin({ webhookUrl: "https://example.com/webhook" });

      await expect(plugin.onMessage(createPayload(), context)).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("onError", () => {
    it("logs error with context", async () => {
      const plugin = new WebhookPlugin({ webhookUrl: "https://example.com/webhook" });
      const error = new Error("Processing failed");
      const payload = createPayload();

      await plugin.onError(error, payload, context);

      expect(context.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Webhook"),
        expect.objectContaining({
          error: "Processing failed",
          webhookUrl: "https://example.com/webhook",
        })
      );
    });
  });
});
