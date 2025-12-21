import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  RedditOAuth,
  RedditOAuthConfig,
  generateState,
  generateCodeVerifier,
  generateCodeChallenge,
} from "../oauth.js";
import type { OAuthTokens } from "../types.js";

describe("RedditOAuth", () => {
  const mockConfig: RedditOAuthConfig = {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    redirectUri: "https://example.com/callback",
    scopes: ["ads_read", "ads_write", "account"],
  };

  let oauth: RedditOAuth;

  beforeEach(() => {
    oauth = new RedditOAuth(mockConfig);
    vi.clearAllMocks();
  });

  describe("getAuthorizationUrl", () => {
    it("should generate valid authorization URL with required parameters", () => {
      const { url, state } = oauth.getAuthorizationUrl();

      const parsedUrl = new URL(url);
      expect(parsedUrl.origin).toBe("https://www.reddit.com");
      expect(parsedUrl.pathname).toBe("/api/v1/authorize");

      expect(parsedUrl.searchParams.get("client_id")).toBe(mockConfig.clientId);
      expect(parsedUrl.searchParams.get("response_type")).toBe("code");
      expect(parsedUrl.searchParams.get("redirect_uri")).toBe(mockConfig.redirectUri);
      expect(parsedUrl.searchParams.get("scope")).toBe("ads_read ads_write account");
      expect(parsedUrl.searchParams.get("state")).toBe(state);
      expect(parsedUrl.searchParams.get("duration")).toBe("permanent");
    });

    it("should generate unique state for each request", () => {
      const result1 = oauth.getAuthorizationUrl();
      const result2 = oauth.getAuthorizationUrl();

      expect(result1.state).not.toBe(result2.state);
    });

    it("should include code_challenge for PKCE flow", () => {
      const { url, codeVerifier } = oauth.getAuthorizationUrl({ usePKCE: true });

      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get("code_challenge")).toBeTruthy();
      expect(parsedUrl.searchParams.get("code_challenge_method")).toBe("S256");
      expect(codeVerifier).toBeTruthy();
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange authorization code for tokens", async () => {
      const mockTokenResponse = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        token_type: "bearer",
        expires_in: 86400,
        scope: "ads_read ads_write account",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const tokens = await oauth.exchangeCodeForTokens("auth-code-123");

      expect(tokens.accessToken).toBe("mock-access-token");
      expect(tokens.refreshToken).toBe("mock-refresh-token");
      expect(tokens.tokenType).toBe("bearer");
      expect(tokens.expiresIn).toBe(86400);
      expect(tokens.scope).toEqual(["ads_read", "ads_write", "account"]);
      expect(tokens.expiresAt).toBeInstanceOf(Date);
    });

    it("should include code_verifier when PKCE is used", async () => {
      const mockTokenResponse = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        token_type: "bearer",
        expires_in: 86400,
        scope: "ads_read",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      await oauth.exchangeCodeForTokens("auth-code-123", "code-verifier-123");

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = fetchCall?.[1]?.body as string;
      expect(body).toContain("code_verifier=code-verifier-123");
    });

    it("should throw error on failed token exchange", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "invalid_grant" }),
      });

      await expect(oauth.exchangeCodeForTokens("invalid-code")).rejects.toThrow(
        "Token exchange failed"
      );
    });

    it("should handle network failure during token exchange", async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

      await expect(oauth.exchangeCodeForTokens("auth-code")).rejects.toThrow(
        "Network error"
      );
    });

    it("should handle malformed JSON response during token exchange", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("Invalid JSON")),
        text: () => Promise.resolve("<!DOCTYPE html><html>Error Page</html>"),
      });

      await expect(oauth.exchangeCodeForTokens("auth-code")).rejects.toThrow(
        "Token exchange failed"
      );
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh access token using refresh token", async () => {
      const mockTokenResponse = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        token_type: "bearer",
        expires_in: 86400,
        scope: "ads_read ads_write",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const tokens = await oauth.refreshAccessToken("old-refresh-token");

      expect(tokens.accessToken).toBe("new-access-token");
      expect(tokens.refreshToken).toBe("new-refresh-token");

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = fetchCall?.[1]?.body as string;
      expect(body).toContain("grant_type=refresh_token");
      expect(body).toContain("refresh_token=old-refresh-token");
    });

    it("should throw error when refresh fails", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "invalid_grant" }),
      });

      await expect(oauth.refreshAccessToken("expired-token")).rejects.toThrow(
        "Token refresh failed"
      );
    });

    it("should handle network failure during token refresh", async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error("Connection timeout"));

      await expect(oauth.refreshAccessToken("refresh-token")).rejects.toThrow(
        "Connection timeout"
      );
    });

    it("should handle malformed JSON response during token refresh", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: () => Promise.reject(new Error("Invalid JSON")),
        text: () => Promise.resolve("Bad Gateway"),
      });

      await expect(oauth.refreshAccessToken("refresh-token")).rejects.toThrow(
        "Token refresh failed"
      );
    });
  });

  describe("isTokenExpired", () => {
    it("should return true for expired token", () => {
      const expiredTokens: OAuthTokens = {
        accessToken: "token",
        refreshToken: "refresh",
        tokenType: "bearer",
        expiresIn: 3600,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        scope: ["ads_read"],
      };

      expect(oauth.isTokenExpired(expiredTokens)).toBe(true);
    });

    it("should return false for valid token", () => {
      const validTokens: OAuthTokens = {
        accessToken: "token",
        refreshToken: "refresh",
        tokenType: "bearer",
        expiresIn: 3600,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        scope: ["ads_read"],
      };

      expect(oauth.isTokenExpired(validTokens)).toBe(false);
    });

    it("should consider token expired within buffer period", () => {
      const almostExpiredTokens: OAuthTokens = {
        accessToken: "token",
        refreshToken: "refresh",
        tokenType: "bearer",
        expiresIn: 3600,
        expiresAt: new Date(Date.now() + 30000), // 30 seconds from now
        scope: ["ads_read"],
      };

      // With default 60 second buffer, this should be considered expired
      expect(oauth.isTokenExpired(almostExpiredTokens)).toBe(true);
    });
  });

  describe("revokeToken", () => {
    it("should revoke access token", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await oauth.revokeToken("access-token");

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall?.[0]).toBe("https://www.reddit.com/api/v1/revoke_token");
      const body = fetchCall?.[1]?.body as string;
      expect(body).toContain("token=access-token");
      expect(body).toContain("token_type_hint=access_token");
    });
  });
});

describe("OAuth Utilities", () => {
  describe("generateState", () => {
    it("should generate a random state string", () => {
      const state1 = generateState();
      const state2 = generateState();

      expect(state1).toHaveLength(32);
      expect(state2).toHaveLength(32);
      expect(state1).not.toBe(state2);
    });
  });

  describe("generateCodeVerifier", () => {
    it("should generate a valid code verifier", () => {
      const verifier = generateCodeVerifier();

      // PKCE code verifier must be 43-128 characters
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });
  });

  describe("generateCodeChallenge", () => {
    it("should generate S256 code challenge from verifier", async () => {
      const verifier = "test-code-verifier-12345678901234567890";
      const challenge = await generateCodeChallenge(verifier);

      // Code challenge should be base64url encoded
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });
});
