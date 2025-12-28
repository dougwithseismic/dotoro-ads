import { randomBytes, createHash } from "crypto";
import { eq, and, lt, isNull, isNotNull } from "drizzle-orm";
import {
  db,
  user,
  session,
  verification,
  type User,
  type Session,
} from "./db.js";

// ============================================================================
// Constants
// ============================================================================

/** Magic link token expiry: 15 minutes */
export const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000;

/** Session expiry: 7 days */
export const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================================================
// Token Generation & Hashing
// ============================================================================

/**
 * Generate a cryptographically secure random token
 * Returns 64 hex characters (32 bytes = 256 bits)
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash a token using SHA-256
 * Used for storing tokens securely in the database
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ============================================================================
// User Management
// ============================================================================

export interface GetOrCreateUserResult {
  user: User;
  isNewUser: boolean;
}

/**
 * Get existing user or create new one by email
 */
export async function getOrCreateUser(email: string): Promise<GetOrCreateUserResult> {
  // First, try to find existing user
  const [existingUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .limit(1);

  if (existingUser) {
    return { user: existingUser, isNewUser: false };
  }

  // Create new user - Better Auth requires name field
  const [newUser] = await db
    .insert(user)
    .values({
      id: randomBytes(16).toString("hex"), // Better Auth uses text IDs
      email: email.toLowerCase(),
      name: "", // Better Auth requires name
      emailVerified: false,
    })
    .returning();

  return { user: newUser!, isNewUser: true };
}

// ============================================================================
// Magic Link Functions
// ============================================================================

export interface CreateMagicLinkResult {
  success: boolean;
  magicLinkUrl?: string;
  expiresAt?: Date;
  isNewUser?: boolean;
  error?: string;
}

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Create a magic link for the given email
 *
 * @param email - User's email address
 * @param baseUrl - Base URL for the magic link (e.g., "https://app.dotoro.io")
 * @returns Magic link URL and expiration
 */
export async function createMagicLink(
  email: string,
  baseUrl: string
): Promise<CreateMagicLinkResult> {
  try {
    // Get or create user
    const { user, isNewUser } = await getOrCreateUser(email);

    // Generate token and hash
    const rawToken = generateSecureToken();
    const hashedToken = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MS);

    // Store hashed token in verification table (Better Auth pattern)
    await db.insert(verification).values({
      id: randomBytes(16).toString("hex"), // Better Auth uses text IDs
      identifier: user.email,
      value: hashedToken,
      expiresAt,
    });

    // Build magic link URL
    const magicLinkUrl = `${baseUrl}/verify?token=${rawToken}`;

    return {
      success: true,
      magicLinkUrl,
      expiresAt,
      isNewUser,
    };
  } catch (error) {
    console.error("Error creating magic link:", error);
    return {
      success: false,
      error: "Failed to create magic link",
    };
  }
}

export interface VerifyMagicLinkResult {
  success: boolean;
  user?: User;
  sessionToken?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Verify a magic link token and create a session
 *
 * @param rawToken - The raw token from the magic link URL
 * @param metadata - Session metadata (user agent, IP)
 * @returns Session info if valid, error if not
 */
export async function verifyMagicLink(
  rawToken: string,
  metadata: SessionMetadata = {}
): Promise<VerifyMagicLinkResult> {
  try {
    const hashedToken = hashToken(rawToken);

    // Find the token in verification table
    const [tokenRecord] = await db
      .select()
      .from(verification)
      .where(eq(verification.value, hashedToken))
      .limit(1);

    // Token not found
    if (!tokenRecord) {
      return {
        success: false,
        error: "Invalid or expired token",
      };
    }

    // Token expired
    if (tokenRecord.expiresAt < new Date()) {
      // Delete expired verification record
      await db.delete(verification).where(eq(verification.id, tokenRecord.id));
      return {
        success: false,
        error: "Invalid or expired token",
      };
    }

    // Delete the used verification record (Better Auth pattern)
    await db.delete(verification).where(eq(verification.id, tokenRecord.id));

    // Get or create user using the identifier (email)
    const result = await getOrCreateUser(tokenRecord.identifier);
    const foundUser = result.user;

    // Mark email as verified
    await db
      .update(user)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(user.id, foundUser.id));

    // Create session
    const { sessionToken, expiresAt } = await createSession(foundUser.id, metadata);

    // Return updated user
    const [updatedUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, foundUser.id))
      .limit(1);

    return {
      success: true,
      user: updatedUser!,
      sessionToken,
      expiresAt,
    };
  } catch (error) {
    console.error("Error verifying magic link:", error);
    return {
      success: false,
      error: "Failed to verify magic link",
    };
  }
}

// ============================================================================
// Session Management
// ============================================================================

export interface CreateSessionResult {
  sessionToken: string;
  session: Session;
  expiresAt: Date;
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  metadata: SessionMetadata = {}
): Promise<CreateSessionResult> {
  const rawToken = generateSecureToken();
  const hashedToken = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  const [newSession] = await db
    .insert(session)
    .values({
      id: randomBytes(16).toString("hex"), // Better Auth uses text IDs
      userId,
      token: hashedToken,
      expiresAt,
      userAgent: metadata.userAgent || null,
      ipAddress: metadata.ipAddress || null,
    })
    .returning();

  return {
    sessionToken: rawToken,
    session: newSession!,
    expiresAt,
  };
}

export interface ValidateSessionResult {
  session: Session;
  user: User;
}

/**
 * Validate a session token and return the session with user
 * Also updates lastActiveAt for sliding expiry
 */
export async function validateSession(
  rawToken: string
): Promise<ValidateSessionResult | null> {
  const hashedToken = hashToken(rawToken);

  // Find session
  const [foundSession] = await db
    .select()
    .from(session)
    .where(eq(session.token, hashedToken))
    .limit(1);

  if (!foundSession) {
    return null;
  }

  // Check if expired
  if (foundSession.expiresAt < new Date()) {
    // Clean up expired session
    await db.delete(session).where(eq(session.id, foundSession.id));
    return null;
  }

  // Get user
  const [foundUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, foundSession.userId))
    .limit(1);

  if (!foundUser) {
    return null;
  }

  // Update updatedAt for sliding expiry (Better Auth pattern)
  await db
    .update(session)
    .set({ updatedAt: new Date() })
    .where(eq(session.id, foundSession.id));

  return { session: foundSession, user: foundUser };
}

/**
 * Revoke a specific session by ID
 */
export async function revokeSession(sessionId: string): Promise<void> {
  await db.delete(session).where(eq(session.id, sessionId));
}

/**
 * Revoke a session by token
 */
export async function revokeSessionByToken(rawToken: string): Promise<void> {
  const hashedToken = hashToken(rawToken);
  await db.delete(session).where(eq(session.token, hashedToken));
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db.delete(session).where(eq(session.userId, userId));
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Clean up expired verification tokens
 * Should be run periodically (e.g., hourly via pg-boss)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  await db
    .delete(verification)
    .where(lt(verification.expiresAt, new Date()));

  // drizzle doesn't return rowCount directly, but the operation succeeds
  return 0; // Return 0 for now, actual count would require raw SQL
}

/**
 * Clean up expired sessions
 * Should be run periodically (e.g., hourly via pg-boss)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  await db
    .delete(session)
    .where(lt(session.expiresAt, new Date()));

  return 0;
}
