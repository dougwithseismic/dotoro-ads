import { RedditOAuth, type RedditOAuthConfig, type OAuthTokens } from "@repo/reddit-ads";
import { encrypt, decrypt, type EncryptedData } from "../../lib/encryption.js";

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

export interface StoredTokens {
  accountId: string;
  redditAccountId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
}

interface EncryptedTokens {
  accountId: string;
  redditAccountId: string;
  encryptedAccessToken: EncryptedData;
  encryptedRefreshToken: EncryptedData;
  expiresAt: string; // ISO string for serialization
  scope: string[];
}

// ============================================================================
// In-memory stores (replace with database in production)
//
// TODO: PRODUCTION REQUIREMENT - Replace Map storage with Redis/database
// for multi-instance deployments.
//
// CRITICAL ISSUES with current in-memory storage:
// 1. OAuth failures when load-balanced across multiple instances
//    - User may start OAuth on instance A but callback hits instance B
//    - The oauthSessions Map won't have the state on instance B
// 2. All tokens lost on server restart
// 3. No horizontal scaling support
// 4. Memory growth with many concurrent users
//
// RECOMMENDED SOLUTIONS:
// - Redis for oauthSessions (short TTL, ~10 min)
// - PostgreSQL/Redis for storedTokens (encrypted, persistent)
//
// Example Redis implementation:
//   await redis.setex(`oauth:session:${state}`, 600, JSON.stringify(session));
//   const session = await redis.get(`oauth:session:${state}`);
// ============================================================================

const oauthSessions = new Map<string, RedditOAuthSession>();
const storedTokens = new Map<string, EncryptedTokens>();

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

      // Store tokens for later use
      await this.storeTokens(session.accountId, tokens);

      // Clean up session
      oauthSessions.delete(state);

      return { tokens, accountId: session.accountId };
    } catch (error) {
      oauthSessions.delete(state);
      throw error;
    }
  }

  /**
   * Get valid tokens for an account, refreshing if needed
   */
  async getValidTokens(accountId: string): Promise<OAuthTokens | null> {
    const stored = storedTokens.get(accountId);

    if (!stored) {
      return null;
    }

    // Decrypt tokens
    let accessToken: string;
    let refreshToken: string;
    try {
      accessToken = decrypt(stored.encryptedAccessToken);
      refreshToken = decrypt(stored.encryptedRefreshToken);
    } catch (error) {
      // Decryption failed - tokens are corrupted or key changed
      console.error(
        `[Reddit OAuth] Token decryption failed for account ${accountId}:`,
        error instanceof Error ? error.message : String(error)
      );
      storedTokens.delete(accountId);
      return null;
    }

    const expiresAt = new Date(stored.expiresAt);
    const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    // Check if tokens are already expired (negative expiresIn)
    if (expiresIn < 0) {
      // Token is expired, attempt refresh
      try {
        const refreshedTokens = await this.oauth.refreshAccessToken(refreshToken);
        await this.storeTokens(accountId, refreshedTokens);
        return refreshedTokens;
      } catch (error) {
        // Token refresh failed, clear stored tokens
        console.error(
          `[Reddit OAuth] Token refresh failed for account ${accountId} (expired token):`,
          error instanceof Error ? error.message : String(error)
        );
        storedTokens.delete(accountId);
        return null;
      }
    }

    const tokens: OAuthTokens = {
      accessToken,
      refreshToken,
      tokenType: "bearer",
      expiresIn,
      expiresAt,
      scope: stored.scope as ("ads_read" | "ads_write" | "account")[],
    };

    // Check if token needs refresh (using the library's check which includes buffer)
    if (this.oauth.isTokenExpired(tokens)) {
      try {
        const refreshedTokens = await this.oauth.refreshAccessToken(
          tokens.refreshToken
        );
        await this.storeTokens(accountId, refreshedTokens);
        return refreshedTokens;
      } catch (error) {
        // Token refresh failed, clear stored tokens
        console.error(
          `[Reddit OAuth] Token refresh failed for account ${accountId} (expiring token):`,
          error instanceof Error ? error.message : String(error)
        );
        storedTokens.delete(accountId);
        return null;
      }
    }

    return tokens;
  }

  /**
   * Revoke tokens for an account
   */
  async revokeTokens(accountId: string): Promise<void> {
    const stored = storedTokens.get(accountId);

    if (stored) {
      try {
        // Decrypt tokens for revocation
        const accessToken = decrypt(stored.encryptedAccessToken);
        const refreshToken = decrypt(stored.encryptedRefreshToken);

        await this.oauth.revokeToken(accessToken, "access_token");
        await this.oauth.revokeToken(refreshToken, "refresh_token");
      } finally {
        storedTokens.delete(accountId);
      }
    }
  }

  /**
   * Check if account has valid tokens
   */
  hasValidTokens(accountId: string): boolean {
    const stored = storedTokens.get(accountId);
    if (!stored) return false;

    const expiresAt = new Date(stored.expiresAt);
    return expiresAt.getTime() > Date.now();
  }

  /**
   * Store tokens with encryption
   * In production, save to database instead of in-memory Map
   */
  private async storeTokens(
    accountId: string,
    tokens: OAuthTokens
  ): Promise<void> {
    // Encrypt sensitive tokens before storage
    const encryptedAccessToken = encrypt(tokens.accessToken);
    const encryptedRefreshToken = encrypt(tokens.refreshToken);

    storedTokens.set(accountId, {
      accountId,
      redditAccountId: "", // Would be fetched from Reddit API
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
      scope: tokens.scope,
    });
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
      scopes: ["ads_read", "ads_write", "account"],
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
  storedTokens.clear();
}
