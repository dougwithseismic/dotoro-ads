import { RedditOAuth, type RedditOAuthConfig, type OAuthTokens } from "@repo/reddit-ads";
import { encrypt, decrypt } from "../../lib/encryption.js";
import { db, adAccounts, oauthTokens } from "../../services/db.js";
import { eq } from "drizzle-orm";

// Type for database operations that works with both db and transactions
type DbOrTransaction = Pick<typeof db, "insert" | "select" | "update" | "delete">;

// ============================================================================
// Types
// ============================================================================

export interface RedditOAuthSession {
  state: string;
  codeVerifier?: string;
  accountId: string;
  redirectUri: string;
  createdAt: Date;
}

// ============================================================================
// In-memory stores for OAuth sessions (temporary, short-lived)
//
// NOTE: OAuth sessions are kept in-memory since they are short-lived (~10 min)
// and only needed during the OAuth flow. For multi-instance deployments,
// consider using Redis for session storage.
//
// Token storage has been moved to the database (PostgreSQL) for persistence.
// ============================================================================

const oauthSessions = new Map<string, RedditOAuthSession>();

// ============================================================================
// OAuth Service
// ============================================================================

export class RedditOAuthService {
  private readonly oauth: RedditOAuth;
  private readonly config: RedditOAuthConfig;

  constructor(config: RedditOAuthConfig) {
    this.config = config;
    this.oauth = new RedditOAuth(config);
  }

  /**
   * Initialize OAuth flow and return authorization URL
   */
  initializeOAuth(
    accountId: string,
    redirectUri?: string
  ): { authorizationUrl: string; state: string } {
    const actualRedirectUri = redirectUri ?? this.config.redirectUri;

    const { url, state, codeVerifier } = this.oauth.getAuthorizationUrl({
      usePKCE: true,
    });

    // Store session for callback validation
    oauthSessions.set(state, {
      state,
      codeVerifier,
      accountId,
      redirectUri: actualRedirectUri,
      createdAt: new Date(),
    });

    // Clean up old sessions (older than 10 minutes)
    this.cleanupOldSessions();

    return { authorizationUrl: url, state };
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(
    code: string,
    state: string
  ): Promise<{ tokens: OAuthTokens; accountId: string }> {
    const session = oauthSessions.get(state);

    if (!session) {
      throw new Error("Invalid or expired OAuth state");
    }

    // Verify state hasn't expired (10 minute limit)
    const now = new Date();
    const sessionAge = now.getTime() - session.createdAt.getTime();
    if (sessionAge > 10 * 60 * 1000) {
      oauthSessions.delete(state);
      throw new Error("OAuth session expired");
    }

    try {
      const tokens = await this.oauth.exchangeCodeForTokens(
        code,
        session.codeVerifier
      );

      // Clean up session
      oauthSessions.delete(state);

      // Return tokens and accountId - caller is responsible for storing
      // after creating the adAccount record in the database
      return { tokens, accountId: session.accountId };
    } catch (error) {
      oauthSessions.delete(state);
      throw error;
    }
  }

  /**
   * Get valid tokens for an account, refreshing if needed
   */
  async getValidTokens(adAccountId: string): Promise<OAuthTokens | null> {
    // Query tokens from database
    const [storedToken] = await db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.adAccountId, adAccountId))
      .limit(1);

    if (!storedToken) {
      return null;
    }

    // Decrypt tokens - catch decrypt errors
    let accessToken: string;
    let refreshToken: string;
    try {
      accessToken = decrypt(storedToken.accessToken);

      if (storedToken.refreshToken) {
        refreshToken = decrypt(storedToken.refreshToken);
      } else {
        refreshToken = "";
      }
    } catch (error) {
      // Decryption failed - tokens are corrupted, malformed, or key changed
      console.error(
        `[Reddit OAuth] Token parse/decrypt failed for account ${adAccountId}:`,
        error instanceof Error ? error.message : String(error)
      );
      await this.deleteTokens(adAccountId);
      return null;
    }

    const expiresAt = storedToken.expiresAt ?? new Date(0);
    const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    const scopes = storedToken.scopes?.split(",") ?? [];

    // Check if tokens are already expired (negative expiresIn)
    if (expiresIn < 0) {
      // Token is expired, attempt refresh
      try {
        const refreshedTokens = await this.oauth.refreshAccessToken(refreshToken);
        await this.storeTokens(adAccountId, refreshedTokens);
        return refreshedTokens;
      } catch (error) {
        // Token refresh failed, clear stored tokens
        console.error(
          `[Reddit OAuth] Token refresh failed for account ${adAccountId} (expired token):`,
          error instanceof Error ? error.message : String(error)
        );
        await this.deleteTokens(adAccountId);
        return null;
      }
    }

    const tokens: OAuthTokens = {
      accessToken,
      refreshToken,
      tokenType: "bearer",
      expiresIn,
      expiresAt,
      scope: scopes as ("adsread" | "adsconversions" | "history" | "adsedit" | "read")[],
    };

