/**
 * Plugin Registry Tests
 *
 * TDD tests for the plugin registry that manages plugin lifecycle.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PluginRegistry } from "../registry.js";
import type { Plugin, MessagePayload, PluginContext } from "../types.js";

// Helper to create a mock plugin
function createMockPlugin(name: string): Plugin {
  return {
    name,
    onMessage: async () => {},
    onError: async () => {},
  };
}

describe("PluginRegistry", () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe("register", () => {
    it("registers a plugin successfully", () => {
      const plugin = createMockPlugin("test-plugin");

      registry.register(plugin);

      expect(registry.isRegistered("test-plugin")).toBe(true);
    });

    it("throws error when registering duplicate plugin name", () => {
      const plugin1 = createMockPlugin("duplicate");
      const plugin2 = createMockPlugin("duplicate");

      registry.register(plugin1);

      expect(() => registry.register(plugin2)).toThrow(
        "Plugin 'duplicate' is already registered"
      );
    });

    it("throws error when plugin name is empty", () => {
      const plugin = createMockPlugin("");

      expect(() => registry.register(plugin)).toThrow("Plugin name cannot be empty");
    });

    it("throws error when plugin is missing onMessage method", () => {
      const invalidPlugin = {
        name: "invalid",
        onError: async () => {},
      } as unknown as Plugin;

      expect(() => registry.register(invalidPlugin)).toThrow(
        "Plugin must implement onMessage method"
      );
    });

    it("throws error when plugin is missing onError method", () => {
      const invalidPlugin = {
        name: "invalid",
        onMessage: async () => {},
      } as unknown as Plugin;

      expect(() => registry.register(invalidPlugin)).toThrow(
        "Plugin must implement onError method"
      );
    });
  });

  describe("unregister", () => {
    it("removes a registered plugin", () => {
      const plugin = createMockPlugin("to-remove");
      registry.register(plugin);

      registry.unregister("to-remove");

      expect(registry.isRegistered("to-remove")).toBe(false);
    });

    it("does not throw when unregistering non-existent plugin", () => {
      expect(() => registry.unregister("non-existent")).not.toThrow();
    });
  });

  describe("get", () => {
    it("returns the plugin by name", () => {
      const plugin = createMockPlugin("my-plugin");
      registry.register(plugin);

      const retrieved = registry.get("my-plugin");

      expect(retrieved).toBe(plugin);
    });

    it("returns undefined for non-existent plugin", () => {
      const retrieved = registry.get("non-existent");

      expect(retrieved).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("returns empty array when no plugins registered", () => {
      const plugins = registry.getAll();

      expect(plugins).toEqual([]);
    });

    it("returns all registered plugins", () => {
      const plugin1 = createMockPlugin("plugin-1");
      const plugin2 = createMockPlugin("plugin-2");
      const plugin3 = createMockPlugin("plugin-3");

      registry.register(plugin1);
      registry.register(plugin2);
      registry.register(plugin3);

      const plugins = registry.getAll();

      expect(plugins).toHaveLength(3);
      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin2);
      expect(plugins).toContain(plugin3);
    });

    it("returns a copy of plugins array (not the internal reference)", () => {
      const plugin = createMockPlugin("test");
      registry.register(plugin);

      const plugins1 = registry.getAll();
      const plugins2 = registry.getAll();

      expect(plugins1).not.toBe(plugins2);
    });
  });

  describe("isRegistered", () => {
    it("returns true for registered plugin", () => {
      const plugin = createMockPlugin("exists");
      registry.register(plugin);

      expect(registry.isRegistered("exists")).toBe(true);
    });

    it("returns false for non-registered plugin", () => {
      expect(registry.isRegistered("does-not-exist")).toBe(false);
    });
  });

  describe("clear", () => {
    it("removes all registered plugins", () => {
      registry.register(createMockPlugin("p1"));
      registry.register(createMockPlugin("p2"));
      registry.register(createMockPlugin("p3"));

      registry.clear();

      expect(registry.getAll()).toHaveLength(0);
    });
  });
});
