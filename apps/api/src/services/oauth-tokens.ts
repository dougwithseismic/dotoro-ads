/**
 * OAuth Tokens Service
 *
 * Provides functionality to retrieve and manage OAuth tokens for various platforms.
 * Currently supports Google OAuth for Google Sheets integration.
 *
 * This service uses the OAuth token repository for encrypted token storage
 * and retrieval from the database.
 */

import type { GoogleSheetsCredentials } from "./google-sheets-service.js";
import {
  upsertTokens,
  getTokens,
  hasTokens,
  deleteTokens,
} from "../repositories/oauth-token-repository.js";

/** Google OAuth revoke endpoint */
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

/**
 * Retrieves Google OAuth credentials for a user.
 *
 * Queries the database for stored OAuth tokens (which are encrypted at rest)
 * and converts them to the GoogleSheetsCredentials format.
 *
 * @param userId - The user ID to retrieve credentials for
 * @returns Google credentials or null if not connected
 *
 * @example
 * ```typescript
 * const credentials = await getGoogleCredentials("user-123");
 * if (credentials) {
 *   const data = await fetchSheetData(credentials, spreadsheetId, sheetName);
 * }
 * ```
 */
export async function getGoogleCredentials(
  userId: string
): Promise<GoogleSheetsCredentials | null> {
  let storedTokens;
  try {
    storedTokens = await getTokens(userId, "google");
  } catch (error) {
    // Decryption failed - treat as if no credentials exist
    // This can happen if encryption key changed or token format is corrupted
    console.warn(
      `[getGoogleCredentials] Failed to decrypt tokens for user ${userId}, treating as not connected:`,
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }

  if (!storedTokens) {
    return null;
  }

  // Convert stored credentials to GoogleSheetsCredentials format
  // - expiresAt: Date -> number (timestamp), null -> null (no expiry)
  // - refreshToken: null -> empty string
  return {
    accessToken: storedTokens.accessToken,
    refreshToken: storedTokens.refreshToken ?? "",
    expiresAt: storedTokens.expiresAt?.getTime() ?? null,
  };
}

/**
 * Stores Google OAuth credentials for a user.
 *
 * Encrypts and stores the OAuth tokens in the database using upsert semantics.
 * If credentials already exist for the user, they are updated.
 *
 * @param userId - The user ID to store credentials for
 * @param credentials - The OAuth credentials to store
 *
 * @example
 * ```typescript
 * await storeGoogleCredentials("user-123", {
 *   accessToken: "...",
 *   refreshToken: "...",
 *   expiresAt: Date.now() + 3600000,
 * });
 * ```
 */
export async function storeGoogleCredentials(
  userId: string,
  credentials: GoogleSheetsCredentials
): Promise<void> {
  await upsertTokens(userId, "google", {
    accessToken: credentials.accessToken,
    refreshToken: credentials.refreshToken || null,  // Empty string -> null
    expiresAt: credentials.expiresAt !== null ? new Date(credentials.expiresAt) : null,  // Handle null
    scopes: null,
  });
}

/**
 * Revokes and deletes Google OAuth credentials for a user.
 *
 * This function:
 * 1. Retrieves stored tokens
 * 2. Attempts to call Google's revoke endpoint (best effort)
 * 3. Deletes tokens from database regardless of revoke result
 *
 * The Google revoke is best-effort - if it fails, we still delete the local tokens
 * to ensure the user can disconnect even if there are network issues.
 *
 * @param userId - The user ID to revoke credentials for
 *
 * @example
 * ```typescript
 * await revokeGoogleCredentials("user-123");
 * ```
 */
export async function revokeGoogleCredentials(userId: string): Promise<void> {
  // First, try to get existing credentials to revoke with Google
  // Wrap in try-catch because decryption can fail if tokens are corrupted
  // (e.g., encryption key changed or data format mismatch)
  let storedTokens = null;
  try {
    storedTokens = await getTokens(userId, "google");
  } catch (error) {
    // Decryption failed - tokens are corrupted, log and continue to delete
    console.warn(
      `[revokeGoogleCredentials] Failed to decrypt tokens for user ${userId}, will delete anyway:`,
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  if (storedTokens) {
    // Best effort: attempt to revoke token with Google
    try {
      const response = await fetch(
        `${GOOGLE_REVOKE_URL}?token=${storedTokens.accessToken}`,
        { method: "POST" }
      );

      if (!response.ok) {
        // Log the actual response status - not just network errors
        console.warn(
          `[revokeGoogleCredentials] Google revoke returned ${response.status} for user ${userId}`
        );
      }
    } catch (error) {
      // Network errors (no response at all)
      console.warn(
        `[revokeGoogleCredentials] Network error revoking token for user ${userId}:`,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  // Always delete tokens from database (idempotent)
  await deleteTokens(userId, "google");
}

/**
 * Checks if a user has Google OAuth credentials stored.
 *
 * This is a lightweight check that doesn't decrypt the tokens.
 *
 * @param userId - The user ID to check
 * @returns true if user has credentials stored, false otherwise
 */
export async function hasGoogleCredentials(userId: string): Promise<boolean> {
  return hasTokens(userId, "google");
}
