/**
 * Authentication Middleware
 *
 * Uses Better Auth for session validation.
 * Provides middleware functions for protected routes.
 */
import type { Context, Next, MiddlewareHandler } from "hono";
import { auth, type Session, type User } from "../lib/auth.js";
import { ErrorCode } from "../lib/errors.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Context variables added by auth middleware
 */
export interface AuthVariables {
  user: User;
  session: Session;
}

/**
 * Context variables for optional auth (user can be null)
 */
export interface OptionalAuthVariables {
  user: User | null;
  session: Session | null;
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Middleware that requires authentication
 * Returns 401 if not authenticated
 * Attaches user and session to context
 *
 * @example
 * ```ts
 * app.use("/protected/*", requireAuth());
 *
 * app.get("/protected/profile", (c) => {
 *   const user = c.get("user"); // User is guaranteed to exist
 *   return c.json({ email: user.email });
 * });
 * ```
 */
export function requireAuth(): MiddlewareHandler<{
  Variables: AuthVariables;
}> {
  return async (c: Context, next: Next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      return c.json(
        {
          error: "Authentication required",
          code: ErrorCode.UNAUTHORIZED,
        },
        401
      );
    }

    // Attach user and session to context
    c.set("user", session.user);
    c.set("session", session.session);

    await next();
  };
}

/**
 * Middleware that optionally attaches user if authenticated
 * Does not require authentication - always passes
 * Attaches user and session to context if valid session exists
 *
 * @example
 * ```ts
 * app.use("/api/*", optionalAuth());
 *
 * app.get("/api/posts", (c) => {
 *   const user = c.get("user"); // User can be null
 *   if (user) {
 *     // Show personalized content
 *   }
 *   return c.json({ posts: [] });
 * });
 * ```
 */
export function optionalAuth(): MiddlewareHandler<{
  Variables: OptionalAuthVariables;
}> {
  return async (c: Context, next: Next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      c.set("user", null);
      c.set("session", null);
      await next();
      return;
    }

    // Attach user and session to context
    c.set("user", session.user);
    c.set("session", session.session);

    await next();
  };
}

/**
 * Helper to get authenticated user from context
 * Throws if user is not authenticated (use after requireAuth middleware)
 */
export function getAuthUser(c: Context): User {
  const user = c.get("user");
  if (!user) {
    throw new Error("User not found in context. Did you forget to use requireAuth middleware?");
  }
  return user;
}

/**
 * Helper to get session from context
 * Throws if session is not available (use after requireAuth middleware)
 */
export function getAuthSession(c: Context): Session {
  const session = c.get("session");
  if (!session) {
    throw new Error("Session not found in context. Did you forget to use requireAuth middleware?");
  }
  return session;
}

// ============================================================================
// Session Validation (for direct use in routes)
// ============================================================================

/**
 * Result of session validation
 */
export interface ValidateSessionResult {
  session: Session;
  user: User;
}

/**
 * Validate a session from request headers
 * Use this when you need to validate a session outside of middleware.
 *
 * For route handlers, prefer using requireAuth() or optionalAuth() middleware instead.
 *
 * @param headers - Request headers containing session cookie
 * @returns Session and user if valid, null otherwise
 */
export async function validateSession(
  headers: Headers
): Promise<ValidateSessionResult | null> {
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return null;
  }

  return {
    session: session.session,
    user: session.user,
  };
}
