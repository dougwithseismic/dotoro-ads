import { z } from "zod";

/**
 * Schema for inbox endpoint payloads
 *
 * Accepts any valid JSON object to support various webhook/automation sources.
 */

// Request payload - any JSON object
export const inboxPayloadSchema = z.record(z.unknown()).describe(
  "Any valid JSON object payload from external systems"
);

export type InboxPayload = z.infer<typeof inboxPayloadSchema>;

// Response schema for successful message receipt
export const inboxResponseSchema = z.object({
  received: z.boolean().describe("Whether the message was successfully received"),
  timestamp: z.string().datetime().describe("ISO 8601 timestamp of when the message was received"),
  id: z.string().uuid().describe("Unique identifier for this message"),
});

export type InboxResponse = z.infer<typeof inboxResponseSchema>;
