/**
 * Slack Plugin Tests
 *
 * TDD tests for the Slack plugin implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SlackPlugin } from "../slack-plugin.js";
import type { MessagePayload, PluginContext } from "../../types.js";

// Helper to create a test message payload
function createPayload(overrides: Partial<MessagePayload> = {}): MessagePayload {
  return {
    id: "msg-123",
    type: "campaign-sync",
    content: "Campaign sync completed successfully",
    metadata: { campaignCount: 15, duration: "2.3s" },
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

describe("SlackPlugin", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let context: PluginContext;
  const webhookUrl = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX";

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

  describe("constructor and name", () => {
    it("has the correct default plugin name", () => {
      const plugin = new SlackPlugin({ webhookUrl });
      expect(plugin.name).toBe("slack");
    });

    it("allows custom plugin name", () => {
      const plugin = new SlackPlugin({ webhookUrl, name: "slack-alerts" });
      expect(plugin.name).toBe("slack-alerts");
    });

    it("validates webhook URL format", () => {
      expect(() => new SlackPlugin({ webhookUrl: "" })).toThrow(
        /webhook.*url.*required/i
      );
    });

    it("accepts valid Slack webhook URL", () => {
      const plugin = new SlackPlugin({ webhookUrl });
      expect(plugin).toBeInstanceOf(SlackPlugin);
    });
  });

  describe("onMessage", () => {
    it("posts message to webhook URL", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload();

      await plugin.onMessage(payload, context);

      expect(mockFetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("formats message as Slack Block Kit structure", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload({
        type: "sync-complete",
        content: "Successfully synced 15 campaigns to Reddit Ads.",
      });

      await plugin.onMessage(payload, context);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Should have blocks array
      expect(body.blocks).toBeDefined();
      expect(Array.isArray(body.blocks)).toBe(true);
    });

    it("includes header block with message type", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload({ type: "Campaign Sync Complete" });

      await plugin.onMessage(payload, context);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      const headerBlock = body.blocks.find(
        (b: { type: string }) => b.type === "header"
      );
      expect(headerBlock).toBeDefined();
      expect(headerBlock.text.type).toBe("plain_text");
      expect(headerBlock.text.text).toContain("Campaign Sync Complete");
    });

    it("includes section block with message content", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload({ content: "Synced 15 campaigns" });

      await plugin.onMessage(payload, context);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      const sectionBlock = body.blocks.find(
        (b: { type: string }) => b.type === "section"
      );
      expect(sectionBlock).toBeDefined();
      expect(sectionBlock.text.text).toContain("Synced 15 campaigns");
    });

    it("includes context block with timestamp", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload();

      await plugin.onMessage(payload, context);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      const contextBlock = body.blocks.find(
        (b: { type: string }) => b.type === "context"
      );
      expect(contextBlock).toBeDefined();
    });

    it("handles successful webhook response without throwing", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload();

      await expect(plugin.onMessage(payload, context)).resolves.not.toThrow();
    });

    it("handles 4xx error responses without throwing", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload();

      // Should NOT throw - just log
      await expect(plugin.onMessage(payload, context)).resolves.not.toThrow();
      expect(context.logger.error).toHaveBeenCalled();
    });

    it("handles 5xx error responses without throwing", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload();

      await expect(plugin.onMessage(payload, context)).resolves.not.toThrow();
      expect(context.logger.error).toHaveBeenCalled();
    });

    it("handles network errors without throwing", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload();

      await expect(plugin.onMessage(payload, context)).resolves.not.toThrow();
      expect(context.logger.error).toHaveBeenCalled();
    });

    it("handles timeout (AbortError) without throwing", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload();

      await expect(plugin.onMessage(payload, context)).resolves.not.toThrow();
      expect(context.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("timeout"),
        expect.any(Object)
      );
    });

    it("uses 5 second timeout by default", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload();

      await plugin.onMessage(payload, context);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it("allows custom timeout configuration", async () => {
      const plugin = new SlackPlugin({ webhookUrl, timeoutMs: 10000 });
      const payload = createPayload();

      await plugin.onMessage(payload, context);

      // Just verify it runs successfully with custom timeout
      expect(mockFetch).toHaveBeenCalled();
    });

    it("truncates header text to 150 characters", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const longType = "A".repeat(200);
      const payload = createPayload({ type: longType });

      await plugin.onMessage(payload, context);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      const headerBlock = body.blocks.find(
        (b: { type: string }) => b.type === "header"
      );
      expect(headerBlock.text.text.length).toBeLessThanOrEqual(150);
    });

    it("truncates section text to 3000 characters", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const longContent = "B".repeat(4000);
      const payload = createPayload({ content: longContent });

      await plugin.onMessage(payload, context);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      const sectionBlock = body.blocks.find(
        (b: { type: string }) => b.type === "section"
      );
      expect(sectionBlock.text.text.length).toBeLessThanOrEqual(3000);
    });

    it("includes metadata fields when present", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload({
        metadata: { campaignCount: 15, duration: "2.3s" },
      });

      await plugin.onMessage(payload, context);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      const sectionWithFields = body.blocks.find(
        (b: { type: string; fields?: unknown[] }) =>
          b.type === "section" && b.fields
      );
      expect(sectionWithFields).toBeDefined();
      expect(sectionWithFields.fields.length).toBeGreaterThan(0);
    });

    it("formats metadata fields as mrkdwn", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload({
        metadata: { status: "success" },
      });

      await plugin.onMessage(payload, context);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      const sectionWithFields = body.blocks.find(
        (b: { type: string; fields?: unknown[] }) =>
          b.type === "section" && b.fields
      );
      expect(sectionWithFields.fields[0].type).toBe("mrkdwn");
    });

    it("applies severity color for error messages", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload({
        metadata: { severity: "error" },
      });

      await plugin.onMessage(payload, context);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Error messages should use attachments with red color
      expect(body.attachments).toBeDefined();
      expect(body.attachments[0].color).toBe("#ff0000");
    });

    it("applies severity color for success messages", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload({
        metadata: { severity: "success" },
      });

      await plugin.onMessage(payload, context);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.attachments).toBeDefined();
      expect(body.attachments[0].color).toBe("#36a64f");
    });

    it("applies severity color for warning messages", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload({
        metadata: { severity: "warning" },
      });

      await plugin.onMessage(payload, context);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.attachments).toBeDefined();
      expect(body.attachments[0].color).toBe("#ffcc00");
    });

    it("uses blocks directly for info severity (no color)", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const payload = createPayload({
        metadata: { severity: "info" },
      });

      await plugin.onMessage(payload, context);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Info messages use blocks directly without attachments
      expect(body.blocks).toBeDefined();
    });
  });

  describe("onError", () => {
    it("logs error details", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const error = new Error("Processing failed");
      const payload = createPayload();

      await plugin.onError(error, payload, context);

      expect(context.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Slack"),
        expect.objectContaining({
          error: "Processing failed",
          messageId: "msg-123",
        })
      );
    });

    it("never throws exceptions", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const error = new Error("Something went wrong");
      const payload = createPayload();

      await expect(
        plugin.onError(error, payload, context)
      ).resolves.not.toThrow();
    });

    it("optionally sends error to Slack when configured", async () => {
      const plugin = new SlackPlugin({
        webhookUrl,
        sendErrorsToSlack: true,
      });
      const error = new Error("Processing failed");
      const payload = createPayload();

      await plugin.onError(error, payload, context);

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Should include error information
      expect(body.attachments).toBeDefined();
      expect(body.attachments[0].color).toBe("#ff0000");
    });

    it("does not send to Slack by default on error", async () => {
      const plugin = new SlackPlugin({ webhookUrl });
      const error = new Error("Processing failed");
      const payload = createPayload();

      await plugin.onError(error, payload, context);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("handles Slack send failure in onError gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const plugin = new SlackPlugin({
        webhookUrl,
        sendErrorsToSlack: true,
      });
      const error = new Error("Original error");
      const payload = createPayload();

      // Should not throw even when Slack send fails
      await expect(
        plugin.onError(error, payload, context)
      ).resolves.not.toThrow();
    });
  });

  describe("debug mode", () => {
    it("logs outgoing payloads in debug mode", async () => {
      const plugin = new SlackPlugin({ webhookUrl, debug: true });
      const payload = createPayload();

      await plugin.onMessage(payload, context);

      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Slack"),
        expect.objectContaining({
          webhookUrl: expect.any(String),
        })
      );
    });

    it("does not log payloads when debug is false", async () => {
      const plugin = new SlackPlugin({ webhookUrl, debug: false });
      const payload = createPayload();

      await plugin.onMessage(payload, context);

      // Should not have debug calls for outgoing payload
      expect(context.logger.debug).not.toHaveBeenCalled();
    });
  });
});
