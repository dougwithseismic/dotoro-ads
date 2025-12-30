/**
 * Plugin System
 *
 * A minimal, extensible plugin system for the message inbox feature.
 * Plugins receive incoming messages and can process them (forward to Slack, Telegram, etc.)
 *
 * @example
 * ```typescript
 * import { pluginRegistry, PluginDispatcher, WebhookPlugin } from './plugins';
 *
 * // Register a plugin
 * pluginRegistry.register(new WebhookPlugin({
 *   webhookUrl: 'https://hooks.slack.com/...',
 *   name: 'slack-webhook'
 * }));
 *
 * // Dispatch a message
 * const dispatcher = new PluginDispatcher(pluginRegistry);
 * const result = await dispatcher.dispatch({
 *   id: 'msg-123',
 *   type: 'notification',
 *   content: 'Hello world',
 *   metadata: {},
 *   timestamp: new Date()
 * });
 * ```
 */

// Types
export type {
  Plugin,
  MessagePayload,
  PluginContext,
  PluginConfig,
  PluginExecutionResult,
  DispatchResult,
} from "./types.js";

// Core classes
export { PluginRegistry, pluginRegistry } from "./registry.js";
export { PluginDispatcher, type DispatcherOptions } from "./dispatcher.js";

// Built-in plugins
export { LoggingPlugin, WebhookPlugin, type WebhookPluginConfig } from "./implementations/index.js";
