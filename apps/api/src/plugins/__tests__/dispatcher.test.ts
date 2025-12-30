/**
 * Plugin Dispatcher Tests
 *
 * TDD tests for the message dispatcher that executes plugins.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { PluginDispatcher } from "../dispatcher.js";
import { PluginRegistry } from "../registry.js";
import type { Plugin, MessagePayload, PluginContext } from "../types.js";

// Helper to create a test message payload
function createPayload(overrides: Partial<MessagePayload> = {}): MessagePayload {
  return {
    id: "msg-123",
    type: "test",
    content: "Test message content",
    metadata: {},
    timestamp: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

// Helper to create a mock plugin with configurable behavior
function createMockPlugin(
  name: string,
  options: {
    onMessage?: (payload: MessagePayload, ctx: PluginContext) => Promise<void>;
    onError?: (error: Error, payload: MessagePayload, ctx: PluginContext) => Promise<void>;
  } = {}
): Plugin {
  return {
    name,
    onMessage: options.onMessage ?? vi.fn().mockResolvedValue(undefined),
    onError: options.onError ?? vi.fn().mockResolvedValue(undefined),
  };
}

describe("PluginDispatcher", () => {
  let registry: PluginRegistry;
  let dispatcher: PluginDispatcher;

  beforeEach(() => {
    vi.useFakeTimers();
    registry = new PluginRegistry();
    dispatcher = new PluginDispatcher(registry);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("dispatch", () => {
    it("dispatches message to all registered plugins", async () => {
      const onMessage1 = vi.fn().mockResolvedValue(undefined);
      const onMessage2 = vi.fn().mockResolvedValue(undefined);

      const plugin1 = createMockPlugin("plugin-1", { onMessage: onMessage1 });
      const plugin2 = createMockPlugin("plugin-2", { onMessage: onMessage2 });

      registry.register(plugin1);
      registry.register(plugin2);

      const payload = createPayload();
      const resultPromise = dispatcher.dispatch(payload);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(onMessage1).toHaveBeenCalledWith(payload, expect.any(Object));
      expect(onMessage2).toHaveBeenCalledWith(payload, expect.any(Object));
      expect(result.messageId).toBe("msg-123");
      expect(result.results).toHaveLength(2);
    });

    it("returns success for all plugins when all succeed", async () => {
      const plugin1 = createMockPlugin("success-1");
      const plugin2 = createMockPlugin("success-2");

      registry.register(plugin1);
      registry.register(plugin2);

      const resultPromise = dispatcher.dispatch(createPayload());
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.results.every((r) => r.success)).toBe(true);
    });

    it("continues processing other plugins when one fails", async () => {
      const failingOnMessage = vi.fn().mockRejectedValue(new Error("Plugin failed"));
      const successOnMessage = vi.fn().mockResolvedValue(undefined);

      const failingPlugin = createMockPlugin("failing", { onMessage: failingOnMessage });
      const successPlugin = createMockPlugin("success", { onMessage: successOnMessage });

      registry.register(failingPlugin);
      registry.register(successPlugin);

      const resultPromise = dispatcher.dispatch(createPayload());
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Both plugins should have been called
      expect(failingOnMessage).toHaveBeenCalled();
      expect(successOnMessage).toHaveBeenCalled();

      // Should have results for both
      expect(result.results).toHaveLength(2);

      // One should fail, one should succeed
      const failingResult = result.results.find((r) => r.pluginName === "failing");
      const successResult = result.results.find((r) => r.pluginName === "success");

      expect(failingResult?.success).toBe(false);
      expect(failingResult?.error).toBe("Plugin failed");
      expect(successResult?.success).toBe(true);
    });

    it("calls onError when plugin fails", async () => {
      const error = new Error("Processing failed");
      const onError = vi.fn().mockResolvedValue(undefined);

      const plugin = createMockPlugin("error-handler", {
        onMessage: vi.fn().mockRejectedValue(error),
        onError,
      });

      registry.register(plugin);

      const payload = createPayload();
      const resultPromise = dispatcher.dispatch(payload);
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(onError).toHaveBeenCalledWith(error, payload, expect.any(Object));
    });

    it("returns empty results when no plugins registered", async () => {
      const payload = createPayload();
      const resultPromise = dispatcher.dispatch(payload);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.messageId).toBe("msg-123");
      expect(result.results).toEqual([]);
    });

    it("tracks duration for each plugin", async () => {
      const plugin = createMockPlugin("timed", {
        onMessage: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }),
      });

      registry.register(plugin);

      const resultPromise = dispatcher.dispatch(createPayload());
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.results[0]?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("handles timeout for slow plugins", async () => {
      // Create a plugin that takes too long
      const slowPlugin = createMockPlugin("slow", {
        onMessage: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds
        }),
      });

      registry.register(slowPlugin);

      // Dispatch with a 1 second timeout
      const dispatcherWithTimeout = new PluginDispatcher(registry, { defaultTimeout: 1000 });
      const resultPromise = dispatcherWithTimeout.dispatch(createPayload());
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.results[0]?.success).toBe(false);
      expect(result.results[0]?.error).toContain("timeout");
    });

    it("provides logger in plugin context", async () => {
      let receivedContext: PluginContext | null = null;

      const plugin = createMockPlugin("context-test", {
        onMessage: vi.fn().mockImplementation(async (_, ctx) => {
          receivedContext = ctx;
        }),
      });

      registry.register(plugin);

      const resultPromise = dispatcher.dispatch(createPayload());
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(receivedContext).not.toBeNull();
      expect(receivedContext?.logger).toBeDefined();
      expect(typeof receivedContext?.logger.info).toBe("function");
      expect(typeof receivedContext?.logger.warn).toBe("function");
      expect(typeof receivedContext?.logger.error).toBe("function");
      expect(typeof receivedContext?.logger.debug).toBe("function");
    });

    it("executes plugins in parallel", async () => {
      const executionOrder: string[] = [];

      const plugin1 = createMockPlugin("fast", {
        onMessage: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          executionOrder.push("fast");
        }),
      });

      const plugin2 = createMockPlugin("slow", {
        onMessage: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          executionOrder.push("slow");
        }),
      });

      registry.register(plugin1);
      registry.register(plugin2);

      const resultPromise = dispatcher.dispatch(createPayload());
      await vi.runAllTimersAsync();
      await resultPromise;

      // Fast should complete before slow due to parallel execution
      expect(executionOrder).toEqual(["fast", "slow"]);
    });
  });

  describe("edge cases", () => {
    it("handles onError throwing an error gracefully", async () => {
      const plugin = createMockPlugin("double-fail", {
        onMessage: vi.fn().mockRejectedValue(new Error("First error")),
        onError: vi.fn().mockRejectedValue(new Error("Error in error handler")),
      });

      registry.register(plugin);

      // Should not throw
      const resultPromise = dispatcher.dispatch(createPayload());
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.results[0]?.success).toBe(false);
      // Should contain the original error, not the error handler error
      expect(result.results[0]?.error).toBe("First error");
    });

    it("handles null/undefined errors gracefully", async () => {
      const plugin = createMockPlugin("null-error", {
        onMessage: vi.fn().mockRejectedValue(null),
      });

      registry.register(plugin);

      const resultPromise = dispatcher.dispatch(createPayload());
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.results[0]?.success).toBe(false);
      expect(result.results[0]?.error).toBeDefined();
    });
  });
});
