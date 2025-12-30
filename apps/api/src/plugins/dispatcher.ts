/**
 * Plugin Dispatcher
 *
 * Executes plugins when messages arrive. Handles parallel execution,
 * error isolation, and timeout management.
 */

import type {
  Plugin,
  MessagePayload,
  PluginContext,
  DispatchResult,
  PluginExecutionResult,
} from "./types.js";
import type { PluginRegistry } from "./registry.js";

/**
 * Options for the dispatcher
 */
export interface DispatcherOptions {
  /** Default timeout in milliseconds for plugin execution (default: 5000) */
  defaultTimeout?: number;
}

/**
 * Creates a default plugin context with a no-op logger
 */
function createDefaultContext(): PluginContext {
  return {
    logger: {
      info: (message: string, data?: Record<string, unknown>) => {
        console.log(`[INFO] ${message}`, data ?? "");
      },
      warn: (message: string, data?: Record<string, unknown>) => {
        console.warn(`[WARN] ${message}`, data ?? "");
      },
      error: (message: string, error?: Error | Record<string, unknown>) => {
        console.error(`[ERROR] ${message}`, error ?? "");
      },
      debug: (message: string, data?: Record<string, unknown>) => {
        console.debug(`[DEBUG] ${message}`, data ?? "");
      },
    },
    config: {},
  };
}

/**
 * Wraps a promise with a timeout
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  pluginName: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Plugin '${pluginName}' timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Normalizes an error to an Error instance with a message
 */
function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  return new Error("Unknown error occurred");
}

export class PluginDispatcher {
  private registry: PluginRegistry;
  private defaultTimeout: number;

  constructor(registry: PluginRegistry, options: DispatcherOptions = {}) {
    this.registry = registry;
    this.defaultTimeout = options.defaultTimeout ?? 5000;
  }

  /**
   * Dispatch a message to all registered plugins
   * Executes plugins in parallel with error isolation
   */
  async dispatch(payload: MessagePayload): Promise<DispatchResult> {
    const plugins = this.registry.getAll();
    const context = createDefaultContext();

    const results = await Promise.all(
      plugins.map((plugin) => this.executePlugin(plugin, payload, context))
    );

    return {
      messageId: payload.id,
      results,
    };
  }

  /**
   * Execute a single plugin with error handling and timing
   */
  private async executePlugin(
    plugin: Plugin,
    payload: MessagePayload,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    const startTime = performance.now();

    try {
      await withTimeout(
        plugin.onMessage(payload, context),
        this.defaultTimeout,
        plugin.name
      );

      return {
        pluginName: plugin.name,
        success: true,
        durationMs: Math.round(performance.now() - startTime),
      };
    } catch (rawError) {
      const error = normalizeError(rawError);
      const durationMs = Math.round(performance.now() - startTime);

      // Call the plugin's error handler (but don't let it crash us)
      try {
        await plugin.onError(error, payload, context);
      } catch {
        // Ignore errors in error handler
      }

      return {
        pluginName: plugin.name,
        success: false,
        durationMs,
        error: error.message,
      };
    }
  }
}
