/**
 * Plugin Registry
 *
 * Central registry to manage plugin lifecycle. Handles registration,
 * unregistration, and retrieval of plugins.
 */

import type { Plugin } from "./types.js";

/**
 * Validates that a plugin implements the required interface
 */
function validatePlugin(plugin: Plugin): void {
  if (!plugin.name || plugin.name.trim() === "") {
    throw new Error("Plugin name cannot be empty");
  }

  if (typeof plugin.onMessage !== "function") {
    throw new Error("Plugin must implement onMessage method");
  }

  if (typeof plugin.onError !== "function") {
    throw new Error("Plugin must implement onError method");
  }
}

export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();

  /**
   * Register a plugin
   * @throws Error if plugin name is already registered or plugin is invalid
   */
  register(plugin: Plugin): void {
    validatePlugin(plugin);

    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Unregister a plugin by name
   * Does not throw if plugin doesn't exist
   */
  unregister(name: string): void {
    this.plugins.delete(name);
  }

  /**
   * Get a plugin by name
   * @returns The plugin or undefined if not found
   */
  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins
   * @returns Array of all registered plugins (copy, not internal reference)
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if a plugin is registered
   */
  isRegistered(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Remove all registered plugins
   */
  clear(): void {
    this.plugins.clear();
  }
}

// Export singleton instance for app-wide use
export const pluginRegistry = new PluginRegistry();
