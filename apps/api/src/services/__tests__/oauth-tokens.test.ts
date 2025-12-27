/**
 * OAuth Tokens Service Tests
 *
 * TDD test suite for the OAuth tokens service that manages storing,
 * retrieving, and revoking OAuth credentials using the repository layer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the repository module before importing the service
vi.mock("../../repositories/oauth-token-repository.js", () => ({
  upsertTokens: vi.fn(),
  getTokens: vi.fn(),
  hasTokens: vi.fn(),
  deleteTokens: vi.fn(),
}));

// Import the mocked repository functions
import {
  upsertTokens,
  getTokens,
  hasTokens,
  deleteTokens,
} from "../../repositories/oauth-token-repository.js";

// Import the service functions to test
import {
  storeGoogleCredentials,
  getGoogleCredentials,
  hasGoogleCredentials,
  revokeGoogleCredentials,
} from "../oauth-tokens.js";

import type { GoogleSheetsCredentials } from "../google-sheets-service.js";

// Helper to create valid credentials
function createCredentials(
  overrides: Partial<GoogleSheetsCredentials> = {}
): GoogleSheetsCredentials {
  return {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    expiresAt: Date.now() + 3600000, // 1 hour from now
    ...overrides,
  };
}

describe("OAuthTokensService", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("storeGoogleCredentials", () => {
    it("calls upsertTokens with correct provider and converted date", async () => {
      const userId = "user-123";
      const expiresAtTimestamp = Date.now() + 3600000;
      const credentials = createCredentials({ expiresAt: expiresAtTimestamp });

      await storeGoogleCredentials(userId, credentials);

      expect(upsertTokens).toHaveBeenCalledTimes(1);
      expect(upsertTokens).toHaveBeenCalledWith(
        userId,
        "google",
        expect.objectContaining({
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
          scopes: null,
        })
      );

      // Verify the expiresAt is a Date object with the correct timestamp
      const callArgs = vi.mocked(upsertTokens).mock.calls[0];
      const storedCredentials = callArgs[2];
      expect(storedCredentials.expiresAt).toBeInstanceOf(Date);
      expect(storedCredentials.expiresAt?.getTime()).toBe(expiresAtTimestamp);
    });

    it("stores credentials with null refresh token when empty string provided", async () => {
      const userId = "user-456";
      const credentials = createCredentials({ refreshToken: "" });

      await storeGoogleCredentials(userId, credentials);

      const callArgs = vi.mocked(upsertTokens).mock.calls[0];
      const storedCredentials = callArgs[2];
      // Empty string should be converted to null for storage
      expect(storedCredentials.refreshToken).toBeNull();
    });

    it("stores credentials with null expiresAt correctly", async () => {
      const userId = "user-789";
      const credentials: GoogleSheetsCredentials = {
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: null,
      };

      await storeGoogleCredentials(userId, credentials);

      expect(upsertTokens).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(upsertTokens).mock.calls[0];
      const storedCredentials = callArgs[2];
      // null expiresAt should remain null (not be converted to a Date)
      expect(storedCredentials.expiresAt).toBeNull();
    });
  });

  describe("getGoogleCredentials", () => {
    it("returns null when no tokens exist", async () => {
      vi.mocked(getTokens).mockResolvedValue(null);

      const result = await getGoogleCredentials("user-123");

      expect(getTokens).toHaveBeenCalledWith("user-123", "google");
      expect(result).toBeNull();
    });

    it("returns credentials in correct format with expiresAt as timestamp", async () => {
      const storedDate = new Date("2025-01-15T12:00:00Z");
      vi.mocked(getTokens).mockResolvedValue({
        accessToken: "stored-access-token",
        refreshToken: "stored-refresh-token",
        expiresAt: storedDate,
        scopes: null,
      });

      const result = await getGoogleCredentials("user-123");

      expect(getTokens).toHaveBeenCalledWith("user-123", "google");
      expect(result).not.toBeNull();
      expect(result).toEqual({
        accessToken: "stored-access-token",
        refreshToken: "stored-refresh-token",
        expiresAt: storedDate.getTime(),
      });
    });

    it("handles null expiresAt from repository", async () => {
      vi.mocked(getTokens).mockResolvedValue({
        accessToken: "stored-access-token",
        refreshToken: "stored-refresh-token",
        expiresAt: null,
        scopes: null,
      });

      const result = await getGoogleCredentials("user-123");

      expect(result).not.toBeNull();
      // When expiresAt is null, it should remain null (indicating no expiry)
      expect(result?.accessToken).toBe("stored-access-token");
      expect(result?.expiresAt).toBeNull();
    });

    it("handles null refresh token from repository", async () => {
      vi.mocked(getTokens).mockResolvedValue({
        accessToken: "stored-access-token",
        refreshToken: null,
        expiresAt: new Date(),
        scopes: null,
      });

      const result = await getGoogleCredentials("user-123");

      expect(result).not.toBeNull();
      // Null refresh token should be converted to empty string for GoogleSheetsCredentials
      expect(result?.refreshToken).toBe("");
    });
  });

  describe("hasGoogleCredentials", () => {
    it("returns true when tokens exist", async () => {
      vi.mocked(hasTokens).mockResolvedValue(true);

      const result = await hasGoogleCredentials("user-123");

      expect(hasTokens).toHaveBeenCalledWith("user-123", "google");
      expect(result).toBe(true);
    });

    it("returns false when no tokens exist", async () => {
      vi.mocked(hasTokens).mockResolvedValue(false);

      const result = await hasGoogleCredentials("user-456");

      expect(hasTokens).toHaveBeenCalledWith("user-456", "google");
      expect(result).toBe(false);
    });
  });

  describe("revokeGoogleCredentials", () => {
    it("calls deleteTokens to remove credentials", async () => {
      vi.mocked(getTokens).mockResolvedValue({
        accessToken: "token-to-revoke",
        refreshToken: "refresh-token",
        expiresAt: new Date(),
        scopes: null,
      });
      vi.mocked(deleteTokens).mockResolvedValue(true);
      // Mock Google's revoke endpoint to succeed
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      await revokeGoogleCredentials("user-123");

      expect(deleteTokens).toHaveBeenCalledWith("user-123", "google");
    });

    it("attempts to call Google revoke endpoint before deleting (best effort)", async () => {
      vi.mocked(getTokens).mockResolvedValue({
        accessToken: "token-to-revoke",
        refreshToken: "refresh-token",
        expiresAt: new Date(),
        scopes: null,
      });
      vi.mocked(deleteTokens).mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      await revokeGoogleCredentials("user-123");

      // Should have attempted to call Google's revoke endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("oauth2.googleapis.com/revoke"),
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("still deletes tokens even if Google revoke fails (best effort)", async () => {
      vi.mocked(getTokens).mockResolvedValue({
        accessToken: "token-to-revoke",
        refreshToken: "refresh-token",
        expiresAt: new Date(),
        scopes: null,
      });
      vi.mocked(deleteTokens).mockResolvedValue(true);
      // Google's revoke endpoint fails
      mockFetch.mockRejectedValue(new Error("Network error"));

      // Should not throw
      await expect(revokeGoogleCredentials("user-123")).resolves.not.toThrow();

      // Should still delete tokens from database
      expect(deleteTokens).toHaveBeenCalledWith("user-123", "google");
    });

    it("handles case when no credentials exist to revoke", async () => {
      vi.mocked(getTokens).mockResolvedValue(null);
      vi.mocked(deleteTokens).mockResolvedValue(false);

      // Should not throw
      await expect(revokeGoogleCredentials("user-123")).resolves.not.toThrow();

      // Should still call deleteTokens (idempotent)
      expect(deleteTokens).toHaveBeenCalledWith("user-123", "google");
      // Should not call Google revoke since there's no token
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("logs warning when Google revoke returns non-2xx status", async () => {
      const mockCredentials = {
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(),
        scopes: null,
      };
      vi.mocked(getTokens).mockResolvedValue(mockCredentials);
      vi.mocked(deleteTokens).mockResolvedValue(true);

      // Mock fetch to return 400 Bad Request
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await revokeGoogleCredentials("user-123");

      // Should log warning about non-OK response
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Google revoke returned 400")
      );

      // Should still delete local tokens (best-effort)
      expect(deleteTokens).toHaveBeenCalledWith("user-123", "google");

      warnSpy.mockRestore();
    });

    it("logs warning when Google revoke returns 401 (already revoked or invalid)", async () => {
      const mockCredentials = {
        accessToken: "invalid-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(),
        scopes: null,
      };
      vi.mocked(getTokens).mockResolvedValue(mockCredentials);
      vi.mocked(deleteTokens).mockResolvedValue(true);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await revokeGoogleCredentials("user-123");

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Google revoke returned 401")
      );
      expect(deleteTokens).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe("Integration: store then retrieve", () => {
    it("returns same values after store and retrieve (timestamps match)", async () => {
      const userId = "user-integration";
      const expiresAtTimestamp = 1705320000000; // Fixed timestamp for deterministic test
      const credentials = createCredentials({
        accessToken: "integration-access-token",
        refreshToken: "integration-refresh-token",
        expiresAt: expiresAtTimestamp,
      });

      // Mock upsertTokens to capture what was stored
      let storedData: {
        accessToken: string;
        refreshToken: string | null;
        expiresAt: Date | null;
        scopes: string | null;
      } | null = null;

      vi.mocked(upsertTokens).mockImplementation(async (_userId, _provider, creds) => {
        storedData = creds;
      });

      // Mock getTokens to return what was stored
      vi.mocked(getTokens).mockImplementation(async () => storedData);

      // Store credentials
      await storeGoogleCredentials(userId, credentials);

      // Retrieve credentials
      const retrieved = await getGoogleCredentials(userId);

      // Verify the retrieved credentials match the original
      expect(retrieved).not.toBeNull();
      expect(retrieved?.accessToken).toBe(credentials.accessToken);
      expect(retrieved?.refreshToken).toBe(credentials.refreshToken);
      expect(retrieved?.expiresAt).toBe(expiresAtTimestamp);
    });
  });
});
