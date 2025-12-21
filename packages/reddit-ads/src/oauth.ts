import { createHash, randomBytes } from "crypto";
import type { OAuthTokens, OAuthScope } from "./types.js";

// ============================================================================
// Constants
// ============================================================================

const REDDIT_OAUTH_ENDPOINTS = {
  authorize: "https://www.reddit.com/api/v1/authorize",
  token: "https://www.reddit.com/api/v1/access_token",
  revoke: "https://www.reddit.com/api/v1/revoke_token",
} as const;

// Default token expiry buffer (60 seconds)
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;

// ============================================================================
// Types
// ============================================================================

export interface RedditOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: OAuthScope[];
  userAgent?: string;
}

export interface AuthorizationUrlResult {
  url: string;
  state: string;
  codeVerifier?: string;
}

export interface AuthorizationUrlOptions {
  usePKCE?: boolean;
  state?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  scope: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a cryptographically secure random state string
 */
export function generateState(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Generate a PKCE code verifier
 */
export function generateCodeVerifier(): string {
  // Generate 32-96 bytes of random data (results in 43-128 base64url chars)
  return randomBytes(48)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 64);
}

/**
 * Generate a PKCE code challenge from a verifier (S256 method)
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = createHash("sha256").update(verifier).digest();
  return hash.toString("base64url");
}

// ============================================================================
// OAuth Client
// ============================================================================

export class RedditOAuth {
  private readonly config: RedditOAuthConfig;

  constructor(config: RedditOAuthConfig) {
    this.config = config;
  }

  /**
   * Generate the authorization URL for OAuth flow
   */
  getAuthorizationUrl(options: AuthorizationUrlOptions = {}): AuthorizationUrlResult {
    const state = options.state ?? generateState();
    const url = new URL(REDDIT_OAUTH_ENDPOINTS.authorize);

    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("scope", this.config.scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("duration", "permanent"); // For refresh tokens

    let codeVerifier: string | undefined;

    if (options.usePKCE) {
      codeVerifier = generateCodeVerifier();
      // Synchronously generate challenge for simplicity
      const hash = createHash("sha256").update(codeVerifier).digest();
      const codeChallenge = hash.toString("base64url");
      url.searchParams.set("code_challenge", codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
    }

    return {
      url: url.toString(),
      state,
      codeVerifier,
    };
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier?: string
  ): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
    });

    if (codeVerifier) {
      body.set("code_verifier", codeVerifier);
    }

    const response = await fetch(REDDIT_OAUTH_ENDPOINTS.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: this.getBasicAuthHeader(),
        "User-Agent": this.getUserAgent(),
      },
      body: body.toString(),
    });

    if (!response.ok) {
      let error: Record<string, unknown> = {};
      try {
        error = await response.json();
      } catch {
        try {
          const rawText = await response.text();
          error = { rawError: rawText.slice(0, 500) };
        } catch {
          error = { parseError: "Unable to parse error response" };
        }
      }
      throw new Error(
        `Token exchange failed: ${error.error ?? response.statusText}`
      );
    }

    const data = (await response.json()) as TokenResponse;
    return this.parseTokenResponse(data);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch(REDDIT_OAUTH_ENDPOINTS.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: this.getBasicAuthHeader(),
        "User-Agent": this.getUserAgent(),
      },
      body: body.toString(),
    });

    if (!response.ok) {
      let error: Record<string, unknown> = {};
      try {
        error = await response.json();
      } catch {
        try {
          const rawText = await response.text();
          error = { rawError: rawText.slice(0, 500) };
        } catch {
          error = { parseError: "Unable to parse error response" };
        }
      }
      throw new Error(
        `Token refresh failed: ${error.error ?? response.statusText}`
      );
    }

    const data = (await response.json()) as TokenResponse;
    return this.parseTokenResponse(data);
  }

  /**
   * Check if token is expired (or will expire soon)
   */
  isTokenExpired(tokens: OAuthTokens, bufferMs = TOKEN_EXPIRY_BUFFER_MS): boolean {
    const now = Date.now();
    const expiresAt = tokens.expiresAt.getTime();
    return now >= expiresAt - bufferMs;
  }

  /**
   * Revoke a token (access or refresh)
   */
  async revokeToken(
    token: string,
    tokenType: "access_token" | "refresh_token" = "access_token"
  ): Promise<void> {
    const body = new URLSearchParams({
      token,
      token_type_hint: tokenType,
    });

    const response = await fetch(REDDIT_OAUTH_ENDPOINTS.revoke, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: this.getBasicAuthHeader(),
        "User-Agent": this.getUserAgent(),
      },
      body: body.toString(),
    });

    if (!response.ok) {
      let error: Record<string, unknown> = {};
      try {
        error = await response.json();
      } catch {
        try {
          const rawText = await response.text();
          error = { rawError: rawText.slice(0, 500) };
        } catch {
          error = { parseError: "Unable to parse error response" };
        }
      }
      throw new Error(
        `Token revocation failed: ${error.error ?? response.statusText}`
      );
    }
  }

  /**
   * Get Basic Auth header for client credentials
   */
  private getBasicAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString("base64");
    return `Basic ${credentials}`;
  }

  /**
   * Get User-Agent header
   */
  private getUserAgent(): string {
    return this.config.userAgent ?? "dotoro-reddit-ads/1.0";
  }

  /**
   * Parse token response into OAuthTokens
   */
  private parseTokenResponse(data: TokenResponse): OAuthTokens {
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);
    const scope = data.scope.split(" ") as OAuthScope[];

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      expiresAt,
      scope,
    };
  }
}

export { REDDIT_OAUTH_ENDPOINTS };
