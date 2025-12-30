/**
 * Inbox API Routes
 *
 * Provides a simple, secure POST endpoint that receives arbitrary JSON payloads
 * from external systems and passes them to the plugin system for processing.
 *
 * Authentication: X-Inbox-Key header validated against INBOX_API_KEY env var
 */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { randomUUID } from "crypto";
import type { Context } from "hono";
import { inboxPayloadSchema, inboxResponseSchema } from "../schemas/inbox.js";
import { errorResponseSchema } from "../schemas/common.js";
import {
  ApiException,
  ErrorCode,
  createUnauthorizedError,
  createValidationError,
  createInternalError,
} from "../lib/errors.js";
import { PluginDispatcher, pluginRegistry } from "../plugins/index.js";
import type { MessagePayload } from "../plugins/types.js";

// ============================================================================
// API Key Validation
// ============================================================================

/**
 * Validates the X-Inbox-Key header against the configured INBOX_API_KEY.
 * Throws 401 if invalid or missing, 500 if INBOX_API_KEY not configured.
 */
function validateApiKey(c: Context): void {
  const configuredKey = process.env.INBOX_API_KEY;

  if (!configuredKey) {
    throw createInternalError("Inbox endpoint not configured");
  }

  const providedKey = c.req.header("X-Inbox-Key") || "";

  if (!providedKey || providedKey !== configuredKey) {
    throw createUnauthorizedError("Invalid or missing API key");
  }
}

// ============================================================================
// Create App
// ============================================================================

export const inboxApp = new OpenAPIHono();

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * POST /api/inbox - Accept external messages
 */
const postInboxRoute = createRoute({
  method: "post",
  path: "/api/inbox",
  tags: ["Inbox"],
  summary: "Receive external message",
  description:
    "Accepts arbitrary JSON payloads from external systems (webhooks, automation tools, etc.) " +
    "and passes them to the plugin system for processing. Requires X-Inbox-Key header for authentication.",
  request: {
    headers: z.object({
      "X-Inbox-Key": z.string().optional().describe("API key for inbox authentication"),
    }),
    body: {
      content: {
        "application/json": {
          schema: inboxPayloadSchema,
        },
      },
      description: "Any valid JSON object payload",
    },
  },
  responses: {
    200: {
      description: "Message received successfully",
      content: {
        "application/json": {
          schema: inboxResponseSchema,
        },
      },
    },
    400: {
      description: "Bad Request - Invalid JSON payload",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - Invalid or missing API key",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

inboxApp.openapi(postInboxRoute, async (c) => {
  // Validate API key first (fail-fast)
  validateApiKey(c);

  // Parse and validate the JSON body
  let payload: Record<string, unknown>;
  try {
    payload = c.req.valid("json");
  } catch {
    throw createValidationError("Invalid JSON payload");
  }

  // Generate message ID and timestamp
  const messageId = randomUUID();
  const timestamp = new Date();

  // Create message payload for plugin system
  const messagePayload: MessagePayload = {
    id: messageId,
    type: (payload.type as string) || "inbox",
    content: JSON.stringify(payload),
    metadata: payload,
    timestamp,
  };

  // Dispatch to plugins (fire-and-forget style, but await for any errors)
  const dispatcher = new PluginDispatcher(pluginRegistry);
  await dispatcher.dispatch(messagePayload);

  return c.json(
    {
      received: true,
      timestamp: timestamp.toISOString(),
      id: messageId,
    },
    200
  );
});

// ============================================================================
// Error Handler
// ============================================================================

inboxApp.onError((err, c) => {
  // Handle our custom API exceptions
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  // Handle JSON parse errors (from Hono's body parser)
  if (err.message?.includes("JSON") || err.name === "SyntaxError") {
    return c.json(
      {
        error: "Invalid JSON payload",
        code: ErrorCode.VALIDATION_ERROR,
      },
      400
    );
  }

  console.error("Inbox endpoint error:", err);
  return c.json(
    {
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
    },
    500
  );
});

export default inboxApp;
