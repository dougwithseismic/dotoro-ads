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

import { googleAuthApp } from "../google.js";
import {
  getGoogleCredentials,
  hasGoogleCredentials,
  revokeGoogleCredentials,
} from "../../services/oauth-tokens.js";

describe("Google OAuth Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/v1/auth/google/connect", () => {
    it("returns not configured message when OAuth is not set up", async () => {
      // Remove env vars to simulate not configured
      vi.stubEnv("GOOGLE_CLIENT_ID", "");

      const res = await googleAuthApp.request("/api/v1/auth/google/connect");

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.error).toMatch(/not configured/i);
    });

    it("returns authorization URL when OAuth is configured", async () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");

      const res = await googleAuthApp.request("/api/v1/auth/google/connect");

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.authorizationUrl).toContain("accounts.google.com");
      expect(data.authorizationUrl).toContain("client_id=test-client-id");
    });
  });

  describe("GET /api/v1/auth/google/callback", () => {
    it("returns error when code is missing", async () => {
      const res = await googleAuthApp.request(
        "/api/v1/auth/google/callback?state=test-state"
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/code|missing/i);
    });

    it("returns not implemented for valid callback (placeholder)", async () => {
      const res = await googleAuthApp.request(
        "/api/v1/auth/google/callback?code=auth-code&state=test-state"
      );

      // Placeholder returns 501 Not Implemented
      expect(res.status).toBe(501);
      const data = await res.json();
      expect(data.error).toMatch(/not implemented|placeholder/i);
    });
  });

  describe("GET /api/v1/auth/google/status", () => {
    it("returns connected: false when user has no credentials", async () => {
      vi.mocked(hasGoogleCredentials).mockResolvedValue(false);

      const res = await googleAuthApp.request(
        "/api/v1/auth/google/status?userId=user-123"
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.connected).toBe(false);
    });

    it("returns connected: true when user has credentials", async () => {
      vi.mocked(hasGoogleCredentials).mockResolvedValue(true);

      const res = await googleAuthApp.request(
        "/api/v1/auth/google/status?userId=user-123"
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.connected).toBe(true);
    });

    it("returns error when userId is missing", async () => {
      const res = await googleAuthApp.request("/api/v1/auth/google/status");

      expect(res.status).toBe(400);
      const data = await res.json() as { error?: unknown; success?: boolean };
      // Zod validation returns an object with error details
      expect(data.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/google/disconnect", () => {
    it("disconnects user Google account", async () => {
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
      expect(revokeGoogleCredentials).toHaveBeenCalledWith("user-123");
    });

    it("returns error when userId is missing", async () => {
      const res = await googleAuthApp.request("/api/v1/auth/google/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as { success?: boolean; error?: unknown };
      // Zod validation returns an object with error details
      expect(data.success).toBe(false);
    });
  });
});
