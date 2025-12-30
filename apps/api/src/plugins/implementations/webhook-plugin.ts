/**
 * Webhook Plugin
 *
 * A plugin that forwards messages to an arbitrary HTTP endpoint.
 */

import type { Plugin, MessagePayload, PluginContext } from "../types.js";

export interface WebhookPluginConfig {
  /** The URL to send messages to */
  webhookUrl: string;
  /** Optional custom name for this plugin instance */
  name?: string;
  /** Optional additional headers to include in requests */
  headers?: Record<string, string>;
}

export class WebhookPlugin implements Plugin {
  name: string;
  private webhookUrl: string;
  private customHeaders: Record<string, string>;

  constructor(config: WebhookPluginConfig) {
    this.name = config.name ?? "webhook";
    this.webhookUrl = config.webhookUrl;
    this.customHeaders = config.headers ?? {};
  }

  /**
   * Forwards the message payload to the configured webhook URL
   */
  async onMessage(payload: MessagePayload, ctx: PluginContext): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.customHeaders,
      },
      body: JSON.stringify({
        id: payload.id,
        type: payload.type,
        content: payload.content,
        metadata: payload.metadata,
        timestamp: payload.timestamp.toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Webhook request failed: ${response.status} ${response.statusText}`
      );
    }
  }

  /**
   * Logs webhook-related errors
   */
  async onError(
    error: Error,
    payload: MessagePayload,
    ctx: PluginContext
  ): Promise<void> {
    ctx.logger.error(`Webhook plugin failed for message ${payload.id}`, {
      error: error.message,
      webhookUrl: this.webhookUrl,
      messageId: payload.id,
    });
  }
}
