/**
 * Better Auth Handler
 *
 * Delegates all /api/auth/* routes to Better Auth.
 * Better Auth provides:
 * - Magic link authentication: /api/auth/magic-link/*
 * - Session management: /api/auth/session
 * - Sign out: /api/auth/sign-out
 *
 * @see https://www.better-auth.com/docs
 */
import { Hono } from "hono";
import { auth } from "../lib/auth.js";

export const authHandler = new Hono();

/**
 * Handle all auth routes via Better Auth
 *
 * Better Auth handles the following endpoints automatically:
 * - POST /api/auth/magic-link - Request magic link email
 * - GET /api/auth/magic-link/verify - Verify magic link token
 * - GET /api/auth/session - Get current session
 * - POST /api/auth/sign-out - Sign out and invalidate session
 * - And more...
 */
authHandler.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

export default authHandler;
