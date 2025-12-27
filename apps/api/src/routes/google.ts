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
  googleOAuthConnectRequestSchema,
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
  storeGoogleCredentials,
} from "../services/oauth-tokens.js";

// ============================================================================
// Create the OpenAPI Hono app
// ============================================================================

export const googleAuthApp = new OpenAPIHono();

// ============================================================================
// OAuth Configuration
// ============================================================================

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SCOPES = [
  // Google Sheets (for data source import)
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  // Google Ads (for campaign management)
  "https://www.googleapis.com/auth/adwords",
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
 * State payload for OAuth flow
 */
interface OAuthStatePayload {
  userId: string;
  redirectUrl: string;
}

/**
 * Encode state payload for OAuth flow
 */
function encodeState(payload: OAuthStatePayload): string {
  return btoa(JSON.stringify(payload));
}

/**
 * Decode state payload from OAuth callback
 * Returns null if the state is invalid or malformed
 */
export function decodeState(state: string): OAuthStatePayload | null {
  try {
    if (!state) {
      return null;
    }
    return JSON.parse(atob(state)) as OAuthStatePayload;
  } catch {
    return null;
  }
}

/**
 * Validate that a redirect URL is within allowed origins
 * Prevents open redirect attacks by ensuring the URL matches the frontend origin
 */
export function isAllowedRedirectUrl(url: string): boolean {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  try {
    const parsed = new URL(url);
    const allowed = new URL(frontendUrl);
    return parsed.origin === allowed.origin;
  } catch {
    return false;
  }
}

/**
 * Build Google OAuth authorization URL
 */
function buildAuthorizationUrl(state: string): string {
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
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// ============================================================================
// Route Definitions
// ============================================================================

const connectRoute = createRoute({
  method: "post",
  path: "/api/v1/auth/google/connect",
  tags: ["Google OAuth"],
  summary: "Initiate Google OAuth flow",
  description:
    "Returns the Google OAuth authorization URL. Redirect the user to this URL to start the OAuth flow. The redirectUrl in the request body specifies where to redirect after OAuth completes.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: googleOAuthConnectRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Authorization URL generated",
      content: {
        "application/json": {
          schema: googleOAuthConnectResponseSchema,
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
  const body = c.req.valid("json");

  // Get userId from body or x-user-id header
  const userId = body.userId || c.req.header("x-user-id");

  if (!userId) {
    return c.json(
      {
        error: "Missing userId. Provide in request body or x-user-id header.",
        code: "MISSING_USER_ID",
      },
      400
    );
  }

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

  // Determine redirect URL (use provided if valid, otherwise default to data-sources page)
  // Security: Validate that redirectUrl is within allowed origins to prevent open redirect attacks
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const defaultRedirectUrl = `${frontendUrl}/data-sources`;
  const redirectUrl =
    body.redirectUrl && isAllowedRedirectUrl(body.redirectUrl)
      ? body.redirectUrl
      : defaultRedirectUrl;

  // Encode state with userId and redirectUrl for the callback
  const state = encodeState({ userId, redirectUrl });
  const authorizationUrl = buildAuthorizationUrl(state);

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
  const defaultRedirectUrl = `${frontendUrl}/data-sources`;

  /**
   * Helper to create an error redirect URL
   */
  function createErrorRedirect(redirectUrl: string, message: string): string {
    return `${redirectUrl}?oauth=error&message=${encodeURIComponent(message)}`;
  }

  /**
   * Helper to create a success redirect URL
   */
  function createSuccessRedirect(redirectUrl: string): string {
    return `${redirectUrl}?oauth=success&platform=google`;
  }

  /**
   * Validate and get the redirect URL (falls back to default if invalid)
   */
  function getValidRedirectUrl(url: string | undefined): string {
    if (!url || !isAllowedRedirectUrl(url)) {
      return defaultRedirectUrl;
    }
    return url;
  }

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

  // Decode and validate state parameter
  const statePayload = decodeState(query.state || "");

  if (!statePayload) {
    console.error("[Google OAuth] Invalid or missing state parameter");
    return c.redirect(
      createErrorRedirect(defaultRedirectUrl, "Invalid state parameter")
    );
  }

  if (!statePayload.userId) {
    console.error("[Google OAuth] State payload missing userId");
    return c.redirect(
      createErrorRedirect(
        getValidRedirectUrl(statePayload.redirectUrl),
        "Invalid state: missing userId"
      )
    );
  }

  const userId = statePayload.userId;
  const redirectUrl = getValidRedirectUrl(statePayload.redirectUrl);

  // Exchange authorization code for tokens
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const googleRedirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:3001/api/v1/auth/google/callback";

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: query.code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: googleRedirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({})) as {
        error?: string;
        error_description?: string;
      };
      const errorMessage =
        errorData.error_description ||
        errorData.error ||
        "Token exchange failed";
      console.error(
        `[Google OAuth] Token exchange failed: ${errorMessage}`
      );
      return c.redirect(createErrorRedirect(redirectUrl, errorMessage));
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
    };

    // Store credentials
    await storeGoogleCredentials(userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
    });

    console.log(`[Google OAuth] Successfully stored credentials for user: ${userId}`);
    return c.redirect(createSuccessRedirect(redirectUrl));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to connect Google account";
    console.error(`[Google OAuth] Error during callback: ${errorMessage}`);
    return c.redirect(createErrorRedirect(redirectUrl, errorMessage));
  }
});

googleAuthApp.openapi(statusRoute, async (c) => {
  const query = c.req.valid("query");

  // Get userId from query param or x-user-id header
  const userId = query.userId || c.req.header("x-user-id");

  if (!userId) {
    return c.json(
      {
        error: "Missing userId. Provide via query parameter or x-user-id header.",
        code: "MISSING_USER_ID",
      },
      400
    );
  }

  const connected = await hasGoogleCredentials(userId);

  return c.json(
    {
      connected,
    },
    200
  );
});

googleAuthApp.openapi(disconnectRoute, async (c) => {
  const body = c.req.valid("json");

  // Get userId from body or x-user-id header
  const userId = body.userId || c.req.header("x-user-id");

  if (!userId) {
    return c.json(
      {
        error: "Missing userId. Provide in request body or x-user-id header.",
        code: "MISSING_USER_ID",
      },
      400
    );
  }

  await revokeGoogleCredentials(userId);

  return c.json(
    {
      success: true,
      message: "Google account disconnected successfully",
    },
    200
  );
});

export default googleAuthApp;
