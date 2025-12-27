/**
 * OAuth Token Repository
 *
 * Repository implementation for storing and retrieving OAuth tokens
 * for data source integrations (Google Sheets, etc.).
 *
 * SECURITY: All tokens are encrypted at rest using AES-256-GCM encryption.
 * The encryption service handles key management via environment variables.
 */

import { eq, and } from "drizzle-orm";
import { db, userOAuthTokens } from "../services/db.js";
import { encrypt, decrypt } from "../lib/encryption.js";
import type { OAuthProvider } from "../types/oauth.js";

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Credentials structure for storing/retrieving OAuth tokens
 */
export interface StoredCredentials {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Store or update OAuth tokens for a user+provider combination (upsert)
 *
 * This function encrypts the accessToken and refreshToken before storage.
 * Uses upsert behavior with onConflictDoUpdate on the unique (userId, provider) constraint.
 *
 * @param userId - The user ID
 * @param provider - The OAuth provider (e.g., 'google', 'microsoft')
 * @param credentials - The credentials to store
 *
 * @example
 * ```ts
 * await upsertTokens("user-123", "google", {
 *   accessToken: "ya29.xxx",
 *   refreshToken: "1//xxx",
 *   expiresAt: new Date(Date.now() + 3600000),
 *   scopes: "https://www.googleapis.com/auth/spreadsheets.readonly"
 * });
 * ```
 */
export async function upsertTokens(
  userId: string,
  provider: OAuthProvider,
  credentials: StoredCredentials
): Promise<void> {
  // Encrypt tokens before storage with error handling
  let encryptedAccessToken: string;
  let encryptedRefreshToken: string | null;

  try {
    encryptedAccessToken = encrypt(credentials.accessToken);
    encryptedRefreshToken = credentials.refreshToken
      ? encrypt(credentials.refreshToken)
      : null;
  } catch (error) {
    console.error(`[upsertTokens] Encryption failed for ${provider}:`, error);
    throw new Error(`Failed to encrypt OAuth tokens for ${provider}`, {
      cause: error,
    });
  }

  const now = new Date();

  // Database operation with error handling
  try {
    // Upsert using onConflictDoUpdate on the unique (userId, provider) constraint
    await db
      .insert(userOAuthTokens)
      .values({
        userId,
        provider,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: credentials.expiresAt,
        scopes: credentials.scopes,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [userOAuthTokens.userId, userOAuthTokens.provider],
        set: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: credentials.expiresAt,
          scopes: credentials.scopes,
          updatedAt: now,
        },
      });
  } catch (error) {
    console.error(
      `[upsertTokens] Database operation failed for ${provider}:`,
      error
    );
    throw new Error(`Failed to store OAuth tokens for ${provider}`, {
      cause: error,
    });
  }
}

/**
 * Retrieve OAuth tokens for a user+provider combination
 *
 * This function decrypts the accessToken and refreshToken after retrieval.
 *
 * @param userId - The user ID
 * @param provider - The OAuth provider
 * @returns The decrypted credentials or null if not found
 *
 * @example
 * ```ts
 * const tokens = await getTokens("user-123", "google");
 * if (tokens) {
 *   console.log("Access token:", tokens.accessToken);
 * }
 * ```
 */
export async function getTokens(
  userId: string,
  provider: OAuthProvider
): Promise<StoredCredentials | null> {
  let result;

  try {
    result = await db.query.userOAuthTokens.findFirst({
      where: and(
        eq(userOAuthTokens.userId, userId),
        eq(userOAuthTokens.provider, provider)
      ),
    });
  } catch (error) {
    console.error(
      `[getTokens] Database query failed for ${provider}:`,
      error instanceof Error ? error.message : error
    );
    throw new Error(`Failed to retrieve OAuth tokens for ${provider}`, {
      cause: error,
    });
  }

  if (!result) {
    return null;
  }

  // Decrypt tokens after retrieval with error handling
  try {
    const decryptedAccessToken = decrypt(result.accessToken);
    const decryptedRefreshToken = result.refreshToken
      ? decrypt(result.refreshToken)
      : null;

    return {
      accessToken: decryptedAccessToken,
      refreshToken: decryptedRefreshToken,
      expiresAt: result.expiresAt,
      scopes: result.scopes,
    };
  } catch (error) {
    console.error(
      `[getTokens] CRITICAL: Failed to decrypt tokens for user ${userId}, provider ${provider}. ` +
        `This may indicate key rotation without migration or data corruption.`,
      error instanceof Error ? error.message : error
    );
    throw new Error(
      `Failed to decrypt stored OAuth tokens for ${provider}. The stored credentials may be corrupted.`,
      { cause: error }
    );
  }
}

/**
 * Check if OAuth tokens exist for a user+provider combination
 *
 * This is a lightweight check that doesn't decrypt the tokens.
 *
 * @param userId - The user ID
 * @param provider - The OAuth provider
 * @returns true if tokens exist, false otherwise
 *
 * @example
 * ```ts
 * if (await hasTokens("user-123", "google")) {
 *   // User has connected their Google account
 * }
 * ```
 */
export async function hasTokens(
  userId: string,
  provider: OAuthProvider
): Promise<boolean> {
  try {
    const result = await db.query.userOAuthTokens.findFirst({
      where: and(
        eq(userOAuthTokens.userId, userId),
        eq(userOAuthTokens.provider, provider)
      ),
      columns: {
        id: true,
      },
    });

    return !!result;
  } catch (error) {
    console.error(
      `[hasTokens] Database query failed for ${provider}:`,
      error
    );
    throw new Error(`Failed to check OAuth token existence for ${provider}`, {
      cause: error,
    });
  }
}

/**
 * Delete OAuth tokens for a user+provider combination
 *
 * @param userId - The user ID
 * @param provider - The OAuth provider
 * @returns true if tokens were deleted, false if no tokens existed
 *
 * @example
 * ```ts
 * const wasDeleted = await deleteTokens("user-123", "google");
 * if (wasDeleted) {
 *   console.log("Tokens removed successfully");
 * }
 * ```
 */
export async function deleteTokens(
  userId: string,
  provider: OAuthProvider
): Promise<boolean> {
  try {
    // Use returning() to get the deleted rows and check if any were deleted
    const result = await db
      .delete(userOAuthTokens)
      .where(
        and(
          eq(userOAuthTokens.userId, userId),
          eq(userOAuthTokens.provider, provider)
        )
      )
      .returning({ id: userOAuthTokens.id });

    // Check if any rows were deleted
    return result.length > 0;
  } catch (error) {
    console.error(
      `[deleteTokens] Database operation failed for ${provider}:`,
      error
    );
    throw new Error(`Failed to delete OAuth tokens for ${provider}`, {
      cause: error,
    });
  }
}
