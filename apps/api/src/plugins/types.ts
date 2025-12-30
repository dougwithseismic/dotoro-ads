/**
 * Plugin System Types
 *
 * Defines the core interfaces for the message inbox plugin system.
 * Plugins receive messages and can process them (forward to Slack, Telegram, etc.)
 */

/**
 * Payload structure for messages processed by plugins
 */
export interface MessagePayload {
  id: string;
  type: string;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Context provided to plugins during execution
 */
export interface PluginContext {
  logger: {
    info: (message: string, data?: Record<string, unknown>) => void;
    warn: (message: string, data?: Record<string, unknown>) => void;
    error: (message: string, error?: Error | Record<string, unknown>) => void;
    debug: (message: string, data?: Record<string, unknown>) => void;
  };
  config: Record<string, unknown>;
}

/**
 * Plugin interface - the contract all plugins must implement
 */
export interface Plugin {
  /** Unique identifier for this plugin */
  name: string;

  /**
   * Called when a message is received
   * @param payload The message payload to process
   * @param ctx Plugin context with logger and config
   */
  onMessage(payload: MessagePayload, ctx: PluginContext): Promise<void>;

  /**
   * Called when an error occurs during message processing
   * @param error The error that occurred
   * @param payload The message payload that caused the error
   * @param ctx Plugin context with logger and config
   */
  onError(error: Error, payload: MessagePayload, ctx: PluginContext): Promise<void>;
}

/**
 * Configuration options for plugins
 */
export interface PluginConfig {
  /** Whether the plugin is enabled */
  enabled: boolean;
  /** Plugin-specific configuration */
  options?: Record<string, unknown>;
  /** Timeout in milliseconds for plugin execution (default: 5000) */
  timeout?: number;
}

/**
 * Result of a single plugin execution
 */
export interface PluginExecutionResult {
  pluginName: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

/**
 * Result of dispatching a message to all plugins
 */
export interface DispatchResult {
  messageId: string;
  results: PluginExecutionResult[];
}
