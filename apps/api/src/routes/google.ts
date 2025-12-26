/**
 * Google OAuth Routes
 *
 * Placeholder routes for Google OAuth flow. These routes handle:
 * - OAuth flow initiation (redirect to Google)
 * - OAuth callback (exchange code for tokens)
 * - Connection status (check if user has connected Google)
 * - Account disconnection (revoke OAuth tokens)
 *
 * Note: Full OAuth implementation requires Google Cloud project setup with:
 * - OAuth 2.0 Client ID and Secret
 * - Authorized redirect URIs
 * - Google Sheets API enabled
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  googleOAuthConnectResponseSchema,
  googleOAuthCallbackQuerySchema,
  googleOAuthStatusQuerySchema,
  googleOAuthStatusResponseSchema,
  googleOAuthDisconnectRequestSchema,
  googleOAuthDisconnectResponseSchema,
  googleOAuthErrorSchema,
} from "../schemas/google.js";
import { commonResponses } from "../lib/openapi.js";
import {
  hasGoogleCredentials,
  revokeGoogleCredentials,
} from "../services/oauth-tokens.js";

// ============================================================================
// Create the OpenAPI Hono app
// ============================================================================

export const googleAuthApp = new OpenAPIHono();

// ============================================================================
// OAuth Configuration
// ============================================================================

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

/**
 * Check if Google OAuth is configured
 */
function isOAuthConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return Boolean(clientId && clientSecret);
}

/**
 * Build Google OAuth authorization URL
 */
function buildAuthorizationUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3001/api/v1/auth/google/callback";

  const params = new URLSearchParams({
    client_id: clientId || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// ============================================================================
// Route Definitions
// ============================================================================

const connectRoute = createRoute({
  method: "get",
  path: "/api/v1/auth/google/connect",
  tags: ["Google OAuth"],
  summary: "Initiate Google OAuth flow",
  description:
    "Returns the Google OAuth authorization URL. Redirect the user to this URL to start the OAuth flow.",
  responses: {
    200: {
      description: "Authorization URL generated",
      content: {
        "application/json": {
          schema: googleOAuthConnectResponseSchema,
        },
      },
    },
    503: {
      description: "OAuth not configured",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const callbackRoute = createRoute({
  method: "get",
  path: "/api/v1/auth/google/callback",
  tags: ["Google OAuth"],
  summary: "Handle OAuth callback",
  description:
    "Handles the OAuth callback from Google. Exchanges the authorization code for tokens and stores them.",
  request: {
    query: googleOAuthCallbackQuerySchema,
  },
  responses: {
    302: {
      description: "Redirects to frontend with OAuth result",
    },
    400: {
      description: "Missing authorization code",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    501: {
      description: "Not implemented (placeholder)",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const statusRoute = createRoute({
  method: "get",
  path: "/api/v1/auth/google/status",
  tags: ["Google OAuth"],
  summary: "Check Google connection status",
  description: "Checks if a user has connected their Google account.",
  request: {
    query: googleOAuthStatusQuerySchema,
  },
  responses: {
    200: {
      description: "Connection status",
      content: {
        "application/json": {
          schema: googleOAuthStatusResponseSchema,
        },
      },
    },
    400: {
      description: "Missing userId",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const disconnectRoute = createRoute({
  method: "post",
  path: "/api/v1/auth/google/disconnect",
  tags: ["Google OAuth"],
  summary: "Disconnect Google account",
  description:
    "Revokes and removes the Google OAuth tokens for a user, disconnecting their Google account.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: googleOAuthDisconnectRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully disconnected",
      content: {
        "application/json": {
          schema: googleOAuthDisconnectResponseSchema,
        },
      },
    },
    400: {
      description: "Missing userId",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

googleAuthApp.openapi(connectRoute, async (c) => {
  if (!isOAuthConfigured()) {
    return c.json(
      {
        error:
          "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
        code: "OAUTH_NOT_CONFIGURED",
      },
      503
    );
  }

  const authorizationUrl = buildAuthorizationUrl();

  return c.json(
    {
      authorizationUrl,
    },
    200
  );
});

googleAuthApp.openapi(callbackRoute, async (c) => {
  const query = c.req.valid("query");
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  // Handle OAuth errors from Google
  if (query.error) {
    console.error(
      `[Google OAuth] Error from Google: ${query.error} - ${query.error_description}`
    );
    return c.redirect(
      `${frontendUrl}/settings?oauth=error&message=${encodeURIComponent(
        query.error_description || query.error
      )}`
    );
  }

  // Check for authorization code
  if (!query.code) {
    return c.json(
      {
        error: "Missing authorization code",
        code: "MISSING_CODE",
      },
      400
    );
  }

  // This is a placeholder - full implementation would:
  // 1. Exchange code for tokens
  // 2. Store tokens in database
  // 3. Redirect to frontend with success

  return c.json(
    {
      error:
        "OAuth callback not implemented. This is a placeholder route. Configure Google Cloud OAuth to enable this feature.",
      code: "NOT_IMPLEMENTED",
    },
    501
  );

  // Example full implementation:
  // try {
  //   const tokens = await exchangeCodeForTokens(query.code);
  //   const userId = getUserIdFromState(query.state);
  //   await storeGoogleCredentials(userId, tokens);
  //   return c.redirect(`${frontendUrl}/settings?oauth=success&platform=google`);
  // } catch (error) {
  //   return c.redirect(
  //     `${frontendUrl}/settings?oauth=error&message=${encodeURIComponent("Failed to connect Google account")}`
  //   );
  // }
});

googleAuthApp.openapi(statusRoute, async (c) => {
  const query = c.req.valid("query");

  if (!query.userId) {
    return c.json(
      {
        error: "Missing userId query parameter",
        code: "MISSING_USER_ID",
      },
      400
    );
  }

  const connected = await hasGoogleCredentials(query.userId);

  return c.json(
    {
      connected,
    },
    200
  );
});

googleAuthApp.openapi(disconnectRoute, async (c) => {
  const body = c.req.valid("json");

  if (!body.userId) {
    return c.json(
      {
        error: "Missing userId in request body",
        code: "MISSING_USER_ID",
      },
      400
    );
  }

  await revokeGoogleCredentials(body.userId);

  return c.json(
    {
      success: true,
      message: "Google account disconnected successfully",
    },
    200
  );
});

export default googleAuthApp;
