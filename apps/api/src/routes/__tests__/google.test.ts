/**
 * Google OAuth Routes Tests
 *
 * Tests for the placeholder Google OAuth routes that will handle:
 * - OAuth flow initiation
 * - OAuth callback handling
 * - Connection status checking
 * - Account disconnection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock environment variables
vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("GOOGLE_REDIRECT_URI", "http://localhost:3001/api/v1/auth/google/callback");
vi.stubEnv("FRONTEND_URL", "http://localhost:3000");

// Mock the OAuth tokens service
vi.mock("../../services/oauth-tokens.js", () => ({
  getGoogleCredentials: vi.fn(),
  storeGoogleCredentials: vi.fn(),
  revokeGoogleCredentials: vi.fn(),
  hasGoogleCredentials: vi.fn(),
}));

// Mock global fetch for token exchange tests
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { googleAuthApp, decodeState, isAllowedRedirectUrl } from "../google.js";
import {
  getGoogleCredentials,
  hasGoogleCredentials,
  revokeGoogleCredentials,
  storeGoogleCredentials,
} from "../../services/oauth-tokens.js";

describe("Google OAuth Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("POST /api/v1/auth/google/connect", () => {
    it("returns not configured message when OAuth is not set up", async () => {
      // Remove env vars to simulate not configured
      vi.stubEnv("GOOGLE_CLIENT_ID", "");

      const res = await googleAuthApp.request("/api/v1/auth/google/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user-123",
        },
        body: JSON.stringify({ redirectUrl: "http://localhost:3000/data-sources" }),
      });

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.error).toMatch(/not configured/i);
    });

    it("returns authorization URL with state containing redirectUrl when OAuth is configured", async () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");

      const res = await googleAuthApp.request("/api/v1/auth/google/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user-123",
        },
        body: JSON.stringify({ redirectUrl: "http://localhost:3000/data-sources" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.authorizationUrl).toContain("accounts.google.com");
      expect(data.authorizationUrl).toContain("client_id=test-client-id");
      // Check that state parameter is included
      expect(data.authorizationUrl).toContain("state=");

      // Decode and verify state contains redirectUrl
      const url = new URL(data.authorizationUrl);
      const state = url.searchParams.get("state");
      expect(state).toBeTruthy();
      const decodedState = JSON.parse(atob(state!));
      expect(decodedState.redirectUrl).toBe("http://localhost:3000/data-sources");
      expect(decodedState.userId).toBe("user-123");
    });

    it("uses default redirectUrl when not provided in body", async () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
      vi.stubEnv("FRONTEND_URL", "http://localhost:3000");

      const res = await googleAuthApp.request("/api/v1/auth/google/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user-123",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // Decode state and verify default redirectUrl
      const url = new URL(data.authorizationUrl);
      const state = url.searchParams.get("state");
      const decodedState = JSON.parse(atob(state!));
      expect(decodedState.redirectUrl).toBe("http://localhost:3000/data-sources");
    });

    it("returns 400 when userId is missing from both body and header", async () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");

      const res = await googleAuthApp.request("/api/v1/auth/google/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ redirectUrl: "http://localhost:3000/data-sources" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as { error: string; code: string };
      expect(data.error).toMatch(/missing.*userId/i);
      expect(data.code).toBe("MISSING_USER_ID");
    });

    it("prefers body userId over x-user-id header when both provided", async () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");

      const res = await googleAuthApp.request("/api/v1/auth/google/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "header-user",
        },
        body: JSON.stringify({
          redirectUrl: "http://localhost:3000/data-sources",
          userId: "body-user",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // Decode state and verify userId from body is used
      const url = new URL(data.authorizationUrl);
      const state = url.searchParams.get("state");
      const decodedState = JSON.parse(atob(state!));
      expect(decodedState.userId).toBe("body-user");
    });

    describe("Open Redirect Protection", () => {
      it("rejects redirectUrl from different origin (potential open redirect attack)", async () => {
        vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
        vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
        vi.stubEnv("FRONTEND_URL", "http://localhost:3000");

        const res = await googleAuthApp.request("/api/v1/auth/google/connect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": "user-123",
          },
          body: JSON.stringify({
            redirectUrl: "https://malicious-site.com/phishing",
          }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();

        // Should fall back to default redirectUrl, not use the malicious one
        const url = new URL(data.authorizationUrl);
        const state = url.searchParams.get("state");
        const decodedState = JSON.parse(atob(state!));
        expect(decodedState.redirectUrl).toBe("http://localhost:3000/data-sources");
        expect(decodedState.redirectUrl).not.toBe("https://malicious-site.com/phishing");
      });

      it("rejects redirectUrl with different protocol (http vs https attack)", async () => {
        vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
        vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
        vi.stubEnv("FRONTEND_URL", "https://myapp.com");

        const res = await googleAuthApp.request("/api/v1/auth/google/connect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": "user-123",
          },
          body: JSON.stringify({
            redirectUrl: "http://myapp.com/data-sources", // http instead of https
          }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();

        // Should fall back to default redirectUrl due to protocol mismatch
        const url = new URL(data.authorizationUrl);
        const state = url.searchParams.get("state");
        const decodedState = JSON.parse(atob(state!));
        expect(decodedState.redirectUrl).toBe("https://myapp.com/data-sources");
      });

      it("rejects redirectUrl with subdomain hijacking attempt", async () => {
        vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
        vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
        vi.stubEnv("FRONTEND_URL", "https://app.example.com");

        const res = await googleAuthApp.request("/api/v1/auth/google/connect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": "user-123",
          },
          body: JSON.stringify({
            redirectUrl: "https://evil.app.example.com/steal", // subdomain attack
          }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();

        // Should fall back to default redirectUrl
        const url = new URL(data.authorizationUrl);
        const state = url.searchParams.get("state");
        const decodedState = JSON.parse(atob(state!));
        expect(decodedState.redirectUrl).toBe("https://app.example.com/data-sources");
      });

      it("accepts redirectUrl from same origin with different path", async () => {
        vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
        vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
        vi.stubEnv("FRONTEND_URL", "http://localhost:3000");

        const res = await googleAuthApp.request("/api/v1/auth/google/connect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": "user-123",
          },
          body: JSON.stringify({
            redirectUrl: "http://localhost:3000/settings/integrations",
          }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();

        // Should accept the custom path since origin matches
        const url = new URL(data.authorizationUrl);
        const state = url.searchParams.get("state");
        const decodedState = JSON.parse(atob(state!));
        expect(decodedState.redirectUrl).toBe("http://localhost:3000/settings/integrations");
      });

      it("handles invalid URL format gracefully", async () => {
        vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
        vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
        vi.stubEnv("FRONTEND_URL", "http://localhost:3000");

        const res = await googleAuthApp.request("/api/v1/auth/google/connect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": "user-123",
          },
          body: JSON.stringify({
            redirectUrl: "not-a-valid-url",
          }),
        });

        // Zod validation should reject invalid URL format with 400
        expect(res.status).toBe(400);
      });
    });
  });

  describe("GET /api/v1/auth/google/callback", () => {
    /**
     * Helper to create a valid base64-encoded state
     */
    function createState(payload: { userId: string; redirectUrl: string }): string {
      return btoa(JSON.stringify(payload));
    }

    /**
     * Helper to create a mock successful token response
     */
    function createTokenResponse(overrides: Partial<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    }> = {}) {
      return {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_in: 3600,
        token_type: "Bearer",
        ...overrides,
      };
    }

    beforeEach(() => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
      vi.stubEnv("GOOGLE_REDIRECT_URI", "http://localhost:3001/api/v1/auth/google/callback");
      vi.stubEnv("FRONTEND_URL", "http://localhost:3000");
      mockFetch.mockReset();
    });

    describe("Error Cases", () => {
      it("redirects to frontend with error when state is missing", async () => {
        const res = await googleAuthApp.request(
          "/api/v1/auth/google/callback?code=auth-code"
        );

        expect(res.status).toBe(302);
        const location = res.headers.get("location");
        expect(location).toContain("oauth=error");
        expect(location).toContain("message=");
        expect(location).toMatch(/state|missing|invalid/i);
      });

      it("redirects to frontend with error when state is invalid base64", async () => {
        const res = await googleAuthApp.request(
          "/api/v1/auth/google/callback?code=auth-code&state=not-valid-base64!!!"
        );

        expect(res.status).toBe(302);
        const location = res.headers.get("location");
        expect(location).toContain("oauth=error");
        expect(location).toMatch(/state|invalid/i);
      });

      it("redirects to frontend with error when state has invalid JSON", async () => {
        const invalidState = btoa("this is not json");
        const res = await googleAuthApp.request(
          `/api/v1/auth/google/callback?code=auth-code&state=${invalidState}`
        );

        expect(res.status).toBe(302);
        const location = res.headers.get("location");
        expect(location).toContain("oauth=error");
        expect(location).toMatch(/state|invalid/i);
      });

      it("redirects to frontend with error when state is missing userId", async () => {
        const stateWithoutUserId = btoa(JSON.stringify({ redirectUrl: "http://localhost:3000/data-sources" }));
        const res = await googleAuthApp.request(
          `/api/v1/auth/google/callback?code=auth-code&state=${stateWithoutUserId}`
        );

        expect(res.status).toBe(302);
        const location = res.headers.get("location");
        expect(location).toContain("oauth=error");
        expect(location).toMatch(/userId|invalid/i);
      });

      it("returns 400 when code is missing", async () => {
        const validState = createState({
          userId: "user-123",
          redirectUrl: "http://localhost:3000/data-sources",
        });

        const res = await googleAuthApp.request(
          `/api/v1/auth/google/callback?state=${validState}`
        );

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/code|missing/i);
      });

      it("redirects to redirectUrl with error when token exchange fails", async () => {
        const validState = createState({
          userId: "user-123",
          redirectUrl: "http://localhost:3000/data-sources",
        });

        // Mock failed token exchange
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            error: "invalid_grant",
            error_description: "Code has expired",
          }),
        });

        const res = await googleAuthApp.request(
          `/api/v1/auth/google/callback?code=expired-code&state=${validState}`
        );

        expect(res.status).toBe(302);
        const location = res.headers.get("location");
        expect(location).toContain("http://localhost:3000/data-sources");
        expect(location).toContain("oauth=error");
        expect(location).toContain("message=");
      });

      it("redirects to redirectUrl with error when token exchange returns network error", async () => {
        const validState = createState({
          userId: "user-123",
          redirectUrl: "http://localhost:3000/data-sources",
        });

        // Mock network error
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        const res = await googleAuthApp.request(
          `/api/v1/auth/google/callback?code=auth-code&state=${validState}`
        );

        expect(res.status).toBe(302);
        const location = res.headers.get("location");
        expect(location).toContain("http://localhost:3000/data-sources");
        expect(location).toContain("oauth=error");
      });

      it("handles Google OAuth error response from initial auth", async () => {
        const res = await googleAuthApp.request(
          "/api/v1/auth/google/callback?error=access_denied&error_description=User%20denied%20access"
        );

        expect(res.status).toBe(302);
        const location = res.headers.get("location");
        expect(location).toContain("oauth=error");
        expect(location).toContain("User%20denied%20access");
      });
    });

    describe("Success Cases", () => {
      it("exchanges code for tokens and stores credentials on success", async () => {
        const validState = createState({
          userId: "user-123",
          redirectUrl: "http://localhost:3000/data-sources",
        });

        // Mock successful token exchange
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createTokenResponse(),
        });

        vi.mocked(storeGoogleCredentials).mockResolvedValueOnce(undefined);

        const res = await googleAuthApp.request(
          `/api/v1/auth/google/callback?code=valid-auth-code&state=${validState}`
        );

        // Verify token exchange was called with correct parameters
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toBe("https://oauth2.googleapis.com/token");
        expect(options.method).toBe("POST");
        expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");

        // Verify body contains correct parameters
        const body = new URLSearchParams(options.body);
        expect(body.get("code")).toBe("valid-auth-code");
        expect(body.get("client_id")).toBe("test-client-id");
        expect(body.get("client_secret")).toBe("test-client-secret");
        expect(body.get("redirect_uri")).toBe("http://localhost:3001/api/v1/auth/google/callback");
        expect(body.get("grant_type")).toBe("authorization_code");

        // Verify credentials were stored
        expect(storeGoogleCredentials).toHaveBeenCalledTimes(1);
        expect(storeGoogleCredentials).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            accessToken: "mock-access-token",
            refreshToken: "mock-refresh-token",
          })
        );

        // Verify redirect to success
        expect(res.status).toBe(302);
        const location = res.headers.get("location");
        expect(location).toBe("http://localhost:3000/data-sources?oauth=success&platform=google");
      });

      it("redirects to the redirectUrl from state on success", async () => {
        const customRedirectUrl = "http://localhost:3000/settings/integrations";
        const validState = createState({
          userId: "user-456",
          redirectUrl: customRedirectUrl,
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createTokenResponse(),
        });
        vi.mocked(storeGoogleCredentials).mockResolvedValueOnce(undefined);

        const res = await googleAuthApp.request(
          `/api/v1/auth/google/callback?code=valid-auth-code&state=${validState}`
        );

        expect(res.status).toBe(302);
        const location = res.headers.get("location");
        expect(location).toBe(`${customRedirectUrl}?oauth=success&platform=google`);
      });

      it("calculates expiresAt correctly from expires_in", async () => {
        const validState = createState({
          userId: "user-123",
          redirectUrl: "http://localhost:3000/data-sources",
        });

        const expiresInSeconds = 7200; // 2 hours
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createTokenResponse({ expires_in: expiresInSeconds }),
        });
        vi.mocked(storeGoogleCredentials).mockResolvedValueOnce(undefined);

        const beforeCall = Date.now();
        await googleAuthApp.request(
          `/api/v1/auth/google/callback?code=valid-auth-code&state=${validState}`
        );
        const afterCall = Date.now();

        expect(storeGoogleCredentials).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            expiresAt: expect.any(Number),
          })
        );

        // Get the expiresAt that was passed
        const storedCredentials = vi.mocked(storeGoogleCredentials).mock.calls[0][1];
        const expectedMinExpiry = beforeCall + expiresInSeconds * 1000;
        const expectedMaxExpiry = afterCall + expiresInSeconds * 1000;

        expect(storedCredentials.expiresAt).toBeGreaterThanOrEqual(expectedMinExpiry);
        expect(storedCredentials.expiresAt).toBeLessThanOrEqual(expectedMaxExpiry);
      });

      it("handles token response without refresh_token gracefully", async () => {
        const validState = createState({
          userId: "user-123",
          redirectUrl: "http://localhost:3000/data-sources",
        });

        // Some flows don't return refresh_token (e.g., when user already granted access)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "mock-access-token",
            expires_in: 3600,
            token_type: "Bearer",
            // No refresh_token
          }),
        });
        vi.mocked(storeGoogleCredentials).mockResolvedValueOnce(undefined);

        const res = await googleAuthApp.request(
          `/api/v1/auth/google/callback?code=valid-auth-code&state=${validState}`
        );

        expect(res.status).toBe(302);
        expect(storeGoogleCredentials).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            accessToken: "mock-access-token",
            refreshToken: undefined,
          })
        );
      });

      it("falls back to default frontend URL if redirectUrl in state is invalid", async () => {
        // State contains an external/malicious URL
        const stateWithBadUrl = createState({
          userId: "user-123",
          redirectUrl: "https://malicious-site.com/phishing",
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createTokenResponse(),
        });
        vi.mocked(storeGoogleCredentials).mockResolvedValueOnce(undefined);

        const res = await googleAuthApp.request(
          `/api/v1/auth/google/callback?code=valid-auth-code&state=${stateWithBadUrl}`
        );

        expect(res.status).toBe(302);
        const location = res.headers.get("location");
        // Should fall back to default frontend URL
        expect(location).toContain("http://localhost:3000");
        expect(location).not.toContain("malicious-site.com");
        expect(location).toContain("oauth=success");
      });
    });

    describe("storeGoogleCredentials error handling", () => {
      it("redirects with error when storeGoogleCredentials fails", async () => {
        const validState = createState({
          userId: "user-123",
          redirectUrl: "http://localhost:3000/data-sources",
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createTokenResponse(),
        });

        // Mock storage failure
        vi.mocked(storeGoogleCredentials).mockRejectedValueOnce(
          new Error("Database connection failed")
        );

        const res = await googleAuthApp.request(
          `/api/v1/auth/google/callback?code=valid-auth-code&state=${validState}`
        );

        expect(res.status).toBe(302);
        const location = res.headers.get("location");
        expect(location).toContain("http://localhost:3000/data-sources");
        expect(location).toContain("oauth=error");
      });
    });
  });

  describe("GET /api/v1/auth/google/status", () => {
    it("returns connected: false when user has no credentials (query param)", async () => {
      vi.mocked(hasGoogleCredentials).mockResolvedValue(false);

      const res = await googleAuthApp.request(
        "/api/v1/auth/google/status?userId=user-123"
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.connected).toBe(false);
      expect(hasGoogleCredentials).toHaveBeenCalledWith("user-123");
    });

    it("returns connected: true when user has credentials (query param)", async () => {
      vi.mocked(hasGoogleCredentials).mockResolvedValue(true);

      const res = await googleAuthApp.request(
        "/api/v1/auth/google/status?userId=user-123"
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.connected).toBe(true);
      expect(hasGoogleCredentials).toHaveBeenCalledWith("user-123");
    });

    it("returns connected status when userId is provided via x-user-id header", async () => {
      vi.mocked(hasGoogleCredentials).mockResolvedValue(true);

      const res = await googleAuthApp.request("/api/v1/auth/google/status", {
        headers: {
          "x-user-id": "header-user-456",
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.connected).toBe(true);
      expect(hasGoogleCredentials).toHaveBeenCalledWith("header-user-456");
    });

    it("prefers query param userId over x-user-id header when both provided", async () => {
      vi.mocked(hasGoogleCredentials).mockResolvedValue(false);

      const res = await googleAuthApp.request(
        "/api/v1/auth/google/status?userId=query-user",
        {
          headers: {
            "x-user-id": "header-user",
          },
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.connected).toBe(false);
      // Should use query param, not header
      expect(hasGoogleCredentials).toHaveBeenCalledWith("query-user");
    });

    it("returns 400 error when userId is missing from both query and header", async () => {
      const res = await googleAuthApp.request("/api/v1/auth/google/status");

      expect(res.status).toBe(400);
      const data = await res.json() as { error: string; code: string };
      expect(data.error).toMatch(/missing.*userId/i);
      expect(data.code).toBe("MISSING_USER_ID");
    });
  });

  describe("POST /api/v1/auth/google/disconnect", () => {
    it("disconnects user Google account with userId in body", async () => {
      vi.mocked(revokeGoogleCredentials).mockResolvedValue(undefined);

      const res = await googleAuthApp.request("/api/v1/auth/google/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: "user-123" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Google account disconnected successfully");
      expect(revokeGoogleCredentials).toHaveBeenCalledWith("user-123");
    });

    it("disconnects user Google account with userId from x-user-id header", async () => {
      vi.mocked(revokeGoogleCredentials).mockResolvedValue(undefined);

      const res = await googleAuthApp.request("/api/v1/auth/google/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "header-user-789",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Google account disconnected successfully");
      expect(revokeGoogleCredentials).toHaveBeenCalledWith("header-user-789");
    });

    it("prefers body userId over x-user-id header when both provided", async () => {
      vi.mocked(revokeGoogleCredentials).mockResolvedValue(undefined);

      const res = await googleAuthApp.request("/api/v1/auth/google/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "header-user",
        },
        body: JSON.stringify({ userId: "body-user" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      // Should use body, not header
      expect(revokeGoogleCredentials).toHaveBeenCalledWith("body-user");
    });

    it("returns 400 error when userId is missing from both body and header", async () => {
      const res = await googleAuthApp.request("/api/v1/auth/google/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as { error: string; code: string };
      expect(data.error).toMatch(/missing.*userId/i);
      expect(data.code).toBe("MISSING_USER_ID");
    });
  });
});

describe("decodeState", () => {
  it("decodes valid base64-encoded state payload", () => {
    const payload = { userId: "user-123", redirectUrl: "http://localhost:3000/data-sources" };
    const encoded = btoa(JSON.stringify(payload));

    const result = decodeState(encoded);

    expect(result).toEqual(payload);
  });

  it("returns null for invalid base64 string", () => {
    const result = decodeState("not-valid-base64!!!");

    expect(result).toBeNull();
  });

  it("returns null for valid base64 but invalid JSON", () => {
    const encoded = btoa("this is not json");

    const result = decodeState(encoded);

    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    const result = decodeState("");

    expect(result).toBeNull();
  });

  it("handles state with special characters in redirectUrl", () => {
    const payload = {
      userId: "user-123",
      redirectUrl: "http://localhost:3000/data-sources?tab=google&filter=active",
    };
    const encoded = btoa(JSON.stringify(payload));

    const result = decodeState(encoded);

    expect(result).toEqual(payload);
  });
});

describe("isAllowedRedirectUrl", () => {
  beforeEach(() => {
    vi.stubEnv("FRONTEND_URL", "http://localhost:3000");
  });

  it("returns true for URL with matching origin", () => {
    const result = isAllowedRedirectUrl("http://localhost:3000/data-sources");

    expect(result).toBe(true);
  });

  it("returns true for URL with matching origin and different path", () => {
    const result = isAllowedRedirectUrl("http://localhost:3000/settings/integrations");

    expect(result).toBe(true);
  });

  it("returns false for URL with different origin", () => {
    const result = isAllowedRedirectUrl("https://malicious-site.com/phishing");

    expect(result).toBe(false);
  });

  it("returns false for URL with different protocol", () => {
    vi.stubEnv("FRONTEND_URL", "https://myapp.com");

    const result = isAllowedRedirectUrl("http://myapp.com/data-sources");

    expect(result).toBe(false);
  });

  it("returns false for URL with different port", () => {
    const result = isAllowedRedirectUrl("http://localhost:4000/data-sources");

    expect(result).toBe(false);
  });

  it("returns false for subdomain attack", () => {
    vi.stubEnv("FRONTEND_URL", "https://app.example.com");

    const result = isAllowedRedirectUrl("https://evil.app.example.com/steal");

    expect(result).toBe(false);
  });

  it("returns false for invalid URL format", () => {
    const result = isAllowedRedirectUrl("not-a-url");

    expect(result).toBe(false);
  });

  it("returns false for empty string", () => {
    const result = isAllowedRedirectUrl("");

    expect(result).toBe(false);
  });

  it("uses default frontend URL when FRONTEND_URL is not set", () => {
    vi.stubEnv("FRONTEND_URL", "");

    // Default is http://localhost:3000
    const result = isAllowedRedirectUrl("http://localhost:3000/data-sources");

    expect(result).toBe(true);
  });
});
