/**
 * Logging Plugin
 *
 * A simple plugin that logs all messages for debugging purposes.
 */

import type { Plugin, MessagePayload, PluginContext } from "../types.js";

const MAX_CONTENT_PREVIEW_LENGTH = 100;

export class LoggingPlugin implements Plugin {
  name = "logging";

  /**
   * Logs incoming message with key details
   */
  async onMessage(payload: MessagePayload, ctx: PluginContext): Promise<void> {
    const contentPreview =
      payload.content.length > MAX_CONTENT_PREVIEW_LENGTH
        ? `${payload.content.slice(0, MAX_CONTENT_PREVIEW_LENGTH)}...`
        : payload.content;

    ctx.logger.info(`Message received: ${payload.id}`, {
      messageId: payload.id,
      type: payload.type,
      contentPreview,
      timestamp: payload.timestamp.toISOString(),
      metadataKeys: Object.keys(payload.metadata),
    });
  }

  /**
   * Logs errors that occur during message processing
   */
  async onError(
    error: Error,
    payload: MessagePayload,
    ctx: PluginContext
  ): Promise<void> {
    ctx.logger.error(`Logging plugin error for message ${payload.id}`, {
      error: error.message,
      messageId: payload.id,
      type: payload.type,
    });
  }
}