    // Check if token needs refresh (using the library's check which includes buffer)
    if (this.oauth.isTokenExpired(tokens)) {
      try {
        const refreshedTokens = await this.oauth.refreshAccessToken(
          tokens.refreshToken
        );
        await this.storeTokens(adAccountId, refreshedTokens);
        return refreshedTokens;
      } catch (error) {
        // Token refresh failed, clear stored tokens
        console.error(
          `[Reddit OAuth] Token refresh failed for account ${adAccountId} (expiring token):`,
          error instanceof Error ? error.message : String(error)
        );
        await this.deleteTokens(adAccountId);
        return null;
      }
    }

    return tokens;
  }

  /**
   * Revoke tokens for an account
   */
  async revokeTokens(adAccountId: string): Promise<void> {
    // Query tokens from database
    const [storedToken] = await db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.adAccountId, adAccountId))
      .limit(1);

    if (storedToken) {
      try {
        // Decrypt tokens for revocation - catch decrypt errors
        const accessToken = decrypt(storedToken.accessToken);

        if (storedToken.refreshToken) {
          const refreshToken = decrypt(storedToken.refreshToken);
          await this.oauth.revokeToken(refreshToken, "refresh_token");
        }

        await this.oauth.revokeToken(accessToken, "access_token");
      } catch (error) {
        // Decryption failed - log but continue with cleanup
        console.error(
          `[Reddit OAuth] Token parse/decrypt failed during revocation for account ${adAccountId}:`,
          error instanceof Error ? error.message : String(error)
        );
      } finally {
        // Always delete tokens from database and update status
        await this.deleteTokens(adAccountId);

        // Update adAccount status to revoked
        await db
          .update(adAccounts)
          .set({ status: "revoked" })
          .where(eq(adAccounts.id, adAccountId));
      }
    }
  }

  /**
   * Check if account has valid tokens
   * Returns true if access token is not expired OR if a refresh token exists (can be refreshed)
   */
  async hasValidTokens(adAccountId: string): Promise<boolean> {
    // Query tokens from database
    const [storedToken] = await db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.adAccountId, adAccountId))
      .limit(1);

    if (!storedToken) return false;

    const expiresAt = storedToken.expiresAt ?? new Date(0);
    // Valid if access token not expired OR has refresh token (can be refreshed)
    return expiresAt.getTime() > Date.now() || !!storedToken.refreshToken;
  }

  /**
   * Store tokens with encryption in the database
   * Public method to allow storing tokens from callback handler
   * @param adAccountId - The ad account ID to store tokens for
   * @param tokens - The OAuth tokens to store
   * @param tx - Optional database transaction to use (for atomic operations)
   */
  async storeTokens(
    adAccountId: string,
    tokens: OAuthTokens,
    tx?: DbOrTransaction
  ): Promise<void> {
    // Use transaction if provided, otherwise use default db
    const database = tx ?? db;

    // Encrypt sensitive tokens before storage
    const encryptedAccessToken = encrypt(tokens.accessToken);
    const encryptedRefreshToken = encrypt(tokens.refreshToken);

    // Upsert oauth tokens - insert or update if exists
    await database
      .insert(oauthTokens)
      .values({
        adAccountId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiresAt,
        scopes: tokens.scope.join(","),
      })
      .onConflictDoUpdate({
        target: oauthTokens.adAccountId,
        set: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: tokens.expiresAt,
          scopes: tokens.scope.join(","),
        },
      });
  }

  /**
   * Delete tokens from database
   */
  private async deleteTokens(adAccountId: string): Promise<void> {
    await db
      .delete(oauthTokens)
      .where(eq(oauthTokens.adAccountId, adAccountId));
  }

  /**
   * Clean up old OAuth sessions
   */
  private cleanupOldSessions(): void {
    const now = new Date();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [state, session] of oauthSessions.entries()) {
      if (now.getTime() - session.createdAt.getTime() > maxAge) {
        oauthSessions.delete(state);
      }
    }
  }
}

// ============================================================================
// Factory function
// ============================================================================

let oauthServiceInstance: RedditOAuthService | null = null;

export function getRedditOAuthService(): RedditOAuthService {
  if (!oauthServiceInstance) {
    const clientId = process.env.REDDIT_CLIENT_ID ?? "";
    const clientSecret = process.env.REDDIT_CLIENT_SECRET ?? "";
    const redirectUri =
      process.env.REDDIT_REDIRECT_URI ?? "http://localhost:3001/api/v1/reddit/auth/callback";

    if (!clientId || !clientSecret) {
      throw new Error(
        "REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set"
      );
    }

    oauthServiceInstance = new RedditOAuthService({
      clientId,
      clientSecret,
      redirectUri,
      scopes: ["adsread", "adsconversions", "history", "adsedit", "read"],
    });
  }

  return oauthServiceInstance;
}

/**
 * Reset the OAuth service singleton for testing purposes
 * This should only be used in tests
 */
export function resetOAuthServiceForTesting(): void {
  oauthServiceInstance = null;
  oauthSessions.clear();
}
