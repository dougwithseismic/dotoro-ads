import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import {
  requestMagicLinkSchema,
  verifyMagicLinkSchema,
  sessionResponseSchema,
  magicLinkRequestedResponseSchema,
  logoutResponseSchema,
  userSchema,
} from "../schemas/auth.js";
import { errorResponseSchema } from "../schemas/common.js";
import { commonResponses } from "../lib/openapi.js";
import { ApiException, ErrorCode } from "../lib/errors.js";
import {
  createMagicLink,
  verifyMagicLink,
  validateSession,
  revokeSessionByToken,
  SESSION_EXPIRY_MS,
} from "../services/auth-service.js";
import { sendMagicLinkEmail } from "@repo/email";

// ============================================================================
// Constants
// ============================================================================

const SESSION_COOKIE_NAME = "session";
const MAGIC_LINK_BASE_URL = process.env.MAGIC_LINK_BASE_URL || "http://localhost:3000";

// Cookie options
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_EXPIRY_MS / 1000, // Convert to seconds
});

// Create the OpenAPI Hono app
export const authApp = new OpenAPIHono();

// ============================================================================
// Route Definitions
// ============================================================================

const requestMagicLinkRoute = createRoute({
  method: "post",
  path: "/api/auth/magic-link/request",
  tags: ["Auth"],
  summary: "Request magic link",
  description: "Request a magic link to be sent to the provided email address. Always returns success to prevent email enumeration.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: requestMagicLinkSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Magic link request processed",
      content: {
        "application/json": {
          schema: magicLinkRequestedResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const verifyMagicLinkRoute = createRoute({
  method: "post",
  path: "/api/auth/magic-link/verify",
  tags: ["Auth"],
  summary: "Verify magic link",
  description: "Verify a magic link token and create a session. Sets a session cookie on success.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: verifyMagicLinkSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token verified, session created",
      content: {
        "application/json": {
          schema: z.object({
            user: userSchema,
            expiresAt: z.string().datetime(),
          }),
        },
      },
    },
    400: {
      description: "Invalid or expired token",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const getSessionRoute = createRoute({
  method: "get",
  path: "/api/auth/session",
  tags: ["Auth"],
  summary: "Get current session",
  description: "Get the current user session. Returns null user if not authenticated.",
  responses: {
    200: {
      description: "Session information",
      content: {
        "application/json": {
          schema: sessionResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const logoutRoute = createRoute({
  method: "post",
  path: "/api/auth/logout",
  tags: ["Auth"],
  summary: "Logout",
  description: "Logout the current user by revoking the session and clearing the cookie.",
  responses: {
    200: {
      description: "Logged out successfully",
      content: {
        "application/json": {
          schema: logoutResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

authApp.openapi(requestMagicLinkRoute, async (c) => {
  const { email } = c.req.valid("json");

  // Get client metadata for security logging
  const userAgent = c.req.header("user-agent");
  const ipAddress = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
    || c.req.header("x-real-ip");

  // Create magic link
  const result = await createMagicLink(email, MAGIC_LINK_BASE_URL);

  // If magic link was created successfully, send email
  if (result.success && result.magicLinkUrl && result.expiresAt) {
    try {
      await sendMagicLinkEmail({
        to: email,
        magicLinkUrl: result.magicLinkUrl,
        expiresAt: result.expiresAt,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      // Log error but don't fail the request (to prevent enumeration)
      console.error("Failed to send magic link email:", error);
    }
  }

  // Always return success to prevent email enumeration
  return c.json(
    {
      success: true as const,
      message: "If an account exists, a magic link has been sent",
    },
    200
  );
});

authApp.openapi(verifyMagicLinkRoute, async (c) => {
  const { token } = c.req.valid("json");

  // Get client metadata
  const userAgent = c.req.header("user-agent");
  const ipAddress = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
    || c.req.header("x-real-ip");

  // Verify magic link
  const result = await verifyMagicLink(token, { userAgent, ipAddress });

  if (!result.success || !result.user || !result.sessionToken || !result.expiresAt) {
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      result.error || "Invalid or expired token"
    );
  }

  // Set session cookie
  setCookie(c, SESSION_COOKIE_NAME, result.sessionToken, getCookieOptions());

  return c.json(
    {
      user: {
        id: result.user.id,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
      },
      expiresAt: result.expiresAt.toISOString(),
    },
    200
  );
});

authApp.openapi(getSessionRoute, async (c) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

  if (!sessionToken) {
    return c.json(
      {
        user: null,
        expiresAt: null,
      },
      200
    );
  }

  const result = await validateSession(sessionToken);

  if (!result) {
    // Clear invalid cookie
    deleteCookie(c, SESSION_COOKIE_NAME);
    return c.json(
      {
        user: null,
        expiresAt: null,
      },
      200
    );
  }

  return c.json(
    {
      user: {
        id: result.user.id,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
      },
      expiresAt: result.session.expiresAt.toISOString(),
    },
    200
  );
});

authApp.openapi(logoutRoute, async (c) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

  if (sessionToken) {
    // Revoke session in database
    await revokeSessionByToken(sessionToken);
  }

  // Clear session cookie
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });

  return c.json(
    {
      success: true as const,
    },
    200
  );
});

// Error handler for API exceptions
authApp.onError((err, c) => {
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  console.error("Auth route error:", err);
  return c.json(
    {
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
    },
    500
  );
});

export default authApp;
