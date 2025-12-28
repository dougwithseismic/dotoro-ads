import { z } from "zod";

/**
 * Auth Schema Definitions
 * Used for magic link authentication flow
 */

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Request magic link - POST /api/auth/magic-link/request
 */
export const requestMagicLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .max(255, "Email must be 255 characters or less"),
});

export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;

/**
 * Verify magic link - POST /api/auth/magic-link/verify
 */
export const verifyMagicLinkSchema = z.object({
  token: z
    .string()
    .length(64, "Token must be exactly 64 characters"),
});

export type VerifyMagicLinkInput = z.infer<typeof verifyMagicLinkSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * User object returned in session responses
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  emailVerified: z.boolean(),
});

export type UserResponse = z.infer<typeof userSchema>;

/**
 * Session response - returned from verify and session endpoints
 */
export const sessionResponseSchema = z.object({
  user: userSchema.nullable(),
  expiresAt: z.string().datetime().nullable(),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/**
 * Response after requesting magic link
 * Always returns success to prevent email enumeration
 */
export const magicLinkRequestedResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export type MagicLinkRequestedResponse = z.infer<typeof magicLinkRequestedResponseSchema>;

/**
 * Generic success response for logout
 */
export const logoutResponseSchema = z.object({
  success: z.literal(true),
});

export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

// ============================================================================
// OpenAPI Schema Extensions
// ============================================================================

/**
 * Example schemas for OpenAPI documentation
 */
export const authExamples = {
  requestMagicLink: {
    email: "user@example.com",
  },
  verifyMagicLink: {
    token: "a".repeat(64),
  },
  sessionResponse: {
    user: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "user@example.com",
      emailVerified: true,
    },
    expiresAt: "2025-01-08T00:00:00.000Z",
  },
  magicLinkRequested: {
    success: true,
    message: "If an account exists, a magic link has been sent",
  },
};
