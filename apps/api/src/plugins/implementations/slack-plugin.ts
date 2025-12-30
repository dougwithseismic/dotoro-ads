/**
 * Slack Plugin
 *
 * A plugin that forwards messages to a Slack channel via webhook.
 * Uses Slack Block Kit for rich message formatting.
 *
 * Key features:
 * - Never throws errors (logs and continues)
 * - Supports severity-based color coding
 * - Formats metadata as Slack fields
 * - 5 second timeout with AbortController
 */

import type { Plugin, MessagePayload, PluginContext } from "../types.js";

// Slack character limits
const HEADER_MAX_LENGTH = 150;
const SECTION_MAX_LENGTH = 3000;
const DEFAULT_TIMEOUT_MS = 5000;

// Severity to color mapping
const SEVERITY_COLORS: Record<string, string | undefined> = {
  info: undefined, // No color bar for info
  success: "#36a64f", // Green
  warning: "#ffcc00", // Yellow
  error: "#ff0000", // Red
};

export interface SlackPluginConfig {
  /** Slack webhook URL (required) */
  webhookUrl: string;
  /** Optional custom name for this plugin instance */
  name?: string;
  /** Timeout in milliseconds (default: 5000) */
  timeoutMs?: number;
  /** Whether to send error notifications to Slack (default: false) */
  sendErrorsToSlack?: boolean;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  fields?: Array<{ type: string; text: string }>;
  elements?: Array<{ type: string; text: string }>;
}

interface SlackWebhookPayload {
  blocks?: SlackBlock[];
  attachments?: Array<{
    color: string;
    blocks: SlackBlock[];
  }>;
}

export class SlackPlugin implements Plugin {
  name: string;
  private webhookUrl: string;
  private timeoutMs: number;
  private sendErrorsToSlack: boolean;
  private debug: boolean;

  constructor(config: SlackPluginConfig) {
    if (!config.webhookUrl || config.webhookUrl.trim() === "") {
      throw new Error("Slack webhook URL is required");
    }

    this.name = config.name ?? "slack";
    this.webhookUrl = config.webhookUrl;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.sendErrorsToSlack = config.sendErrorsToSlack ?? false;
    this.debug = config.debug ?? false;
  }

  /**
   * Forwards the message to Slack via webhook.
   * Never throws - all errors are logged and swallowed.
   */
  async onMessage(payload: MessagePayload, ctx: PluginContext): Promise<void> {
    const severity = this.extractSeverity(payload.metadata);
    const slackPayload = this.buildSlackPayload(payload, severity);

    if (this.debug) {
      ctx.logger.debug("Slack plugin sending message", {
        webhookUrl: this.maskWebhookUrl(this.webhookUrl),
        messageId: payload.id,
        severity,
      });
    }

    await this.sendToSlack(slackPayload, ctx);
  }

  /**
   * Logs error details. Optionally sends error notification to Slack.
   * Never throws - all errors are logged and swallowed.
   */
  async onError(
    error: Error,
    payload: MessagePayload,
    ctx: PluginContext
  ): Promise<void> {
    ctx.logger.error(`Slack plugin error for message ${payload.id}`, {
      error: error.message,
      messageId: payload.id,
      type: payload.type,
    });

    if (this.sendErrorsToSlack) {
      const errorPayload = this.buildErrorSlackPayload(error, payload);
      await this.sendToSlack(errorPayload, ctx);
    }
  }

  /**
   * Sends payload to Slack webhook with timeout handling.
   * Never throws - catches all errors and logs them.
   */
  private async sendToSlack(
    slackPayload: SlackWebhookPayload,
    ctx: PluginContext
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        ctx.logger.error(`Slack webhook returned ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
        });
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        ctx.logger.error("Slack webhook request timeout", {
          timeoutMs: this.timeoutMs,
        });
      } else {
        ctx.logger.error("Slack webhook request failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Builds the Slack Block Kit payload from a message payload.
   */
  private buildSlackPayload(
    payload: MessagePayload,
    severity: string
  ): SlackWebhookPayload {
    const blocks = this.buildBlocks(payload);
    const color = SEVERITY_COLORS[severity];

    if (color) {
      // Use attachments for colored severity bar
      return {
        attachments: [{ color, blocks }],
      };
    }

    // No color for info severity
    return { blocks };
  }

  /**
   * Builds error notification payload for Slack.
   */
  private buildErrorSlackPayload(
    error: Error,
    payload: MessagePayload
  ): SlackWebhookPayload {
    const blocks: SlackBlock[] = [
      this.buildHeaderBlock("Error Processing Message"),
      this.buildSectionBlock(`An error occurred: ${error.message}`),
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Message ID:*\n${payload.id}` },
          { type: "mrkdwn", text: `*Type:*\n${payload.type}` },
        ],
      },
      this.buildContextBlock(new Date().toISOString()),
    ];

    return {
      attachments: [{ color: SEVERITY_COLORS.error!, blocks }],
    };
  }

  /**
   * Builds all blocks for a message.
   */
  private buildBlocks(payload: MessagePayload): SlackBlock[] {
    const blocks: SlackBlock[] = [];

    // Header block with message type
    blocks.push(this.buildHeaderBlock(payload.type));

    // Section block with message content
    blocks.push(this.buildSectionBlock(payload.content));

    // Fields section for metadata (excluding severity)
    const fields = this.buildMetadataFields(payload.metadata);
    if (fields.length > 0) {
      blocks.push({
        type: "section",
        fields,
      });
    }

    // Context block with timestamp
    blocks.push(this.buildContextBlock(payload.timestamp.toISOString()));

    return blocks;
  }

  /**
   * Builds a header block (limited to 150 chars).
   */
  private buildHeaderBlock(text: string): SlackBlock {
    return {
      type: "header",
      text: {
        type: "plain_text",
        text: this.truncate(text, HEADER_MAX_LENGTH),
      },
    };
  }

  /**
   * Builds a section block with mrkdwn text (limited to 3000 chars).
   */
  private buildSectionBlock(text: string): SlackBlock {
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: this.truncate(text, SECTION_MAX_LENGTH),
      },
    };
  }

  /**
   * Builds a context block for timestamps/metadata.
   */
  private buildContextBlock(timestamp: string): SlackBlock {
    return {
      type: "context",
      elements: [{ type: "mrkdwn", text: `Sent at ${timestamp}` }],
    };
  }

  /**
   * Builds Slack fields from metadata object.
   */
  private buildMetadataFields(
    metadata: Record<string, unknown>
  ): Array<{ type: string; text: string }> {
    return Object.entries(metadata)
      .filter(([key]) => key !== "severity") // Exclude severity from fields
      .map(([key, value]) => ({
        type: "mrkdwn",
        text: `*${this.formatFieldLabel(key)}:*\n${String(value)}`,
      }));
  }

  /**
   * Formats a camelCase or snake_case key as a readable label.
   */
  private formatFieldLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^\s/, "")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Extracts severity from metadata, defaults to 'info'.
   */
  private extractSeverity(metadata: Record<string, unknown>): string {
    const severity = metadata.severity;
    if (
      typeof severity === "string" &&
      Object.keys(SEVERITY_COLORS).includes(severity)
    ) {
      return severity;
    }
    return "info";
  }

  /**
   * Truncates text to max length, adding ellipsis if truncated.
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 3) + "...";
  }

  /**
   * Masks webhook URL for safe logging (shows only first part).
   */
  private maskWebhookUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}/***`;
    } catch {
      return "***";
    }
  }
}
